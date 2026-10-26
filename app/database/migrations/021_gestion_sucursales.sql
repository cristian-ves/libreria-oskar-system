-- Impide que una baja física de sucursal/bodega borre inventario en cascada.
-- La aplicación usa baja lógica; estos RESTRICT protegen además la integridad
-- ante eliminaciones directas o futuras rutas mal configuradas.
ALTER TABLE bodegas
  DROP CONSTRAINT IF EXISTS bodegas_sucursal_id_fkey,
  ADD CONSTRAINT bodegas_sucursal_id_fkey
    FOREIGN KEY (sucursal_id) REFERENCES sucursales(id) ON DELETE RESTRICT;

ALTER TABLE inventarios
  DROP CONSTRAINT IF EXISTS inventarios_bodega_id_fkey,
  ADD CONSTRAINT inventarios_bodega_id_fkey
    FOREIGN KEY (bodega_id) REFERENCES bodegas(id) ON DELETE RESTRICT;
