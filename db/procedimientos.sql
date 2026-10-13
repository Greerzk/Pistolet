-- =====================================================================
--  PISTOLET · Procedimientos almacenados
--  PostgreSQL 14+ · ejecutar DESPUÉS de schema.sql
--
--  Contenido:
--    · registrar_produccion()  → hornea un lote: descuenta insumos,
--                                suma producto, recalcula costo
--    · crear_pedido()          → valida y descuenta stock al hacer el pedido
--    · registrar_pago()        → cobro en mostrador (efectivo/tarjeta)
--    · cancelar_pedido()       → revierte stock y lo deja en 'cancelado'
--
--  TODAS son transaccionales: si algo falla a mitad, todo se revierte.
-- =====================================================================
BEGIN;

-- Folios correlativos sin riesgo de duplicados concurrentes
CREATE SEQUENCE IF NOT EXISTS seq_folio_produccion START 1;
CREATE SEQUENCE IF NOT EXISTS seq_folio_pedido      START 1;

-- =====================================================================
-- 1) PRODUCCIÓN
--    registrar_produccion(producto, cantidad, usuario)
--    Ej.:  SELECT registrar_produccion(1, 100, 1);   -- 100 conchas
-- =====================================================================
CREATE OR REPLACE FUNCTION registrar_produccion(
    p_producto_id bigint,
    p_cantidad    integer,
    p_usuario_id  bigint DEFAULT NULL
) RETURNS bigint AS $$
DECLARE
    v_produccion_id bigint;
    v_folio         varchar(20);
    v_costo_total   numeric(10,2);
BEGIN
    -- Validaciones
    IF p_cantidad <= 0 THEN
        RAISE EXCEPTION 'La cantidad a producir debe ser mayor a 0';
    END IF;
    IF NOT EXISTS (SELECT 1 FROM producto WHERE id = p_producto_id AND activo) THEN
        RAISE EXCEPTION 'Producto % inexistente o inactivo', p_producto_id;
    END IF;
    IF NOT EXISTS (SELECT 1 FROM receta WHERE producto_id = p_producto_id) THEN
        RAISE EXCEPTION 'El producto % no tiene receta registrada', p_producto_id;
    END IF;

    -- Folio correlativo anual: PRD-2026-00001
    v_folio := 'PRD-' || to_char(now(), 'YYYY') || '-' ||
               lpad(nextval('seq_folio_produccion')::text, 5, '0');

    -- a) Cabecera del lote
    INSERT INTO produccion (folio, producto_id, cantidad, costo_total, usuario_id)
    VALUES (v_folio, p_producto_id, p_cantidad, 0, p_usuario_id)
    RETURNING id INTO v_produccion_id;

    -- b) Consumos: cuánto de cada insumo requiere la cantidad, con el costo
    --    vigente del insumo en esta fecha (histórico)
    INSERT INTO produccion_consumo
        (produccion_id, insumo_id, cantidad, costo_unitario, subtotal)
    SELECT v_produccion_id,
           r.insumo_id,
           round(r.cantidad_por_unidad * p_cantidad, 3),
           i.costo_unitario,
           round(r.cantidad_por_unidad * p_cantidad * i.costo_unitario, 2)
    FROM receta r
    JOIN insumo i ON i.id = r.insumo_id
    WHERE r.producto_id = p_producto_id;

    -- c) Validar que alcancen los insumos ANTES de tocar stock
    PERFORM 1
       FROM produccion_consumo c
       JOIN insumo          i ON i.id = c.insumo_id
      WHERE c.produccion_id = v_produccion_id
        AND i.stock < c.cantidad;
    IF FOUND THEN
        RAISE EXCEPTION 'Insumos insuficientes para producir % unidades de %',
                        p_cantidad, (SELECT nombre FROM producto WHERE id = p_producto_id);
    END IF;

    -- Descontar insumos
    UPDATE insumo i
       SET stock = round(i.stock - c.cantidad, 3)
      FROM produccion_consumo c
     WHERE c.produccion_id = v_produccion_id
       AND i.id = c.insumo_id;

    -- Auditoría de insumos
    INSERT INTO movimiento_insumo
        (insumo_id, tipo, cantidad, motivo, produccion_id, usuario_id)
    SELECT c.insumo_id, 'salida', -c.cantidad,
           'Producción ' || v_folio, v_produccion_id, p_usuario_id
      FROM produccion_consumo c
     WHERE c.produccion_id = v_produccion_id;

    -- d) Sumar unidades al producto y recalcular su costo unitario
    SELECT SUM(subtotal) INTO v_costo_total
      FROM produccion_consumo
     WHERE produccion_id = v_produccion_id;

    UPDATE produccion SET costo_total = v_costo_total WHERE id = v_produccion_id;

    UPDATE producto
       SET stock = stock + p_cantidad,
           costo = round(v_costo_total / p_cantidad, 2)
     WHERE id = p_producto_id;

    -- Auditoría del producto
    INSERT INTO movimiento_inventario
        (producto_id, tipo, cantidad, motivo, produccion_id, usuario_id)
    VALUES (p_producto_id, 'entrada', p_cantidad,
            'Producción ' || v_folio, v_produccion_id, p_usuario_id);

    RETURN v_produccion_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 2) CREAR PEDIDO (desde la app móvil)
--    crear_pedido(usuario, items JSON, notas)
--    Ej.: SELECT crear_pedido(2,
--           '[{"producto_id":1,"cantidad":5},{"producto_id":2,"cantidad":3}]',
--           'Recoger a las 6pm');
--    Descuenta stock de forma atómica y guarda el movimiento de inventario.
-- =====================================================================
CREATE OR REPLACE FUNCTION crear_pedido(
    p_usuario_id bigint,
    p_items      jsonb,
    p_notas      text DEFAULT NULL
) RETURNS bigint AS $$
DECLARE
    v_pedido_id bigint;
    v_folio     varchar(20);
    v_item      jsonb;
    v_prod_id   bigint;
    v_cant      integer;
    v_precio    numeric(10,2);
    v_stock     integer;
    v_subtotal  numeric(10,2) := 0;
BEGIN
    IF p_items IS NULL OR jsonb_array_length(p_items) = 0 THEN
        RAISE EXCEPTION 'El pedido debe tener al menos un producto';
    END IF;

    v_folio := 'PIS-' || to_char(now(), 'YYYY') || '-' ||
               lpad(nextval('seq_folio_pedido')::text, 5, '0');

    INSERT INTO pedido (folio, usuario_id, estado, notas)
    VALUES (v_folio, p_usuario_id, 'pendiente', p_notas)
    RETURNING id INTO v_pedido_id;

    -- Recorremos cada renglón recibido
    FOR v_item IN SELECT value FROM jsonb_array_elements(p_items)
    LOOP
        v_prod_id := (v_item->>'producto_id')::bigint;
        v_cant    := (v_item->>'cantidad')::integer;

        IF v_prod_id IS NULL OR v_cant <= 0 THEN
            RAISE EXCEPTION 'Renglón inválido: %', v_item;
        END IF;

        -- Bloqueo de fila (FOR UPDATE) + lectura de precio/stock: evita que
        -- dos pedidos concurrentes vendan la última pieza al mismo tiempo.
        SELECT precio, stock INTO v_precio, v_stock
          FROM producto
         WHERE id = v_prod_id AND activo
           FOR UPDATE;
        IF NOT FOUND THEN
            RAISE EXCEPTION 'Producto % inexistente o inactivo', v_prod_id;
        END IF;
        IF v_stock < v_cant THEN
            RAISE EXCEPTION 'Stock insuficiente de % (disponible: %)',
                            v_prod_id, v_stock;
        END IF;

        UPDATE producto SET stock = stock - v_cant WHERE id = v_prod_id;

        INSERT INTO pedido_detalle
            (pedido_id, producto_id, cantidad, precio_unitario, subtotal)
        VALUES (v_pedido_id, v_prod_id, v_cant, v_precio, round(v_precio * v_cant, 2));

        INSERT INTO movimiento_inventario
            (producto_id, tipo, cantidad, motivo, pedido_id, usuario_id)
        VALUES (v_prod_id, 'salida', -v_cant, 'Venta pedido ' || v_folio,
                v_pedido_id, p_usuario_id);

        v_subtotal := v_subtotal + v_precio * v_cant;
    END LOOP;

    UPDATE pedido
       SET subtotal = round(v_subtotal, 2),
           total    = round(v_subtotal, 2)
     WHERE id = v_pedido_id;

    RETURN v_pedido_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 3) PAGO EN MOSTRADOR (efectivo / tarjeta)
--    registrar_pago(pedido, metodo, monto_pagado, cajero)
--    Ej.:  SELECT registrar_pago(1, 'efectivo', 97.50, 1);
--    Cobra, cierra el pedido como 'entregado' y registra al cajero.
-- =====================================================================
CREATE OR REPLACE FUNCTION registrar_pago(
    p_pedido_id bigint,
    p_metodo    metodo_pago,
    p_monto     numeric(10,2),
    p_cajero_id bigint DEFAULT NULL
) RETURNS void AS $$
DECLARE
    v_total  numeric(10,2);
    v_estado estado_pedido;
BEGIN
    -- FOR UPDATE: impide cobrar dos veces el mismo pedido en paralelo
    SELECT total, estado INTO v_total, v_estado
      FROM pedido WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido % no existe', p_pedido_id;
    END IF;
    IF v_estado IN ('entregado', 'cancelado') THEN
        RAISE EXCEPTION 'El pedido % ya está %', p_pedido_id, v_estado;
    END IF;
    IF p_monto <> v_total THEN
        RAISE EXCEPTION 'El monto (%) no coincide con el total del pedido (%)',
                        p_monto, v_total;
    END IF;

    INSERT INTO pago (pedido_id, metodo, estado, monto, pagado_en)
    VALUES (p_pedido_id, p_metodo, 'pagado', p_monto, now());

    UPDATE pedido
       SET estado = 'entregado', cajero_id = p_cajero_id
     WHERE id = p_pedido_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 4) CANCELAR PEDIDO
--    cancelar_pedido(pedido)
--    Revierte el stock y el movimiento de inventario.
-- =====================================================================
CREATE OR REPLACE FUNCTION cancelar_pedido(p_pedido_id bigint) RETURNS void AS $$
DECLARE
    v_estado estado_pedido;
    r        RECORD;
BEGIN
    SELECT estado INTO v_estado FROM pedido WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido % no existe', p_pedido_id;
    END IF;
    IF v_estado IN ('entregado', 'cancelado') THEN
        RAISE EXCEPTION 'El pedido % ya está %', p_pedido_id, v_estado;
    END IF;

    -- Regresar unidades a cada producto
    FOR r IN SELECT producto_id, cantidad
               FROM pedido_detalle WHERE pedido_id = p_pedido_id
    LOOP
        UPDATE producto SET stock = stock + r.cantidad WHERE id = r.producto_id;

        INSERT INTO movimiento_inventario
            (producto_id, tipo, cantidad, motivo, pedido_id, usuario_id)
        VALUES (r.producto_id, 'entrada', r.cantidad,
                'Cancelación pedido ' || p_pedido_id, p_pedido_id, NULL);
    END LOOP;

    UPDATE pedido SET estado = 'cancelado' WHERE id = p_pedido_id;
END;
$$ LANGUAGE plpgsql;

-- =====================================================================
-- 5) REEMBOLSAR PAGO
--    reembolsar_pago(pedido, cajero, restock)
--    Ej.:  SELECT reembolsar_pago(1, 1, true);
--    · Marca el último pago 'pagado' como 'reembolsado'.
--    · p_restock = true  → el cliente devolvió la mercancía: regresa
--      stock y deja el pedido en 'cancelado'.
--    · p_restock = false → solo devolución de dinero, el pedido queda
--      'entregado'.
--    NOTA: las tarjetas se reembolsan en la terminal bancaria (no hay
--    pasarela online); aquí solo se registra la contraparte interna.
-- =====================================================================
CREATE OR REPLACE FUNCTION reembolsar_pago(
    p_pedido_id bigint,
    p_cajero_id bigint  DEFAULT NULL,
    p_restock   boolean DEFAULT false
) RETURNS void AS $$
DECLARE
    v_estado  estado_pedido;
    v_pago_id bigint;
    r         RECORD;
BEGIN
    SELECT estado INTO v_estado FROM pedido WHERE id = p_pedido_id FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido % no existe', p_pedido_id;
    END IF;

    SELECT id INTO v_pago_id
      FROM pago
     WHERE pedido_id = p_pedido_id AND estado = 'pagado'
     ORDER BY id DESC
     LIMIT 1
       FOR UPDATE;
    IF NOT FOUND THEN
        RAISE EXCEPTION 'El pedido % no tiene un pago por reembolsar', p_pedido_id;
    END IF;

    UPDATE pago SET estado = 'reembolsado' WHERE id = v_pago_id;

    IF p_restock THEN
        -- El cliente devolvió la mercancía: regresar unidades y auditar
        FOR r IN SELECT producto_id, cantidad
                   FROM pedido_detalle WHERE pedido_id = p_pedido_id
        LOOP
            UPDATE producto SET stock = stock + r.cantidad WHERE id = r.producto_id;

            INSERT INTO movimiento_inventario
                (producto_id, tipo, cantidad, motivo, pedido_id, usuario_id)
            VALUES (r.producto_id, 'entrada', r.cantidad,
                    'Reembolso pedido ' || p_pedido_id, p_pedido_id, p_cajero_id);
        END LOOP;

        UPDATE pedido SET estado = 'cancelado' WHERE id = p_pedido_id;
    END IF;
END;
$$ LANGUAGE plpgsql;

COMMIT;

-- =====================================================================
-- PRUEBA RÁPIDA (tras schema.sql + seed)
-- =====================================================================
-- SELECT registrar_produccion(1, 100, 1);    -- 100 conchas (harina 50 → 44 kg)
-- SELECT registrar_produccion(2,  50, 1);    --  50 cuernos
-- SELECT registrar_produccion(3,  30, 1);    --  30 baguettes
--
-- SELECT id, nombre, stock, costo FROM producto ORDER BY id;
-- SELECT id, nombre, stock FROM insumo ORDER BY id;
--
-- -- El cliente #2 pide 5 conchas y 1 baguette = 85.00
-- SELECT crear_pedido(2,
--        '[{"producto_id": 1, "cantidad": 5}, {"producto_id": 3, "cantidad": 1}]',
--        'Recoger a las 18:00');
--
-- -- Cobro en mostrador con tarjeta, atendido por el admin (usuario 1)
-- SELECT registrar_pago(1, 'tarjeta', 85.00, 1);
-- SELECT id, estado, cajero_id, total FROM pedido WHERE id = 1;   -- entregado, cajero 1
--
-- -- Corte de caja del día
-- SELECT p.creado_en::date AS dia,
--        pg.metodo,
--        COUNT(DISTINCT p.id) AS pedidos,
--        SUM(pg.monto)        AS total
-- FROM pedido p
-- JOIN pago pg ON pg.pedido_id = p.id
-- WHERE p.estado <> 'cancelado'
--   AND p.creado_en::date = CURRENT_DATE
-- GROUP BY dia, pg.metodo;