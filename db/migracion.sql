-- =====================================================================
--  PISTOLET · Migración y carga inicial de datos
--  PostgreSQL 14+ · ejecutar DESPUÉS de schema.sql
--
--  Escenario típico: ya tienes una tabla simple `productos`
--  (id, nombre, precio, stock, imagen) alimentando GET /api/productos.
-- =====================================================================

BEGIN;

-- ---------------------------------------------------------------------
-- 1) Si tu base actual tiene una tabla `productos`, migra en bloque.
--    (Ajusta el nombre del esquema/tabla según la base que tengas.)
-- ---------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS categoria_legacy AS
SELECT DISTINCT nombre_categoria AS nombre,  -- cambia este campo por el que tengas
       lower(regexp_replace(nombre_categoria, '[^a-z0-9]+', '-', 'g')) AS slug
FROM productos_legacy;

-- Categoría genérica por si tus productos no tenían categoría
INSERT INTO categoria (nombre, slug)
SELECT nombre, slug FROM categoria_legacy
ON CONFLICT (slug) DO NOTHING;
INSERT INTO categoria (nombre, slug)
SELECT 'Genérica', 'generica' WHERE NOT EXISTS (SELECT 1 FROM categoria WHERE slug = 'generica');

-- Cargar los productos existentes
INSERT INTO producto (categoria_id, nombre, precio, stock, imagen)
SELECT c.id, p.nombre, p.precio, p.stock, p.imagen
FROM productos_legacy p
LEFT JOIN categoria_legacy cl ON cl.nombre_categoria = p.nombre_categoria
LEFT JOIN categoria c ON c.slug = coalesce(cl.slug, 'generica');

-- Recalcular el folio siguiente según el mayor id existente
SELECT setval(pg_get_serial_sequence('producto', 'id'),
              (SELECT COALESCE(MAX(id), 1) FROM producto));

DROP TABLE categoria_legacy;

COMMIT;

-- =====================================================================
-- 2) CARGAR EL CATÁLOGO REAL DESDE UN EXPORT (CSV)
--    Convierte tu Excel/hoja a CSV y usa COPY (o el import de pgAdmin):
--
--    productos.csv:
--    categoria,nombre,precio,stock,imagen
--    Pan dulce,Concha,12,0,concha.jpg
--
--    COPY producto (categoria_id, nombre, precio, stock, imagen)
--    FROM 'C:/ruta/productos.csv' CSV HEADER;   -- requiere categorías cargadas antes
--
--    ⚠ Si quieres EUROS/PESOS al día siguiente usa esta plantilla de INSERT
-- ---------------------------------------------------------------------
-- INSERT INTO producto (categoria_id, nombre, precio, stock, imagen) VALUES
--     (1, 'Concha',          12.00, 0, 'concha.jpg'),
--     (1, 'Cuerno',          13.50, 0, 'cuerno.jpg'),
--     (2, 'Baguette',        25.00, 0, 'baguette.jpg'),
--     (2, 'Pan de agua',      8.00, 0, 'pan_agua.jpg'),
--     (3, 'Pastel de chocolate', 300.00, 0, 'pastel_choco.jpg');

-- =====================================================================
-- 3) ATENDER UN PEDIDO EN MOSTRADOR (pago en tienda + cierre)
--    Todo dentro de UNA transacción para que nunca quede "pagado" sin
--    "entregado" o viceversa.
-- =====================================================================
-- BEGIN;
--   -- Registrar el pago (método: 'efectivo' | 'tarjeta')
--   INSERT INTO pago (pedido_id, metodo, estado, monto)
--   VALUES ($1, 'efectivo', 'pagado', $2);
--
--   -- Cerrar el pedido y registrar quién atendió (el empleado logueado con JWT)
--   UPDATE pedido
--      SET estado = 'entregado', cajero_id = $3
--    WHERE id = $1 AND estado IN ('listo', 'en_preparacion');
-- COMMIT;
--
-- NOTA sobre stock: al CREARSE el pedido se descuenta el stock del
-- producto y se escribe su movimiento de inventario (tipo 'salida',
-- motivo 'venta', pedido_id). Si se cancela, se revierte. Así nunca
-- vendes lo que no tienes.

-- =====================================================================
-- 4) CORTE DE CAJA DEL DÍA (efectivo vs tarjeta)
-- =====================================================================
-- SELECT p.creado_en::date AS dia,
--        pg.metodo,
--        COUNT(DISTINCT p.id) AS pedidos,
--        SUM(pg.monto)       AS total
-- FROM pedido p
-- JOIN pago pg ON pg.pedido_id = p.id
-- WHERE p.estado <> 'cancelado'
--   AND p.creado_en::date = CURRENT_DATE
-- GROUP BY dia, pg.metodo
-- ORDER BY metodo;
--
-- Usa el índice ix_pedido_creado para que este reporte no escanee todo.