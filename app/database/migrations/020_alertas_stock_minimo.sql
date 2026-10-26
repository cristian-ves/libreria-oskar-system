CREATE TABLE IF NOT EXISTS alertas_inventario_reportes (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  fecha_local DATE NOT NULL UNIQUE,
  estado VARCHAR(24) NOT NULL DEFAULT 'procesando'
    CHECK (estado IN ('procesando', 'completado', 'sin_alertas', 'sin_administradores', 'fallido', 'incierto')),
  snapshot JSONB NOT NULL DEFAULT '[]'::jsonb,
  cantidad_alertas INTEGER NOT NULL DEFAULT 0 CHECK (cantidad_alertas >= 0),
  iniciado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  finalizado_en TIMESTAMPTZ,
  error TEXT,
  lease_token UUID,
  lease_hasta TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS alertas_inventario_entregas (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  reporte_id UUID NOT NULL REFERENCES alertas_inventario_reportes(id) ON DELETE CASCADE,
  administrador_id UUID NOT NULL,
  correo_electronico VARCHAR(254) NOT NULL,
  nombre_administrador VARCHAR(150) NOT NULL,
  estado VARCHAR(24) NOT NULL DEFAULT 'pendiente'
    CHECK (estado IN ('pendiente', 'procesando', 'enviado', 'fallido', 'incierto')),
  intentos INTEGER NOT NULL DEFAULT 0 CHECK (intentos >= 0),
  reintento_seguro BOOLEAN NOT NULL DEFAULT FALSE,
  enviado_en TIMESTAMPTZ,
  error TEXT,
  lease_token UUID,
  lease_hasta TIMESTAMPTZ,
  creado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  actualizado_en TIMESTAMPTZ NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT uq_alertas_entrega_reporte_admin UNIQUE (reporte_id, administrador_id)
);

CREATE INDEX IF NOT EXISTS idx_alertas_entregas_pendientes
  ON alertas_inventario_entregas (reporte_id, estado, lease_hasta);
CREATE INDEX IF NOT EXISTS idx_alertas_reportes_estado_fecha
  ON alertas_inventario_reportes (estado, fecha_local DESC);
