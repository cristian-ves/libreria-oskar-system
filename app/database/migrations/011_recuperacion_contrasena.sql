-- ============================================================================
-- MIGRACIÓN: 011_recuperacion_contrasena.sql
-- DESCRIPCIÓN: Recuperación de contraseña por correo. Reutiliza la columna
--              existente token_recuperacion para el SHA-256 hexadecimal del
--              token (64 caracteres, cabe en VARCHAR(255)), agrega su
--              vencimiento y la fecha del último cambio de contraseña
--              (invalida las sesiones emitidas antes). Idempotente.
-- ============================================================================

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS token_recuperacion_expira TIMESTAMPTZ;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS password_cambiada_en TIMESTAMPTZ;

-- Búsqueda por hash del token y unicidad entre enlaces vigentes.
CREATE UNIQUE INDEX IF NOT EXISTS idx_usuarios_token_recuperacion ON usuarios (token_recuperacion)
WHERE token_recuperacion IS NOT NULL;
