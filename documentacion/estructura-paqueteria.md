# Estructura de Paquetería y Arquitectura del Sistema - Librería Oskar

Este documento describe la estructura de directorios, organización de paquetes, modularización y flujo de datos de los proyectos **Backend** y **Frontend** del sistema de inventario y catálogo de la Librería Oskar.

---

## 1. Visión General del Proyecto (Estructura Raíz)

El proyecto está organizado como un espacio de trabajo modular (*monorepo multi-paquete*) con separación clara entre backend, frontend, base de datos e infraestructura:

```
app/
├── backend/               # Servidor API RESTful en Node.js + Express
├── frontend/              # Aplicación SPA en React + Vite + Tailwind CSS
├── database/              # Esquemas DDL y migraciones SQL para PostgreSQL
├── .github/               # Pipelines de CI/CD (GitHub Actions)
├── AGENTS.md              # Definición de roles y normas del equipo
├── docker-compose.yml     # Orquestación de contenedores en desarrollo
├── package.json           # Scripts globales de orquestación
└── ESTRUCTURA_PAQUETERIA.md # Documento de referencia de arquitectura
```

---

## 2. Backend: Arquitectura y Paquetería (Node.js + Express)

El backend sigue un patrón de **Arquitectura en Capas Limpia (Clean Layered Architecture)**, desacoplando el protocolo HTTP de la lógica de negocio y del acceso a datos.

### 2.1 Árbol de Directorios (`backend/src`)

```
backend/
├── Dockerfile                  # Configuración de contenedor Docker
├── .env.example                # Variables de entorno requeridas
├── package.json                # Dependencias y scripts de backend
├── src/
│   ├── server.js               # Punto de entrada y arranque del servidor HTTP
│   ├── app.js                  # Configuración de Express, middlewares globales y rutas
│   │
│   ├── config/                 # Configuración de infraestructura
│   │   ├── env.js              # Carga y validación de variables de entorno
│   │   └── db.js               # Pool de conexiones a PostgreSQL (`pg`)
│   │
│   ├── routes/                 # Definición de endpoints y mapeo a controladores
│   │   ├── index.js            # Agregador central de rutas (`/api`)
│   │   ├── auth.routes.js      # Rutas de autenticación (`/api/auth`)
│   │   ├── libro.routes.js     # Rutas de libros y catálogo (`/api/libros`)
│   │   ├── inventario.routes.js# Rutas de inventario y stock (`/api/inventario`)
│   │   └── movimiento.routes.js# Rutas de movimientos de stock (`/api/movimientos`)
│   │
│   ├── middlewares/            # Interceptores de peticiones HTTP
│   │   ├── auth.js             # Verificación de JWT y control de acceso RBAC
│   │   ├── validator.js        # Validación y sanitización de payloads de entrada
│   │   └── errorHandler.js     # Manejador global centralizado de errores
│   │
│   ├── controllers/            # Capa de presentación / controladores HTTP
│   │   ├── auth.controller.js
│   │   ├── libro.controller.js
│   │   └── inventario.controller.js
│   │
│   ├── services/               # Capa de lógica de negocio y transacciones ACID
│   │   ├── auth.service.js         # Lógica de login, tokens y perfiles
│   │   ├── libro.service.js        # Reglas de negocio de libros y catálogo
│   │   ├── inventario.service.js   # Ajustes de stock, entradas y salidas atómicas
│   │   └── googleBooks.service.js  # Integración externa resiliente con Google Books API
│   │
│   ├── repositories/           # Capa de acceso a datos (DAO / Repositorios SQL)
│   │   ├── autor.repository.js
│   │   ├── categoria.repository.js
│   │   ├── editorial.repository.js
│   │   ├── inventario.repository.js
│   │   ├── libro.repository.js
│   │   ├── movimiento.repository.js
│   │   └── usuario.repository.js
│   │
│   ├── database/               # Scripts de base de datos
│   │   ├── migrate.js          # Ejecutor de migraciones SQL
│   │   └── seed.js             # Inserción de datos iniciales
│   │
│   └── utils/                  # Clases y funciones transversales
│       ├── errors.js           # Clases de errores HTTP (AppError, NotFoundError, etc.)
│       └── slug.js             # Generación de slugs para búsquedas amigables
│
└── tests/                      # Suite de pruebas automatizadas
    ├── api.e2e.test.js         # Pruebas End-to-End de endpoints
    ├── escanear.integration.test.js # Pruebas de integración de escaneo
    └── googleBooks.test.js     # Pruebas unitarias/mock del servicio externo
```

### 2.2 Responsabilidad por Capa en Backend

| Capa | Responsabilidad |
|---|---|
| **Routes** | Define la URL y el método HTTP, asocia middlewares de seguridad/validación y delega al controlador correspondiente. |
| **Middlewares** | Verifica tokens JWT, roles de usuario (`Administrador`, `Empleado`), valida esquemas de datos y captura excepciones globales. |
| **Controllers** | Extrae parámetros de `req` (`params`, `query`, `body`), invoca a los servicios y retorna respuestas estructuradas en formato estándar `{ status: 'success', data }`. |
| **Services** | Implementa las reglas de negocio, validaciones funcionales, coordina transacciones atómicas con la base de datos y consume APIs externas con fallbacks. |
| **Repositories** | Ejecuta consultas SQL parametrizadas a PostgreSQL utilizando `pg.Pool`, gestionando claves primarias UUID y mapeo relacional. |

---

## 3. Frontend: Arquitectura y Paquetería (React + Vite + Tailwind)

El frontend está estructurado como una **Single Page Application (SPA)** basada en componentes funcionales reutilizables, vistas modulares, gestión de estado por Contexto y cliente HTTP centralizado.

### 3.1 Árbol de Directorios (`frontend/src`)

```
frontend/
├── index.html                  # Plantilla HTML base del SPA
├── vite.config.js              # Configuración de Vite y proxy reverso a `/api`
├── tailwind.config.js          # Configuración de diseño y tema Tailwind CSS
├── postcss.config.js           # Procesador de CSS
├── package.json                # Dependencias de frontend
├── src/
│   ├── main.jsx                # Punto de entrada de React (montaje en DOM)
│   ├── App.jsx                 # Configuración de rutas (`react-router-dom`) y Providers
│   ├── index.css               # Estilos globales y directivas Tailwind
│   │
│   ├── api/                    # Capa de comunicación con la API REST
│   │   └── client.js           # Cliente HTTP centralizado (`fetch` wrapper con auth headers)
│   │
│   ├── context/                # Estado global de la aplicación
│   │   └── AuthContext.jsx     # Contexto de autenticación, sesión y roles
│   │
│   ├── components/             # Componentes UI modulares y reutilizables
│   │   ├── Navbar.jsx          # Barra de navegación principal y responsiva
│   │   ├── Footer.jsx          # Pie de página institucional
│   │   ├── BookCard.jsx        # Tarjeta de libro para catálogo y cuadrícula
│   │   ├── BarcodeScanner.jsx  # Componente de escaneo por cámara (`html5-qrcode`)
│   │   ├── ProtectedRoute.jsx  # Guardián de rutas por autenticación y roles
│   │   ├── Toast.jsx           # Notificaciones interactivas tipo feedback
│   │   └── LoadingSpinner.jsx  # Indicador de estado de carga
│   │
│   ├── views/                  # Vistas y pantallas principales (Páginas)
│   │   ├── Catalogo.jsx        # Catálogo público con búsqueda y filtros
│   │   ├── LibroDetalle.jsx    # Ficha técnica, sinopsis y disponibilidad
│   │   ├── Inventario.jsx      # Panel de gestión de stock, alertas y movimientos
│   │   ├── RegistrarLibro.jsx  # Registro de nuevos libros (escaneo + formulario)
│   │   ├── Login.jsx           # Formulario de inicio de sesión
│   │   └── Nosotros.jsx        # Información institucional de Librería Oskar
│   │
│   └── assets/                 # Recursos estáticos locales
│       └── logo.jpg            # Logotipo de la librería
```

### 3.2 Responsabilidad por Módulo en Frontend

| Módulo | Responsabilidad |
|---|---|
| **`api/client.js`** | Maneja llamadas HTTP a `/api`, inyecta encabezados de autorización JWT, maneja errores y serializa respuestas. |
| **`context/AuthContext`** | Mantiene el estado de autenticación en memoria/almacenamiento local, proveyendo métodos `login`, `logout` y verificación de roles. |
| **`components/`** | Elementos visuales reutilizables e interactivos (escáner con cámara, tarjetas, modales y alertas). |
| **`views/`** | Páginas enrutadas que orquestan componentes, cargan datos y gestionan interacciones completas del usuario. |

---

## 4. Base de Datos (`database/`)

La capa de persistencia se gestiona de forma centralizada con scripts DDL y migraciones versionadas:

```
database/
├── schema.sql                         # Definición completa del esquema relacional (tablas, triggers, índices)
└── migrations/
    ├── 002_categorias.sql             # Migración incremental de categorías
    └── 003_categorias_adicionales.sql # Migración de categorías adicionales
```

- **PostgreSQL**: Uso de UUIDs para claves primarias, claves foráneas con integridad referencial, índices condicionales e índices para búsqueda rápida.
- **Triggers PL/pgSQL**: Actualización automática de existencias ante inserción de movimientos de inventario (`tg_movimientos_inventario_stock`).

---

## 5. Flujo de Datos e Integración entre Capas

```
[ Usuario / Navegador ]
         │
         ▼
[ Frontend: React SPA ] (Views -> Components)
         │  (api/client.js)
         ▼
[ Proxy Vite / Nginx ] (/api/*)
         │
         ▼
[ Backend: Express App ]
   ├── [ Middlewares ] (auth.js, validator.js, errorHandler.js)
   ├── [ Controllers ] (libro.controller.js, etc.)
   ├── [ Services ]    (libro.service.js, googleBooks.service.js)
   └── [ Repositories ] (libro.repository.js)
         │
         ├───► [ Google Books API ] (Fallback externo de metadatos)
         │
         ▼
[ PostgreSQL Database ] (Tablas, Triggers, Índices)
```
