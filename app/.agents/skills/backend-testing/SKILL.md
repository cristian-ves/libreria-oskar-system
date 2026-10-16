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

## Caso conocido en esta rama
- Último reporte de Codex: `npm test`: 49/53 pasaron; 4 tests nuevos de inventario fallan porque insertan ISBN de longitud > 20, mientras `libros.isbn` es `VARCHAR(20)`.
- Antes de corregir, confirmar que esos son los fallos actuales y revisar archivos modificados/sin seguimiento. Ajustar generadores de ISBN/fixtures a <=20 caracteres; para comportamiento de escaneo usar ISBN-13 válido si el validador lo exige.
- Reejecutar primero tests relevantes y después la suite entera; no prometer 53/53 sin ejecutarla.
