# Gestión de sucursales y bodegas

La administración se realiza en `/sucursales` y requiere el rol `Administrador` tanto en React como en las rutas API. Las ubicaciones se conservan: no hay endpoints de borrado físico y los cambios de estado se guardan en `activo`.

## API administrativa

Todas las rutas siguientes requieren `authenticate` y `authorize('Administrador')`.

| Operación | Ruta |
|---|---|
| Listar sucursales | `GET /api/sucursales?activo=true|false&q=` |
| Crear sucursal | `POST /api/sucursales` (`nombre`, `direccion`, `telefono?`) |
| Ver detalle | `GET /api/sucursales/:id` |
| Editar | `PUT /api/sucursales/:id` |
| Activar/desactivar | `PATCH /api/sucursales/:id/activo` (`activo`) |
| Bodegas de una sucursal | `GET /api/sucursales/:id/bodegas?activo=true|false&q=` |
| Crear bodega | `POST /api/sucursales/:sucursalId/bodegas` (`nombre`, `descripcion?`) |
| Listar bodegas administrativas | `GET /api/bodegas/sucursal/:sucursalId?activo=true|false&q=` |
| Ver/editar bodega | `GET /api/bodegas/:id`, `PUT /api/bodegas/:id` |
| Activar/desactivar bodega | `PATCH /api/bodegas/:id/activo` (`activo`) |

El `GET /api/bodegas` público conserva los campos `{ id, nombre, descripcion, sucursal_nombre }`; solo muestra bodegas y sucursales activas. Las operaciones devuelven errores HTTP estándar: 400 para entradas inválidas, 401/403 para acceso, 404 si el recurso falta y 409 cuando una regla de estado, unicidad o historial lo impide.

## Reglas de integridad

- Una sucursal se desactiva únicamente cuando no tiene bodegas activas ni existencias positivas.
- Una bodega se desactiva únicamente cuando no conserva existencias positivas. Sus inventarios en cero y movimientos permanecen disponibles para historial.
- Una bodega solo se puede reactivar bajo una sucursal activa.
- El traslado se permite solo si no existen registros de inventario ni ventas ligados a la bodega, para preservar la atribución histórica.
- Los nombres se normalizan con `trim` y se comparan sin distinguir mayúsculas por la API. La restricción existente `uq_sucursal_bodega` por sucursal y nombre se conserva; no se agregó otra restricción que pudiera fallar por datos heredados.
- Los escritores de stock y ventas validan estado activo dentro de su transacción. El orden de bloqueo es sucursal → bodega → inventario; las bajas administrativas usan el mismo prefijo para serializarse con operaciones concurrentes.
- Kardex y ventas pasadas siguen consultables aunque la ubicación esté inactiva.

## Migración 021

`database/migrations/021_gestion_sucursales.sql` cambia las claves foráneas `bodegas.sucursal_id` e `inventarios.bodega_id` de `ON DELETE CASCADE` a `ON DELETE RESTRICT`. No crea ni borra filas. Se refleja en `database/schema.sql` y en asociaciones Sequelize. La migración depende de los nombres FK PostgreSQL existentes `bodegas_sucursal_id_fkey` e `inventarios_bodega_id_fkey`.

En un entorno local nuevo se inicializa `database/schema.sql`; una base ya creada aplica migraciones con el procedimiento aprobado del runbook. La migración 021 se validó en `libreria_oskar_test`; no se ejecutó en Cloud SQL.

## Pruebas y revisión manual

La suite de backend incluye `tests/sucursalesBodegasCrud.test.js`, que verifica RBAC, CRUD, contrato público, condiciones de baja/reactivación, rechazo de borrado físico por FK, historial, inventario y ventas. Ejecutar `npm test` desde `app/`; el runner verifica que Sequelize esté conectado exclusivamente a `libreria_oskar_test`.

Para revisión manual, iniciar sesión como Administrador, abrir **Administración → Sucursales y bodegas**, crear una sucursal y bodega, editar, filtrar por estado y probar las bajas. Repetir con Empleado (403 y sin enlace) y sin sesión (redirigido por la ruta protegida; API 401). El endpoint público de bodegas debe seguir respondiendo solo con ubicaciones activas.
