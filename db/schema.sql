-- =====================================================================
--  PISTOLET · Esquema de base de datos definitivo v2
--  PostgreSQL 14+
--
--  Decisiones confirmadas:
--    · Motor: PostgreSQL
--    · Sucursales: una sola          → stock en producto/insumo
--    · Pedidos: pickup en sucursal   → sin direcciones ni reparto
--    · Pagos: efectivo o tarjeta     → sin pasarela online
--    · Elaboración: recetas + insumos → producción por lotes
--    · Auth: JWT (con refresh tokens  → tabla 'sesion')
--
--  Alineado con la API actual: POST /api/login, GET /api/productos
-- =====================================================================
BEGIN;

-- ---------------------------------------------------------------------
-- TIPOS ENUMERADOS (colección de valores fijos del negocio)
-- ---------------------------------------------------------------------
CREATE TYPE rol_usuario AS ENUM ('cliente', 'empleado', 'admin');
CREATE TYPE estado_pedido AS ENUM
    ('pendiente', 'confirmado', 'en_preparacion', 'listo', 'entregado', 'cancelado');
CREATE TYPE metodo_pago AS ENUM ('efectivo', 'tarjeta');
CREATE TYPE estado_pago AS ENUM ('pendiente', 'pagado', 'reembolsado', 'fallido');
CREATE TYPE tipo_movimiento AS ENUM ('entrada', 'salida', 'ajuste');

-- ---------------------------------------------------------------------
-- 1) USUARIOS  (clientes y personal)
-- ---------------------------------------------------------------------
CREATE TABLE usuario (
    id              bigint       GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre          varchar(120) NOT NULL,
    email           varchar(160) NOT NULL,
    telefono        varchar(20),
    password_hash   varchar(255) NOT NULL,          -- bcrypt/argon2, NUNCA texto plano
    rol             rol_usuario  NOT NULL DEFAULT 'cliente',
    avatar_url      text,                           -- foto de perfil (Cloudinary)
    avatar_public_id text,                          -- id en Cloudinary (para borrarla)
    activo          boolean      NOT NULL DEFAULT true,
    creado_en       timestamptz  NOT NULL DEFAULT now(),
    actualizado_en  timestamptz  NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX ux_usuario_email ON usuario (lower(email));

-- ---------------------------------------------------------------------
-- 2) CATEGORÍAS
-- ---------------------------------------------------------------------
CREATE TABLE categoria (
    id     bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre varchar(80) NOT NULL UNIQUE,
    slug   varchar(80) NOT NULL UNIQUE,
    activo boolean NOT NULL DEFAULT true
);

-- ---------------------------------------------------------------------
-- 3) PRODUCTOS TERMINADOS (lo que se vende al mostrador / pickup)
-- ---------------------------------------------------------------------
CREATE TABLE producto (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    categoria_id   bigint REFERENCES categoria(id) ON DELETE SET NULL,
    nombre         varchar(150) NOT NULL,
    descripcion    text,
    sku            varchar(40) UNIQUE,
    precio         numeric(10,2) NOT NULL CHECK (precio >= 0),   -- precio de venta
    costo          numeric(10,2) CHECK (costo >= 0),             -- costo según receta (se actualiza en cada producción)
    stock          integer NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_minimo   integer NOT NULL DEFAULT 0,
    unidad         varchar(20) NOT NULL DEFAULT 'pieza',
    imagen         varchar(255),                                 -- p.ej. 'concha_chocolate.jpg' (en /img/productos/pan/)
    activo         boolean NOT NULL DEFAULT true,
    creado_en      timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- Varias imágenes por producto (opcional)
CREATE TABLE producto_imagen (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id bigint NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    url         varchar(255) NOT NULL,
    orden       smallint NOT NULL DEFAULT 0
);

-- ---------------------------------------------------------------------
-- 4) INSUMOS (materias primas: harina, levadura, azúcar...)
-- ---------------------------------------------------------------------
CREATE TABLE insumo (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    nombre         varchar(150) NOT NULL UNIQUE,
    unidad         varchar(20) NOT NULL,             -- kg, g, L, ml, pieza, docena
    stock          numeric(12,3) NOT NULL DEFAULT 0 CHECK (stock >= 0),
    stock_minimo   numeric(12,3) NOT NULL DEFAULT 0,
    costo_unitario numeric(10,2) NOT NULL DEFAULT 0 CHECK (costo_unitario >= 0),
    proveedor      varchar(150),
    activo         boolean NOT NULL DEFAULT true,
    creado_en      timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 5) RECETAS (cuánto de cada insumo lleva UNA unidad del producto)
-- ---------------------------------------------------------------------
CREATE TABLE receta (
    id                  bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id         bigint NOT NULL REFERENCES producto(id) ON DELETE CASCADE,
    insumo_id           bigint NOT NULL REFERENCES insumo(id) ON DELETE RESTRICT,
    cantidad_por_unidad numeric(12,3) NOT NULL CHECK (cantidad_por_unidad > 0),
    UNIQUE (producto_id, insumo_id)
);

-- ---------------------------------------------------------------------
-- 6) PRODUCCIÓN (lotes horneados) y su consumo de insumos
-- ---------------------------------------------------------------------
CREATE TABLE produccion (
    id          bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    folio       varchar(20) NOT NULL UNIQUE,          -- ej. PRD-2026-00001
    producto_id bigint NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    cantidad    integer NOT NULL CHECK (cantidad > 0),
    costo_total numeric(10,2) NOT NULL DEFAULT 0,     -- Σ subtotal de producción_consumo
    usuario_id  bigint REFERENCES usuario(id) ON DELETE SET NULL,
    creado_en   timestamptz NOT NULL DEFAULT now()
);

-- Cantidades y costos CONGELADOS al momento de producir (histórico)
CREATE TABLE produccion_consumo (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    produccion_id  bigint NOT NULL REFERENCES produccion(id) ON DELETE CASCADE,
    insumo_id      bigint NOT NULL REFERENCES insumo(id) ON DELETE RESTRICT,
    cantidad       numeric(12,3) NOT NULL CHECK (cantidad > 0),
    costo_unitario numeric(10,2) NOT NULL,            -- costo del insumo en esa fecha
    subtotal       numeric(10,2) NOT NULL
);

-- ---------------------------------------------------------------------
-- 7) PEDIDOS (pickup) y líneas de pedido
-- ---------------------------------------------------------------------
CREATE TABLE pedido (
    id             bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    folio          varchar(20) NOT NULL UNIQUE,          -- ej. PIS-2026-00001
    usuario_id     bigint NOT NULL REFERENCES usuario(id) ON DELETE RESTRICT,
    cajero_id      bigint REFERENCES usuario(id) ON DELETE SET NULL,  -- empleado que atendió en mostrador
    estado         estado_pedido NOT NULL DEFAULT 'pendiente',
    subtotal       numeric(10,2) NOT NULL DEFAULT 0,
    descuento      numeric(10,2) NOT NULL DEFAULT 0,
    total          numeric(10,2) NOT NULL DEFAULT 0,
    notas          text,                                 -- hora de recogida, mensaje, etc.
    creado_en      timestamptz NOT NULL DEFAULT now(),
    actualizado_en timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE pedido_detalle (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id       bigint NOT NULL REFERENCES pedido(id)   ON DELETE CASCADE,
    producto_id     bigint NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    cantidad        integer NOT NULL CHECK (cantidad > 0),
    precio_unitario numeric(10,2) NOT NULL CHECK (precio_unitario >= 0),  -- precio histórico
    subtotal        numeric(10,2) NOT NULL CHECK (subtotal >= 0),
    UNIQUE (pedido_id, producto_id)
);

-- ---------------------------------------------------------------------
-- 8) PAGOS
-- ---------------------------------------------------------------------
CREATE TABLE pago (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    pedido_id  bigint NOT NULL REFERENCES pedido(id) ON DELETE CASCADE,
    metodo     metodo_pago NOT NULL,
    estado     estado_pago NOT NULL DEFAULT 'pendiente',
    monto      numeric(10,2) NOT NULL CHECK (monto > 0),
    referencia varchar(100),                          -- id de transacción de la pasarela
    pagado_en  timestamptz,
    creado_en  timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 9) AUDITORÍA DE MOVIMIENTOS
--    · movimiento_inventario → productos terminados
--    · movimiento_insumo     → materias primas
--    El campo stock de producto/insumo es una CACHÉ; la fuente de
--    verdad son estas tablas.
-- ---------------------------------------------------------------------
CREATE TABLE movimiento_inventario (
    id              bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    producto_id     bigint NOT NULL REFERENCES producto(id) ON DELETE RESTRICT,
    tipo            tipo_movimiento NOT NULL,
    cantidad        integer NOT NULL CHECK (cantidad <> 0),   -- signo: +entrada / -salida
    motivo          varchar(120),
    pedido_id       bigint REFERENCES pedido(id)     ON DELETE SET NULL,  -- tipo salida 'venta'
    produccion_id   bigint REFERENCES produccion(id) ON DELETE SET NULL,  -- tipo entrada 'producción'
    usuario_id      bigint REFERENCES usuario(id)    ON DELETE SET NULL,
    creado_en       timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE movimiento_insumo (
    id            bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    insumo_id     bigint NOT NULL REFERENCES insumo(id) ON DELETE RESTRICT,
    tipo          tipo_movimiento NOT NULL,
    cantidad      numeric(12,3) NOT NULL CHECK (cantidad <> 0),
    motivo        varchar(120),
    produccion_id bigint REFERENCES produccion(id) ON DELETE SET NULL,   -- tipo salida 'producción'
    usuario_id    bigint REFERENCES usuario(id)    ON DELETE SET NULL,
    creado_en     timestamptz NOT NULL DEFAULT now()
);

-- ---------------------------------------------------------------------
-- 8b) SESIONES (refresh tokens JWT)
--     Solo se guarda el HASH del token, nunca el token en texto plano.
-- ---------------------------------------------------------------------
CREATE TABLE sesion (
    id         bigint GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    usuario_id bigint NOT NULL REFERENCES usuario(id) ON DELETE CASCADE,
    token_hash varchar(64) NOT NULL UNIQUE,           -- SHA-256 (hex) del refresh token
    creado_en  timestamptz NOT NULL DEFAULT now(),
    expira_en  timestamptz NOT NULL,
    revocada   boolean NOT NULL DEFAULT false
);
CREATE INDEX ix_sesion_usuario ON sesion (usuario_id);

-- ---------------------------------------------------------------------
-- 10) ÍNDICES
-- ---------------------------------------------------------------------
-- FKs / filtros frecuentes
CREATE INDEX ix_producto_categoria  ON producto (categoria_id) WHERE activo;
CREATE INDEX ix_producto_stock_bajo ON producto (stock) WHERE stock <= stock_minimo;
CREATE INDEX ix_receta_producto     ON receta (producto_id);
CREATE INDEX ix_receta_insumo       ON receta (insumo_id);
CREATE INDEX ix_produccion_producto ON produccion (producto_id, creado_en DESC);
CREATE INDEX ix_consumo_produccion  ON produccion_consumo (produccion_id);
CREATE INDEX ix_consumo_insumo      ON produccion_consumo (insumo_id);
CREATE INDEX ix_pedido_usuario      ON pedido (usuario_id, creado_en DESC);
CREATE INDEX ix_pedido_abiertos     ON pedido (estado) WHERE estado NOT IN ('entregado','cancelado');
CREATE INDEX ix_detalle_pedido      ON pedido_detalle (pedido_id);
CREATE INDEX ix_detalle_producto    ON pedido_detalle (producto_id);
CREATE INDEX ix_pago_pedido         ON pago (pedido_id);
CREATE INDEX ix_pedido_creado       ON pedido (creado_en DESC);        -- reportes diarios / corte de caja
CREATE INDEX ix_mov_inv_producto    ON movimiento_inventario (producto_id, creado_en DESC);
CREATE INDEX ix_mov_insumo          ON movimiento_insumo (insumo_id, creado_en DESC);

-- Búsqueda tipo "concha" / "pan" (requiere pg_trgm)
CREATE EXTENSION IF NOT EXISTS pg_trgm;
CREATE INDEX ix_producto_nombre_trgm ON producto USING gin (nombre gin_trgm_ops);
CREATE INDEX ix_insumo_nombre_trgm   ON insumo   USING gin (nombre gin_trgm_ops);

-- ---------------------------------------------------------------------
-- 11) TRIGGERS para mantener actualizado_en
-- ---------------------------------------------------------------------
CREATE OR REPLACE FUNCTION set_actualizado_en() RETURNS trigger AS $$
BEGIN
    NEW.actualizado_en := now();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_usuario_upd  BEFORE UPDATE ON usuario
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER trg_producto_upd BEFORE UPDATE ON producto
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER trg_insumo_upd   BEFORE UPDATE ON insumo
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();
CREATE TRIGGER trg_pedido_upd   BEFORE UPDATE ON pedido
    FOR EACH ROW EXECUTE FUNCTION set_actualizado_en();

COMMIT;

-- =====================================================================
-- DATOS INICIALES (seed)
-- =====================================================================
BEGIN;

INSERT INTO usuario (nombre, email, password_hash, rol)
VALUES ('Admin Pistolet', 'admin@pistolet.mx', 'REEMPLAZA_CON_HASH_BCRYPT', 'admin'),
       ('Cliente Demo',   'demo@pistolet.mx',  'REEMPLAZA_CON_HASH_BCRYPT', 'cliente');

INSERT INTO categoria (nombre, slug) VALUES
    ('Pan dulce', 'pan-dulce'),
    ('Pan salado', 'pan-salado'),
    ('Pasteles', 'pasteles'),
    ('Bebidas', 'bebidas');

INSERT INTO insumo (nombre, unidad, stock, stock_minimo, costo_unitario, proveedor)
VALUES
    ('Harina de trigo',   'kg',  50,   10, 18.00, 'Distribuidora del Norte'),
    ('Levadura',          'kg',   5,    2, 45.00, 'Distribuidora del Norte'),
    ('Azúcar',            'kg',  20,    5, 22.00, 'Distribuidora del Norte'),
    ('Mantequilla',       'kg',  10,    3, 90.00, 'Lácteos La Vaquita'),
    ('Sal',               'kg',   5,    1,  8.00, 'Distribuidora del Norte');

-- Concha   (1 unidad) · precio venta 12.00
INSERT INTO producto (categoria_id, nombre, precio, costo, stock, unidad, imagen)
VALUES (1, 'Concha', 12.00, NULL, 0, 'pieza', 'concha.jpg');

-- Cuerno   (1 unidad) · precio venta 13.50
INSERT INTO producto (categoria_id, nombre, precio, costo, stock, unidad, imagen)
VALUES (1, 'Cuerno', 13.50, NULL, 0, 'pieza', 'cuerno.jpg');

-- Baguette (1 unidad) · precio venta 25.00
INSERT INTO producto (categoria_id, nombre, precio, costo, stock, unidad, imagen)
VALUES (2, 'Baguette', 25.00, NULL, 0, 'pieza', 'baguette.jpg');

INSERT INTO receta (producto_id, insumo_id, cantidad_por_unidad) VALUES
    (1, 1, 0.060),             -- Concha:   60 g harina
    (1, 2, 0.004),             --           4 g levadura
    (1, 3, 0.020),             --           20 g azúcar
    (1, 4, 0.010),             --           10 g mantequilla
    (2, 1, 0.075),             -- Cuerno:   75 g harina
    (2, 2, 0.005),             --           5 g levadura
    (2, 3, 0.025),             --           25 g azúcar
    (2, 4, 0.020),             --           20 g mantequilla
    (3, 1, 0.200),             -- Baguette: 200 g harina
    (3, 2, 0.004),             --           4 g levadura
    (3, 5, 0.004);             --           4 g sal

COMMIT;

-- =====================================================================
-- OPERACIÓN DE PRODUCCIÓN (ejemplo: hornear 100 conchas dentro de una
-- transacción para que stock y costos nunca queden a medias)
-- =====================================================================
-- BEGIN;
--   SET $1 = 1;        -- producto_id (concha)
--   SET $2 = 100;      -- cantidad a producir
--   SET $3 = $user_id; -- quien registra
--
--   -- a) Insertar cabecera de producción y sus consumos desde la receta
--   WITH cab AS (
--       INSERT INTO produccion (folio, producto_id, cantidad, usuario_id)
--       VALUES ('PRD-2026-00001', $1, $2, $3) RETURNING id
--   )
--   INSERT INTO produccion_consumo (produccion_id, insumo_id, cantidad, costo_unitario, subtotal)
--   SELECT cab.id, r.insumo_id,
--          r.cantidad_por_unidad * $2,
--          i.costo_unitario,
--          r.cantidad_por_unidad * $2 * i.costo_unitario
--   FROM cab CROSS JOIN receta r JOIN insumo i ON i.id = r.insumo_id
--   WHERE r.producto_id = $1;
--
--   -- b) Descontar insumos (con guardado de movimiento de auditoría)
--   UPDATE insumo i SET stock = i.stock - c.cantidad
--   FROM produccion_consumo c
--   WHERE c.insumo_id = i.id AND c.produccion_id = (SELECT id FROM produccion WHERE folio = 'PRD-2026-00001');
--
--   -- c) Sumar al stock del producto y recalcular su costo unitario
--   UPDATE producto p SET
--       stock = p.stock + $2,
--       costo = (SELECT SUM(subtotal) FROM produccion_consumo WHERE produccion_id = <id>) / $2
--   WHERE p.id = $1;
-- COMMIT;
-- (En producción esto irá en un procedimiento almacenado / transacción de la API)