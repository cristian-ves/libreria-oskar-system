---
name: backend-testing
description: Diagnosticar tests Node.js/PostgreSQL y asegurar cobertura de regresiones, rollback y concurrencia.
---

# Pruebas backend y regresiones

## Procedimiento
1. Revisar `git status`, configuración de tests y base/servicios contra los que se ejecutarán. No ejecutar semillas destructivas contra BD compartida sin autorización.
2. Reproducir fallos con `npm test` desde `backend/`, registrar errores exactos y distinguir fixture, schema, código, ambiente.
3. Corregir la causa mínima; no alterar producción ni constraints para acomodar fixtures defectuosos.
4. Si pruebas crean usuarios/libros/inventarios, usar datos únicos y limpieza transaccional o por teardown sin borrar registros ajenos.
5. Probar comportamiento del ORM, respuesta HTTP y transacciones reales; mocks no sustituyen pruebas de integración.
6. Reportar resumen de pruebas que pasan, fallan y se omiten y evidencia del cambio.

## Contexto actual
- `npm test` (desde `app/`) requiere `db-test` arriba (`docker compose --profile test up -d db-test`). Línea base verificada el 2026-10-22: 173 pasan, 0 fallan (detalle por archivo en `docs/PROJECT_SPECS.md` §4.9).
- `libros.isbn` es `VARCHAR(20)`: los fixtures usan ISBN-13 válido de 20 caracteres o menos.
- Siete pruebas aún importan `config/db.js` (cliente `pg`); no lo uses en pruebas nuevas.
- Reejecutar primero las pruebas relevantes y después la suite entera; no prometer un total sin ejecutarla.
