# Librería Oskar

Sistema web de **inventario interno** y **catálogo informativo** de libros para una librería. No tiene carrito, reservas ni pagos. Interfaz en español y mobile-first. Proyecto del seminario 2026.

- **Frontend**: React 18, Vite 5, Tailwind 3 (`app/frontend`).
- **Backend**: Node 22, Express 4, Sequelize 6 (`app/backend`).
- **Base de datos**: PostgreSQL (`app/database/schema.sql` es la fuente de verdad).

La especificación técnica verificada contra el código está en [`app/docs/PROJECT_SPECS.md`](app/docs/PROJECT_SPECS.md). Las reglas para agentes están en [`app/AGENTS.md`](app/AGENTS.md).

## Roles

| Rol | Acceso |
|---|---|
| Administrador | Todo, incluido fijar precios y listar usuarios. |
| Empleado | Escaneo, ingresos, salidas, ajustes, stock y kardex. Ve precios pero no los fija: al registrar libros queda `precio = 0` y `precio_pendiente = true`. |
| Usuario | Existe en la BD, sin acceso a nada protegido. |
| Público | Catálogo y ficha de cada libro. |

## Cómo arrancarlo

Requiere Node 22, npm y Docker. Excepto el paso 1, los comandos se ejecutan desde `app/` (`cd app`).

```bash
# 1. Variables de entorno del backend (copia el ejemplo; usa DB_PORT=5434, el puerto que publica `db`)
cp app/backend/.env.example app/backend/.env

# 2. Dependencias
npm --prefix backend install
npm --prefix frontend install

# 3. Base de datos y backend con Docker Compose
docker compose up -d            # servicios db (host 5434) y backend (host 3000)

# 4. Datos maestros de prueba (sucursal, bodega y usuarios Administrador y Empleado)
npm run seed

# 5. Frontend en el host (http://localhost:5173, proxy de /api a localhost:3000)
npm run frontend:dev
```

Notas:
- El backend también puede correr en el host con `npm run dev` (con `DB_PORT=5434` en `backend/.env`); `npm run seed` siempre corre en el host y necesita ese mismo `.env`.
- Las contraseñas del seed se leen de `SEED_ADMIN_PASSWORD` y `SEED_EMPLEADO_PASSWORD` (ver `backend/src/database/seed.js`).
- Compilar el frontend: `npm run frontend:build`.

## Pruebas

Las pruebas del backend usan una base aislada (`libreria_oskar_test`, puerto 5435):

```bash
docker compose --profile test up -d db-test
npm test
```

El frontend no tiene pruebas automatizadas; se verifica con `npm run frontend:build` y prueba manual.
