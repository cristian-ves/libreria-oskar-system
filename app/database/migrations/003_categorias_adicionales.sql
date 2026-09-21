-- ============================================================================
-- MIGRACIÓN: 003_categorias_adicionales.sql
-- DESCRIPCIÓN: Amplía el catálogo de categorías con más ramas del Derecho y
--              géneros de literatura universal. Idempotente.
-- ============================================================================

INSERT INTO categorias (nombre) VALUES
('Derecho Laboral'),
('Derecho Administrativo'),
('Derecho Procesal'),
('Derecho Tributario'),
('Derecho Notarial y Registral'),
('Derecho Internacional'),
('Ficción y Novela'),
('Cuento y Relatos'),
('Poesía y Teatro'),
('Ensayo y Filosofía'),
('Historia'),
('Infantil y Juvenil'),
('Ciencia y Tecnología'),
('Autoayuda y Desarrollo Personal')
ON CONFLICT (nombre) DO NOTHING;
