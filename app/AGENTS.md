# AGENTS.md — Librería Oskar

Sistema web de inventario interno + catálogo informativo de libros. Sin carrito, reservas ni pagos. Interfaz en español, mobile-first. Responde en español.

## Stack y estructura
- Frontend: React 18, Vite 5, Tailwind 3 (paleta `oskar`), lucide-react, html5-qrcode, react-router-dom 6. JSX, sin TypeScript. En `app/frontend/src/`:
  `views/` (orquestadores delgados), `components/` y `components/ui/`, `context/`, `features/{catalogo,categorias,inventario,libros,registrar-libro,reportes,seguridad,usuarios,ventas}/{components,hooks}`, `hooks/`, `services/api/`, `utils/`.
- Frontend, reglas: todo HTTP sale de `services/api/` (`apiFetch` inyecta el JWT y ante 401 con token limpia la sesión y va a `/login`; `auth.api.js`, `catalogo.api.js`, `dosFactores.api.js` y `recuperacion.api.js` usan `fetch` directo a propósito; `dosFactores.api.js` en los pasos con token temporal y `recuperacion.api.js` en endpoints públicos sin sesión, donde un 401 no debe cerrar la sesión). Roles solo vía `utils/roles.js`; token solo vía `utils/tokenStorage.js`. Las vistas no contienen lógica de datos: va en hooks de la feature.
- Backend: Node 22, Express 4, CommonJS, en `app/backend/src/`: `routes → controllers → services → repositories → models` (más `config/`, `middlewares/`, `utils/`, `database/`). Sequelize 6.37 sobre PostgreSQL, 16 modelos.
- Backend, fachadas: `services/libro.service.js` (sobre `services/libro/*`), `repositories/inventario.repository.js` (sobre `repositories/inventario/*`) y `middlewares/validator.js` (sobre `middlewares/validators/*`) son fachadas. Los consumidores importan la fachada, nunca los módulos internos. `routes/index.js` solo cablea; los handlers viven en controladores.
- Utilidades compartidas: `utils/isbn.js`, `utils/uuid.js`, `utils/slug.js`, `utils/errors.js`. No reimplementes validación de ISBN/UUID.
- BD: PostgreSQL con UUID. `app/database/schema.sql` es la fuente de verdad; migraciones en `app/database/migrations/`.
- Pruebas del backend: runner nativo de Node, `npm test` desde `app/`, BD aislada `libreria_oskar_test` (puerto 5435, servicio `db-test`). El frontend no tiene pruebas: se verifica con `npm run frontend:build` y prueba manual.
- Docker Compose: `db`, `db-test`, `backend`. El frontend corre en el host con `npm run frontend:dev`. Producción en Google Cloud (Cloud Run + Cloud SQL + Firebase Hosting), desplegada por GitHub Actions al hacer push a `main` (`.github/workflows/deploy.yml` en la raíz del repo); infraestructura en Terraform (`infra/`), que se aplica a mano. Detalle en `docs/RUNBOOK.md`.

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
- 2FA (TOTP, endpoints en `/api/auth/2fa/`) implementado: obligatorio para Administrador y Empleado cuando `TWO_FACTOR_ENFORCED` está activo (por defecto solo en producción; siempre apagado con `NODE_ENV=test`); el rol Usuario queda fuera. Detalle en `docs/PROJECT_SPECS.md` §4.6.

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
- Ramas nuevas desde `develop`; se integran en `develop`. Todo push a `main` despliega a producción (Cloud Run y Firebase Hosting) con `.github/workflows/deploy.yml` (raíz del repo), incluso si solo cambia documentación; por eso no se fusiona ni se empuja a `main` sin acuerdo. Cómo funciona y cómo volver atrás: `app/docs/RUNBOOK.md` §4, §5 y §12; infraestructura en `infra/` (Terraform, ver `infra/README.md`).
- Migraciones: existen 002, 003, 004 (ventas), 010 (2FA), 011 (recuperación de contraseña) y 020 (alertas de inventario). 005-009 estaban asignadas al otro desarrollador; 010-019 se usaron para seguridad. Todo cambio de esquema se refleja también en `database/schema.sql` y en los modelos, siempre con autorización explícita.
- Archivos compartidos con riesgo de conflicto: `backend/src/routes/index.js`, `backend/src/models/index.js`, `frontend/src/App.jsx`, `frontend/src/components/Navbar.jsx`, `database/schema.sql`, `docs/PROJECT_SPECS.md`. Trae `develop` antes de editarlos y mantén el cambio mínimo.
- Todo endpoint, servicio o repositorio nuevo trae pruebas en `backend/tests/` (con `db-test` arriba) y no debe romper las existentes.
- Ya implementados: CRUD admin de usuarios y categorías, edición/baja de libros, ventas y reportes con exportación Excel/PDF.

## Jobs
- `oskar-alertas-inventario` ejecuta alertas diarias desde `backend/src/scripts/enviar-alertas-inventario.js`; el código/Terraform están preparados, pero el Job y Scheduler requieren configuración/aplicación autorizada en Google Cloud.
- Gmail SMTP no es transaccional: una entrega ambigua queda en revisión y no se reintenta automáticamente. No alteres los estados inciertos sin verificación.
- La especificación de diseño original está en `app/docs/roadmap/inventory-email-alerts`; catalog-employee-crud, ventas y auth-2fa permanecen como referencia de diseño ya implementada.

## Skills activas (`app/.agents/skills/<nombre>/SKILL.md`)
| Skill | Úsala para |
|---|---|
| backend-engineer-nodejs | Capas, Express, errores, auth |
| backend-testing | Pruebas del backend |
| database-architect | Esquema, migraciones, triggers |
| devops-gcp-automation | Docker, CI/CD, Terraform, Google Cloud |
| frontend-engineer-react | React, Vite, Tailwind |
| inventory-transactions | Movimientos, stock, bloqueos |
| sequelize-orm | Convenciones del ORM |
