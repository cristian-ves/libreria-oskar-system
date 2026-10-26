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
# 1. Variables de entorno del backend (el ejemplo ya apunta al puerto 5434 que publica `db`)
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
- El backend también puede correr en el host con `npm run dev`; `npm run seed` siempre corre en el host y ambos usan `backend/.env`.
- Las contraseñas del seed se leen de `SEED_ADMIN_PASSWORD` y `SEED_EMPLEADO_PASSWORD` (ver `backend/src/database/seed.js`). Con `NODE_ENV=production` el seed solo crea el Administrador central desde `SEED_ADMIN_EMAIL` y `SEED_ADMIN_PASSWORD` si no existe, y falla si los datos son inválidos.
- Compilar el frontend: `npm run frontend:build`.

## Pruebas

Las pruebas del backend usan una base aislada (`libreria_oskar_test`, puerto 5435):

```bash
docker compose --profile test up -d db-test
npm test
```

El frontend no tiene pruebas automatizadas; se verifica con `npm run frontend:build` y prueba manual.

## Trabajo en equipo

- Las ramas nuevas salen de `develop` y se integran en `develop`. Todo push a `main` despliega a producción (Cloud Run y Firebase Hosting) con `.github/workflows/deploy.yml` (raíz del repo), incluso si solo cambia documentación; por eso no se fusiona ni se empuja a `main` sin acuerdo. Cómo funciona y cómo volver atrás: `app/docs/RUNBOOK.md` §4, §5 y §12; infraestructura en `infra/` (Terraform, ver `infra/README.md`).
- Reparto vigente por tema: (1) CRUD administrativo de usuarios y categorías; (2) edición de libros ya registrados (fijar precio), ventas, paginación y escáner de cámara.
- Migraciones: la 004 es la de ventas (ya aplicada al repositorio); los cambios de esquema nuevos usan la 005 en adelante, reflejados también en `app/database/schema.sql` y en los modelos.
- Archivos compartidos con riesgo de conflicto (trae `develop` antes de editarlos y mantén el cambio mínimo): `backend/src/routes/index.js`, `backend/src/models/index.js`, `frontend/src/App.jsx`, `frontend/src/components/Navbar.jsx`, `database/schema.sql` y `docs/PROJECT_SPECS.md` (rutas dentro de `app/`).
- Todo endpoint, servicio o repositorio nuevo trae pruebas en `app/backend/tests/` y no debe romper las existentes.
- Agentes: lánzalos desde `app/`, `app/backend` o `app/frontend` para que carguen `app/AGENTS.md` y las skills de `app/.agents/skills/` (recomendación según la documentación de Codex, no una garantía).
- Claude Code: desde `app/`, ejecuta una vez este comando local (esos archivos no se versionan):

```bash
printf '@AGENTS.md\n' > CLAUDE.md && mkdir -p .claude && ln -s ../.agents/skills .claude/skills
```
