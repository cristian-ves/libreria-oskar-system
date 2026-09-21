-- ============================================================================
-- MIGRACIÓN: 002_categorias.sql
-- DESCRIPCIÓN: Crea tabla categorias, agrega categoria_id a libros de forma
--              idempotente, genera índice y añade semillas iniciales.
-- ============================================================================

CREATE TABLE IF NOT EXISTS categorias (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    nombre VARCHAR(100) UNIQUE NOT NULL,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

ALTER TABLE libros 
ADD COLUMN IF NOT EXISTS categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL;

CREATE INDEX IF NOT EXISTS idx_libros_categoria ON libros(categoria_id);

INSERT INTO categorias (nombre) VALUES
('Derecho Penal'),
('Derecho Civil'),
('Derecho Constitucional'),
('Derecho Mercantil'),
('Literatura'),
('Otros')
ON CONFLICT (nombre) DO NOTHING;
