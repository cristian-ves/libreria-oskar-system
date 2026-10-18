---
name: sequelize-orm
description: Convenciones vigentes de Sequelize 6 en el backend de Librería Oskar (repositorios, transacciones, bloqueos, alias). Úsala al tocar modelos o repositorios.
---

# Sequelize ORM — convenciones vigentes
La migración desde SQL nativo ya terminó. Aquí solo hay reglas para código nuevo o modificado.

## Reglas
- Todo acceso a datos va en `repositories/` con métodos Sequelize (`findOne`, `findAll`, `create`, `update`, `include`). `sequelize.query()` solo para excepciones analíticas, justificadas en un comentario.
- NUNCA `sequelize.sync()`. El esquema lo define `app/database/schema.sql` y las migraciones; los modelos lo reflejan, no lo crean.
- Modelos con atributos en snake_case, igual que las columnas.
- Los repositorios devuelven objetos planos, no instancias de modelo. Conserva alias (p. ej. `rol_nombre`), nulos, tipos y orden.
- Una transacción por operación de negocio atómica; pasa el mismo `{ transaction }` a cada llamada.
- Bloqueo pesimista con `transaction.LOCK.UPDATE` (ver `inventarioRepository.findByIdForUpdate`); no lo quites.
- Duplicados: captura el código 23505 dentro de un savepoint para no abortar la transacción externa.
- `upsert` y `findOrCreate` no equivalen a `ON CONFLICT`: verifica el comportamiento con una prueba.
- No modifiques `stock_actual` con `update`; registra un movimiento y deja actuar al trigger.
- Paginación con `include`: verifica que el conteo y el orden no se dupliquen.

## Al cambiar un repositorio
- Prueba rollback, concurrencia, paginación y forma del JSON en la BD aislada `libreria_oskar_test`.
- No describas como "100% ORM" código que aún use SQL nativo.
