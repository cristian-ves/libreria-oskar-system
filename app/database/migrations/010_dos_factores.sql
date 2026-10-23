-- ============================================================================
-- MIGRACIÓN: 010_dos_factores.sql
-- DESCRIPCIÓN: Autenticación en dos pasos (TOTP). Agrega a usuarios el contador
--              de intentos fallidos, el bloqueo temporal y el último paso TOTP
--              aceptado (anti-reutilización), y crea codigos_respaldo_2fa.
--              Idempotente. El secreto cifrado (formato v1, máx. 86 caracteres)
--              cabe en la columna existente dos_factores_secreto VARCHAR(128).
-- ============================================================================

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS dos_factores_intentos INTEGER NOT NULL DEFAULT 0;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS dos_factores_bloqueado_hasta TIMESTAMPTZ;

ALTER TABLE usuarios
ADD COLUMN IF NOT EXISTS dos_factores_ultimo_paso BIGINT;

-- Códigos de respaldo de un solo uso; solo se guarda su HMAC-SHA256.
CREATE TABLE IF NOT EXISTS codigos_respaldo_2fa (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    usuario_id UUID NOT NULL REFERENCES usuarios(id) ON DELETE CASCADE,
    codigo_hash VARCHAR(128) NOT NULL,
    usado_en TIMESTAMPTZ,
    creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT uq_codigos_respaldo_2fa_usuario_hash UNIQUE (usuario_id, codigo_hash)
);

CREATE INDEX IF NOT EXISTS idx_codigos_respaldo_2fa_usuario_id ON codigos_respaldo_2fa(usuario_id);
