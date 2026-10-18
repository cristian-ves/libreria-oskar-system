# AGENTS.md — Librería Oskar

Sistema web de inventario interno + catálogo informativo de libros. Sin carrito, reservas ni pagos. Interfaz en español, mobile-first. Responde en español.

## Stack y estructura actual
- Frontend: React 18, Vite 5, Tailwind 3 (paleta `oskar`), lucide-react, html5-qrcode, react-router-dom 6. JSX, sin TypeScript. Carpetas `app/frontend/src/{api,assets,context,components,views}`; no hay hooks, servicios por dominio ni tests.
- Backend: Node 22, Express 4, CommonJS, en `app/backend/src/`: `routes → controllers → services → repositories → models` (más `config/`, `middlewares/`, `utils/`, `database/`). Sequelize 6.37 sobre PostgreSQL, 11 modelos.
- BD: PostgreSQL con UUID. `app/database/schema.sql` es la fuente de verdad; migraciones en `app/database/migrations/`.
- Pruebas: runner nativo de Node, `npm test` desde `app/`, BD aislada `libreria_oskar_test` (puerto 5435).
- Docker Compose: `db`, `db-test`, `backend`. El frontend corre en el host con `npm run dev`. Despliegue en Google Cloud: planeado, no ejecutado.
- Hay un refactor en curso: la estructura objetivo de frontend y backend se documentará al cerrar cada subtarea. Mientras tanto, respeta la estructura actual.

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
- `config/db.js` (cliente `pg`) solo se usa en healthcheck y tests, no en repositorios.
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
- `POST /api/libros/escanear` exige rol `Administrador` o `Empleado` (`authenticate` + `authorize`). Sin token → 401; rol `Usuario` → 403.
- El actor (`usuarioId`) de todo movimiento sale siempre de `req.user.id` (inyectado por `authenticate`), nunca del body. Un `usuarioId` en el body se ignora.

## Pruebas
- Las de integración modifican datos: apuntan a la BD aislada y limpian lo que crean.
- `libros.isbn` es VARCHAR(20): usa ISBN-13 válido en fixtures y no amplíes la columna.
- En operaciones críticas cubre rollback, movimiento+trigger, concurrencia, stock no negativo y duplicados.
- No afirmes que algo pasa o está desplegado sin evidencia.

## Convenciones
- Archivos backend `nombre.capa.js`. Atributos de modelos en snake_case, igual que las columnas.
- Cambios pequeños y acotados; no reescribas lo que funciona.

## Comportamiento del agente
- Lee solo los archivos necesarios.
- NO instales dependencias ni ejecutes builds, tests o migraciones salvo que se pida; el usuario los corre.
- NO ejecutes operaciones git (commit, push, checkout, merge, rebase, reset, clean, stash): las hace el usuario. No edites `main`.
- Si hay cambios locales sin confirmar, presérvalos.
- Cierra cada tarea con un resumen de MÁXIMO 5 líneas: archivos modificados, comportamiento conservado, riesgos/pendientes.

## Documentación
`app/docs/PROJECT_SPECS.md` es la fuente de verdad verificada. NO lo cargues completo: lee solo la sección necesaria. Si el código y las specs discrepan, manda el código.
Índice: §3 BD, §4 backend (4.3 endpoints, 4.5 transacciones, 4.6 auth/RBAC, 4.9 tests), §5 frontend, §6 flujos, §7 infraestructura, §8 permisos, §9 deuda técnica, §10 lo ausente, §11 convenciones, §12 docs y agentes.

## Roadmap (NO implementado)
2FA, alertas de inventario por correo, CRUD admin de empleados y catálogo, y ventas. No los asumas existentes. Sus specs están en `app/docs/roadmap/` (auth-2fa, inventory-email-alerts, catalog-employee-crud).

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
