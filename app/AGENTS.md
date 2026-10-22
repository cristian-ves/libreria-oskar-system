# AGENTS.md — Librería Oskar

Sistema web de inventario interno + catálogo informativo de libros. Sin carrito, reservas ni pagos. Interfaz en español, mobile-first. Responde en español.

## Stack y estructura
- Frontend: React 18, Vite 5, Tailwind 3 (paleta `oskar`), lucide-react, html5-qrcode, react-router-dom 6. JSX, sin TypeScript. En `app/frontend/src/`:
  `views/` (orquestadores delgados), `components/` y `components/ui/`, `context/`, `features/{inventario,registrar-libro,catalogo}/{components,hooks}`, `hooks/`, `services/api/`, `utils/`.
- Frontend, reglas: todo HTTP sale de `services/api/` (`apiFetch` inyecta el JWT y ante 401 con token limpia la sesión y va a `/login`; `auth.api.js` y `catalogo.api.js` usan `fetch` directo a propósito). Roles solo vía `utils/roles.js`; token solo vía `utils/tokenStorage.js`. Las vistas no contienen lógica de datos: va en hooks de la feature.
- Backend: Node 22, Express 4, CommonJS, en `app/backend/src/`: `routes → controllers → services → repositories → models` (más `config/`, `middlewares/`, `utils/`, `database/`). Sequelize 6.37 sobre PostgreSQL, 13 modelos.
- Backend, fachadas: `services/libro.service.js` (sobre `services/libro/*`), `repositories/inventario.repository.js` (sobre `repositories/inventario/*`) y `middlewares/validator.js` (sobre `middlewares/validators/*`) son fachadas. Los consumidores importan la fachada, nunca los módulos internos. `routes/index.js` solo cablea; los handlers viven en controladores.
- Utilidades compartidas: `utils/isbn.js`, `utils/uuid.js`, `utils/slug.js`, `utils/errors.js`. No reimplementes validación de ISBN/UUID.
- BD: PostgreSQL con UUID. `app/database/schema.sql` es la fuente de verdad; migraciones en `app/database/migrations/`.
- Pruebas del backend: runner nativo de Node, `npm test` desde `app/`, BD aislada `libreria_oskar_test` (puerto 5435, servicio `db-test`). El frontend no tiene pruebas: se verifica con `npm run frontend:build` y prueba manual.
- Docker Compose: `db`, `db-test`, `backend`. El frontend corre en el host con `npm run frontend:dev`. Despliegue en Google Cloud: planeado, no ejecutado.

## Roles
- Administrador: todo.
- Empleado: escaneo, ingresos, salidas, ajustes, stock y kardex. No administra usuarios. Ve precios pero no los fija: al registrar libros queda `precio=0` y `precio_pendiente=true`.
- Usuario: existe en BD, sin acceso a nada protegido.
- El catálogo es público.

## Reglas de arquitectura y persistencia
- Preserva contratos HTTP y formatos `{ status: 'success', data }`, `{ status: 'fail', message }`, `{ status: 'error', message }`.
- Verifica en el código que un endpoint o campo existe antes de darlo por hecho; no inventes endpoints, tablas ni archivos.
- Errores con la jerarquía `AppError` de `utils/errors.js`.
- Usa métodos Sequelize. `sequelize.query()` solo en excepciones analíticas justificadas.
- NUNCA `sequelize.sync()` (ni force ni alter). No modifiques esquema, migraciones ni triggers sin autorización explícita.
- `config/db.js` (cliente `pg`) solo lo usan pruebas; no lo importes desde la app.
- Conserva los contratos de repositorios y servicios (nombres, nulos, tipos, alias, orden, JSON plano).
- Una sola transacción por operación de negocio atómica, pasando el mismo `{ transaction }` a todo.
- No dupliques endpoints.

## Reglas de inventario
- El backend registra movimientos en `movimientos_inventario`; el trigger `tg_movimientos_inventario_stock` actualiza `stock_actual`. Nunca lo modifiques directo (solo se inicializa en 0 al crear el inventario).
- Tipos válidos: Ingreso, Salida, Ajuste, Ajuste Auditoria.
- `UNIQUE (libro_id, bodega_id)`; sin stock negativo; conserva `inventarioRepository.findByIdForUpdate` y los bloqueos pesimistas.
- Bajo stock = `stock_actual <= stock_minimo`. Stock obsoleto = sin salidas en `DIAS_STOCK_OBSOLETO` (90 por defecto).
- No cambies cálculos de alertas ni formatos de reportes sin requerimiento.

## Seguridad
- bcrypt es hash, no "cifrado". Usa el JWT y RBAC existentes y valida permisos en el backend, no solo en React.
- Nunca expongas ni versiones secretos, `.env` ni claves; comprueba su presencia sin mostrar valores.
- `POST /api/libros/escanear` exige rol `Administrador` o `Empleado` (`authenticate` + `authorize`). Sin token → 401; rol `Usuario` → 403. El frontend no lo llama.
- El actor (`usuarioId`) de todo movimiento sale siempre de `req.user.id` (inyectado por `authenticate`), nunca del body. Un `usuarioId` en el body se ignora.

## Pruebas
- Las de integración modifican datos: apuntan a la BD aislada y limpian lo que crean.
- `libros.isbn` es VARCHAR(20): usa ISBN-13 válido en fixtures y no amplíes la columna.
- En operaciones críticas cubre rollback, movimiento+trigger, concurrencia, stock no negativo y duplicados.
- No afirmes que algo pasa o está desplegado sin evidencia.

## Convenciones
- Archivos backend `nombre.capa.js`. Atributos de modelos en snake_case, igual que las columnas.
- Frontend: componentes PascalCase, hooks `useNombre.js`, servicios `dominio.api.js`.
- Cambios pequeños y acotados; no reescribas lo que funciona.

## Comportamiento del agente
- Lee solo los archivos necesarios.
- Puedes correr `npm test` (requiere `db-test` arriba) y `npm run frontend:build` para verificar tus cambios.
- NO instales dependencias ni ejecutes migraciones.
- NO ejecutes operaciones git (commit, push, checkout, merge, rebase, reset, clean, stash): las hace el usuario. No edites `main`.
- Si hay cambios locales sin confirmar, presérvalos.
- Cierra cada tarea con un resumen de MÁXIMO 5 líneas: archivos modificados, comportamiento conservado, riesgos/pendientes.

## Documentación
`app/docs/PROJECT_SPECS.md` es la fuente de verdad verificada. NO lo cargues completo: lee solo la sección necesaria. Si el código y las specs discrepan, manda el código.
Índice: §3 BD, §4 backend (4.3 endpoints, 4.5 capas y transacciones, 4.6 auth/RBAC, 4.9 tests), §5 frontend, §6 flujos, §7 infraestructura, §8 permisos, §9 deuda técnica, §10 lo ausente, §11 convenciones, §12 docs y agentes.

## Trabajo en equipo
- Ramas nuevas desde `develop`; se integran en `develop`. Un push a `main` dispara el despliegue (`.github/workflows/deploy.yml`): no fusionar ni empujar a `main` sin acuerdo.
- Migraciones: la 004 es la de ventas (ya aplicada al repositorio); los cambios de esquema nuevos usan la 005 en adelante y se reflejan también en `database/schema.sql` y en los modelos, siempre con autorización explícita.
- Archivos compartidos con riesgo de conflicto: `backend/src/routes/index.js`, `backend/src/models/index.js`, `frontend/src/App.jsx`, `frontend/src/components/Navbar.jsx`, `database/schema.sql`, `docs/PROJECT_SPECS.md`. Trae `develop` antes de editarlos y mantén el cambio mínimo.
- Todo endpoint, servicio o repositorio nuevo trae pruebas en `backend/tests/` (con `db-test` arriba) y no debe romper las existentes.
- Alcance del CRUD admin pendiente: usuarios y categorías. La edición/baja de libros y las ventas se desarrollan aparte.

## Roadmap (NO implementado)
2FA, alertas de inventario por correo, CRUD admin de empleados y catálogo, y ventas (esquema, API e interfaz creados; reportes pendientes). No los asumas existentes. Sus specs están en `app/docs/roadmap/` (auth-2fa, inventory-email-alerts, catalog-employee-crud, ventas).

## Skills activas (`app/.agents/skills/<nombre>/SKILL.md`)
| Skill | Úsala para |
|---|---|
| backend-engineer-nodejs | Capas, Express, errores, auth |
| backend-testing | Pruebas del backend |
| database-architect | Esquema, migraciones, triggers |
| devops-gcp-automation | Docker, CI, Google Cloud |
| frontend-engineer-react | React, Vite, Tailwind |
| inventory-transactions | Movimientos, stock, bloqueos |
| sequelize-orm | Convenciones del ORM |
