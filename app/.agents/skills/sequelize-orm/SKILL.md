---
name: sequelize-orm
description: Migrar repositorios, modelos y transacciones de pg a Sequelize 6 sin alterar el contrato de la aplicación.
---

# Sequelize ORM — Fase 3

## Cuándo aplicar
Cuando se pida migrar consultas, implementar modelos/asociaciones, o adaptar repositorios a Sequelize.

## Procedimiento
1. Inspeccionar modelos, repositorio, llamadas desde servicios y `database/schema.sql` relevantes; documentar firma, resultado (incluyendo alias), tratamiento de NULL y transacción.
2. Revisar `git status --short` y diffs, incluidos archivos sin seguimiento. Si hay cambios previos, preservarlos y continuar solo con instrucciones explícitas.
3. Reemplazar consultas normales con `findOne`, `findByPk`, `findAll`, `create`, `update`, `include` y agregaciones. Pasar `transaction` a cada método dentro de una unidad atómica.
4. Devolver objetos planos si el contrato anterior devolvía filas `pg`; respetar alias como `rol_nombre`, valores monetarios y tipos de conteos.
5. Para `upsert`/`findOrCreate`, respetar los efectos de `ON CONFLICT`, las restricciones únicas y la concurrencia; no presuponer equivalencia exacta.
6. Para operaciones dependientes de un cliente `pg`, no ejecutar ORM en una conexión distinta dentro de la misma transacción; coordinar migración de servicios o mantener fallback temporal explícito.
7. No modificar esquema ni ejecutar `sync` ni romper la lógica del trigger.
8. Probar lecturas, escritura, paginación, errores, rollback, concurrencia y compatibilidad JSON; reportar SQL directo remanente.

## Reglas para reportes
No llamar “100% ORM” a un repositorio con fallback `client.query` o con `sequelize.query`. Si un reporte analítico requiere SQL nativo, justificarlo y documentar la excepción; no cargar tablas completas en memoria sin medir.
