# Backend — Librería Oskar

API REST en Node 22 + Express 4 + Sequelize 6 sobre PostgreSQL. Los endpoints, las firmas por capa, las transacciones y las pruebas están documentados (y verificados contra el código) en [`../docs/PROJECT_SPECS.md`](../docs/PROJECT_SPECS.md), sección §4. Reglas de trabajo en [`../AGENTS.md`](../AGENTS.md).

## Arquitectura

`routes → controllers → services → repositories → models`, con `config/`, `middlewares/`, `utils/` y `database/` como apoyo.

```text
src/
├── app.js, server.js        # Express y arranque (verifica la BD con Sequelize; cierra con sequelize.close())
├── run-tests.js             # Runner de pruebas con guardia de BD aislada
├── config/                  # env.js, sequelize.js (db.js: cliente pg, solo pruebas)
├── routes/                  # index.js solo cablea; auth, libro, inventario y movimiento
├── controllers/             # health, bodega, categoria, usuario, auth, libro, inventario
├── middlewares/             # auth.js, errorHandler.js, validator.js (fachada) + validators/
├── services/                # un servicio por dominio; libro.service.js es fachada de services/libro/
├── repositories/            # inventario.repository.js es fachada de repositories/inventario/
├── models/                  # 11 modelos Sequelize (atributos en snake_case)
├── utils/                   # errors.js, isbn.js, uuid.js, slug.js
└── database/                # migrate.js y seed.js (usan Sequelize)
```

Las fachadas (`libro.service.js`, `inventario.repository.js`, `validator.js`) mantienen su contrato: los consumidores las importan y no tocan los módulos internos.

## Configuración

Copia `.env.example` a `.env` y completa los valores (el archivo `.env` no se versiona). Variables y valores por defecto: §4.1 de las specs. Con la base de Docker Compose (`db`) usa `DB_PORT=5434`.

## Comandos

Desde `app/` (o con `npm run <script>` dentro de `backend/`):

```bash
npm run dev       # nodemon src/server.js
npm start         # node src/server.js
npm run seed      # sucursal, bodega y usuarios Administrador y Empleado
npm run migrate   # aplica database/migrations/*.sql pendientes (tabla schema_migrations)
npm test          # pruebas; requiere db-test arriba
```

Base de datos y backend con Docker: `docker compose up -d` (servicios `db` y `backend`).

## Pruebas

```bash
docker compose --profile test up -d db-test   # libreria_oskar_test, puerto 5435
npm test
```

`src/run-tests.js` se niega a correr con `NODE_ENV=production` o si Sequelize no está conectado a `libreria_oskar_test`. Las pruebas de integración modifican datos y limpian lo que crean. Detalle por archivo: §4.9 de las specs.

## Migraciones

`database/schema.sql` es la fuente de verdad. Una migración nueva es un archivo `NNN_nombre.sql` en `database/migrations/`, idempotente (`IF NOT EXISTS`). No se usa `sequelize.sync()`.
