# Estructura de Paquetería y Arquitectura — Librería Oskar

Describe las capas y carpetas del backend y del frontend. El detalle verificado (endpoints, firmas, flujos, deuda técnica) está en `app/docs/PROJECT_SPECS.md`; si algo discrepa, manda el código.

## 1. Raíz

```text
app/
├── backend/               # API REST en Node.js + Express + Sequelize
├── frontend/              # SPA en React + Vite + Tailwind CSS
├── database/              # schema.sql (fuente de verdad) y migrations/
├── docs/                  # PROJECT_SPECS.md y roadmap/ (funciones no implementadas)
├── .agents/skills/        # Directrices por dominio para agentes
├── .github/               # Workflow de CI/CD y guía de despliegue
├── AGENTS.md              # Reglas de trabajo para agentes
├── docker-compose.yml     # db, db-test (perfil test) y backend
└── package.json           # Scripts de orquestación (--prefix backend / frontend)
```

## 2. Backend (`backend/src`)

Flujo: `routes → controllers → services → repositories → models`.

```text
src/
├── app.js, server.js, run-tests.js
├── config/            # env.js, sequelize.js, db.js (cliente pg: solo pruebas)
├── routes/            # Cableado de endpoints; sin lógica
├── controllers/       # Capa HTTP: leen la petición y serializan la respuesta
├── middlewares/       # auth.js, errorHandler.js, validator.js y validators/
├── services/          # Lógica de negocio y transacciones
│   └── libro/         # Módulos internos de libro.service.js
├── repositories/      # Acceso a datos con Sequelize
│   └── inventario/    # Módulos internos de inventario.repository.js
├── models/            # Modelos Sequelize (uno por tabla)
├── utils/             # errors.js, isbn.js, uuid.js, slug.js
└── database/          # migrate.js y seed.js
```

Responsabilidad por capa:
- **routes**: asocian ruta, middlewares (`authenticate`, `authorize`, validadores) y método del controlador.
- **controllers**: extraen parámetros, toman el actor de `req.user` y delegan en un servicio. Responden con `{ status, data }`.
- **services**: reglas de negocio y una sola transacción por operación atómica.
- **repositories**: consultas Sequelize; devuelven objetos planos y aceptan `{ transaction }`.
- **models**: mapean las tablas del DDL con atributos en snake_case.

Fachadas: `services/libro.service.js`, `repositories/inventario.repository.js` y `middlewares/validator.js` reexportan los módulos de sus carpetas. Los consumidores importan la fachada.

## 3. Frontend (`frontend/src`)

```text
src/
├── App.jsx, main.jsx, index.css
├── views/             # Orquestadores de ruta (una por pantalla)
├── components/        # Compartidos: Navbar, Footer, Toast, ProtectedRoute, BarcodeScanner...
│   └── ui/            # Primitivas: Modal, ErrorBox, FieldLabel, Input, Select
├── context/           # AuthContext (sesión)
├── features/          # catalogo/, inventario/ y registrar-libro/, cada una con components/ y hooks/
├── hooks/             # Hooks genéricos (useDebouncedValue)
├── services/api/      # client.js (apiFetch) y un módulo *.api.js por dominio
└── utils/             # tokenStorage, roles, formatters, parsers
```

Responsabilidad por módulo:
- **views**: leen sesión y parámetros, invocan el hook de su feature y componen componentes.
- **features/*/hooks**: estado, efectos y llamadas a `services/api`.
- **features/*/components**: presentación de cada pantalla.
- **services/api**: único punto de salida HTTP; `apiFetch` inyecta el JWT y gestiona el 401.
- **utils**: acceso al token y a los roles, formateo y parseo.

## 4. Base de Datos (`database/`)

```text
database/
├── schema.sql     # Tablas, trigger de stock, índices y semillas
└── migrations/    # Scripts incrementales idempotentes (002, 003)
```

PostgreSQL con claves UUID. El trigger `tg_movimientos_inventario_stock` actualiza `stock_actual` al insertar un movimiento en `movimientos_inventario`; el backend nunca modifica el stock directamente.

## 5. Flujo de datos

```text
[ Navegador ] → [ Frontend React ] views → hooks → services/api
        │  (proxy de Vite: /api → localhost:3000)
        ▼
[ Express ] middlewares → controllers → services → repositories
        │                                   └──► Google Books / OpenLibrary (metadatos por ISBN)
        ▼
[ PostgreSQL ] tablas, trigger e índices
```
