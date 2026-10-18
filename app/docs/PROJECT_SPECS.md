# Especificación Técnica de Proyecto — Librería Oskar

> Documento generado automáticamente con base en la inspección directa del código fuente. Es la única fuente de contexto verificada para planificación de refactorizaciones, auditorías de arquitectura y desarrollo de nuevas funcionalidades sin acceso directo al repositorio.

---

## 0. Metadatos

| Clave | Valor | Fuente de verificación |
|---|---|---|
| **Fecha de generación** | 2026-10-18 | Reloj del sistema de entorno local |
| **Rama actual** | `develop` | `git branch --show-current` |
| **Hash del commit** | `08796a1` | `git rev-parse --short HEAD` |
| **ORM utilizado** | Sequelize | `app/backend/package.json` |
| **Versión exacta del ORM** | `^6.37.8` | `app/backend/package.json` (`dependencies.sequelize`) |
| **Motor de base de datos** | PostgreSQL (vía `pg` y `sequelize`) | `app/database/schema.sql`, `app/backend/package.json` |

---

## 1. Visión General y Stack Tecnológico

### 1.1 Dependencias y Manifiestos `package.json`

#### Raíz del monorepo (`app/package.json`)
- **Nombre**: `libreria-oskar-app`
- **Versión**: `1.0.0`
- **Descripción**: Monorepo / Workspace raíz para Librería Oskar - Sistema de Inventario y Catálogo
- **Dependencias (`dependencies`)**: No existe
- **Dependencias de desarrollo (`devDependencies`)**: No existe
- **Scripts npm**:
  - `start`: `npm --prefix backend start`
  - `dev`: `npm --prefix backend run dev`
  - `seed`: `npm --prefix backend run seed`
  - `test`: `npm --prefix backend test`
  - `test:sequelize`: `npm --prefix backend run test:sequelize`
  - `frontend:dev`: `npm --prefix frontend run dev`
  - `frontend:build`: `npm --prefix frontend run build`
  - `frontend:preview`: `npm --prefix frontend run preview`

#### Backend (`app/backend/package.json`)
- **Nombre**: `libreria-oskar-backend`
- **Versión**: `1.0.0`
- **Main**: `src/server.js`
- **Dependencias de producción (`dependencies`)**:
  - `bcryptjs`: `^3.0.3`
  - `cors`: `^2.8.5`
  - `dotenv`: `^16.4.7`
  - `express`: `^4.21.2`
  - `helmet`: `^8.0.0`
  - `jsonwebtoken`: `^9.0.3`
  - `morgan`: `^1.10.0`
  - `pg`: `^8.13.3`
  - `pg-hstore`: `^2.3.4`
  - `sequelize`: `^6.37.8`
- **Dependencias de desarrollo (`devDependencies`)**:
  - `nodemon`: `^3.1.9`
- **Scripts npm**:
  - `start`: `node src/server.js`
  - `dev`: `nodemon src/server.js`
  - `seed`: `node src/database/seed.js`
  - `migrate`: `node src/database/migrate.js`
  - `test`: `node src/run-tests.js`
  - `test:sequelize`: `node src/test-sequelize.js`

#### Frontend (`app/frontend/package.json`)
- **Nombre**: `libreria-oskar-frontend`
- **Versión**: `1.0.0`
- **Tipo de módulo**: `module` (ESM nativo)
- **Dependencias de producción (`dependencies`)**:
  - `html5-qrcode`: `^2.3.8`
  - `lucide-react`: `^0.475.0`
  - `react`: `^18.3.1`
  - `react-dom`: `^18.3.1`
  - `react-router-dom`: `^6.30.6`
- **Dependencias de desarrollo (`devDependencies`)**:
  - `@rollup/rollup-linux-x64-gnu`: `^4.63.4`
  - `@vitejs/plugin-react`: `^4.3.4`
  - `autoprefixer`: `^10.4.20`
  - `postcss`: `^8.4.49`
  - `tailwindcss`: `^3.4.17`
  - `vite`: `^5.4.14`
- **Scripts npm**:
  - `dev`: `vite`
  - `build`: `vite build`
  - `preview`: `vite preview`

### 1.2 Versión de Node.js Requerida
- **Campo `engines` en `package.json`**: No existe en ninguno de los tres archivos `package.json`.
- **Versión de Node en Contenedor (`Dockerfile`)**: `Node 22` (`FROM node:22-alpine`).
- **Versión de Node en Pipeline CI (`deploy.yml`)**: `Node 22` (`node-version: 22`).

---

## 2. Árbol de Directorios y Métricas de Código

### 2.1 Árbol de Archivos de `app/` (Líneas de código verificadas)

```text
app/
├── AGENTS.md (74)
├── docker-compose.yml (78)
├── package.json (19)
├── .agents/
│   └── skills/
│       ├── backend-engineer-nodejs/SKILL.md (34)
│       ├── backend-testing/SKILL.md (19)
│       ├── database-architect/SKILL.md (26)
│       ├── devops-gcp-automation/SKILL.md (26)
│       ├── frontend-engineer-react/SKILL.md (26)
│       ├── inventory-transactions/SKILL.md (25)
│       └── sequelize-orm/SKILL.md (23) (convenciones vigentes)
├── .github/
│   ├── DEPLOYMENT_GUIDE.md (115)
│   └── workflows/
│       └── deploy.yml (151)
├── backend/
│   ├── Dockerfile (54)
│   ├── .dockerignore (10)
│   ├── .env (14)
│   ├── .env.example (24)
│   ├── package.json (40)
│   ├── README.md (158)
│   ├── src/
│   │   ├── app.js (43)
│   │   ├── run-tests.js (60)
│   │   ├── server.js (47)
│   │   ├── test-sequelize.js (91)
│   │   ├── config/
│   │   │   ├── db.js (85)
│   │   │   ├── env.js (44)
│   │   │   └── sequelize.js (48)
│   │   ├── controllers/
│   │   │   ├── auth.controller.js (39)
│   │   │   ├── inventario.controller.js (112)
│   │   │   └── libro.controller.js (179)
│   │   ├── database/
│   │   │   ├── migrate.js (79)
│   │   │   └── seed.js (139)
│   │   ├── middlewares/
│   │   │   ├── auth.js (76)
│   │   │   ├── errorHandler.js (74)
│   │   │   └── validator.js (345)
│   │   ├── models/
│   │   │   ├── index.js (48)
│   │   │   ├── autor.model.js (50)
│   │   │   ├── bodega.model.js (83)
│   │   │   ├── categoria.model.js (46)
│   │   │   ├── editorial.model.js (50)
│   │   │   ├── inventario.model.js (94)
│   │   │   ├── libro.model.js (127)
│   │   │   ├── movimientoInventario.model.js (91)
│   │   │   ├── rol.model.js (50)
│   │   │   ├── sucursal.model.js (63)
│   │   │   ├── tipoMovimiento.model.js (43)
│   │   │   └── usuario.model.js (95)
│   │   ├── repositories/
│   │   │   ├── autor.repository.js (123)
│   │   │   ├── categoria.repository.js (78)
│   │   │   ├── editorial.repository.js (123)
│   │   │   ├── inventario.repository.js (456)
│   │   │   ├── libro.repository.js (255)
│   │   │   ├── movimiento.repository.js (233)
│   │   │   └── usuario.repository.js (182)
│   │   ├── services/
│   │   │   ├── auth.service.js (55)
│   │   │   ├── googleBooks.service.js (289)
│   │   │   ├── inventario.service.js (188)
│   │   │   └── libro.service.js (515)
│   │   └── utils/
│   │       ├── errors.js (51)
│   │       └── slug.js (98)
│   └── tests/
│       ├── api.e2e.test.js (162)
│       ├── errorHandler.test.js (123)
│       ├── escanear.integration.test.js (151)
│       ├── googleBooks.test.js (145)
│       ├── inventarioRepository.test.js (468)
│       ├── inventarioService.test.js (204)
│       ├── isbnValidation.test.js (90)
│       ├── libroRepository.test.js (237)
│       ├── libroServiceSequelize.test.js (386)
│       ├── movimientoRepository.test.js (245)
│       ├── repositories.test.js (180)
│       ├── sequelize.test.js (94)
│       ├── usuarioRepository.test.js (103)
│       └── helpers/
│           └── httpMocks.js (50)
├── database/
│   ├── schema.sql (273)
│   └── migrations/
│       ├── 002_categorias.sql (26)
│       └── 003_categorias_adicionales.sql (23)
├── docs/
│   ├── PROJECT_SPECS.md (975)
│   └── roadmap/
│       ├── auth-2fa/SKILL.md (16)
│       ├── catalog-employee-crud/SKILL.md (17)
│       └── inventory-email-alerts/SKILL.md (17)
└── frontend/
    ├── index.html (16)
    ├── package.json (27)
    ├── postcss.config.js (6)
    ├── README.md (44)
    ├── tailwind.config.js (26)
    ├── vite.config.js (17)
    └── src/
        ├── App.jsx (66)
        ├── index.css (34)
        ├── main.jsx (16)
        ├── api/
        │   └── client.js (42)
        ├── assets/
        │   └── logo.jpg
        ├── context/
        │   └── AuthContext.jsx (118)
        ├── components/
        │   ├── BarcodeScanner.jsx (222)
        │   ├── BookCard.jsx (114)
        │   ├── Footer.jsx (23)
        │   ├── LoadingSpinner.jsx (30)
        │   ├── Navbar.jsx (125)
        │   ├── ProtectedRoute.jsx (48)
        │   └── Toast.jsx (74)
        └── views/
            ├── Catalogo.jsx (660)
            ├── Inventario.jsx (1181)
            ├── LibroDetalle.jsx (347)
            ├── Login.jsx (119)
            ├── Nosotros.jsx (88)
            └── RegistrarLibro.jsx (1010)
```

### 2.2 Archivos de más de 250 Líneas

| Ruta del archivo | Líneas | Qué responsabilidades mezcla |
|---|---|---|
| `app/frontend/src/views/Inventario.jsx` | 1181 | Gestión de tabs (Existencias vs Kardex), estado global de filtros y paginación, modales interactivos de Salida y Ajuste con validaciones de formulario, polling/render de KPIs globales de resumen, y llamadas directas con `apiFetch`. |
| `app/frontend/src/views/RegistrarLibro.jsx` | 1010 | Integración del visor de cámara (`html5-qrcode`), consulta preliminar por ISBN con fallback a formulario manual, gestión de estado multipaso (`scanner` → `existe` → `noExiste`), validación de checksum y formato de ISBN, render condicional por rol para precios, e historial de sesión local. |
| `app/frontend/src/views/Catalogo.jsx` | 660 | Catálogo interactivo público, partición y renderizado de categorías (Derecho vs General), Drawer de filtros mobile con sincronización de estado draft y bloqueo de scroll en `body`, input con debounce, cuadrícula de tarjetas y paginación visual. |
| `app/backend/src/services/libro.service.js` | 515 | Upsert atómico con savepoints para maestros de autor y editorial, orquestación de escaneo con APIs externas fuera de transacción, creación de libros con verificación de conflicto, regla de negocio de precio según rol, e inyección de movimientos de inventario. |
| `app/backend/tests/inventarioRepository.test.js` | 468 | Suite de pruebas de persistencia para inventario: cubre bloqueos pesimistas, contratos de respuesta JSON, queries analíticas de resumen, y soporte de transacciones concurrentes. |
| `app/backend/src/repositories/inventario.repository.js` | 456 | Operaciones básicas de inventario (`findByLibroAndBodega`, `findOrCreate`, `findByIdForUpdate`), subconsultas SQL manuales en Sequelize para detectar última salida y stock obsoleto, y agregaciones complejas para métricas del dashboard. |
| `app/backend/tests/libroServiceSequelize.test.js` | 386 | Pruebas transaccionales de extremo a extremo para el servicio de libros: verificación de rollback multinivel, bloqueos pesimistas, trigger de stock y concurrencia de escaneo. |
| `app/frontend/src/views/LibroDetalle.jsx` | 347 | Parseo de referencias compuestas (slug + shortId), consulta HTTP al backend, renderizado de ficha técnica con portadas, y desglose de disponibilidad por bodega y sucursal. |
| `app/backend/src/middlewares/validator.js` | 345 | Validación matemática de checksum de ISBN-10 y ISBN-13, normalización de cadenas, y verificación de payloads de 8 operaciones distintas (escaneo, consulta, registro, ingresos, filtros, kardex, salidas, ajustes). |
| `app/backend/src/services/googleBooks.service.js` | 289 | Cliente HTTP para Google Books API con timeouts y manejo de errores 429/503, fallback multinivel hacia OpenLibrary API con resolución de autores vía `Promise.allSettled`, catálogo estático de contingencia y caché TTL en memoria. |
| `app/database/schema.sql` | 273 | Definición DDL unificada de 11 tablas, extensiones `uuid-ossp` y `pgcrypto`, trigger PL/pgSQL con bloqueos `FOR UPDATE`, 13 índices relacionales y semillas iniciales. |
| `app/backend/src/repositories/libro.repository.js` | 255 | Búsqueda por ISBN/UUID con carga eager de 3 relaciones, lógica de `upsert` e inserción con captura de códigos PostgreSQL (`23505`), agregaciones de stock entre bodegas (`COALESCE(SUM(...))`), y resolución de disponibilidad por sucursal mediante slug/shortId. |

---

## 3. Base de Datos (PostgreSQL)

### 3.1 Fuente de Verdad y Estado del Esquema
- **Fuente de verdad**: `app/database/schema.sql` es la fuente de verdad declarada para nombres de tablas, columnas, restricciones, UUIDs y triggers.
- **Mecanismo de migraciones**: Directorio `app/database/migrations/` ejecutado secuencialmente por `app/backend/src/database/migrate.js`, registrando ejecuciones en la tabla `schema_migrations`.
- **Diferencias entre `schema.sql` y modelos Sequelize**:
  - No hay divergencias estructurales: los 11 modelos definidos en `src/models/` mapean exactamente las 11 tablas del DDL.
  - La migración `002_categorias.sql` ya está integrada en el `schema.sql` principal.
  - `schema.sql` siembra las **20 categorías** (las 6 originales y las 14 de la migración `003_categorias_adicionales.sql`, con `ON CONFLICT (nombre) DO NOTHING`). Una BD creada desde cero con `schema.sql` ya equivale a aplicar `schema.sql + 002 + 003`. Las migraciones 002 y 003 permanecen como scripts idempotentes válidos para BDs ya existentes.
  - La tabla `schema_migrations` es creada exclusivamente en runtime por `migrate.js` y no forma parte del `schema.sql` estático.

### 3.2 Catálogo de Tablas y Columnas Clave

| Tabla | Columna | Tipo SQL | Restricciones / Claves |
|---|---|---|---|
| `sucursales` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `sucursales` | `nombre` | `VARCHAR(100)` | NOT NULL |
| `sucursales` | `direccion` | `TEXT` | NOT NULL |
| `sucursales` | `telefono` | `VARCHAR(20)` | Nullable |
| `sucursales` | `activo` | `BOOLEAN` | NOT NULL, DEFAULT TRUE |
| `sucursales` | `creado_en` / `actualizado_en` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `bodegas` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `bodegas` | `sucursal_id` | `UUID` | FK -> `sucursales(id)` ON DELETE CASCADE, NOT NULL |
| `bodegas` | `nombre` | `VARCHAR(100)` | NOT NULL, UNIQUE con `sucursal_id` (`uq_sucursal_bodega`) |
| `bodegas` | `descripcion` | `TEXT` | Nullable |
| `bodegas` | `activo` | `BOOLEAN` | NOT NULL, DEFAULT TRUE |
| `roles` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `roles` | `nombre` | `VARCHAR(50)` | NOT NULL, UNIQUE ('Administrador', 'Empleado', 'Usuario') |
| `roles` | `descripcion` | `TEXT` | Nullable |
| `usuarios` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `usuarios` | `rol_id` | `UUID` | FK -> `roles(id)` ON DELETE RESTRICT, NOT NULL |
| `usuarios` | `nombre_completo` | `VARCHAR(150)` | NOT NULL |
| `usuarios` | `email` | `VARCHAR(150)` | NOT NULL, UNIQUE |
| `usuarios` | `password_hash` | `VARCHAR(255)` | NOT NULL (hash bcrypt) |
| `usuarios` | `dos_factores_activo` | `BOOLEAN` | NOT NULL, DEFAULT FALSE |
| `usuarios` | `dos_factores_secreto` | `VARCHAR(128)` | Nullable (Base32 para TOTP) |
| `usuarios` | `token_recuperacion` | `VARCHAR(255)` | Nullable |
| `usuarios` | `activo` | `BOOLEAN` | NOT NULL, DEFAULT TRUE |
| `autores` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `autores` | `nombre` | `VARCHAR(150)` | NOT NULL, UNIQUE |
| `autores` | `biografia` | `TEXT` | Nullable |
| `editoriales` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `editoriales` | `nombre` | `VARCHAR(150)` | NOT NULL, UNIQUE |
| `editoriales` | `pais` | `VARCHAR(100)` | Nullable |
| `categorias` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `categorias` | `nombre` | `VARCHAR(100)` | NOT NULL, UNIQUE |
| `libros` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `libros` | `autor_id` | `UUID` | FK -> `autores(id)` ON DELETE SET NULL, Nullable |
| `libros` | `editorial_id` | `UUID` | FK -> `editoriales(id)` ON DELETE SET NULL, Nullable |
| `libros` | `categoria_id` | `UUID` | FK -> `categorias(id)` ON DELETE SET NULL, Nullable |
| `libros` | `titulo` | `VARCHAR(255)` | NOT NULL |
| `libros` | `isbn` | `VARCHAR(20)` | UNIQUE, Nullable |
| `libros` | `resena` | `TEXT` | NOT NULL |
| `libros` | `imagen_url` | `TEXT` | Nullable |
| `libros` | `precio` | `NUMERIC(10,2)`| NOT NULL, CHECK (`precio >= 0`) |
| `libros` | `activo` | `BOOLEAN` | NOT NULL, DEFAULT TRUE |
| `inventarios` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `inventarios` | `libro_id` | `UUID` | FK -> `libros(id)` ON DELETE CASCADE, NOT NULL |
| `inventarios` | `bodega_id` | `UUID` | FK -> `bodegas(id)` ON DELETE CASCADE, NOT NULL |
| `inventarios` | `stock_actual` | `INT` | NOT NULL, DEFAULT 0, CHECK (`stock_actual >= 0`) |
| `inventarios` | `stock_minimo` | `INT` | NOT NULL, DEFAULT 5, CHECK (`stock_minimo >= 0`) |
| `inventarios` | `ultima_auditoria` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
| `tipo_movimientos` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `tipo_movimientos` | `nombre` | `VARCHAR(50)` | NOT NULL, UNIQUE ('Ingreso', 'Salida', 'Ajuste') |
| `tipo_movimientos` | `descripcion` | `TEXT` | Nullable |
| `movimientos_inventario` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `movimientos_inventario` | `inventario_id` | `UUID` | FK -> `inventarios(id)` ON DELETE CASCADE, NOT NULL |
| `movimientos_inventario` | `usuario_id` | `UUID` | FK -> `usuarios(id)` ON DELETE RESTRICT, NOT NULL |
| `movimientos_inventario` | `tipo_movimiento_id`| `UUID` | FK -> `tipo_movimientos(id)` ON DELETE RESTRICT, NOT NULL |
| `movimientos_inventario` | `cantidad` | `INT` | NOT NULL, CHECK (`cantidad >= 0`) |
| `movimientos_inventario` | `motivo_detalle` | `TEXT` | Nullable (Justificación o detalle del movimiento) |
| `movimientos_inventario` | `fecha_movimiento` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |

### 3.3 Enums y Tipos Categóricos
- **Enums nativos en Postgres**: No existe ningún tipo `CREATE TYPE ... AS ENUM`.
- Todos los valores categóricos están implementados como tablas relacionales con restricciones `UNIQUE` (`roles.nombre`, `tipo_movimientos.nombre`).

### 3.4 Triggers y Funciones PL/pgSQL

#### Función `fn_actualizar_stock_por_movimiento()` y Trigger `tg_movimientos_inventario_stock`
- **Asociación**: `AFTER INSERT ON movimientos_inventario FOR EACH ROW EXECUTE FUNCTION fn_actualizar_stock_por_movimiento()`.
- **Mecanismo de acción**:
  1. Consulta `tipo_movimientos.nombre` a partir de `NEW.tipo_movimiento_id`. Si no existe, eleva excepción PL/pgSQL (`RAISE EXCEPTION`).
  2. Ejecuta un bloqueo pesimista en base de datos: `SELECT stock_actual INTO v_stock_previo FROM inventarios WHERE id = NEW.inventario_id FOR UPDATE;`.
  3. Evalúa la regla según el tipo de movimiento:
     - **'Ingreso'**: Valida `NEW.cantidad > 0`. Ejecuta `UPDATE inventarios SET stock_actual = stock_actual + NEW.cantidad, ultima_auditoria = CURRENT_TIMESTAMP WHERE id = NEW.inventario_id;`.
     - **'Salida'**: Valida `NEW.cantidad > 0` y verifica que `v_stock_previo >= NEW.cantidad`. Si es menor, eleva excepción por saldo insuficiente. Si es válido, ejecuta `UPDATE inventarios SET stock_actual = stock_actual - NEW.cantidad, ultima_auditoria = CURRENT_TIMESTAMP WHERE id = NEW.inventario_id;`.
     - **'Ajuste'** o **'Ajuste Auditoria'**: Valida `NEW.cantidad >= 0`. Ejecuta `UPDATE inventarios SET stock_actual = NEW.cantidad, ultima_auditoria = CURRENT_TIMESTAMP WHERE id = NEW.inventario_id;` (establece el stock directamente al valor verificado).
     - **Cualquier otro tipo**: Eleva excepción `Operación de movimiento no soportada`.

### 3.5 Índices Optimizados en Base de Datos

| Nombre del Índice | Tabla | Columnas | Condición / Tipo |
|---|---|---|---|
| `idx_libros_titulo` | `libros` | `titulo` | B-Tree |
| `idx_libros_isbn` | `libros` | `isbn` | B-Tree |
| `idx_libros_autor` | `libros` | `autor_id` | B-Tree |
| `idx_libros_editorial` | `libros` | `editorial_id` | B-Tree |
| `idx_libros_categoria` | `libros` | `categoria_id` | B-Tree |
| `idx_libros_catalogo_activo` | `libros` | `activo, precio` | B-Tree compuesto |
| `idx_inventario_alertas` | `inventarios` | `stock_actual, stock_minimo` | Parcial: `WHERE (stock_actual <= stock_minimo)` |
| `idx_inventarios_bodega` | `inventarios` | `bodega_id` | B-Tree |
| `idx_inventarios_libro` | `inventarios` | `libro_id` | B-Tree |
| `idx_usuarios_email` | `usuarios` | `email` | B-Tree |
| `idx_movimientos_fecha` | `movimientos_inventario` | `fecha_movimiento DESC` | B-Tree ordenado descendente |
| `idx_movimientos_inventario_id` | `movimientos_inventario` | `inventario_id` | B-Tree |
| `idx_movimientos_usuario_id` | `movimientos_inventario` | `usuario_id` | B-Tree |

### 3.6 Detalle Específico de Movimientos de Inventario
- **Nombre de columna para motivo**: La columna se llama exactamente `motivo_detalle` (tipo `TEXT`).
- **Existencia de campo de referencia adicional**: No existe columna `referencia` en la tabla `movimientos_inventario`.
- **Valores posibles para tipo de movimiento**: `'Ingreso'`, `'Salida'`, `'Ajuste'`, `'Ajuste Auditoria'` (soportados por el trigger PL/pgSQL).

---

## 4. Backend

### 4.1 Variables de Entorno y Configuración (`backend/src/config/`)

| Variable | Tipo | Propósito | Valor por defecto |
|---|---|---|---|
| `PORT` | Número | Puerto de escucha HTTP de Express | `3000` (`8080` en contenedor) |
| `NODE_ENV` | String | Entorno de ejecución (`development`, `production`, `test`) | `development` |
| `DB_HOST` | String | Host o socket de PostgreSQL | `localhost` |
| `DB_PORT` | Número | Puerto TCP de PostgreSQL | `5432` |
| `DB_USER` | String | Usuario de conexión a PostgreSQL | `postgres` |
| `DB_PASSWORD` | String | Contraseña de conexión a PostgreSQL | `postgres` |
| `DB_NAME` | String | Nombre de la base de datos de negocio | `libreria_oskar` |
| `DATABASE_URL` | String | URI de conexión completa a PostgreSQL | `undefined` |
| `TEST_DB_HOST` | String | Host de base de pruebas aislada | `localhost` |
| `TEST_DB_PORT` | Número | Puerto de base de pruebas | `5435` |
| `TEST_DB_USER` | String | Usuario de base de pruebas | `postgres` |
| `TEST_DB_PASSWORD`| String | Contraseña de base de pruebas | `postgres` |
| `JWT_SECRET` | String | Clave de firma simétrica HMAC SHA-256 | Obligatoria en prod; dev: `'secreto-solo-para-desarrollo-local'` |
| `JWT_EXPIRES_IN` | String | Tiempo de validez del token JWT | `'8h'` |
| `GOOGLE_BOOKS_API_KEY` | String | API Key opcional de Google Books | `null` |
| `DIAS_STOCK_OBSOLETO` | Número | Umbral de días sin salidas para clasificar stock muerto | `90` |
| `SEQUELIZE_LOGGING` | Booleano | Si habilita salida de queries SQL a consola | `false` |

- **Conexión Sequelize (`src/config/sequelize.js`)**: Instancia `Sequelize` configurada con `freezeTableName: true`, `underscored: true`, `timestamps: false`, y pool de conexiones (max: 20, min: 0, acquire: 30000ms, idle: 30000ms).
- **Conexión `pg.Pool` (`src/config/db.js`)**: Instancia nativa `Pool` con pool max 20, timeout 30000ms, mantenida para compatibilidad y para el test runner.

### 4.2 Bootstrap y Middlewares Globales (`src/app.js` y `src/server.js`)
- `server.js`: Valida conectividad con `db.testConnection()`, inicia `app.listen(env.PORT)` y registra escuchadores para señales `SIGINT` y `SIGTERM` para efectuar *graceful shutdown* cerrando el servidor HTTP y finalizando el pool de base de datos.
- Middlewares globales en `app.js` (en orden de ejecución):
  1. `helmet()`: Cabeceras de seguridad HTTP.
  2. `cors({ origin: '*', methods: [...], allowedHeaders: [...] })`: Habilitación de CORS para el cliente frontend.
  3. `express.json({ limit: '10mb' })`: Deserialización de cuerpos JSON.
  4. `express.urlencoded({ extended: true, limit: '10mb' })`: Deserialización de payloads URL-encoded.
  5. `morgan('dev')`: Registro de logs HTTP en consola (desactivado cuando `NODE_ENV === 'test'`).
  6. Enrutador `/api`: Montaje de `src/routes/index.js`.
  7. Manejador 404: Dispara `NotFoundError` para cualquier ruta o método no mapeado.
  8. `errorHandler`: Middleware centralizado con 4 argumentos `(err, req, res, next)`.

### 4.3 Tabla Completa de Endpoints

| Método | Ruta | Middlewares (Auth / Rol) | Controller.Función | Service.Función | Repository.Función | Descripción |
|---|---|---|---|---|---|---|
| `GET` | `/api/health` | Ninguno (Público) | Inline en `routes/index.js` | No aplica | `db.testConnection()` | Monitoreo de salud para Cloud Run / Docker. |
| `GET` | `/api/bodegas` | Ninguno (Público) | Inline en `routes/index.js` | No aplica | `Bodega.findAll()` | Listado de bodegas activas con su sucursal. |
| `GET` | `/api/categorias`| Ninguno (Público) | Inline en `routes/index.js` | No aplica | `categoriaRepository.findAll()` | Catálogo de categorías temáticas ordenadas. |
| `GET` | `/api/usuarios` | `authenticate`, `authorize('Administrador')` | Inline en `routes/index.js` | No aplica | `Usuario.findAll()` | Lista de usuarios activos para asignación. |
| `POST` | `/api/auth/login` | Ninguno (Público) | `authController.login` | `authService.login` | `usuarioRepository.findByEmail` | Autentica credenciales y genera token JWT. |
| `GET` | `/api/auth/me` | `authenticate` | `authController.me` | No aplica | No aplica (lee `req.user`) | Perfil del usuario autenticado en la sesión. |
| `GET` | `/api/libros` | Ninguno (Público) | `libroController.listar` | No aplica | `libroRepository.searchAndList` | Catálogo de libros con filtros `q` y categoría. |
| `GET` | `/api/libros/:ref` | Ninguno (Público) | `libroController.detalle` | No aplica | `libroRepository.findDetalleByRef` | Ficha técnica pública y disponibilidad por ref/UUID. |
| `POST` | `/api/libros/escanear` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateEscanearLibro` | `libroController.escanear` | `libroService.escanearLibro` | `libroRepository.upsert`, `inventarioRepository.findOrCreate`, `movimientoRepository.createMovimiento` | Escaneo de ISBN, registro atómico e ingreso de 1 unidad. Body: `{ isbn, bodegaId }`. Actor (`usuarioId`) tomado de `req.user.id`. |
| `POST` | `/api/libros/consultar`| `authenticate`, `authorize('Administrador', 'Empleado')`, `validateConsultarLibro` | `libroController.consultar` | `libroService.consultarLibro` | `libroRepository.findByIsbn`, `inventarioRepository.findByLibroId` | Verifica existencia local o sugiere metadatos de Google Books sin persistir. |
| `POST` | `/api/libros/registrar`| `authenticate`, `authorize('Administrador', 'Empleado')`, `validateRegistrarLibro` | `libroController.registrar` | `libroService.registrarLibro` | `libroRepository.create`, `inventarioRepository.findOrCreate`, `movimientoRepository.createMovimiento` | Registro manual de libro con regla de precio por rol e ingreso inicial. |
| `POST` | `/api/libros/:id/ingreso` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateIngresoLibro` | `libroController.ingreso` | `libroService.ingresoLibro` | `libroRepository.findById`, `inventarioRepository.findOrCreate`, `movimientoRepository.createMovimiento` | Ingreso de unidades de stock a un libro existente en bodega. |
| `GET` | `/api/inventario/resumen` | `authenticate`, `authorize('Administrador', 'Empleado')` | `inventarioController.resumen` | `inventarioService.obtenerResumen` | `inventarioRepository.getResumen` | Métricas generales de stock, bajo stock, obsoletos y sin precio. |
| `GET` | `/api/inventario` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateListarInventario` | `inventarioController.listar` | `inventarioService.listarInventario` | `inventarioRepository.findAllWithDetails` | Listado de inventario con filtros por estado, término y bodega. |
| `POST` | `/api/inventario/:id/salida` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateSalidaInventario` | `inventarioController.salida` | `inventarioService.registrarSalida` | `inventarioRepository.findByIdForUpdate`, `movimientoRepository.createMovimiento` | Registro de salida de stock con bloqueo pesimista. |
| `POST` | `/api/inventario/:id/ajuste` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateAjusteInventario` | `inventarioController.ajuste` | `inventarioService.registrarAjuste` | `inventarioRepository.findByIdForUpdate`, `movimientoRepository.createMovimiento` | Ajuste directo de stock auditado con bloqueo pesimista. |
| `GET` | `/api/movimientos` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateListarMovimientos` | `inventarioController.listarMovimientos` | `inventarioService.listarMovimientos` | `movimientoRepository.findAllWithFilters` | Kardex cronológico de movimientos paginado. |

### 4.4 Modelos Sequelize (`src/models/`)

| Modelo | Archivo | Tabla | Asociaciones Definidas | Hooks |
|---|---|---|---|---|
| `Sucursal` | `sucursal.model.js` | `sucursales` | `hasMany(models.Bodega, { as: 'bodegas', foreignKey: 'sucursal_id', onDelete: 'CASCADE' })` | No existe |
| `Bodega` | `bodega.model.js` | `bodegas` | `belongsTo(models.Sucursal, { as: 'sucursal', foreignKey: 'sucursal_id' })`, `hasMany(models.Inventario, { as: 'inventarios', foreignKey: 'bodega_id' })`, `belongsToMany(models.Libro, { through: models.Inventario, as: 'libros', foreignKey: 'bodega_id', otherKey: 'libro_id' })` | No existe |
| `Rol` | `rol.model.js` | `roles` | `hasMany(models.Usuario, { as: 'usuarios', foreignKey: 'rol_id', onDelete: 'RESTRICT' })` | No existe |
| `Usuario` | `usuario.model.js` | `usuarios` | `belongsTo(models.Rol, { as: 'rol', foreignKey: 'rol_id' })`, `hasMany(models.MovimientoInventario, { as: 'movimientos', foreignKey: 'usuario_id' })` | No existe |
| `Autor` | `autor.model.js` | `autores` | `hasMany(models.Libro, { as: 'libros', foreignKey: 'autor_id', onDelete: 'SET NULL' })` | No existe |
| `Editorial` | `editorial.model.js` | `editoriales` | `hasMany(models.Libro, { as: 'libros', foreignKey: 'editorial_id', onDelete: 'SET NULL' })` | No existe |
| `Categoria` | `categoria.model.js` | `categorias` | `hasMany(models.Libro, { as: 'libros', foreignKey: 'categoria_id', onDelete: 'SET NULL' })` | No existe |
| `Libro` | `libro.model.js` | `libros` | `belongsTo(models.Autor, { as: 'autor' })`, `belongsTo(models.Editorial, { as: 'editorial' })`, `belongsTo(models.Categoria, { as: 'categoria' })`, `hasMany(models.Inventario, { as: 'inventarios', foreignKey: 'libro_id' })`, `belongsToMany(models.Bodega, { through: models.Inventario, as: 'bodegas', foreignKey: 'libro_id', otherKey: 'bodega_id' })` | No existe |
| `Inventario` | `inventario.model.js` | `inventarios` | `belongsTo(models.Libro, { as: 'libro', foreignKey: 'libro_id' })`, `belongsTo(models.Bodega, { as: 'bodega', foreignKey: 'bodega_id' })`, `hasMany(models.MovimientoInventario, { as: 'movimientos', foreignKey: 'inventario_id' })` | No existe |
| `TipoMovimiento` | `tipoMovimiento.model.js`| `tipo_movimientos` | `hasMany(models.MovimientoInventario, { as: 'movimientos', foreignKey: 'tipo_movimiento_id' })` | No existe |
| `MovimientoInventario` | `movimientoInventario.model.js` | `movimientos_inventario` | `belongsTo(models.Inventario, { as: 'inventario', foreignKey: 'inventario_id' })`, `belongsTo(models.Usuario, { as: 'usuario', foreignKey: 'usuario_id' })`, `belongsTo(models.TipoMovimiento, { as: 'tipo_movimiento', foreignKey: 'tipo_movimiento_id' })` | No existe |

### 4.5 Firmas por Capa, Transacciones y Control de Concurrencia

#### Capa de Controladores (`src/controllers/`)
- `auth.controller.js`:
  - `login(req, res, next)`: Extrae `email` y `password`, llama a `authService.login`, responde con HTTP 200. Depende de `authService`.
  - `me(req, res, next)`: Responde con HTTP 200 enviando `req.user`. Sin dependencias externas.
- `libro.controller.js`:
  - `escanear(req, res, next)`: Extrae `isbn`, `bodegaId`, `usuarioId`, llama a `libroService.escanearLibro`. Depende de `libroService`.
  - `listar(req, res, next)`: Extrae `q` y `categoriaId`, llama a `libroRepository.searchAndList`, calcula `ref` con `buildRef`. Depende de `libroRepository`, `slug.js`.
  - `consultar(req, res, next)`: Extrae `isbn`, llama a `libroService.consultarLibro`. Depende de `libroService`.
  - `registrar(req, res, next)`: Extrae payload de libro, inyecta `req.user.id` y `req.user.rol`, llama a `libroService.registrarLibro`. Depende de `libroService`.
  - `ingreso(req, res, next)`: Extrae `id` de params, `bodegaId` y `cantidad` de body, inyecta `req.user.id`, llama a `libroService.ingresoLibro`. Depende de `libroService`.
  - `detalle(req, res, next)`: Parsea `ref` con `parseRef`, consulta `libroRepository.findDetalleByRef`. Depende de `libroRepository`, `slug.js`, `errors.js`.
- `inventario.controller.js`:
  - `listar(req, res, next)`: Extrae `estado`, `q`, `bodegaId`, llama a `inventarioService.listarInventario`. Depende de `inventarioService`.
  - `resumen(req, res, next)`: Llama a `inventarioService.obtenerResumen`. Depende de `inventarioService`.
  - `listarMovimientos(req, res, next)`: Extrae filtros de kardex, llama a `inventarioService.listarMovimientos`. Depende de `inventarioService`.
  - `salida(req, res, next)`: Extrae `id`, `cantidad`, `motivo`, inyecta `req.user.id`, llama a `inventarioService.registrarSalida`. Depende de `inventarioService`.
  - `ajuste(req, res, next)`: Extrae `id`, `stockNuevo`, `motivo`, inyecta `req.user.id`, llama a `inventarioService.registrarAjuste`. Depende de `inventarioService`.

#### Capa de Servicios (`src/services/`)
- `auth.service.js`:
  - `login({ email, password })`: Valida presencia de campos, busca usuario por email, compara con `bcrypt.compare`, valida estado `activo`, firma JWT con `jwt.sign`. Depende de `usuarioRepository`, `bcryptjs`, `jsonwebtoken`, `env.js`, `errors.js`.
- `googleBooks.service.js`:
  - `normalizarIsbn(isbn)`: Elimina espacios y guiones.
  - `buscarPorIsbn(rawIsbn)`: Orquesta llamadas con caché de 1h y cascada: Google Books API (3s timeout) → OpenLibrary API (3s timeout) → Catálogo estático de contingencia (`FALLBACK_CATALOG`).
  - `_consultarGoogleBooks(isbn, timeoutMs)`: Realiza `fetch` con timeout y mapea volumen.
  - `_consultarFallbackOpenLibrary(isbn, timeoutMs)`: Realiza `fetch` a OpenLibrary y resuelve autores mediante `Promise.allSettled`.
- `libro.service.js`:
  - `_upsertMasterRecord(Model, transaction, nombre, defaults, updates)`: Busca o crea un maestro protegiendo la transacción mediante savepoint.
  - `_upsertAutor(transaction, { nombre, biografia })`: Upsert para modelo `Autor`.
  - `_upsertEditorial(transaction, { nombre, pais })`: Upsert para modelo `Editorial`.
  - `escanearLibro({ isbn, bodegaId, usuarioId })`: Valida entidades antes de la transacción; consulta API externa fuera de transacción; ejecuta `sequelize.transaction(...)` para insertar o reusar libro, asegurar inventario y registrar movimiento `Ingreso`.
  - `_crearMovimientoIngreso(transaction, { inventarioId, usuarioId, cantidad, motivoDetalle })`: Helper para crear tipo de movimiento `Ingreso` y registrar el movimiento.
  - `consultarLibro({ isbn })`: Consulta existencia local; si no existe, consulta API externa sin insertar nada en base de datos.
  - `registrarLibro({ ...params, usuarioId, usuarioRol })`: Ejecuta `sequelize.transaction(...)`; aplica regla de precio (si `usuarioRol !== 'Administrador'`, fuerza `precio = 0` y `precio_pendiente = true`); upsert de autor/editorial, crea libro, asegura inventario y crea movimiento `Ingreso`.
  - `ingresoLibro({ libroId, bodegaId, cantidad, usuarioId })`: Ejecuta `sequelize.transaction(...)`; valida libro y bodega, asegura inventario e inserta movimiento `Ingreso`.
- `inventario.service.js`:
  - `listarInventario({ estado, q, bodegaId })`: Aplica umbral de obsolescencia y consulta repositorio. Depende de `inventarioRepository`, `env.js`.
  - `obtenerResumen()`: Consulta métricas consolidadas. Depende de `inventarioRepository`, `env.js`.
  - `listarMovimientos({ libroId, bodegaId, tipo, limit, offset })`: Valida límites y consulta kardex. Depende de `movimientoRepository`.
  - `registrarSalida({ inventarioId, cantidad, motivo, usuarioId })`: Ejecuta `sequelize.transaction(...)`; aplica bloqueo pesimista con `findByIdForUpdate`; valida stock suficiente; inserta movimiento `Salida` (disparando el trigger que decrementa stock); retorna inventario actualizado.
  - `registrarAjuste({ inventarioId, stockNuevo, motivo, usuarioId })`: Ejecuta `sequelize.transaction(...)`; aplica bloqueo pesimista con `findByIdForUpdate`; valida cambio de stock; inserta movimiento `Ajuste` con cantidad = stockNuevo (disparando el trigger que fija el stock); retorna inventario actualizado.

#### Manejo de Transacciones y Control de Concurrencia
- **Mecanismo transaccional**: `sequelize.transaction(async (transaction) => { ... })`. Todas las llamadas ORM dentro de la unidad de trabajo reciben `{ transaction }`.
- **Bloqueo pesimista**: Se aplica en `inventarioRepository.findByIdForUpdate(id, { transaction })` mediante `lock: transaction.LOCK.UPDATE`, traduciéndose en `SELECT ... FOR UPDATE` a nivel PostgreSQL para evitar *race conditions* en decrementos y ajustes simultáneos.
- **Savepoints**: En `LibroService._upsertMasterRecord` y `MovimientoRepository.ensureTipoMovimiento` se usa `sequelize.transaction({ transaction }, (savepoint) => ...)` para aislar infracciones de restricciones `UNIQUE` (código PostgreSQL `23505`) sin abortar la transacción principal.

### 4.6 Autenticación, 2FA y RBAC

#### JWT
- Firmado con `jsonwebtoken` usando `HS256` y clave `env.jwt.secret`.
- Tiempo de vida: configurado en `env.jwt.expiresIn` (por defecto `8h`).
- Payload del token: `{ sub: usuario.id, rol: usuario.rol_nombre, nombre: usuario.nombre_completo }`.

#### 2FA (Segundo Factor)
- **Estado real en backend**: No implementado.
- Existen columnas en base de datos (`dos_factores_activo`, `dos_factores_secreto`) y atributos en el modelo `Usuario`, pero no existen rutas, controladores ni lógica para generación/verificación TOTP en `auth.service.js`.

#### RBAC (Control de Acceso Basado en Roles)
- Middleware `authenticate` (`src/middlewares/auth.js`):
  1. Extrae cabecera `Authorization: Bearer <token>`.
  2. Valida firma y expiración del JWT.
  3. Carga el registro del usuario mediante `usuarioRepository.findById(decoded.sub)`.
  4. Valida que `usuario.activo === true`.
  5. Asigna `req.user = { id, nombre_completo, email, rol }`.
- Middleware `authorize(...roles)` (`src/middlewares/auth.js`):
  1. Verifica existencia de `req.user`. Si no existe, eleva `UnauthorizedError` (HTTP 401).
  2. Evalúa si `roles.includes(req.user.rol)`. Si no está incluido, eleva `ForbiddenError` (HTTP 403).

### 4.7 Integraciones Externas (`src/services/googleBooks.service.js`)
- **Proveedor primario**: Google Books API (`https://www.googleapis.com/books/v1/volumes?q=isbn:{isbn}`).
  - Timeout: 3000 ms controlado mediante `AbortSignal.timeout(3000)`.
  - API Key: Inyectada si `GOOGLE_BOOKS_API_KEY` está configurada.
- **Proveedor secundario (Fallback)**: OpenLibrary API (`https://openlibrary.org/isbn/{isbn}.json`).
  - Timeout: 3000 ms.
  - Resolución de autores: Itera hasta 3 claves `/authors/OL...json` en paralelo con `Promise.allSettled`, ignorando fallos individuales.
- **Proveedor terciario (Contingencia estática)**: `FALLBACK_CATALOG` en memoria (contiene datos bibliográficos completos de 4 obras clásicas de software y literatura: Clean Code, The Pragmatic Programmer, Don Quijote, Cien años de soledad).
- **Caché**: Instancia `Map` en memoria con TTL de 1 hora (`60 * 60 * 1000` ms).

### 4.8 Manejo de Errores y Formato de Respuestas
- **Jerarquía de Errores (`src/utils/errors.js`)**:
  - `AppError` (base, status code configurable)
  - `ValidationError` (HTTP 400, soporta array `details`)
  - `NotFoundError` (HTTP 404)
  - `ConflictError` (HTTP 409, define `ConflictError.PG_UNIQUE_VIOLATION = '23505'`)
  - `UnauthorizedError` (HTTP 401)
  - `ForbiddenError` (HTTP 403)
- **Middleware `errorHandler` (`src/middlewares/errorHandler.js`)**:
  - Mapea `UniqueConstraintError` o código PG `23505` a HTTP 409 con mensaje `"El recurso ya existe."`.
  - Mapea `ForeignKeyConstraintError` o código PG `23503` a HTTP 400 con mensaje `"La referencia indicada no es válida."`.
  - Mapea `SequelizeValidationError` o código PG `22P02` a HTTP 400 con mensaje `"Los datos enviados no son válidos."`.
  - Mapea código PG `P0001` (excepciones de triggers PL/pgSQL) a HTTP 400 con mensaje `"La operación no puede completarse por una regla de negocio."`.
  - Enmascara errores 500 con `"Error interno del servidor."` y previene la fuga de sentencias SQL, parámetros o trazas internas.
- **Contratos de Respuesta HTTP**:
  - Éxito: `{ "status": "success", "data": ... [, "results": N] }`.
  - Fallo operacional (4xx): `{ "status": "fail", "message": "..." [, "details": [...]] }`.
  - Error no controlado (5xx): `{ "status": "error", "message": "Error interno del servidor." }`.

### 4.9 Suite de Pruebas Automatizadas Backend

| Archivo de Prueba | Tipo | Base de Datos | Mocks Utilizados | Cobertura Funcional |
|---|---|---|---|---|
| `tests/isbnValidation.test.js` | Unitaria | No requiere | No | Algoritmo checksum ISBN-10 y 13, normalización de guiones, rechazo de > 20 chars. |
| `tests/errorHandler.test.js` | Unitaria | No requiere | `httpMocks.js` | Mapeo de errores Sequelize, códigos PostgreSQL, ocultamiento de SQL y formato JSON. |
| `tests/googleBooks.test.js` | Integración / Mock | No requiere | `global.fetch` | Manejo de timeouts, errores 429/500, fallback a OpenLibrary y catálogo de contingencia. |
| `tests/sequelize.test.js` | Integración | `libreria_oskar_test` | No | Conectividad ORM, verificación de definición de los 11 modelos y carga eager loading. |
| `tests/repositories.test.js` | Integración | `libreria_oskar_test` | No | `CategoriaRepository`, `AutorRepository`, `EditorialRepository` (upsert y rollback). |
| `tests/usuarioRepository.test.js` | Integración | `libreria_oskar_test` | No | Búsqueda por email/UUID, exclusión de credenciales sensibles, compatibilidad de transacciones. |
| `tests/libroRepository.test.js` | Integración | `libreria_oskar_test` | No | Búsqueda por ISBN/UUID, inserción ORM, manejo de concurrencia y agregaciones de stock. |
| `tests/movimientoRepository.test.js` | Integración | `libreria_oskar_test` | No | Búsqueda/creación de tipos, verificación del trigger PL/pgSQL y reversión en rollback. |
| `tests/inventarioRepository.test.js` | Integración | `libreria_oskar_test` | No | Bloqueo pesimista `FOR UPDATE`, cálculo de stock obsoleto, alertas mínimas y KPIs de resumen. |
| `tests/inventarioService.test.js` | Integración | `libreria_oskar_test` | No | Salidas y ajustes vía servicio, rechazo de saldo insuficiente (HTTP 409) y concurrencia. |
| `tests/libroServiceSequelize.test.js`| Integración | `libreria_oskar_test` | `googleBooksService` | Escaneo completo, registro manual por rol, ingresos repetidos y atomicidad ACID. |
| `tests/escanear.integration.test.js` | Integración | `libreria_oskar_test` | No | Flujo de escaneo con sembrado dinámico y verificación de rollback inducido. |
| `tests/api.e2e.test.js` | End-to-End | `libreria_oskar_test` | No | Endpoints HTTP reales vía servidor Express temporal: health, bodegas, login, usuarios y escaneo. |

- **Runner**: Node.js test runner nativo (`node --test --test-concurrency=1 tests/**/*.test.js`), ejecutado mediante `src/run-tests.js`.
- **Aislamiento**: `src/run-tests.js` bloquea la ejecución si `NODE_ENV === 'production'` o si el nombre de la base de datos no es exactamente `libreria_oskar_test`.

---

## 5. Frontend (React 18 + Vite + Tailwind CSS)

### 5.1 Entry Point y Enrutamiento (`src/App.jsx`)

| Ruta | Vista Componente | Acceso / Rol Requerido | Comportamiento |
|---|---|---|---|
| `/` | `Navigate` | Público | Redirige automáticamente a `/catalogo` |
| `/catalogo` | `Catalogo` | Público | Catálogo interactivo de libros con buscador y filtros |
| `/catalogo/:ref` | `LibroDetalle` | Público | Ficha técnica y disponibilidad por sucursal |
| `/nosotros` | `Nosotros` | Público | Información institucional de la empresa |
| `/login` | `Login` | Público | Formulario de autenticación de operadores |
| `/registrar` | `RegistrarLibro` | `Administrador`, `Empleado` | Escaneo y registro de libros (protegido por `ProtectedRoute`) |
| `/inventario` | `Inventario` | `Administrador`, `Empleado` | Dashboard, gestión de stock y kardex (protegido por `ProtectedRoute`) |
| `*` | `Navigate` | Público | Redirige cualquier ruta desconocida a `/catalogo` |

### 5.2 Análisis Detallado por Vista

#### 1. `Catalogo.jsx` (660 líneas)
- **Responsabilidades**: Exploración visual de libros activos, filtrado por categorías temáticas (clasificadas en "Ramas del Derecho" y "Otras categorías"), búsqueda con debounce en vivo, drawer lateral para dispositivos móviles con bloqueo de scroll, y enlaces a fichas técnicas.
- **Endpoints consumidos**:
  - `GET /api/categorias` (carga inicial del catálogo de filtros)
  - `GET /api/libros?q=...&categoriaId=...` (recarga reactiva)
- **Estado local relevante**: `libros`, `categorias`, `isLoading`, `searchTerm`, `categoriaId`, `isMobileFiltersOpen`, `resultsCount`.
- **Componentes que utiliza**: `BtnCategoria`, `PanelFiltros`, `DrawerFiltros`, `Footer`, iconos de `lucide-react`.
- **Lógica que debería extraerse**:
  - Hook personalizado `useCatalogoFilters` para manejar sincronización de query params en URL, debounce y llamadas a la API.
  - Subcomponente independiente `BookGrid` y `BookCatalogCard`.

#### 2. `LibroDetalle.jsx` (347 líneas)
- **Responsabilidades**: Presentación detallada del libro a partir de su slug o UUID (`:ref`), visualización de portada ampliada, precio formateado, y desglose de existencias por bodega y sucursal.
- **Endpoints consumidos**:
  - `GET /api/libros/:ref`
- **Estado local relevante**: `libro`, `isLoading`, `notFound`, `error`.
- **Componentes que utiliza**: `LoadingSpinner`, `Footer`, iconos de `lucide-react`.
- **Lógica que debería extraerse**:
  - Subcomponente `DisponibilidadTable` para aislar la tabla de sucursales/bodegas.
  - Hook `useLibroDetalle(ref)`.

#### 3. `RegistrarLibro.jsx` (1010 líneas)
- **Responsabilidades**: Orquesta el registro de libros físicos: escaneo con cámara, búsqueda automática de metadatos o formulario de captura manual completo con validación matemática de ISBN, verificación de duplicados locales, e ingreso de existencias. Oculta el campo de precio a usuarios con rol Empleado.
- **Endpoints consumidos**:
  - `GET /api/bodegas`
  - `GET /api/categorias`
  - `POST /api/libros/consultar`
  - `POST /api/libros/:id/ingreso`
  - `POST /api/libros/registrar`
- **Estado local relevante**: `paso` ('scanner' \| 'existe' \| 'noExiste'), `isbnInput`, `libroExistente`, `sugerencia`, `bodegas`, `categorias`, `bodegaId`, `cantidadIngreso`, `regForm` (objeto de 11 campos), `fieldErrors`, `historial`.
- **Componentes que utiliza**: `BarcodeScanner`, `LoadingSpinner`, `Toast`, iconos de `lucide-react`.
- **Lógica que debería extraerse**:
  - Máquina de estados o hook `useRegistrarLibroWizard`.
  - Formularios separados en componentes dedicados: `FormLibroExiste` y `FormLibroManual`.
  - Módulo independiente de validación de ISBN y campos de formulario.

#### 4. `Inventario.jsx` (1181 líneas)
- **Responsabilidades**: Dashboard analítico de almacenes: métricas globales (KPIs), listado filtrable de existencias con alertas de stock mínimo y obsolescencia, kardex cronológico de movimientos paginado, modal de registro de salida de mercancía, y modal de ajuste auditado de existencias.
- **Endpoints consumidos**:
  - `GET /api/bodegas`
  - `GET /api/inventario/resumen`
  - `GET /api/inventario?estado=...&q=...&bodegaId=...`
  - `GET /api/movimientos?libroId=...&bodegaId=...&tipo=...&limit=...&offset=...`
  - `POST /api/inventario/:id/salida`
  - `POST /api/inventario/:id/ajuste`
- **Estado local relevante**: `activeTab` ('existencias' \| 'kardex'), `resumen`, `existencias`, `movimientos`, `estadoFilter`, `searchInput`, `selectedBodega`, `modalSalida`, `modalAjuste`, `kardexPage`.
- **Componentes que utiliza**: `Toast`, `TipoBadge`, `EstadoBadge`, iconos de `lucide-react`.
- **Lógica que debería extraerse**:
  - Modales extraídos a componentes dedicados: `ModalSalidaInventario` y `ModalAjusteInventario`.
  - Componentes de tablas: `TablaExistencias` y `TablaKardex`.
  - Hooks `useInventarioData` y `useKardexPagination`.

#### 5. `Login.jsx` (119 líneas)
- **Responsabilidades**: Captura de credenciales (correo y contraseña), envío al backend, almacenamiento de sesión en contexto, y redirección a la ruta previa o a `/inventario`.
- **Endpoints consumidos**:
  - `POST /api/auth/login` (a través de `login()` en `AuthContext`)
- **Estado local relevante**: `email`, `password`, `error`, `isSubmitting`.
- **Componentes que utiliza**: Iconos de `lucide-react`.
- **Lógica que debería extraerse**: Validación de formato de email en cliente.

#### 6. `Nosotros.jsx` (88 líneas)
- **Responsabilidades**: Vista estática institucional con información de sucursales, horarios, misión y datos de contacto de Librería Oskar.
- **Endpoints consumidos**: No consume endpoints.
- **Estado local relevante**: Ninguno (estático).
- **Componentes que utiliza**: `Footer`, iconos de `lucide-react`.
- **Lógica que debería extraerse**: No requiere extracción.

### 5.3 Catálogo de Componentes y Props

| Componente | Archivo | Props Aceptadas | Descripción |
|---|---|---|---|
| `Navbar` | `src/components/Navbar.jsx` | Ninguna | Barra de navegación superior responsive con tabs y estado de sesión. |
| `Footer` | `src/components/Footer.jsx` | Ninguna | Pie de página con créditos, enlaces y aviso de derechos. |
| `LoadingSpinner` | `src/components/LoadingSpinner.jsx` | `message` (String, default: "Cargando...") | Overlay visual con spinner animado para llamadas asíncronas. |
| `Toast` | `src/components/Toast.jsx` | `toast` (Objeto: `{ type, title, message, bookTitle, stockInfo }`), `onClose` (Función) | Notificación flotante emergente con temporizador de 6s. |
| `BookCard` | `src/components/BookCard.jsx` | `data` (Objeto con `libro`, `inventario`, `movimiento`, `es_nuevo_en_catalogo`), `bodegaNombre` (String) | Tarjeta enriquecida de confirmación tras escaneo atómico. |
| `BarcodeScanner` | `src/components/BarcodeScanner.jsx` | `onScanSuccess` (Función), `isProcessing` (Booleano), `onClose` (Función opcional) | Visor de escaneo por cámara web/móvil vía `html5-qrcode` con selector de lente y fallback manual. |
| `ProtectedRoute` | `src/components/ProtectedRoute.jsx` | `children` (ReactNode), `roles` (Array de strings opcional) | Guardián de navegación: verifica sesión y permisos de rol RBAC. |

### 5.4 Hooks, Contextos y Cliente HTTP

#### `api/client.js` (`apiFetch`)
- Envoltorio de `fetch` nativo.
- Lee automáticamente el token JWT desde `localStorage.getItem('oskar_token')`.
- Si existe token, inyecta `Authorization: Bearer <token>`.
- Inyecta `Content-Type: application/json` si el cuerpo no es `FormData`.
- Si la respuesta es HTTP 401 y había un token almacenado, purga `localStorage.removeItem('oskar_token')` y redirige forzosamente mediante `window.location.assign('/login')`.

#### `context/AuthContext.jsx` (`AuthProvider` y `useAuth`)
- Estado mantenido: `user` (objeto `{ id, nombre_completo, email, rol }`), `token` (String), `loading` (Booleano).
- Al inicializar (efecto de montaje): Si existe `oskar_token`, realiza petición a `GET /api/auth/me`. Si la sesión es válida, carga los datos del usuario; si falla, destruye el token.
- Funciones expuestas:
  - `login(email, password)`: Envía petición a `/api/auth/login`, persiste el token en `localStorage` y actualiza el estado.
  - `logout()`: Elimina `oskar_token` de `localStorage` y resetea `user` y `token` a `null`.

### 5.5 Guardas de Rutas y Manejo de Sesión en Cliente
- Implementadas en `ProtectedRoute.jsx`.
- Mientras `loading === true`, muestra `LoadingSpinner` centrado.
- Si `user === null`, redirige a `/login` preservando la ruta previa en `state: { from: location }`.
- Si `roles` está definido y `!roles.includes(user.rol)`, renderiza una pantalla de "Acceso Denegado" con código HTTP visual 403 y botón de retorno al catálogo.

### 5.6 Configuración de Tailwind CSS y Vite
- **Vite (`vite.config.js`)**: Puerto `5173`. Configura proxy reverso para `/api` hacia `http://localhost:3000`.
- **Tailwind CSS (`tailwind.config.js`)**:
  - Tipografía base: `fontFamily.sans: ['"Fira Sans"', 'sans-serif']`.
  - Paleta de colores corporativa `oskar`:
    - `oskar.gold`: `#e8c85e` (dorado brillante para badges y títulos)
    - `oskar.bronze`: `#b07c19` (dorado tostado para hovers y bordes)
    - `oskar.amber`: `#e19922` (dorado cálido para acentos activos y botones principales)
    - `oskar.dark`: `#252525` (antracita para tipografía principal)
    - `oskar.light`: `#f3f3f3` (gris claro para fondos y contenedores)

---

## 6. Flujos End-to-End

### 6.1 Flujo 1: Inicio de Sesión (Login)
1. **Vista**: `Login.jsx` captura `email` y `password` en el formulario y llama a `login(email, password)` del contexto.
2. **Cliente**: `AuthContext.jsx` despacha `POST /api/auth/login` con payload JSON.
3. **Servidor**: `src/app.js` recibe la petición, procesa JSON y enruta hacia `src/routes/auth.routes.js`.
4. **Controlador**: `authController.login` invoca a `authService.login`.
5. **Servicio**: `authService.login` invoca `usuarioRepository.findByEmail(email)`.
6. **Repositorio**: `usuarioRepository.findByEmail` consulta PostgreSQL con Sequelize (`Usuario.findOne` con include de `Rol`).
7. **Servicio**: Valida con `bcrypt.compare(password, usuario.password_hash)`. Si es válido, genera JWT con `jwt.sign`.
8. **Cliente**: `AuthContext.jsx` guarda el token en `localStorage('oskar_token')`, establece `user` y navega a `/inventario`.

### 6.2 Flujo 2: Autenticación de Dos Factores (2FA)
- **Estado en código**: No existe flujo end-to-end implementado. El login solo valida email y password.

### 6.3 Flujo 3: Registro de Libro por Escaneo Directo
1. **Vista**: `RegistrarLibro.jsx` (modo escáner activo) o llamada directa vía API.
2. **Cliente**: Envía `POST /api/libros/escanear` con `{ isbn, bodegaId }` y cabecera Bearer JWT.
3. **Middlewares**:
   - `auth.authenticate`: Valida JWT y autenticidad del usuario en PostgreSQL.
   - `auth.authorize('Administrador', 'Empleado')`: Rechaza con 403 al rol `Usuario` (y con 401 si no hay `req.user`).
   - `validator.validateEscanearLibro`: Normaliza y valida checksum matemático del ISBN y formato UUID de bodega. El `usuarioId` del body no se valida ni se usa.
4. **Controlador**: `libroController.escanear` llama a `libroService.escanearLibro`.
5. **Servicio (fase externa)**:
   - Valida existencia previa de bodega y usuario en BD.
   - Comprueba si el libro ya existe con `libroRepository.findByIsbn(cleanIsbn)`.
   - Si no existe localmente, consulta `googleBooksService.buscarPorIsbn(cleanIsbn)`.
6. **Servicio (fase transaccional ACID)**:
   - Inicia `sequelize.transaction(async (transaction) => ...)`.
   - Si el libro no existía, ejecuta `_upsertAutor`, `_upsertEditorial` y `libroRepository.upsert`.
   - Asegura la relación en inventario con `inventarioRepository.findOrCreate`.
   - Inserta movimiento en `movimientoRepository.createMovimiento` con `tipoMovimiento = 'Ingreso'` y `cantidad = 1`.
7. **Base de Datos (Trigger)**:
   - Se activa el trigger PL/pgSQL `tg_movimientos_inventario_stock`.
   - Ejecuta `SELECT stock_actual FROM inventarios FOR UPDATE`.
   - Incrementa `stock_actual = stock_actual + 1` de forma pesimista y atómica.
8. **Servicio**: Relee el stock actualizado por el trigger y confirma la transacción (`COMMIT`).
9. **Vista**: Recibe HTTP 201 (si es nuevo) o HTTP 200 (si ya existía) y renderiza `BookCard.jsx` y `Toast.jsx`.

### 6.4 Flujo 4: Registro Manual de Libro
1. **Vista**: `RegistrarLibro.jsx` (paso `noExiste`). El usuario completa título, autor, editorial, categoría, reseña, cantidad, stock mínimo y bodega.
   - Si `user.rol === 'Administrador'`: Se habilita el input de precio.
   - Si `user.rol === 'Empleado'`: El input de precio se deshabilita mostrando mensaje informativo.
2. **Cliente**: Despacha `POST /api/libros/registrar` con `apiFetch`.
3. **Middlewares**: `authenticate`, `authorize('Administrador', 'Empleado')`, `validateRegistrarLibro`.
4. **Controlador**: `libroController.registrar` inyecta `req.user.id` y `req.user.rol` y delega a `libroService.registrarLibro`.
5. **Servicio**:
   - Regla de rol: Si `usuarioRol !== 'Administrador'`, fuerza `precio = 0` y `precio_pendiente = true`.
   - Abre `sequelize.transaction(...)`.
   - Realiza upsert de autor y editorial con savepoints.
   - Crea el libro en `libroRepository.create`.
   - Crea inventario con `stock_minimo` configurable en `inventarioRepository.findOrCreate`.
   - Registra movimiento de tipo `Ingreso` por la cantidad inicial recibida.
6. **Base de Datos (Trigger)**: `tg_movimientos_inventario_stock` suma la cantidad inicial al inventario.
7. **Confirmación**: Transacción confirmada; el frontend muestra Toast de éxito y advierte si el precio quedó pendiente de asignación.

### 6.5 Flujo 5: Ingreso de Stock a Libro Existente
1. **Vista**: `RegistrarLibro.jsx` (paso `existe`). Muestra datos del libro y selector de bodega y cantidad.
2. **Cliente**: Despacha `POST /api/libros/:id/ingreso`.
3. **Middlewares**: `authenticate`, `authorize('Administrador', 'Empleado')`, `validateIngresoLibro`.
4. **Controlador**: `libroController.ingreso` delega a `libroService.ingresoLibro`.
5. **Servicio**:
   - Inicia transacción en Sequelize.
   - Valida existencia de libro y bodega.
   - Asegura inventario con `inventarioRepository.findOrCreate`.
   - Inserta movimiento en `movimientoRepository.createMovimiento` (`tipoMovimiento = 'Ingreso'`).
6. **Base de Datos (Trigger)**: Suma atómicamente la cantidad al inventario mediante bloqueo `FOR UPDATE`.
7. **Confirmación**: Responde HTTP 201 con stock anterior y actualizado.

### 6.6 Flujo 6: Salida de Mercancía
1. **Vista**: `Inventario.jsx` (pestaña Existencias). Clic en botón "Salida" abre modal.
2. **Cliente**: Envía `POST /api/inventario/:id/salida` con `{ cantidad, motivo }`.
3. **Middlewares**: `authenticate`, `authorize('Administrador', 'Empleado')`, `validateSalidaInventario`.
4. **Controlador**: `inventarioController.salida` delega a `inventarioService.registrarSalida`.
5. **Servicio**:
   - Inicia `sequelize.transaction(...)`.
   - Bloquea la fila con `inventarioRepository.findByIdForUpdate(inventarioId, { transaction })` (`SELECT ... FOR UPDATE`).
   - Valida que `stock_actual >= cantidad`. Si es insuficiente, arroja `ConflictError` (HTTP 409).
   - Inserta registro en `movimientos_inventario` con `tipo = 'Salida'`.
6. **Base de Datos (Trigger)**: Resta la cantidad de `stock_actual` y actualiza `ultima_auditoria`.
7. **Confirmación**: Retorna el nuevo stock y actualiza la lista en el frontend.

### 6.7 Flujo 7: Ajuste Auditado de Stock
1. **Vista**: `Inventario.jsx` (pestaña Existencias). Clic en botón "Ajuste" abre modal.
2. **Cliente**: Envía `POST /api/inventario/:id/ajuste` con `{ stockNuevo, motivo }`.
3. **Middlewares**: `authenticate`, `authorize('Administrador', 'Empleado')`, `validateAjusteInventario`.
4. **Controlador**: `inventarioController.ajuste` delega a `inventarioService.registrarAjuste`.
5. **Servicio**:
   - Inicia `sequelize.transaction(...)`.
   - Bloquea la fila con `findByIdForUpdate`.
   - Valida que `stockNuevo !== stock_actual`.
   - Inserta movimiento con `tipo = 'Ajuste'`, `cantidad = stockNuevo`, y motivo formateado con el stock previo.
6. **Base de Datos (Trigger)**: Caso `'Ajuste'`: ejecuta `stock_actual = NEW.cantidad`.
7. **Confirmación**: Retorna stock anterior y fijado; recarga la grilla.

### 6.8 Flujo 8: Catálogo Público y Ficha Detallada
1. **Vista**: `Catalogo.jsx` carga al montar `GET /api/categorias` y `GET /api/libros`.
2. **Controlador / Repositorio**: `libroRepository.searchAndList` ejecuta `Libro.findAll` con joins a `Autor`, `Editorial`, `Categoria` y `Inventario`, agregando el stock total de todas las bodegas (`COALESCE(SUM(stock_actual), 0)`).
3. **Interacción**: El usuario hace clic en una tarjeta con enlace `/catalogo/:ref` (donde `:ref` es `slug-shortId`).
4. **Vista Detalle**: `LibroDetalle.jsx` monta y despacha `GET /api/libros/:ref`.
5. **Repositorio**: `libroRepository.findDetalleByRef` parsea el shortId, localiza el libro y mapea la disponibilidad desagregada por sucursal y bodega.

### 6.9 Flujo 9: Dashboard y Resumen de Inventario
1. **Vista**: `Inventario.jsx` monta y ejecuta en paralelo `GET /api/inventario/resumen`, `GET /api/inventario` y `GET /api/bodegas`.
2. **Repositorio**: `inventarioRepository.getResumen` ejecuta agregaciones SQL:
   - Total unidades en almacenes (`SUM(stock_actual)`).
   - Títulos con existencias disponibles (`COUNT(DISTINCT libro_id)` donde `stock_actual > 0`).
   - Registros en bajo stock (`stock_actual <= stock_minimo`).
   - Registros agotados (`stock_actual = 0`).
   - Registros obsoletos (sin salidas en los últimos 90 días).
   - Libros sin precio asignado (`precio = 0 OR precio IS NULL`).
   - Top 10 alertas críticas de desabastecimiento ordenadas por déficit.
3. **Vista**: Renderiza las tarjetas de KPIs y la tabla de alertas críticas.

---

## 7. Infraestructura y DevOps

### 7.1 Dockerfiles
- **Backend (`app/backend/Dockerfile`)**:
  - Construcción multi-stage optimizada para producción.
  - **Etapa 1 (`dependencies`)**: Base `node:22-alpine`, instala `libc6-compat`, copia `package.json` y `package-lock.json`, ejecuta `npm ci --omit=dev --ignore-scripts` y limpia caché npm.
  - **Etapa 2 (`runner`)**: Base `node:22-alpine`, variables `NODE_ENV=production`, `PORT=8080`. Copia `node_modules` desde la etapa 1 y código fuente de `src/`.
  - **Seguridad**: Ejecuta bajo usuario no privilegiado `USER node`.
  - **Healthcheck**: Sondeo cada 30s al endpoint `/api/health` mediante `node -e fetch(...)`.
  - **Puerto expuesto**: `8080` (estándar de Cloud Run). Comando de inicio: `CMD ["node", "src/server.js"]`.
- **Frontend Dockerfile**: No existe en el repositorio.

### 7.2 Docker Compose (`app/docker-compose.yml`)
- **Versión**: `3.8`.
- **Servicios declarados**:
  1. `db`: Imagen `postgres:15-alpine`. Expone puerto host `5434:5432`. Base `libreria_oskar`. Monta `./database/schema.sql` en `/docker-entrypoint-initdb.d/01_schema.sql` para inicialización automática. Volumen `pgdata`.
  2. `db-test`: Imagen `postgres:15-alpine`. Expone puerto host `5435:5432`. Perfil `["test"]`. Base `libreria_oskar_test`. Volumen `pgdata_test`.
  3. `backend`: Construye desde `./backend/Dockerfile`. Expone puerto host `3000:8080`. Variables: `DB_HOST=db`, `DB_PORT=5432`, `PORT=8080`. Espera estado saludable de `db`.
- **Servicio Frontend en Compose**: No existe declarado en `docker-compose.yml`.

### 7.3 Workflows CI/CD (`app/.github/workflows/deploy.yml`)
- **Disparadores**: `push` a la rama `main` o ejecución manual `workflow_dispatch`.
- **Variables y Secretos**: `GCP_PROJECT_ID`, `GCP_SA_KEY`, `CLOUD_SQL_CONNECTION_NAME`, `DB_USER`, `DB_PASSWORD`, `DB_NAME`, `GOOGLE_BOOKS_API_KEY`.
- **Job 1: `test-and-verify` (CI)**:
  - Ejecuta en `ubuntu-latest`.
  - Levanta contenedor de servicio PostgreSQL 15 en puerto 5432.
  - Configura Node 22 (`setup-node@v4`).
  - Aplica `database/schema.sql` usando `psql`.
  - Ejecuta `npm ci` y `npm test` en `backend/`.
- **Job 2: `build-and-deploy` (CD)**:
  - Requiere aprobación del Job 1 (`needs: test-and-verify`).
  - Autentica en Google Cloud vía `google-github-actions/auth@v2` con credenciales de cuenta de servicio.
  - Configura Docker para Google Artifact Registry (`GAR_LOCATION`).
  - Construye la imagen Docker del backend con tags `:commit-sha` y `:latest`, y la publica en Artifact Registry.
  - Despliega en Google Cloud Run (`google-github-actions/deploy-cloudrun@v2`) con `--allow-unauthenticated`, conexión a Cloud SQL vía socket `/cloudsql/...` y variables de entorno productivas.

---

## 8. Matriz de Permisos Real

### 8.1 Matriz de Acceso por Rol Verificada en Código

| Módulo / Acción | Endpoint Backend | Público / Anónimo | Empleado | Administrador | Rol 'Usuario' en BD |
|---|---|---|---|---|---|
| Consultar Catálogo | `GET /api/libros` | Permitido | Permitido | Permitido | Permitido |
| Ver Ficha de Libro | `GET /api/libros/:ref` | Permitido | Permitido | Permitido | Permitido |
| Ver Sedes y Nosotros | Vista `/nosotros` | Permitido | Permitido | Permitido | Permitido |
| Iniciar Sesión | `POST /api/auth/login` | Permitido | Permitido | Permitido | Permitido |
| Consultar Perfil | `GET /api/auth/me` | Denegado (401) | Permitido | Permitido | Permitido |
| Listar Usuarios Operadores | `GET /api/usuarios` | Denegado (401) | Denegado (403) | Permitido | Denegado (403) |
| Escanear ISBN Directo | `POST /api/libros/escanear` | Denegado (401) | Permitido | Permitido | Denegado (403) |
| Consultar ISBN Previo | `POST /api/libros/consultar` | Denegado (401) | Permitido | Permitido | Denegado (403) |
| Ingreso Stock Existente | `POST /api/libros/:id/ingreso`| Denegado (401) | Permitido | Permitido | Denegado (403) |
| Registro Manual de Libro | `POST /api/libros/registrar` | Denegado (401) | Permitido (Precio = 0) | Permitido (Define Precio) | Denegado (403) |
| Ver Dashboard / Resumen | `GET /api/inventario/resumen` | Denegado (401) | Permitido | Permitido | Denegado (403) |
| Listar Existencias | `GET /api/inventario` | Denegado (401) | Permitido | Permitido | Denegado (403) |
| Registrar Salida Stock | `POST /api/inventario/:id/salida`| Denegado (401) | Permitido | Permitido | Denegado (403) |
| Registrar Ajuste Stock | `POST /api/inventario/:id/ajuste`| Denegado (401) | Permitido | Permitido | Denegado (403) |
| Consultar Kardex | `GET /api/movimientos` | Denegado (401) | Permitido | Permitido | Denegado (403) |

### 8.2 Diferencias con lo Declarado en AGENTS.md
1. **Rol Usuario**: `AGENTS.md` estipula que solo existen `Administrador` y `Empleado` como roles operativos y que el catálogo es público. En la base de datos se sembró el rol `'Usuario'`, pero no tiene acceso a ninguna vista protegida ni existe endpoint de autorregistro.
2. **Escaneo por ISBN (`POST /api/libros/escanear`)**: Resuelto en T3. La ruta exige `authenticate` + `authorize('Administrador', 'Empleado')` y su JSDoc declara `@access Administrador / Empleado`. El rol `Usuario` recibe 403.
3. **Gestión de Empleados**: AGENTS.md las lista en "Roadmap (NO implementado)" y sus specs están en app/docs/roadmap/. En el código solo existe `GET /api/usuarios` para lectura; no existen endpoints de creación, edición o baja de empleados.

### 8.3 Ocultamiento de Precios al Empleado (Comportamiento Exacto)
- **En Backend (`POST /api/libros/registrar`)**: `libroService.registrarLibro` evalúa `esAdmin = (usuarioRol === 'Administrador')`. Si el usuario es `Empleado`, ignora cualquier valor enviado en `precio`, fuerza `precioFinal = 0.00` y retorna la bandera `"precio_pendiente": true`.
- **En Backend (`POST /api/libros/consultar`)**: La sugerencia retornada cuando un libro no existe omite intencionalmente el precio recuperado de Google Books para evitar fijaciones no autorizadas.
- **En Frontend (`RegistrarLibro.jsx`)**:
  - En el paso `existe` (ingreso a libro existente), la etiqueta de precio está envuelta en `{esAdmin && (<p>Precio: Q{precio.toFixed(2)}</p>)}`, por lo que se oculta completamente al Empleado.
  - En el paso `noExiste` (formulario manual), el campo `precio` solo se muestra como `<Input>` editable al Administrador; al Empleado se le muestra un contenedor desactivado con el texto `"El administrador asignará el precio"`.
- **En Catálogo Público y Detalle (`Catalogo.jsx` y `LibroDetalle.jsx`)**: El precio de venta al público NO se oculta al Empleado ni a visitantes anónimos; se muestra siempre que sea mayor a 0, o muestra `"Precio por confirmar"` si es 0.

---

## 9. Deuda Técnica Observada

| Ítem / Problema | Archivo afectado | Evidencia en código |
|---|---|---|
| **Componentes de vista monolíticos** | `app/frontend/src/views/Inventario.jsx`, `RegistrarLibro.jsx`, `Catalogo.jsx` | Archivos de 1181, 1010 y 660 líneas que mezclan UI, peticiones HTTP, debounce, modales y validación de reglas de negocio. |
| **Cliente de base de datos dual y código redundante** | `app/backend/src/config/db.js` | Mantiene configuración y pool de `pg` nativo cuando todos los repositorios fueron migrados a Sequelize. Solo se usa para tests y healthcheck. |
| **Monorepo incompleto** | `app/package.json` | Ejecuta scripts con flags `--prefix`, pero no declara la propiedad formal `"workspaces": ["backend", "frontend"]`. |
| **Ausencia de tests en Frontend** | `app/frontend/` | No existe directorio de pruebas, ni frameworks como Vitest, Jest o React Testing Library en `package.json`. |
| **Duplicación de validación de ISBN** | `app/backend/src/middlewares/validator.js`, `app/backend/src/services/googleBooks.service.js`, `app/backend/src/utils/slug.js` | Funciones de normalización de cadenas, limpieza de guiones y expresiones regulares de UUID reimplementadas en múltiples archivos. |
| **Tratamiento de errores con savepoints manuales** | `app/backend/src/services/libro.service.js` (L21) | Crea transacciones anidadas manuales para atrapar `23505` en Sequelize en lugar de un constraint handling declarativo. |
| **Ausencia de contenedor de Frontend en desarrollo** | `app/docker-compose.yml` | Solo orquesta `db`, `db-test` y `backend`. El frontend debe ejecutarse manualmente en el host con `npm run dev`. |
| **Falta de paginación en inventario y catálogo** | `app/backend/src/repositories/inventario.repository.js` (L325), `libro.repository.js` (L136) | Aplica `LIMIT 200` y `LIMIT 50` fijos sin soportar parámetro `offset` en existencias y catálogo. |

---

## 10. Funcionalidad Incompleta o Ausente (respecto a AGENTS.md)

1. **Autenticación de Dos Factores (2FA)**:
   - AGENTS.md las lista en "Roadmap (NO implementado)" y sus specs están en app/docs/roadmap/.
   - En la base de datos existen los campos `dos_factores_activo` y `dos_factores_secreto`.
   - **Estado real**: No existe lógica de enrolamiento, generación de QR, validación de token TOTP ni desafío en el login.
2. **Notificaciones por Correo de Desabastecimiento y Libros Sin Precio**:
   - AGENTS.md las lista en "Roadmap (NO implementado)" y sus specs están en app/docs/roadmap/.
   - **Estado real**: No existe servicio de correo, no hay dependencias SMTP (como Nodemailer o Sendgrid) en `package.json`, ni tareas programadas (*cron jobs*) para envíos automáticos.
3. **CRUD Administrativo de Catálogo y Empleados**:
   - AGENTS.md las lista en "Roadmap (NO implementado)" y sus specs están en app/docs/roadmap/.
   - **Estado real**: En empleados solo existe `GET /api/usuarios` (lectura). No existen endpoints `POST`, `PUT` o `DELETE` para usuarios. En catálogo no existen endpoints para modificar (`PUT /api/libros/:id`) ni dar de baja libros obsoletos (`DELETE` o baja lógica).
4. **Validación de Sesión en el Lector Móvil**:
   - `BarcodeScanner.jsx` no valida permisos de rol internamente; depende exclusivamente de la vista contenedora y el guardián de ruta.

---

## 11. Convenciones Detectadas en el Código

### 11.1 Nomenclatura y Estructura
- **Base de Datos**: Nombres de tablas en minúsculas, plural y snake_case (`sucursales`, `tipo_movimientos`, `movimientos_inventario`). Claves primarias siempre `id UUID`. Claves foráneas con sufijo `_id` (`libro_id`, `bodega_id`, `rol_id`).
- **Backend (JavaScript CommonJS)**:
  - Archivos: `nombre.capa.js` (`libro.controller.js`, `inventario.service.js`, `movimiento.repository.js`, `usuario.model.js`).
  - Clases: PascalCase (`LibroController`, `InventarioRepository`, `AppError`).
  - Métodos y variables: camelCase (`escanearLibro`, `findByNombre`, `stockActual`).
  - Modelos Sequelize: Atributos en snake_case coincidiendo exactamente con las columnas de Postgres (`stock_actual`, `precio_pendiente`, `fecha_movimiento`).
- **Frontend (JavaScript ESM + JSX)**:
  - Vistas y componentes en PascalCase (`Catalogo.jsx`, `BookCard.jsx`, `BarcodeScanner.jsx`).
  - Variables y estados en camelCase (`isProcessing`, `selectedBodega`).
  - Estilos con Tailwind CSS usando clases de utilidad atómicas y variables de color personalizadas (`text-oskar-dark`, `bg-oskar-gold`).

### 11.2 Formato de Respuestas y Errores
- **Éxito**: Siempre objeto JSON con propiedad `status: 'success'` y los datos bajo `data`:
  ```json
  {
    "status": "success",
    "data": { ... }
  }
  ```
- **Error controlado (4xx)**: Propiedad `status: 'fail'` y mensaje legible:
  ```json
  {
    "status": "fail",
    "message": "Mensaje descriptivo del error",
    "details": ["Detalle 1", "Detalle 2"]
  }
  ```
- **Error del servidor (5xx)**: Propiedad `status: 'error'` con mensaje genérico:
  ```json
  {
    "status": "error",
    "message": "Error interno del servidor."
  }
  ```

---

## 12. Archivos de Documentación y Configuración de Agentes

### 12.1 Jerarquía de Fuentes de Verdad
La prioridad de fuentes de información para agentes y desarrolladores se rige por:
1. **`app/AGENTS.md`**: Reglas globales de arquitectura, persistencia, seguridad y comportamiento operativo del agente.
2. **Skills activas (`app/.agents/skills/`)**: Directrices técnicas especializadas por dominio de ingeniería.
3. **`app/docs/PROJECT_SPECS.md`**: Especificación exhaustiva y fuente de verdad técnica detallada.

> **Regla de oro**: Ante cualquier discrepancia entre documentación, agentes o especificaciones, **el código fuente y la base de datos mandan**.

### 12.2 Estado de Archivos y Configuración de Agentes
- **`app/AGENTS.md` reescrito (74 líneas)**: Actualizado y conciso. No declara como activos 2FA, correos ni CRUD admin; los lista en "Roadmap (NO implementado)" apuntando a `app/docs/roadmap/`.
- **7 skills activas (`app/.agents/skills/`)**: Se mantienen las 7 skills del alcance vigente (`backend-engineer-nodejs`, `backend-testing`, `database-architect`, `devops-gcp-automation`, `frontend-engineer-react`, `inventory-transactions`, `sequelize-orm`). En particular, `sequelize-orm` fue actualizada a convenciones vigentes (ya no procedimiento de migración), `database-architect` incluye el tipo 'Ajuste', y las skills de funciones no implementadas (`auth-2fa`, `catalog-employee-crud`, `inventory-email-alerts`) se trasladaron a `app/docs/roadmap/`.
- **Carga en agy CLI**: Verificado manualmente: agy citó `AGENTS.md` y las skills sin ruta explícita en el prompt.

### 12.3 Catálogo de Archivos de Documentación

| Archivo | Propósito en una línea | Estado y Alineación |
|---|---|---|
| `README.md` (raíz del repo) | Título introductorio del repositorio del seminario. | No aporta información técnica ni instrucciones. |
| `documentacion/estructura-paqueteria.md` | Descripción arquitectónica inicial de paquetes y capas. | **Contradicción severa**: Describe el backend basado en `pg.Pool` directo y DAO SQL tradicional; omite por completo los 11 modelos Sequelize y la configuración ORM. |
| `app/AGENTS.md` | Guía de trabajo colaborativo, directrices de arquitectura y reglas para agentes. | Reescrito (74 líneas). Totalmente alineado; 2FA, correos y CRUD admin marcados en "Roadmap (NO implementado)". |
| `app/backend/README.md` | Documentación técnica específica del servidor Express. | **Contradicción**: Afirma que `POST /api/libros/escanear` no requiere autenticación y documenta arquitectura con `pg.Pool` previa a la migración ORM. |
| `app/frontend/README.md` | Guía de componentes y ejecución del cliente React. | Desactualizado: no documenta las vistas de Inventario, Nosotros ni el flujo de autenticación con JWT. |
| `app/.github/DEPLOYMENT_GUIDE.md` | Manual paso a paso para aprovisionamiento y despliegue en Google Cloud Platform. | Alineado con `.github/workflows/deploy.yml` y `Dockerfile`. |
| `app/docs/PROJECT_SPECS.md` | Fuente de verdad y especificación integral del sistema. | Actualizado; refleja la arquitectura Sequelize, roadmap e infraestructura verificada. |
| `app/docs/roadmap/auth-2fa/SKILL.md` | Especificación técnica para segundo factor TOTP (roadmap). | Funcionalidad no implementada; spec en `app/docs/roadmap/`. |
| `app/docs/roadmap/catalog-employee-crud/SKILL.md` | Especificación técnica para CRUD de catálogo y empleados (roadmap). | Funcionalidad no implementada; spec en `app/docs/roadmap/`. |
| `app/docs/roadmap/inventory-email-alerts/SKILL.md` | Especificación técnica para alertas de inventario por correo (roadmap). | Funcionalidad no implementada; spec en `app/docs/roadmap/`. |
| `app/.agents/skills/backend-engineer-nodejs/SKILL.md` | Directrices de desarrollo Express, arquitectura en capas y transacciones Sequelize. | Skill activa; alineada con backend y Sequelize. |
| `app/.agents/skills/backend-testing/SKILL.md` | Reglas para ejecución de tests con el runner nativo de Node.js. | Skill activa; alineada con `src/run-tests.js` y `tests/`. |
| `app/.agents/skills/database-architect/SKILL.md` | Directrices de integridad referencial, triggers PL/pgSQL y soporte para 'Ajuste'. | Skill activa; alineada con `app/database/schema.sql`. |
| `app/.agents/skills/devops-gcp-automation/SKILL.md` | Pautas para Dockerfiles multi-stage, Artifact Registry y Cloud Run. | Skill activa; alineada con `Dockerfile` y `deploy.yml`. |
| `app/.agents/skills/frontend-engineer-react/SKILL.md` | Pautas de diseño mobile-first, React Router, Tailwind y `html5-qrcode`. | Skill activa; alineada con los componentes de `app/frontend/src/`. |
| `app/.agents/skills/inventory-transactions/SKILL.md` | Reglas de atomicidad ACID, bloqueos pesimistas y trigger de stock. | Skill activa; totalmente alineada con `libro.service.js` e `inventario.service.js`. |
| `app/.agents/skills/sequelize-orm/SKILL.md` | Convenciones vigentes de Sequelize ORM (modelos, asociaciones y repositorios). | Skill activa; actualizada a convenciones vigentes (ya no procedimiento de migración). |
