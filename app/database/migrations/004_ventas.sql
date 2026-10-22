-- ============================================================================
-- MIGRACIÓN: 004_ventas.sql
-- DESCRIPCIÓN: Crea ventas y venta_detalles (con su secuencia de correlativo),
--              agrega venta_id a movimientos_inventario y los índices de ventas.
--              Idempotente. No modifica la función ni el trigger de stock.
-- ============================================================================

-- Módulo de ventas: documento de venta y sus líneas.
-- El correlativo (numero) lo asigna la BD con una secuencia; puede haber huecos.
CREATE SEQUENCE IF NOT EXISTS ventas_numero_seq AS INTEGER;

CREATE TABLE IF NOT EXISTS ventas (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    numero INTEGER NOT NULL UNIQUE DEFAULT nextval('ventas_numero_seq'),
    bodega_id UUID NOT NULL REFERENCES bodegas(id) ON DELETE RESTRICT,
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE RESTRICT, -- Vendedor
    cliente_nombre VARCHAR(150) NOT NULL DEFAULT 'Consumidor final',
    cliente_nit VARCHAR(20),
    metodo_pago VARCHAR(20) NOT NULL,
    subtotal NUMERIC(10, 2) NOT NULL CHECK (subtotal >= 0),
    descuento NUMERIC(10, 2) NOT NULL DEFAULT 0 CHECK (descuento >= 0), -- Monto fijo sobre el subtotal
    total NUMERIC(10, 2) NOT NULL CHECK (total >= 0),
    notas TEXT,
    estado VARCHAR(20) NOT NULL DEFAULT 'Completada',
    anulada_en TIMESTAMPTZ,
    anulada_por UUID REFERENCES usuarios(id) ON DELETE RESTRICT,
    motivo_anulacion TEXT,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP, -- Fecha de la venta
    CONSTRAINT ck_ventas_metodo_pago CHECK (metodo_pago IN ('Efectivo', 'Transferencia')),
    CONSTRAINT ck_ventas_total CHECK (total = subtotal - descuento),
    CONSTRAINT ck_ventas_estado CHECK (estado IN ('Completada', 'Anulada')),
    CONSTRAINT ck_ventas_anulacion CHECK (
        (estado = 'Anulada' AND anulada_en IS NOT NULL AND anulada_por IS NOT NULL)
        OR (estado = 'Completada' AND anulada_en IS NULL AND anulada_por IS NULL)
    )
);

ALTER SEQUENCE ventas_numero_seq OWNED BY ventas.numero;

CREATE TABLE IF NOT EXISTS venta_detalles (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    venta_id UUID NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
    libro_id UUID NOT NULL REFERENCES libros(id) ON DELETE RESTRICT,
    cantidad INT NOT NULL CHECK (cantidad > 0),
    precio_unitario NUMERIC(10, 2) NOT NULL CHECK (precio_unitario > 0), -- Snapshot del precio al vender
    subtotal NUMERIC(10, 2) NOT NULL,
    CONSTRAINT ck_venta_detalles_subtotal CHECK (subtotal = cantidad * precio_unitario),
    CONSTRAINT uq_venta_libro UNIQUE (venta_id, libro_id)
);

ALTER TABLE movimientos_inventario
ADD COLUMN IF NOT EXISTS venta_id UUID REFERENCES ventas(id) ON DELETE RESTRICT;

CREATE INDEX IF NOT EXISTS idx_ventas_fecha ON ventas(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_estado_fecha ON ventas(estado, creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_id ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_venta_detalles_libro_id ON venta_detalles(libro_id);
CREATE INDEX IF NOT EXISTS idx_movimientos_venta_id ON movimientos_inventario(venta_id) WHERE venta_id IS NOT NULL;
