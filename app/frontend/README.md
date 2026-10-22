# Frontend — Librería Oskar

SPA en React 18 + Vite 5 + Tailwind 3 (paleta `oskar`) con `react-router-dom` 6, `lucide-react` y `html5-qrcode`. Rutas, vistas, componentes, hooks y cliente HTTP están documentados en [`../docs/PROJECT_SPECS.md`](../docs/PROJECT_SPECS.md), sección §5. Reglas de trabajo en [`../AGENTS.md`](../AGENTS.md).

## Comandos

Desde `app/`:

```bash
npm run frontend:dev       # servidor de desarrollo en http://localhost:5173
npm run frontend:build     # build de producción (genera dist/)
npm run frontend:preview   # sirve el build
```

`vite.config.js` redirige `/api` a `http://localhost:3000`, así que el backend debe estar arriba. Dependencias: `npm --prefix frontend install`.

## Estructura de `src/`

```text
views/                  Orquestadores de ruta: Catalogo, LibroDetalle, RegistrarLibro, Inventario, Login, Nosotros
components/             Navbar, Footer, Toast, LoadingSpinner, ProtectedRoute, BarcodeScanner
components/ui/          Modal, ErrorBox, FieldLabel, Input, Select
context/                AuthContext (sesión)
features/<feature>/     components/ y hooks/ de catalogo, inventario y registrar-libro
hooks/                  useDebouncedValue
services/api/           client.js (apiFetch) y un módulo *.api.js por dominio
utils/                  tokenStorage, roles, formatters, parsers
```

## Reglas

- Todo HTTP pasa por `services/api/`. `apiFetch` inyecta el JWT y, ante un 401 con token, limpia la sesión y redirige a `/login`. `auth.api.js` y `catalogo.api.js` usan `fetch` directo a propósito (endpoints públicos o sin redirección por 401).
- Las vistas solo orquestan: la lógica de datos vive en los hooks de cada feature.
- Los roles se consultan con `utils/roles.js` y el token con `utils/tokenStorage.js`.
- El frontend no valida el checksum del ISBN; lo hace el backend. Tampoco llama a `POST /api/libros/escanear`.

## Pruebas

No hay pruebas automatizadas. Se verifica con `npm run frontend:build` y prueba manual.
