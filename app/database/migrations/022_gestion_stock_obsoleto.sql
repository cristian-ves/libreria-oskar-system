-- Índices para consultar rotación comercial por libro/bodega sin recorrer todo el historial.
-- No cambia datos ni depende de la migración 021 de gestión de sucursales.
CREATE INDEX IF NOT EXISTS idx_ventas_bodega_estado_fecha
    ON ventas (bodega_id, estado, creado_en DESC);

CREATE INDEX IF NOT EXISTS idx_venta_detalles_libro_venta
    ON venta_detalles (libro_id, venta_id);

-- Solo se buscan primeras recepciones no originadas por ventas/anulaciones.
CREATE INDEX IF NOT EXISTS idx_movimientos_ingreso_inventario_fecha
    ON movimientos_inventario (inventario_id, fecha_movimiento)
    WHERE venta_id IS NULL;
