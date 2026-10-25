# Especificación Técnica de Proyecto — Librería Oskar

> Documento mantenido a mano y verificado contra el código fuente. Si el texto y el código discrepan, manda el código. Lo que no se pudo comprobar se marca "no verificado".

---

## 0. Metadatos

| Clave | Valor | Fuente de verificación |
|---|---|---|
| **Fecha de actualización** | 2026-10-22 | `date +%F` |
| **Rama actual** | `actualizar-documentacion` | `git status -sb` |
| **Hash del commit** | `38fd90f` | `git rev-parse --short HEAD` (commit previo a esta documentación) |
| **ORM utilizado** | Sequelize | `app/backend/package.json` |
| **Versión exacta del ORM** | `^6.37.8` | `app/backend/package.json` (`dependencies.sequelize`) |
| **Motor de base de datos** | PostgreSQL (Sequelize sobre el driver `pg`) | `app/database/schema.sql`, `app/backend/package.json` |

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
  - `nodemailer`: `^10.2.1`
  - `otplib`: `13.5.0` (versión exacta; TOTP)
  - `pg`: `^8.13.3`
  - `pg-hstore`: `^2.3.4`
  - `qrcode`: `1.5.4` (versión exacta; QR del alta 2FA)
  - `sequelize`: `^6.37.8`
- **Dependencias de desarrollo (`devDependencies`)**:
  - `nodemon`: `^3.1.9`
- **Scripts npm**:
  - `start`: `node src/server.js`
  - `dev`: `nodemon src/server.js`
  - `seed`: `node src/database/seed.js`
  - `migrate`: `node src/database/migrate.js`
  - `correo:probar`: `node src/scripts/probar-correo.js`
  - `reset-2fa`: `node src/scripts/reset-2fa.js` (solo en `backend/`; no existe en `app/package.json`)
  - `test`: `node src/run-tests.js`
  - `test:sequelize`: `node src/test-sequelize.js`

#### Frontend (`app/frontend/package.json`)
- **Nombre**: `libreria-oskar-frontend`
- **Versión**: `1.0.0`
- **Tipo de módulo**: `module` (ESM nativo)
- **Dependencias de producción (`dependencies`)**:
  - `barcode-detector`: `3.2.3` (versión exacta; lector de respaldo para navegadores sin `BarcodeDetector`)
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

### 2.1 Árbol de Archivos de `app/` (líneas por archivo)

Generado con `find`/`os.walk` + conteo de saltos de línea (equivalente a `wc -l`), excluyendo `node_modules`, `dist`, `.git`, `.claude`, `.idea`, `CLAUDE.md`, `.env` y `package-lock.json`; sin conteo para imágenes.

```text
app/
├── AGENTS.md (89)
├── .dockerignore (9)
├── docker-compose.yml (84)
├── package.json (18)
├── .agents/
│   └── skills/
│       ├── backend-engineer-nodejs/
│       │   └── SKILL.md (35)
│       ├── backend-testing/
│       │   └── SKILL.md (20)
│       ├── database-architect/
│       │   └── SKILL.md (26)
│       ├── devops-gcp-automation/
│       │   └── SKILL.md (26)
│       ├── frontend-engineer-react/
│       │   └── SKILL.md (27)
│       ├── inventory-transactions/
│       │   └── SKILL.md (25)
│       └── sequelize-orm/
│           └── SKILL.md (23)
├── .github/
│   ├── DEPLOYMENT_GUIDE.md (115)
│   └── workflows/
│       └── deploy.yml (150)
├── backend/
│   ├── .env.example (66)
│   ├── Dockerfile (61)
│   ├── README.md (63)
│   ├── package.json (47)
│   ├── src/
│   │   ├── app.js (47)
│   │   ├── run-tests.js (50)
│   │   ├── server.js (47)
│   │   ├── test-sequelize.js (91)
│   │   ├── assets/
│   │   │   └── logo-correo.png
│   │   ├── config/
│   │   │   ├── cors.config.js (11)
│   │   │   ├── db.js (87)
│   │   │   ├── env.js (68)
│   │   │   ├── mail.config.js (55)
│   │   │   ├── recuperacion.config.js (39)
│   │   │   ├── security.config.js (39)
│   │   │   ├── sequelize.js (47)
│   │   │   └── twoFactor.config.js (58)
│   │   ├── controllers/
│   │   │   ├── auth.controller.js (38)
│   │   │   ├── bodega.controller.js (19)
│   │   │   ├── categoria.controller.js (50)
│   │   │   ├── dosFactores.controller.js (69)
│   │   │   ├── health.controller.js (36)
│   │   │   ├── inventario.controller.js (117)
│   │   │   ├── libro.controller.js (236)
│   │   │   ├── recuperacion.controller.js (27)
│   │   │   ├── reportes.controller.js (67)
│   │   │   ├── usuario.controller.js (34)
│   │   │   └── venta.controller.js (70)
│   │   ├── database/
│   │   │   ├── esperarBaseDatos.js (91)
│   │   │   ├── migrate.js (80)
│   │   │   └── seed.js (206)
│   │   ├── middlewares/
│   │   │   ├── auth.js (86)
│   │   │   ├── auth2fa.js (55)
│   │   │   ├── errorHandler.js (82)
│   │   │   ├── rateLimit.js (43)
│   │   │   ├── rateLimitRecuperacion.js (8)
│   │   │   ├── validator.js (57)
│   │   │   └── validators/
│   │   │       ├── common.js (29)
│   │   │       ├── exportacionReportes.validators.js (38)
│   │   │       ├── inventario.validators.js (90)
│   │   │       ├── libro.validators.js (249)
│   │   │       ├── movimiento.validators.js (48)
│   │   │       ├── pagination.validators.js (24)
│   │   │       ├── reportes.validators.js (54)
│   │   │       ├── reportesVentas.validators.js (84)
│   │   │       └── venta.validators.js (155)
│   │   ├── models/
│   │   │   ├── autor.model.js (49)
│   │   │   ├── bodega.model.js (82)
│   │   │   ├── categoria.model.js (45)
│   │   │   ├── codigoRespaldo.model.js (56)
│   │   │   ├── editorial.model.js (49)
│   │   │   ├── index.js (53)
│   │   │   ├── inventario.model.js (93)
│   │   │   ├── libro.model.js (126)
│   │   │   ├── movimientoInventario.model.js (105)
│   │   │   ├── rol.model.js (49)
│   │   │   ├── sucursal.model.js (62)
│   │   │   ├── tipoMovimiento.model.js (42)
│   │   │   ├── usuario.model.js (121)
│   │   │   ├── venta.model.js (156)
│   │   │   └── ventaDetalle.model.js (78)
│   │   ├── repositories/
│   │   │   ├── autor.repository.js (122)
│   │   │   ├── bodega.repository.js (53)
│   │   │   ├── categoria.repository.js (115)
│   │   │   ├── dosFactores.repository.js (145)
│   │   │   ├── editorial.repository.js (122)
│   │   │   ├── inventario.repository.js (11)
│   │   │   ├── libro.repository.js (382)
│   │   │   ├── movimiento.repository.js (257)
│   │   │   ├── recuperacion.repository.js (83)
│   │   │   ├── usuario.repository.js (245)
│   │   │   ├── venta.repository.js (152)
│   │   │   ├── inventario/
│   │   │   │   ├── inventarioBasico.repository.js (240)
│   │   │   │   ├── inventarioListado.repository.js (130)
│   │   │   │   ├── inventarioResumen.repository.js (110)
│   │   │   │   └── inventarioSubconsultas.helper.js (10)
│   │   │   └── reportes/
│   │   │       ├── inventarioValorizado.repository.js (113)
│   │   │       ├── kardex.repository.js (9)
│   │   │       └── ventas.repository.js (141)
│   │   ├── routes/
│   │   │   ├── auth.routes.js (24)
│   │   │   ├── dosFactores.routes.js (27)
│   │   │   ├── index.js (39)
│   │   │   ├── inventario.routes.js (65)
│   │   │   ├── libro.routes.js (126)
│   │   │   ├── movimiento.routes.js (21)
│   │   │   ├── reportes.routes.js (22)
│   │   │   └── venta.routes.js (65)
│   │   ├── scripts/
│   │   │   ├── probar-correo.js (40)
│   │   │   ├── reset-2fa.js (34)
│   │   │   └── vista-previa-correos.js (33)
│   │   ├── services/
│   │   │   ├── auth.service.js (71)
│   │   │   ├── bodega.service.js (13)
│   │   │   ├── catalogo.service.js (52)
│   │   │   ├── categoria.service.js (60)
│   │   │   ├── dosFactores.service.js (154)
│   │   │   ├── googleBooks.service.js (312)
│   │   │   ├── inventario.service.js (189)
│   │   │   ├── libro.service.js (15)
│   │   │   ├── mail.service.js (15)
│   │   │   ├── recuperacion.service.js (99)
│   │   │   ├── reportes.service.js (21)
│   │   │   ├── usuario.service.js (115)
│   │   │   ├── venta.service.js (11)
│   │   │   ├── dosFactores/
│   │   │   │   ├── cifrado.js (72)
│   │   │   │   ├── intentos.js (52)
│   │   │   │   ├── respaldo.js (43)
│   │   │   │   ├── sesion.js (41)
│   │   │   │   └── totp.js (65)
│   │   │   ├── libro/
│   │   │   │   ├── administracion.service.js (63)
│   │   │   │   ├── escaneo.service.js (229)
│   │   │   │   ├── ingreso.service.js (75)
│   │   │   │   ├── maestros.service.js (47)
│   │   │   │   ├── movimientoIngreso.service.js (36)
│   │   │   │   ├── precio.service.js (17)
│   │   │   │   └── registro.service.js (160)
│   │   │   ├── mail/
│   │   │   │   ├── consola.provider.js (36)
│   │   │   │   ├── fabrica.service.js (132)
│   │   │   │   ├── logo.js (45)
│   │   │   │   ├── plantillas.js (103)
│   │   │   │   ├── seguridad.mail.js (16)
│   │   │   │   ├── smtp.provider.js (53)
│   │   │   │   └── validacion.mail.js (75)
│   │   │   ├── recuperacion/
│   │   │   │   ├── correos.js (73)
│   │   │   │   └── token.js (13)
│   │   │   ├── reportes/
│   │   │   │   ├── contrato.service.js (12)
│   │   │   │   ├── corteCaja.service.js (29)
│   │   │   │   ├── dinero.helper.js (15)
│   │   │   │   ├── inventarioValorizado.service.js (21)
│   │   │   │   ├── kardex.service.js (23)
│   │   │   │   ├── librosMasVendidos.service.js (20)
│   │   │   │   ├── reposicion.service.js (28)
│   │   │   │   ├── resumenPeriodo.service.js (54)
│   │   │   │   ├── ventas.service.js (21)
│   │   │   │   └── exportadores/
│   │   │   │       ├── excel.exporter.js (129)
│   │   │   │       ├── exportacion.config.js (5)
│   │   │   │       ├── exportacion.service.js (37)
│   │   │   │       ├── pdf.exporter.js (151)
│   │   │   │       └── reportes.export.service.js (169)
│   │   │   └── venta/
│   │   │       ├── anular.service.js (64)
│   │   │       ├── bloqueo.helper.js (26)
│   │   │       ├── consulta.service.js (101)
│   │   │       └── crear.service.js (146)
│   │   └── utils/
│   │       ├── errors.js (50)
│   │       ├── isbn.js (71)
│   │       ├── passwordPolicy.js (14)
│   │       ├── sesionVigente.js (17)
│   │       ├── slug.js (97)
│   │       ├── uuid.js (20)
│   │       └── ventas.js (129)
│   └── tests/
│       ├── api.e2e.test.js (539)
│       ├── apiSecurity.test.js (135)
│       ├── categoriasConteoAdmin.e2e.test.js (86)
│       ├── categoriasCrud.e2e.test.js (130)
│       ├── consultarSugerencia.test.js (130)
│       ├── correoPlantillas.test.js (151)
│       ├── dosFactoresAlta.test.js (133)
│       ├── dosFactoresBloqueo.test.js (141)
│       ├── dosFactoresConcurrencia.test.js (142)
│       ├── dosFactoresConfig.test.js (69)
│       ├── dosFactoresCripto.test.js (114)
│       ├── dosFactoresGestion.test.js (99)
│       ├── dosFactoresLogin.test.js (151)
│       ├── dosFactoresRestablecer.test.js (117)
│       ├── errorHandler.test.js (123)
│       ├── escanear.integration.test.js (151)
│       ├── esperarBaseDatos.test.js (173)
│       ├── googleBooks.test.js (145)
│       ├── inventarioRepository.test.js (468)
│       ├── inventarioService.test.js (204)
│       ├── isbnValidation.test.js (90)
│       ├── libroPrecio.test.js (149)
│       ├── libroRepository.test.js (237)
│       ├── libroServiceSequelize.test.js (387)
│       ├── librosAdmin.e2e.test.js (230)
│       ├── mailAdjuntos.test.js (106)
│       ├── mailConfig.test.js (43)
│       ├── mailProveedores.test.js (84)
│       ├── mailReintentos.test.js (137)
│       ├── movimientoRepository.test.js (245)
│       ├── paginacionCatalogoInventario.e2e.test.js (160)
│       ├── recuperacionConfig.test.js (73)
│       ├── recuperacionCorreoHtml.test.js (96)
│       ├── recuperacionRestablecer.test.js (116)
│       ├── recuperacionSesiones.test.js (141)
│       ├── recuperacionSolicitar.test.js (167)
│       ├── reportes.e2e.test.js (143)
│       ├── reportesExportacion.e2e.test.js (150)
│       ├── reportesVentas.e2e.test.js (153)
│       ├── repositories.test.js (180)
│       ├── seedProduccion.test.js (168)
│       ├── sequelize.test.js (96)
│       ├── sugerenciaRelleno.test.js (80)
│       ├── usuarioRepository.test.js (103)
│       ├── usuariosCrud.test.js (92)
│       ├── utilsIsbnUuid.test.js (166)
│       ├── validatorsCaracterizacion.test.js (642)
│       ├── ventasApi.test.js (206)
│       ├── ventasApiConsulta.test.js (169)
│       ├── ventasConcurrencia.test.js (159)
│       ├── ventasEsquema.test.js (266)
│       ├── ventasServicio.test.js (227)
│       ├── ventasUtils.test.js (84)
│       └── helpers/
│           ├── dosFactores.js (123)
│           ├── httpMocks.js (50)
│           ├── recuperacion.js (60)
│           ├── ventasFixtures.js (118)
│           └── ventasHttp.js (43)
├── database/
│   ├── schema.sql (359)
│   └── migrations/
│       ├── 002_categorias.sql (25)
│       ├── 003_categorias_adicionales.sql (22)
│       ├── 004_ventas.sql (58)
│       ├── 010_dos_factores.sql (29)
│       └── 011_recuperacion_contrasena.sql (18)
├── docs/
│   ├── PROJECT_SPECS.md (1693)
│   └── roadmap/
│       ├── auth-2fa/
│       │   └── SKILL.md (20)
│       ├── catalog-employee-crud/
│       │   └── SKILL.md (36)
│       ├── inventory-email-alerts/
│       │   └── SKILL.md (17)
│       └── ventas/
│           └── SPEC.md (64)
└── frontend/
    ├── README.md (39)
    ├── index.html (16)
    ├── package.json (27)
    ├── postcss.config.js (6)
    ├── tailwind.config.js (25)
    ├── vite.config.js (16)
    └── src/
        ├── App.jsx (142)
        ├── index.css (39)
        ├── main.jsx (16)
        ├── assets/
        │   └── logo.jpg
        ├── components/
        │   ├── BarcodeScanner.jsx (139)
        │   ├── EstadoEscaner.jsx (47)
        │   ├── Footer.jsx (23)
        │   ├── LoadingSpinner.jsx (30)
        │   ├── ModalPrecioLibro.jsx (100)
        │   ├── Navbar.jsx (158)
        │   ├── ProtectedRoute.jsx (48)
        │   ├── Toast.jsx (73)
        │   └── ui/
        │       ├── ControlCantidad.jsx (47)
        │       ├── ErrorBox.jsx (18)
        │       ├── FieldLabel.jsx (7)
        │       ├── Input.jsx (8)
        │       ├── Modal.jsx (9)
        │       ├── OpcionesSegmentadas.jsx (23)
        │       ├── Paginacion.jsx (73)
        │       └── Select.jsx (10)
        ├── context/
        │   └── AuthContext.jsx (95)
        ├── features/
        │   ├── catalogo/
        │   │   ├── components/
        │   │   │   ├── BookGrid.jsx (69)
        │   │   │   ├── BtnCategoria.jsx (15)
        │   │   │   ├── DetalleSkeleton.jsx (19)
        │   │   │   ├── DisponibilidadItem.jsx (44)
        │   │   │   ├── DrawerFiltros.jsx (179)
        │   │   │   ├── EtiquetasFiltros.jsx (41)
        │   │   │   ├── FichaLibro.jsx (139)
        │   │   │   ├── LibroError.jsx (31)
        │   │   │   ├── LibroNoEncontrado.jsx (23)
        │   │   │   ├── PanelFiltros.jsx (106)
        │   │   │   └── SinResultados.jsx (50)
        │   │   └── hooks/
        │   │       ├── useCatalogo.js (155)
        │   │       └── useLibroDetalle.js (78)
        │   ├── categorias/
        │   │   ├── components/
        │   │   │   ├── FormularioCategoria.jsx (76)
        │   │   │   └── TablaCategorias.jsx (71)
        │   │   └── hooks/
        │   │       └── useCategorias.js (145)
        │   ├── inventario/
        │   │   ├── components/
        │   │   │   ├── EstadoBadge.jsx (23)
        │   │   │   ├── ModalAjusteInventario.jsx (161)
        │   │   │   ├── ModalSalidaInventario.jsx (149)
        │   │   │   ├── ResumenKpis.jsx (129)
        │   │   │   ├── TablaExistencias.jsx (295)
        │   │   │   ├── TablaKardex.jsx (226)
        │   │   │   └── TipoBadge.jsx (16)
        │   │   └── hooks/
        │   │       ├── useInventarioData.js (155)
        │   │       └── useKardex.js (80)
        │   ├── libros/
        │   │   ├── components/
        │   │   │   ├── FiltrosGestionLibros.jsx (15)
        │   │   │   ├── FormularioEditarLibro.jsx (62)
        │   │   │   └── TablaGestionLibros.jsx (38)
        │   │   └── hooks/
        │   │       └── useGestionLibros.js (119)
        │   ├── registrar-libro/
        │   │   ├── camposFaltantes.js (85)
        │   │   ├── validacion.js (33)
        │   │   ├── components/
        │   │   │   ├── AvisoCamposFaltantes.jsx (32)
        │   │   │   ├── FichaLibroExistente.jsx (104)
        │   │   │   ├── FormularioIngreso.jsx (54)
        │   │   │   ├── FormularioRegistro.jsx (248)
        │   │   │   ├── HistorialSesion.jsx (33)
        │   │   │   ├── PanelConsulta.jsx (75)
        │   │   │   ├── PanelLateral.jsx (62)
        │   │   │   ├── ResultadoIngreso.jsx (40)
        │   │   │   └── ResultadoRegistro.jsx (40)
        │   │   └── hooks/
        │   │       └── useRegistrarLibro.js (264)
        │   ├── reportes/
        │   │   ├── reportes.config.js (29)
        │   │   ├── components/
        │   │   │   ├── AccionesExportacion.jsx (14)
        │   │   │   ├── FiltrosReporte.jsx (25)
        │   │   │   ├── ResumenReporte.jsx (46)
        │   │   │   ├── SelectorReporte.jsx (12)
        │   │   │   └── TablaReporte.jsx (35)
        │   │   └── hooks/
        │   │       └── useReportes.js (197)
        │   ├── seguridad/
        │   │   ├── codigos.js (48)
        │   │   ├── errores.js (20)
        │   │   ├── navegador.js (41)
        │   │   ├── recuperacion.js (41)
        │   │   ├── components/
        │   │   │   ├── AlertaError.jsx (29)
        │   │   │   ├── BotonCopiar.jsx (33)
        │   │   │   ├── BotonPrincipal.jsx (20)
        │   │   │   ├── CampoAcceso.jsx (23)
        │   │   │   ├── CampoCodigoTotp.jsx (26)
        │   │   │   ├── CodigosRespaldo.jsx (69)
        │   │   │   ├── ConfirmacionSolicitud.jsx (21)
        │   │   │   ├── EnlaceSecundario.jsx (8)
        │   │   │   ├── FormularioCredenciales.jsx (83)
        │   │   │   ├── FormularioOlvide.jsx (33)
        │   │   │   ├── FormularioRegenerar.jsx (50)
        │   │   │   ├── FormularioRestablecer.jsx (53)
        │   │   │   ├── PanelSeguridad.jsx (80)
        │   │   │   ├── PasoConfigurar.jsx (104)
        │   │   │   ├── PasoVerificar.jsx (108)
        │   │   │   └── TarjetaAcceso.jsx (28)
        │   │   └── hooks/
        │   │       ├── useFocoCodigo.js (28)
        │   │       ├── useLoginDosPasos.js (155)
        │   │       ├── useRestablecerContrasena.js (81)
        │   │       ├── useSeguridad.js (77)
        │   │       └── useSolicitarRecuperacion.js (49)
        │   ├── usuarios/
        │   │   ├── components/
        │   │   │   ├── FiltrosUsuarios.jsx (48)
        │   │   │   ├── FormularioUsuario.jsx (110)
        │   │   │   └── TablaUsuarios.jsx (110)
        │   │   └── hooks/
        │   │       └── useUsuarios.js (123)
        │   └── ventas/
        │       ├── components/
        │       │   ├── BuscadorLibrosVenta.jsx (62)
        │       │   ├── EstadoVentaBadge.jsx (10)
        │       │   ├── FichaVenta.jsx (72)
        │       │   ├── FiltrosVentas.jsx (46)
        │       │   ├── FormularioCliente.jsx (47)
        │       │   ├── LineasVenta.jsx (55)
        │       │   ├── ModalAnularVenta.jsx (95)
        │       │   ├── ResumenVenta.jsx (29)
        │       │   └── TablaVentas.jsx (127)
        │       └── hooks/
        │           ├── useNuevaVenta.js (161)
        │           ├── useVentaDetalle.js (37)
        │           └── useVentas.js (61)
        ├── hooks/
        │   ├── useCamaraEscaner.js (225)
        │   ├── useDebouncedValue.js (14)
        │   ├── useDiagnosticoEscaner.js (29)
        │   └── useGeometriaEscaner.js (36)
        ├── services/
        │   └── api/
        │       ├── auth.api.js (18)
        │       ├── bodegas.api.js (5)
        │       ├── catalogo.api.js (16)
        │       ├── categorias.api.js (21)
        │       ├── client.js (34)
        │       ├── dosFactores.api.js (41)
        │       ├── inventario.api.js (27)
        │       ├── libros.api.js (29)
        │       ├── librosAdmin.api.js (21)
        │       ├── recuperacion.api.js (19)
        │       ├── reportes.api.js (30)
        │       ├── usuarios.api.js (21)
        │       └── ventas.api.js (27)
        ├── utils/
        │   ├── cargarDetectorDeCodigos.js (29)
        │   ├── dinero.js (24)
        │   ├── errorCamara.js (16)
        │   ├── formatters.js (30)
        │   ├── geometriaEscaner.js (33)
        │   ├── parsers.js (10)
        │   ├── roles.js (24)
        │   └── tokenStorage.js (26)
        └── views/
            ├── Catalogo.jsx (196)
            ├── Categorias.jsx (126)
            ├── GestionLibros.jsx (58)
            ├── Inventario.jsx (197)
            ├── LibroDetalle.jsx (66)
            ├── Login.jsx (77)
            ├── Nosotros.jsx (88)
            ├── NuevaVenta.jsx (98)
            ├── OlvideContrasena.jsx (33)
            ├── RegistrarLibro.jsx (194)
            ├── Reportes.jsx (71)
            ├── RestablecerContrasena.jsx (44)
            ├── Seguridad.jsx (25)
            ├── Usuarios.jsx (141)
            ├── VentaDetalle.jsx (88)
            └── Ventas.jsx (55)
```

### 2.2 Archivos de más de 250 Líneas

Lista generada con `find` + `wc -l` sobre código, pruebas y SQL (`*.js`, `*.jsx`, `*.sql`):

| Ruta del archivo | Líneas | Qué contiene |
|---|---|---|
| `app/backend/tests/validatorsCaracterizacion.test.js` | 642 | Pruebas de caracterización de los 8 validadores (fijan también comportamientos defectuosos, ver §9). |
| `app/backend/tests/api.e2e.test.js` | 539 | Pruebas HTTP end-to-end contra un servidor Express temporal. |
| `app/backend/tests/inventarioRepository.test.js` | 468 | Persistencia de inventario: bloqueo `FOR UPDATE`, stock obsoleto, alertas y KPIs de resumen. |
| `app/backend/tests/libroServiceSequelize.test.js` | 387 | Transacciones del servicio de libros: rollback, trigger, concurrencia de escaneo. |
| `app/backend/src/repositories/libro.repository.js` | 382 | Búsqueda por ISBN/UUID (con variantes `ForUpdate`; `findByIds` para ventas), `upsert`/`create` con captura de `23505`, edición bibliográfica, baja (`updateActivo`), listado admin paginado (`findAdminPage`), catálogo paginado y detalle por `ref`. |
| `app/database/schema.sql` | 359 | DDL de 14 tablas, extensiones, secuencia de ventas, trigger PL/pgSQL, 20 índices y semillas (roles, tipos de movimiento, 20 categorías). |
| `app/backend/src/services/googleBooks.service.js` | 312 | Cliente de Google Books con fallback a OpenLibrary, catálogo de contingencia y caché TTL; cada resultado trae `relleno`. |
| `app/frontend/src/features/inventario/components/TablaExistencias.jsx` | 295 | Tabla de existencias con `EstadoBadge` por fila y `Paginacion`. |
| `app/backend/tests/ventasEsquema.test.js` | 266 | Esquema de ventas: correlativo, CHECK, UNIQUE, FK RESTRICT y movimiento con `venta_id` (trigger). |
| `app/frontend/src/features/registrar-libro/hooks/useRegistrarLibro.js` | 264 | Estado y acciones del asistente de registro (`paso`, consulta, ingreso, registro; `camposFaltantes`). |
| `app/backend/src/repositories/movimiento.repository.js` | 257 | Tipos de movimiento (`getTipoMovimientoByName`, `ensureTipoMovimiento`), `createMovimiento` y Kardex filtrado y paginado (`findAllWithFilters`). |

---

## 3. Base de Datos (PostgreSQL)

### 3.1 Fuente de Verdad y Estado del Esquema
- **Fuente de verdad**: `app/database/schema.sql` es la fuente de verdad declarada para nombres de tablas, columnas, restricciones, UUIDs y triggers.
- **Mecanismo de migraciones**: Directorio `app/database/migrations/` ejecutado secuencialmente por `app/backend/src/database/migrate.js`, registrando ejecuciones en la tabla `schema_migrations`.
- **Diferencias entre `schema.sql` y modelos Sequelize**:
  - No hay divergencias estructurales: los 14 modelos definidos en `src/models/` mapean exactamente las 14 tablas del DDL.
  - La migración `002_categorias.sql` ya está integrada en el `schema.sql` principal.
  - `schema.sql` siembra las **20 categorías** (las 6 originales y las 14 de la migración `003_categorias_adicionales.sql`, con `ON CONFLICT (nombre) DO NOTHING`). Una BD creada desde cero con `schema.sql` ya equivale a aplicar `schema.sql + 002 + 003`. Las migraciones 002 y 003 permanecen como scripts idempotentes válidos para BDs ya existentes.
  - La migración `004_ventas.sql` (secuencia `ventas_numero_seq`, tablas `ventas` y `venta_detalles`, columna `movimientos_inventario.venta_id` e índices) es idempotente y su DDL es el mismo que `schema.sql`: una BD nueva equivale a la BD anterior + 004. La API de ventas (crear, listar, consultar y anular) existe desde el segundo commit de la serie y la interfaz (`/ventas`, `/ventas/nueva`, `/ventas/:id`) desde el tercero.
  - La migración `010_dos_factores.sql` (columnas `dos_factores_intentos`, `dos_factores_bloqueado_hasta` y `dos_factores_ultimo_paso` al final de `usuarios`, tabla `codigos_respaldo_2fa` e índice `idx_codigos_respaldo_2fa_usuario_id`) es idempotente y su DDL es el mismo que `schema.sql`, con las columnas en el mismo orden. Aplicada dos veces a `libreria_oskar_test` sin errores (la segunda la omite `schema_migrations`; re-ejecutar su SQL dentro de una transacción revertida tampoco falla). La equivalencia por `pg_dump --schema-only` no está verificada. El rango 010-019 queda reservado para el 2FA.
  - La migración `011_recuperacion_contrasena.sql` (columnas `token_recuperacion_expira` y `password_cambiada_en` al final de `usuarios`, después de las de 010 y en el mismo orden, e índice único parcial `idx_usuarios_token_recuperacion`) es idempotente y su DDL es el mismo que `schema.sql`. Reutiliza la columna existente `token_recuperacion` para el SHA-256 del token (64 hexadecimales en `VARCHAR(255)`). Aplicada dos veces a `libreria_oskar_test` (la segunda la omite `schema_migrations`; re-ejecutar su SQL en una transacción revertida tampoco falla). No crea tablas: siguen 14. La equivalencia por `pg_dump --schema-only` no está verificada.
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
| `usuarios` | `dos_factores_secreto` | `VARCHAR(128)` | Nullable. Secreto TOTP cifrado (AES-256-GCM, formato `v1:<iv>:<etiqueta>:<cifrado>` en base64url, 86 caracteres). No nulo con `dos_factores_activo = false` = alta pendiente |
| `usuarios` | `token_recuperacion` | `VARCHAR(255)` | Nullable. SHA-256 hexadecimal (64 caracteres) del token de recuperación de contraseña; nunca el token en claro. Índice único parcial `idx_usuarios_token_recuperacion` |
| `usuarios` | `activo` | `BOOLEAN` | NOT NULL, DEFAULT TRUE |
| `usuarios` | `dos_factores_intentos` | `INTEGER` | NOT NULL, DEFAULT 0 (fallos 2FA consecutivos, TOTP y respaldo) |
| `usuarios` | `dos_factores_bloqueado_hasta` | `TIMESTAMPTZ` | Nullable (bloqueo de 15 min al 5.º fallo, hora de la BD) |
| `usuarios` | `dos_factores_ultimo_paso` | `BIGINT` | Nullable (último paso TOTP aceptado; anti-reutilización) |
| `usuarios` | `token_recuperacion_expira` | `TIMESTAMPTZ` | Nullable (vencimiento del enlace: 30 min, hora de la BD; migración 011) |
| `usuarios` | `password_cambiada_en` | `TIMESTAMPTZ` | Nullable (último restablecimiento, reloj de la app; invalida los JWT con `iat` anterior; migración 011) |
| `codigos_respaldo_2fa` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `codigos_respaldo_2fa` | `usuario_id` | `UUID` | FK -> `usuarios(id)` ON DELETE CASCADE, NOT NULL; `uq_codigos_respaldo_2fa_usuario_hash` UNIQUE (`usuario_id`, `codigo_hash`) |
| `codigos_respaldo_2fa` | `codigo_hash` | `VARCHAR(128)` | NOT NULL (HMAC-SHA256 en hex, 64 caracteres; el código en claro no se guarda) |
| `codigos_respaldo_2fa` | `usado_en` | `TIMESTAMPTZ` | Nullable (NULL = disponible) |
| `codigos_respaldo_2fa` | `creado_en` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP |
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
| `movimientos_inventario` | `venta_id` | `UUID` | FK -> `ventas(id)` ON DELETE RESTRICT, Nullable (última columna; venta que originó el movimiento) |
| `ventas` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `ventas` | `numero` | `INTEGER` | NOT NULL, UNIQUE, `DEFAULT nextval('ventas_numero_seq')` (puede tener huecos) |
| `ventas` | `bodega_id` | `UUID` | FK -> `bodegas(id)` ON DELETE RESTRICT, NOT NULL |
| `ventas` | `usuario_id` | `UUID` | FK -> `usuarios(id)` ON DELETE RESTRICT, NOT NULL (vendedor) |
| `ventas` | `cliente_nombre` | `VARCHAR(150)` | NOT NULL, DEFAULT 'Consumidor final' |
| `ventas` | `cliente_nit` | `VARCHAR(20)` | Nullable |
| `ventas` | `metodo_pago` | `VARCHAR(20)` | NOT NULL, `ck_ventas_metodo_pago` ('Efectivo', 'Transferencia') |
| `ventas` | `subtotal` / `descuento` / `total` | `NUMERIC(10,2)` | NOT NULL, todos `>= 0` (`descuento` DEFAULT 0); `ck_ventas_total`: `total = subtotal - descuento` |
| `ventas` | `notas` | `TEXT` | Nullable |
| `ventas` | `estado` | `VARCHAR(20)` | NOT NULL, DEFAULT 'Completada', `ck_ventas_estado` ('Completada', 'Anulada') |
| `ventas` | `anulada_en` / `anulada_por` / `motivo_anulacion` | `TIMESTAMPTZ` / `UUID` / `TEXT` | Nullable; `anulada_por` FK -> `usuarios(id)` RESTRICT; `ck_ventas_anulacion` exige ambos con 'Anulada' y ninguno con 'Completada' |
| `ventas` | `creado_en` | `TIMESTAMPTZ` | NOT NULL, DEFAULT CURRENT_TIMESTAMP (fecha de la venta) |
| `venta_detalles` | `id` | `UUID` | PK, `DEFAULT uuid_generate_v4()` |
| `venta_detalles` | `venta_id` | `UUID` | FK -> `ventas(id)` ON DELETE CASCADE, NOT NULL; `uq_venta_libro` UNIQUE (`venta_id`, `libro_id`) |
| `venta_detalles` | `libro_id` | `UUID` | FK -> `libros(id)` ON DELETE RESTRICT, NOT NULL |
| `venta_detalles` | `cantidad` | `INT` | NOT NULL, CHECK (`cantidad > 0`) |
| `venta_detalles` | `precio_unitario` | `NUMERIC(10,2)` | NOT NULL, CHECK (`precio_unitario > 0`) (snapshot del precio) |
| `venta_detalles` | `subtotal` | `NUMERIC(10,2)` | NOT NULL, `ck_venta_detalles_subtotal`: `subtotal = cantidad * precio_unitario` |

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
| `idx_usuarios_token_recuperacion` | `usuarios` | `token_recuperacion` | UNIQUE parcial: `WHERE token_recuperacion IS NOT NULL` (migración 011) |
| `idx_codigos_respaldo_2fa_usuario_id` | `codigos_respaldo_2fa` | `usuario_id` | B-Tree (redundante con el UNIQUE que empieza por `usuario_id`, ver §9) |
| `idx_movimientos_fecha` | `movimientos_inventario` | `fecha_movimiento DESC` | B-Tree ordenado descendente |
| `idx_movimientos_inventario_id` | `movimientos_inventario` | `inventario_id` | B-Tree |
| `idx_movimientos_usuario_id` | `movimientos_inventario` | `usuario_id` | B-Tree |
| `idx_ventas_fecha` | `ventas` | `creado_en DESC` | B-Tree ordenado descendente |
| `idx_ventas_estado_fecha` | `ventas` | `estado, creado_en DESC` | B-Tree compuesto |
| `idx_ventas_usuario_id` | `ventas` | `usuario_id` | B-Tree |
| `idx_venta_detalles_libro_id` | `venta_detalles` | `libro_id` | B-Tree |
| `idx_movimientos_venta_id` | `movimientos_inventario` | `venta_id` | Parcial: `WHERE venta_id IS NOT NULL` |

### 3.6 Detalle Específico de Movimientos de Inventario
- **Nombre de columna para motivo**: La columna se llama exactamente `motivo_detalle` (tipo `TEXT`).
- **Existencia de campo de referencia adicional**: No existe columna `referencia` en la tabla `movimientos_inventario`. Sí existe `venta_id` (UUID nullable, FK a `ventas` ON DELETE RESTRICT): enlaza el movimiento con la venta que lo originó; lo escriben la venta (`Salida`) y su anulación (`Ingreso`) mediante `movimientoRepository.createMovimiento({ ventaId })`; `GET /api/movimientos` no lo expone.
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
| `DB_CONNECT_MAX_WAIT_MS` | Número (entero 0-600000, ms) | Tiempo máximo que `server.js`, `migrate.js` y `seed.js` esperan a la BD al arrancar, reintentando. Lo lee `database/esperarBaseDatos.js` directamente de `process.env` (no pasa por `config/env.js`); un valor inválido lanza Error sin mostrar el valor | `120000` en producción; `0` (un solo intento) en los demás entornos |
| `TEST_DB_HOST` | String | Host de base de pruebas aislada | `localhost` |
| `TEST_DB_PORT` | Número | Puerto de base de pruebas | `5435` |
| `TEST_DB_USER` | String | Usuario de base de pruebas | `postgres` |
| `TEST_DB_PASSWORD`| String | Contraseña de base de pruebas | `postgres` |
| `MAIL_PROVIDER` | String | Proveedor de correo: `smtp` o `consola` (alias `console`). Con `NODE_ENV=test` siempre `consola`; valor inválido lanza Error al cargar | `smtp` en producción; `consola` en otros entornos |
| `MAIL_HOST` | String | Servidor SMTP | `smtp.gmail.com` |
| `MAIL_PORT` | Número | Puerto SMTP (465 → `secure: true`; otros → `requireTLS: true`); fuera de 1-65535 lanza Error | `587` |
| `MAIL_USER` | String | Usuario SMTP | vacío |
| `MAIL_PASSWORD` | String | Contraseña SMTP (contraseña de aplicación en Gmail); nunca se registra en logs | vacío |
| `MAIL_FROM` | String | Remitente | `MAIL_USER` |
| `JWT_SECRET` | String | Clave de firma simétrica HMAC SHA-256 | Obligatoria en prod; dev: `'secreto-solo-para-desarrollo-local'` |
| `JWT_EXPIRES_IN` | String | Tiempo de validez del token JWT | `'8h'` |
| `TWO_FACTOR_ENFORCED` | Booleano (`true`/`false`) | 2FA obligatorio para Administrador y Empleado (activación forzada en el login). Con `NODE_ENV=test` siempre `false`; otro valor lanza Error al cargar | `true` en producción; `false` en otros entornos (Compose: `false`) |
| `TWO_FACTOR_ENCRYPTION_KEY` | String (64 hex = 32 bytes) | Clave maestra del 2FA; de ella se derivan con HKDF-SHA256 la clave AES-256-GCM del secreto y la clave HMAC de los códigos de respaldo. Formato inválido lanza Error sin mostrar el valor | Obligatoria en prod; fuera de prod, clave de desarrollo fija con `[WARN CONFIG]` (sin aviso en `test`) |
| `GOOGLE_BOOKS_API_KEY` | String | API Key opcional de Google Books | `null` |
| `DIAS_STOCK_OBSOLETO` | Número | Umbral de días sin salidas para clasificar stock muerto | `90` |
| `SEQUELIZE_LOGGING` | Booleano | Si habilita salida de queries SQL a consola | `false` |
| `CORS_ORIGINS` | Lista CSV de orígenes HTTP(S) | Orígenes autorizados por CORS; obligatoria en producción | Ausente: permisivo solo en desarrollo; producción falla al iniciar. Compose: `http://localhost:5173,http://localhost:4173` (sobreescribible) |
| `TRUST_PROXY` | Entero no negativo | Número exacto de saltos proxy confiables para `req.ip` | `0` (no confiar en `X-Forwarded-For`) |
| `LOGIN_RATE_LIMIT` | Entero positivo | Intentos por IP permitidos en login | `10` |
| `LOGIN_RATE_WINDOW_MS` | Entero positivo en milisegundos | Ventana del limitador de login | `900000` (15 minutos) |
| `FRONTEND_URL` | Origen HTTP(S) sin ruta ni barra final | Base del enlace de recuperación de contraseña (`{FRONTEND_URL}/restablecer#token=…`). Valor inválido lanza Error sin mostrarlo. Con `NODE_ENV=test` se ignora | `http://localhost:5173` fuera de producción; en producción, si falta, `[WARN CONFIG]` y no se envían enlaces. Compose: `http://localhost:5173` (sobreescribible) |
| `SEED_ADMIN_EMAIL` | String (correo, máx. 150) | Solo el seed y solo con `NODE_ENV=production`: correo del Administrador central. Obligatoria en producción, sin valor por defecto; se normaliza con `trim()` y minúsculas y, si falta o es inválida, el seed falla antes de abrir la transacción | Sin valor |
| `SEED_ADMIN_PASSWORD` | String | Contraseña del Administrador. En producción solo se exige (y se valida con `utils/passwordPolicy.js`) cuando el usuario no existe; nunca se modifica uno existente. Fuera de producción es la contraseña de `admin@libreriaoskar.com` y se reinicia en cada ejecución | Fuera de producción: `Admin123!`; en producción: sin valor |
| `SEED_EMPLEADO_PASSWORD` | String | Contraseña de `empleado@libreriaoskar.com` en el seed (sin cambios) | Fuera de producción: `Empleado123!`; en producción: sin valor (el seed solo avisa) |

- **Correo (`src/config/mail.config.js`)**: `leerConfigCorreo(entorno, nodeEnv)` es una función pura; `env.js` la invoca y expone el resultado como `env.mail` (`proveedor`, `host`, `port`, `user`, `password`, `from`, `faltantes`). Con `smtp` y `MAIL_USER`/`MAIL_PASSWORD` ausentes no lanza: `env.js` emite un `[WARN CONFIG]` que nombra las variables faltantes (nunca valores) y los envíos fallan registrados.
- **2FA (`src/config/twoFactor.config.js`)**: `leerConfigDosFactores(entorno, nodeEnv)` es una función pura (estilo `mail.config.js`); `env.js` expone `env.twoFactor` con `enforced`, `encryptionKey` (Buffer), `claveDesarrollo` y las constantes: emisor `Librería Oskar`, 6 dígitos, periodo 30 s, SHA-1, tolerancia ±1 paso, token temporal de 600 s, 5 intentos, bloqueo de 15 min y 10 códigos de respaldo. `enforced` se lee en cada login (las pruebas lo cambian y lo restauran).
- **Recuperación de contraseña (`src/config/recuperacion.config.js`)**: `leerConfigRecuperacion(entorno, nodeEnv)` es una función pura (estilo `mail.config.js`); `env.js` expone `env.recuperacion` con `frontendUrl` (o `null`), `faltantes` y las constantes: vencimiento 30 min, enfriamiento 2 min, `recuperarMax` 5, `restablecerMax` 10 y ventana de 15 min. En producción sin `FRONTEND_URL` no lanza: `env.js` emite un `[WARN CONFIG]` que nombra la variable y `POST /api/auth/recuperar` responde igual sin enviar nada (registra `[RECUPERACION]`).
- **Conexión Sequelize (`src/config/sequelize.js`)**: Instancia `Sequelize` configurada con `freezeTableName: true`, `underscored: true`, `timestamps: false`, y pool de conexiones (max: 20, min: 0, acquire: 30000ms, idle: 30000ms).
- **Cliente `pg` nativo (`src/config/db.js`)**: Pool de `pg` de uso exclusivo de pruebas (lo importan 7 archivos de `tests/`; su cabecera lo indica). La app no lo importa: `server.js`, `health.controller.js`, `run-tests.js`, `database/migrate.js` y `database/seed.js` usan Sequelize. Se retira en una fase posterior junto con esas pruebas.
- **Puerto en `.env.example`**: usa `DB_PORT=5434` para coincidir con el puerto que publica Compose; el valor por defecto de `config/env.js` sigue siendo `5432`.
- **`DATABASE_URL`**: `config/env.js` fuerza `connectionString: undefined` cuando `NODE_ENV=test`, de modo que las pruebas nunca usan una URL completa.

### 4.2 Bootstrap y Middlewares Globales (`src/app.js` y `src/server.js`)
- `server.js`: Espera a la BD con `esperarBaseDatos()` (`database/esperarBaseDatos.js`, que envuelve `testSequelizeConnection()` de `config/sequelize.js`): en producción reintenta con pausas de 1, 2, 4, 8 y 10 s hasta `DB_CONNECT_MAX_WAIT_MS` (120 s por defecto), registrando `[DATABASE RETRY]`; los errores de autenticación y de base inexistente (`28P01`, `28000`, `3D000`, `SequelizeAccessDeniedError`) no se reintentan. Fuera de producción el valor por defecto es 0: un solo intento, como antes. Luego inicia `app.listen(env.PORT)` y registra escuchadores de `SIGINT` y `SIGTERM` para un *graceful shutdown*: cierra el servidor HTTP y luego llama a `sequelize.close()`. Si la conexión inicial falla (o se agota la espera), termina el proceso con código 1. `migrate.js` y `seed.js` hacen la misma espera solo al ejecutarse como script (`require.main === module`); importarlos no espera nada.
- Middlewares globales en `app.js` (en orden de ejecución):
  1. `helmet()`: Cabeceras de seguridad HTTP.
  2. Configura `trust proxy` con `TRUST_PROXY` (0 por defecto) y aplica la lista `CORS_ORIGINS`; incluye métodos GET/POST/PUT/PATCH/DELETE/OPTIONS y expone `Content-Disposition`. OPTIONS responde preflight con 204. Las solicitudes sin `Origin` no reciben permiso CORS.
  3. `express.json` y `express.urlencoded` aceptan hasta 1 MB. JSON sintácticamente inválido responde 400; exceso de tamaño responde 413, ambos en formato `{ status: 'fail', message }` sin detalles internos.
  4. `morgan('dev')`: Registro de logs HTTP en consola (desactivado cuando `NODE_ENV === 'test'`).
  5. Enrutador `/api`: Montaje de `src/routes/index.js`. `POST /api/auth/login` usa un rate limiter por `req.ip` (10 por 15 minutos por defecto, configurable), con 429 `{ status: 'fail', message }`. Los registros vencidos se purgan periódicamente; el limitador en memoria se reinicia al reiniciar cada proceso. Despliegues con varias réplicas requieren un almacén compartido antes de escalar.
  6. Manejador 404 y `errorHandler` centralizado con 4 argumentos `(err, req, res, next)`.

`TRUST_PROXY` debe configurarse al número exacto de proxies confiables entre cliente y aplicación. La topología de despliegue aún no está definida; mantener `0` mientras no se conozca. Si Cloud Run/ingress queda como único salto directo, verificar la cadena real y configurar `1`; no usar `true` ni `*`.

### 4.3 Tabla Completa de Endpoints

`src/routes/index.js` solo cablea rutas (sin lógica) y monta `auth.routes.js`, `libro.routes.js`, `inventario.routes.js`, `movimiento.routes.js` y `venta.routes.js`. `auth.routes.js` monta `dosFactores.routes.js` en `/api/auth/2fa` y declara `/recuperar` y `/restablecer`. Todos los handlers viven en controladores.

| Método | Ruta | Middlewares (Auth / Rol) | Controller.Función | Service.Función | Repository.Función | Descripción |
|---|---|---|---|---|---|---|
| `GET` | `/api/health` | Ninguno (Público) | `healthController.check` | No aplica | No aplica (usa `testSequelizeConnection()`) | Monitoreo de salud para Cloud Run / Docker. Responde 200 `healthy` o 503 `degraded` (formato propio, sin envoltorio `status: 'success'`). |
| `GET` | `/api/bodegas` | Ninguno (Público) | `bodegaController.listar` | `bodegaService.listarActivas` | `bodegaRepository.findActivas` | Listado de bodegas activas con su sucursal. |
| `GET` | `/api/categorias`| Ninguno (Público) | `categoriaController.listar` | `categoriaService.listar` | `categoriaRepository.findAll` | Catálogo de categorías temáticas ordenadas. |
| `GET` | `/api/categorias/admin` | `authenticate`, `authorize('Administrador')` | `categoriaController.listarAdministracion` | `categoriaService.listarAdministracion` | `categoriaRepository.findAllWithLibroCount` | Listado administrativo ordenado con `id`, `nombre` y `libros_count` entero, obtenido en una consulta agrupada. No cambia el GET público. |
| `POST` | `/api/categorias` | `authenticate`, `authorize('Administrador')` | `categoriaController.crear` | `categoriaService.crear` | `categoriaRepository.findByNombre`, `create` | Crea una categoría; recorta nombre, exige valor no vacío y rechaza duplicados sin distinguir mayúsculas (409). |
| `PUT` | `/api/categorias/:id` | `authenticate`, `authorize('Administrador')` | `categoriaController.renombrar` | `categoriaService.renombrar` | `findById`, `findByNombre`, `updateNombre` | Renombra una categoría; valida UUID, existencia y duplicados (409), permite conservar el nombre y no altera libros asociados. |
| `DELETE` | `/api/categorias/:id` | `authenticate`, `authorize('Administrador')` | `categoriaController.eliminar` | `categoriaService.eliminar` | `findById`, `countLibros`, `delete` | Elimina solo si no tiene libros; con asociaciones devuelve 409 e indica la cantidad. |
| `GET` | `/api/usuarios` | `authenticate`, `authorize('Administrador')` | `usuarioController.listar` | `usuarioService.listar` | `usuarioRepository.findActivosConRol` / `findConRol` | Sin parámetros conserva la lista de usuarios activos y su forma original; `?incluirInactivos=true` incluye activos e inactivos con `activo`. |
| `POST` | `/api/usuarios` | `authenticate`, `authorize('Administrador')` | `usuarioController.crear` | `usuarioService.crear` | `usuarioRepository.create`, `findRoleByName`, `emailExists` | Crea Administrador o Empleado activo; normaliza email y aplica política de contraseña y bcrypt. |
| `PUT` | `/api/usuarios/:id` | `authenticate`, `authorize('Administrador')` | `usuarioController.actualizar` | `usuarioService.actualizar` | `usuarioRepository.findByIdForUpdate`, `update`, `findRoleByName` | Edita nombre, correo, rol y estado; protege rol propio y último Administrador activo. No cambia contraseña. |
| `PATCH` | `/api/usuarios/:id/activo` | `authenticate`, `authorize('Administrador')` | `usuarioController.cambiarActivo` | `usuarioService.cambiarActivo` | `usuarioRepository.findByIdForUpdate`, `countActiveAdministrators` | Activa o desactiva la cuenta con protección de auto desactivación y último Administrador activo. |
| `POST` | `/api/auth/login` | Ninguno (Público) | `authController.login` | `authService.login` | `usuarioRepository.findByEmail` | Autentica credenciales. Sin segundo factor: 200 `{ token, usuario }` (igual que antes). Con 2FA activo (cualquier rol): 200 `{ paso: 'verificar', tokenTemporal, expiraEnSegundos }`. Con `TWO_FACTOR_ENFORCED` y rol Administrador/Empleado sin 2FA: 200 `{ paso: 'configurar', tokenTemporal, expiraEnSegundos }`. Errores sin cambios. |
| `GET` | `/api/auth/me` | `authenticate` | `authController.me` | No aplica | No aplica (lee `req.user`) | Perfil del usuario autenticado en la sesión. |
| `POST` | `/api/auth/recuperar` | Ninguno (Público), `Cache-Control: no-store`, `limiteRecuperar` (5 por 15 min por IP) | `recuperacionController.recuperar` | `recuperacionService.solicitar` | `recuperacionRepository.buscarActivoPorEmail`, `emitirToken` | Body `{ email }` (string no vacío, ≤150 tras recortar; si no, 400). Siempre 200 `{ mensaje }` con el mismo texto, exista o no la cuenta, esté activa o no, se envíe o no el correo. Solo a cuentas activas y fuera del enfriamiento de 2 min envía (sin esperarlo) un enlace `{FRONTEND_URL}/restablecer#token=…` que vence en 30 min y reemplaza al anterior. 429 límite. |
| `POST` | `/api/auth/restablecer` | Ninguno (Público), `Cache-Control: no-store`, `limiteRestablecer` (10 por 15 min por IP) | `recuperacionController.restablecer` | `recuperacionService.restablecer` | `recuperacionRepository.buscarPorTokenVigente`, `consumirToken` | Body `{ token, password }`. 200 `{ restablecido: true }` (no inicia sesión, no toca el 2FA; invalida los JWT anteriores y envía un aviso). 400 "El enlace no es válido o ya venció. Solicita uno nuevo." (formato, inexistente, vencido, usado, cuenta inactiva), 400 política de contraseña o igual a la actual (sin consumir el enlace), 429 límite. |
| `POST` | `/api/auth/2fa/configurar` | `exigirAlcance('2fa-setup')` | `dosFactoresController.configurar` | `dosFactoresService.configurar` | `dosFactoresRepository.obtenerEstado`, `guardarSecretoPendiente` | Genera un secreto nuevo (reemplaza uno pendiente), lo guarda cifrado con activo=false. 200 `{ qrDataUrl, secretoManual, otpauthUrl }` con `Cache-Control: no-store`; 409 si ya está activo. |
| `POST` | `/api/auth/2fa/activar` | `exigirAlcance('2fa-setup')` | `dosFactoresController.activar` | `dosFactoresService.activar` | `obtenerEstado` (con `FOR UPDATE`), `reservarIntento`, `reclamarPaso`, `reemplazarRespaldos` | Body `{ codigo }`. 200 `{ token, usuario, codigosRespaldo }` (10, una sola vez; `no-store`). 400 formato, 401 código inválido, 409 sin alta pendiente o ya activo, 429 bloqueo. |
| `POST` | `/api/auth/2fa/verificar` | `exigirAlcance('2fa-verify')` | `dosFactoresController.verificar` | `dosFactoresService.verificar` | `obtenerEstado`, `reservarIntento`, `reclamarPaso`, `consumirRespaldo`, `reiniciarIntentos` | Body `{ codigo }` o `{ codigoRespaldo }` (exactamente uno). 200 `{ token, usuario }` (`no-store`). 400, 401 "Código inválido o vencido." (igual para TOTP y respaldo), 429. |
| `GET` | `/api/auth/2fa/estado` | `authenticate` | `dosFactoresController.estado` | `dosFactoresService.estado` | `obtenerEstado`, `contarRespaldosRestantes` | 200 `{ activo, obligatorio, codigosRespaldoRestantes }`. |
| `POST` | `/api/auth/2fa/respaldo/regenerar` | `authenticate` | `dosFactoresController.regenerarRespaldo` | `dosFactoresService.regenerarRespaldo` | `obtenerEstado`, `reservarIntento`, `reclamarPaso`, `reemplazarRespaldos` | Body `{ codigo }` (TOTP vigente). 200 `{ codigosRespaldo }` (`no-store`). Código inválido → 400 (no 401, para que el cliente no cierre la sesión); 409 sin 2FA activo; 429. |
| `POST` | `/api/auth/2fa/usuarios/:id/restablecer` | `authenticate`, `authorize('Administrador')` | `dosFactoresController.restablecer` | `dosFactoresService.restablecerPorAdministrador` | `obtenerEstado` (con `FOR UPDATE`), `restablecer` | Borra secreto y códigos y reinicia contador, bloqueo y último paso. 200 `{ restablecido: true }`; 400 id no UUID; 403 si es el propio administrador (usar `npm run reset-2fa`); 404 si no existe. |
| `GET` | `/api/libros` | Ninguno (Público), `validatePaginacion` | `libroController.listar` | `catalogoService.listar` | `libroRepository.searchAndList` | Catálogo con filtros `q` y categoría, paginado con `limit` (50 por defecto) y `offset` (0). Devuelve `{ status, results, total, limit, offset, data }`; `results` es la cantidad de elementos de la página y `total` cuenta todos los libros que cumplen los filtros. |
| `GET` | `/api/libros/admin` | `authenticate`, `authorize('Administrador')`, `validatePaginacion`, `validateAdminListarLibros` | `libroController.listarAdministracion` | `libroService.listarLibrosAdministracion` | `libroRepository.findAdminPage` | Lista libros activos e inactivos para administración; filtros `q` (título), `categoriaId`, `estado=todos|activo|inactivo`, `limit` (50 por defecto) y `offset` (0). Devuelve `{ status, results, total, limit, offset, data }` con campos bibliográficos, precio, estado y nombres de relaciones. |
| `PUT` | `/api/libros/:id` | `authenticate`, `authorize('Administrador')`, `validateEditarLibro` | `libroController.actualizar` | `libroService.actualizarLibro` | `libroRepository.findByIdForUpdate`, `findByIsbn`, `updateBibliografia` | Edita título, autor, editorial, categoría, reseña e imagen; ISBN se valida si se envía (si se omite se conserva; vacío/null lo limpia). Normaliza cadenas, reutiliza upsert case-insensitive de maestros, rechaza autor marcador e ISBN duplicado (409). No cambia precio, stock ni movimientos. Transacción única. |
| `PATCH` | `/api/libros/:id/activo` | `authenticate`, `authorize('Administrador')`, `validateCambiarActivoLibro` | `libroController.cambiarActivo` | `libroService.cambiarActivoLibro` | `libroRepository.findByIdForUpdate`, `updateActivo` | Baja lógica reversible con `{ activo: boolean }`; nunca elimina el registro. Repetir el estado es idempotente; mantiene inventario e historial. |
| `GET` | `/api/libros/:ref` | Ninguno (Público) | `libroController.detalle` | `catalogoService.detalle` | `libroRepository.findDetalleByRef` | Ficha técnica pública y disponibilidad por ref/UUID; libros inactivos responden 404. |
| `POST` | `/api/libros/escanear` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateEscanearLibro` | `libroController.escanear` | `libroService.escanearLibro` | `libroRepository.findByIsbnForUpdate`, `upsert`, `inventarioRepository.findOrCreate`, `movimientoRepository.createMovimiento` | Escaneo de ISBN, registro atómico e ingreso de 1 unidad. Body: `{ isbn, bodegaId }`. Actor (`usuarioId`) tomado de `req.user.id`. Rechaza libros locales inactivos con 409 antes de crear movimientos. El frontend no lo consume (solo API y pruebas). |
| `POST` | `/api/libros/consultar`| `authenticate`, `authorize('Administrador', 'Empleado')`, `validateConsultarLibro` | `libroController.consultar` | `libroService.consultarLibro` | `libroRepository.findByIsbn`, `inventarioRepository.findByLibroId` | Verifica existencia local o sugiere metadatos externos sin persistir. ISBN inexistente conserva la sugerencia; libro local inactivo responde 409. La sugerencia tiene la forma `{ isbn, titulo, autor, editorial, resena, imagen_url, fuente, campos_faltantes }`, sin precio. |
| `POST` | `/api/libros/registrar`| `authenticate`, `authorize('Administrador', 'Empleado')`, `validateRegistrarLibro` | `libroController.registrar` | `libroService.registrarLibro` | `libroRepository.findByIsbnForUpdate`, `create`, `inventarioRepository.findOrCreate`, `movimientoRepository.createMovimiento` | Registro manual de libro con regla de precio por rol e ingreso inicial. Un ISBN existente e inactivo responde 409 y no crea inventario ni movimiento. |
| `POST` | `/api/libros/:id/ingreso` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateIngresoLibro` | `libroController.ingreso` | `libroService.ingresoLibro` | `libroRepository.findByIdForUpdate`, `inventarioRepository.findOrCreate`, `movimientoRepository.createMovimiento` | Ingreso de unidades de stock a un libro existente en bodega; libro inactivo responde 409 sin crear inventario ni movimiento. |
| `PATCH` | `/api/libros/:id/precio` | `authenticate`, `authorize('Administrador')`, `validateActualizarPrecioLibro` | `libroController.actualizarPrecio` | `libroService.actualizarPrecio` | `libroRepository.updatePrecio` | Fija o corrige el precio de un libro existente. Body: `{ precio }` (0 a 99999999.99, máximo 2 decimales). 400 si es inválido, 404 si el libro no existe, 200 con el libro plano. No toca stock ni movimientos. |
| `GET` | `/api/inventario/resumen` | `authenticate`, `authorize('Administrador', 'Empleado')` | `inventarioController.resumen` | `inventarioService.obtenerResumen` | `inventarioRepository.getResumen` | Métricas generales de stock, bajo stock, obsoletos y sin precio. |
| `GET` | `/api/inventario` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validatePaginacion`, `validateListarInventario` | `inventarioController.listar` | `inventarioService.listarInventario` | `inventarioRepository.findAllWithDetails` | Listado con filtros por estado, término y bodega, paginado con `limit` (200 por defecto) y `offset` (0). Devuelve `{ status, total, limit, offset, data }`, con `libro_activo` para identificar bajas; incluye libros inactivos y conserva el resumen global. |
| `POST` | `/api/inventario/:id/salida` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateSalidaInventario` | `inventarioController.salida` | `inventarioService.registrarSalida` | `inventarioRepository.findByIdForUpdate`, `movimientoRepository.createMovimiento` | Registro de salida de stock con bloqueo pesimista. |
| `POST` | `/api/inventario/:id/ajuste` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateAjusteInventario` | `inventarioController.ajuste` | `inventarioService.registrarAjuste` | `inventarioRepository.findByIdForUpdate`, `movimientoRepository.createMovimiento` | Ajuste directo de stock auditado con bloqueo pesimista. |
| `GET` | `/api/movimientos` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateListarMovimientos` | `inventarioController.listarMovimientos` | `inventarioService.listarMovimientos` | `movimientoRepository.findAllWithFilters` | Kardex cronológico de movimientos paginado. |
| `GET` | `/api/reportes/inventario-valorizado` | `authenticate`, `authorize('Administrador')`, `validateReporteInventario` | `reportesController.inventarioValorizado` | `reportesService.generarInventarioValorizado` | `inventarioValorizadoRepository.findPage` | Página por libro y bodega con filtros `libroId`, `categoriaId`, `bodegaId`, `limit` (50 por defecto, 1-200) y `offset` (0). Incluye existencias, totales físicos globales/por categoría/bodega y campos monetarios `null`: el esquema no registra costo de adquisición. Incluye libros inactivos. |
| `GET` | `/api/reportes/kardex` | `authenticate`, `authorize('Administrador')`, `validateReporteKardex` | `reportesController.kardex` | `reportesService.generarKardex` | `kardexReportesRepository.findPage` → `movimientoRepository.findAllWithFilters` | Kardex administrativo con filtros `libroId`, `categoriaId`, `bodegaId`, `tipo`, `desde`, `hasta`, `limit` (50 por defecto, 1-200) y `offset`. Mantiene movimientos de ventas/anulaciones; el saldo histórico por fila no está almacenado y se devuelve `null`. |
| `GET` | `/api/reportes/corte-caja` | `authenticate`, `authorize('Administrador')`, `validateCorteCaja` | `reportesController.corteCaja` | `reportesService.generarCorteCaja` | `ventasReportesRepository.resumenEstado`, `cortePorMetodo`, `cortePorVendedor` | Requiere `fecha=YYYY-MM-DD`, día inclusivo Guatemala (UTC-06:00). Agrega cabeceras sin unir detalles: ventas completadas, bruto, descuentos, neto, método de pago y vendedor; anuladas aparecen aparte con importes originales. Es corte de ventas, no conciliación física de caja. |
| `GET` | `/api/reportes/resumen-periodo` | `authenticate`, `authorize('Administrador')`, `validateResumenPeriodo` | `reportesController.resumenPeriodo` | `reportesService.generarResumenPeriodo` | `ventasReportesRepository.resumenEstado` | Requiere `desde` y `hasta` inclusivos (`YYYY-MM-DD`, Guatemala UTC-06:00). Devuelve métricas de completadas y anulaciones, y compara contra el intervalo inmediatamente anterior de igual duración; variación porcentual sobre neto, `null` si el neto previo es cero y el actual no. |
| `GET` | `/api/reportes/libros-mas-vendidos` | `authenticate`, `authorize('Administrador')`, `validateLibrosMasVendidos` | `reportesController.librosMasVendidos` | `reportesService.generarLibrosMasVendidos` | `ventasReportesRepository.librosMasVendidos` | Filtros opcionales `desde`, `hasta`, `limit` (10 por defecto, 1-200) y `offset` (0). Suma cantidad y `venta_detalles.subtotal` histórico, ordena determinísticamente y excluye ventas `Anulada`; incluye libros hoy inactivos que vendieron. |
| `GET` | `/api/reportes/reposicion` | `authenticate`, `authorize('Administrador')`, `validateReposicion` | `reportesController.reposicion` | `reportesService.generarReposicion` | `ventasReportesRepository.reposicion` | Filtros opcionales `desde`, `hasta`, `bodegaId`, `categoriaId`, `libroId`, `limit` (50, 1-200) y `offset`. Una fila por inventario/bodega, existencias, mínimo y unidades completadas del período. `necesita_reposicion` solo es verdadero para un libro activo con existencias <= mínimo; `cantidad_sugerida` es `null`. |
| `GET` | `/api/reportes/ventas` | `authenticate`, `authorize('Administrador')`, `validateVentasReporte` | `reportesController.ventas` | `reportesService.generarVentas` | `ventasReportesRepository.ventas` | Filtros opcionales `desde`, `hasta`, `estado`, `vendedorId`, `metodoPago`, `limit` (50, 1-200) y `offset` (0). Orden más reciente primero y desempate estable; incluye todas las columnas administrativas indicadas e información de anulación. |
| `GET` | `/api/reportes/:tipo/exportar?formato=xlsx\|pdf` | `authenticate`, `authorize('Administrador')`, `validateReporteExportacion` y validador del tipo | `reportesController.exportar` | `exportacionService.generar` → `reportesExportService.prepararExportacion` → servicio JSON vigente → `excel.exporter` / `pdf.exporter` | Exporta corte-caja, resumen-periodo, libros-mas-vendidos, reposicion, inventario-valorizado, kardex y ventas. Usa todos los registros filtrados, no la página del UI. `maxRegistros` opcional (1-5000), máximo fijo 5000; responde 413 si el conjunto supera ese valor. Máximo dos exportaciones simultáneas; archivos en memoria, sin jobs. |
| `POST` | `/api/ventas` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateCrearVenta` | `ventaController.crear` | `ventaService.crearVenta` | `bodegaRepository.findActivaById`, `libroRepository.findByIdsForUpdate`, `inventarioRepository.findByLibrosAndBodega`, `inventarioRepository.findByIdForUpdate`, `ventaRepository.createVenta`, `ventaRepository.createDetalles`, `movimientoRepository.createMovimiento` | Registra una venta (cabecera, líneas y movimientos `Salida` con `venta_id`) en una transacción. Bloquea y rechaza libros inactivos con 409 antes de persistir. También valida stock y precio. |
| `GET` | `/api/ventas` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateListarVentas` | `ventaController.listar` | `ventaService.listarVentas` | `ventaRepository.findPagina`, `ventaRepository.contarLineasPorVentas` | Lista paginada (más recientes primero) con `estado`, `desde`/`hasta` (días inclusivos en hora de Guatemala, UTC-6), `limit` (1-200, 50 por defecto) y `offset`. Ambos roles ven todas las ventas. |
| `GET` | `/api/ventas/:id` | `authenticate`, `authorize('Administrador', 'Empleado')`, `validateVentaId` | `ventaController.obtener` | `ventaService.obtenerVenta` | `ventaRepository.findDetalleById` | Detalle de una venta con líneas, bodega, vendedor y datos de anulación. 400 si el id no es UUID; 404 si no existe. |
| `POST` | `/api/ventas/:id/anular` | `authenticate`, `authorize('Administrador')`, `validateAnularVenta` | `ventaController.anular` | `ventaService.anularVenta` | `ventaRepository.findByIdForUpdate`, `ventaRepository.findLineasByVenta`, `inventarioRepository.findByIdForUpdate`, `movimientoRepository.createMovimiento`, `ventaRepository.marcarAnulada` | Anula la venta completa: movimientos `Ingreso` con `venta_id` y estado `Anulada`. Body: `{ motivo }` (obligatorio, máx. 500). 200 con el detalle; 404 no existe; 409 ya anulada. |

#### Reportes administrativos
- Arquitectura: `routes/reportes.routes.js` → `controllers/reportes.controller.js` → fachada `services/reportes.service.js` → servicios especializados por informe en `services/reportes/` → `repositories/reportes/`. Validadores en `middlewares/validators/reportes.validators.js` y `reportesVentas.validators.js`, exportados por `middlewares/validator.js`. `services/reportes/contrato.service.js` centraliza el sobre común. Las consultas analíticas agregan cabeceras sin unir detalles cuando calculan importes y usan `NUMERIC` de PostgreSQL; no alteran los servicios de creación/anulación ni los contratos de `/api/ventas`.
- Todos los reportes requieren JWT y rol `Administrador`. Las fechas `YYYY-MM-DD` corresponden a días inclusivos de `America/Guatemala` (UTC-06:00), mediante `rangoFechasNegocio`. Los listados aceptan `limit` de 1 a 200 (predeterminado 50; 10 para ranking) y `offset` desde cero. Resúmenes agregados no usan paginación significativa y exponen `limit`/`offset` nulos cuando comparten el sobre general.
- Contrato común: `{ status: 'success', data: { filtros, total, limit, offset, ... } }`. Inventario añade `registros`, `resumen`, `totales_por_categoria` y `totales_por_bodega`. Cada registro contiene `inventario_id`, ids/nombres del libro, categoría y bodega, `existencias`, `costo_unitario: null` y `valor_total: null`; resumen/grupos contienen número de registros y existencias, con `valor_total: null`. Los agregados cubren todos los resultados filtrados, no solo la página. No usa `libros.precio`.
- **Limitación de costo**: el esquema almacena `libros.precio` (precio comercial), `venta_detalles.precio_unitario` (snapshot de venta) y montos de ventas; no existe costo de adquisición por libro, lote, bodega o movimiento. No se calcula valorización contable ni se deriva de precio de venta. `valoracion_disponible` es `false` hasta que exista una fuente de costo acordada y persistida. La agregación de existencias utiliza una consulta analítica con `GROUPING SETS`; sus JOIN son solo relaciones N:1, por lo que no duplican inventarios.
- Kardex añade el array `movimientos` con las mismas filas/orden del repositorio vigente, más `venta_id` para identificar `Salida` de venta y `Ingreso` de anulación, y `existencias_resultantes: null`. El ledger no guarda saldo posterior por movimiento; en `Ajuste` `cantidad` es el stock final fijado por el trigger, no un delta. No se recalculan saldos históricos. Libros inactivos y sus movimientos permanecen incluidos si cumplen los filtros.
- `corte-caja` requiere `fecha` y devuelve `ventas` (cantidad, bruto, descuentos, neto), `ventas_por_metodo_pago`, `totales_por_vendedor` y `anuladas` con sus importes originales. Las anuladas no se cuentan como ingresos netos vigentes. El esquema no registra apertura, efectivo inicial, retiros ni conteo físico: no se presenta como conciliación de caja.
- `resumen-periodo` requiere ambos extremos inclusivos. El período comparable es el tramo inmediatamente anterior con igual número de días. Métricas actuales/comparables separan completadas de anuladas; la variación es del neto completado, `null` cuando el denominador es cero y el período actual no.
- `libros-mas-vendidos` suma `venta_detalles.cantidad` y `venta_detalles.subtotal` histórico, solo para ventas `Completada`; por tanto conserva ventas de libros hoy inactivos. `ingresos_brutos` refleja subtotales de líneas antes del descuento global de cabecera, ya que el modelo no distribuye ese descuento entre libros. Posición desempata por unidades, ingresos, título e id.
- `reposicion` devuelve inventario por libro y bodega, y unidades de ventas `Completada` en el rango, también por bodega. Solo marca bajo mínimo si el libro sigue activo y `existencias <= stock_minimo`; los inactivos se identifican pero no generan alerta operativa. `cantidad_sugerida` queda `null`: no hay plazo de entrega ni nivel objetivo persistidos para justificar una cantidad. No se inventan costos ni pronósticos.
- `ventas` usa los filtros existentes en el esquema: fechas, `estado` (`Completada`/`Anulada`), `vendedorId` y `metodoPago` (`Efectivo`/`Transferencia`), con paginación estable por fecha, correlativo e id. Incluye montos originales y campos de anulación; consultar/listar no cambia registros.
- Para las nuevas agregaciones, los importes usan los montos DECIMAL históricos y se serializan con dos decimales, sin recalcular a precios actuales ni sumar montos duplicados por detalles. El método de pago y vendedor se agregan desde la cabecera de venta.
- Exportaciones: `GET /api/reportes/:tipo/exportar?formato=xlsx|pdf` admite los siete slugs documentados en la tabla. Reutiliza cada servicio JSON y reúne páginas internas de 200 filas hasta completar el total filtrado. Se ignoran `limit`/`offset` de la vista para que el archivo no quede limitado a la página actual; `maxRegistros` permite pedir un máximo menor, entre 1 y 5000. Si se excede, HTTP 413 con error estándar; tipos desconocidos 404 y formato/filtros inválidos 400. No se crean trabajos en segundo plano.
- La preparación de exportación usa un límite duro de 5000 registros filtrados y admite dos exportaciones simultáneas por proceso para contener memoria. Dependencias de producción: `exceljs@4.4.0` (XLSX) y `pdfkit@0.20.2` (PDF), declaradas en `backend/package.json`; ambas se generan en memoria. Los archivos llevan título, generación, filtros y notas; `Content-Type` y `Content-Disposition` se fijan con nombres controlados por el servidor. CORS ya expone `Content-Disposition`.
- XLSX usa hojas por sección, encabezados destacados, filtros, panel superior congelado, anchos acotados, wrap y celdas monetarias numéricas con formato Q. Texto controlado por usuario con prefijo de fórmula se fuerza a texto; `null` se representa como `No disponible`. PDF repite encabezados de tabla, cambia a horizontal para tablas anchas, recorta texto a la celda/página, numera páginas y usa tipografía estándar sin archivos externos. En ambos formatos los costos, saldos y cantidades sugeridas nulos permanecen como `No disponible`, no cero.
- Limitación de concurrencia: las exportaciones se generan sin streaming y ocupan memoria proporcional a filas/columnas; 5000 filas y dos solicitudes simultáneas son el límite de esta etapa. Si el volumen real excede ese límite, se requiere diseño de streaming o trabajos asíncronos antes de ampliarlo. No se implementó la interfaz React.

### 4.4 Modelos Sequelize (`src/models/`)

| Modelo | Archivo | Tabla | Asociaciones Definidas | Hooks |
|---|---|---|---|---|
| `Sucursal` | `sucursal.model.js` | `sucursales` | `hasMany(models.Bodega, { as: 'bodegas', foreignKey: 'sucursal_id', onDelete: 'CASCADE' })` | No existe |
| `Bodega` | `bodega.model.js` | `bodegas` | `belongsTo(models.Sucursal, { as: 'sucursal', foreignKey: 'sucursal_id' })`, `hasMany(models.Inventario, { as: 'inventarios', foreignKey: 'bodega_id' })`, `belongsToMany(models.Libro, { through: models.Inventario, as: 'libros', foreignKey: 'bodega_id', otherKey: 'libro_id' })` | No existe |
| `Rol` | `rol.model.js` | `roles` | `hasMany(models.Usuario, { as: 'usuarios', foreignKey: 'rol_id', onDelete: 'RESTRICT' })` | No existe |
| `Usuario` | `usuario.model.js` | `usuarios` | `belongsTo(models.Rol, { as: 'rol', foreignKey: 'rol_id' })`, `hasMany(models.MovimientoInventario, { as: 'movimientos', foreignKey: 'usuario_id' })`, `hasMany(models.CodigoRespaldo, { as: 'codigosRespaldo', foreignKey: 'usuario_id', onDelete: 'CASCADE' })`. `dos_factores_ultimo_paso` es `BIGINT` (llega como string; el repositorio 2FA lo convierte a número). | No existe |
| `Autor` | `autor.model.js` | `autores` | `hasMany(models.Libro, { as: 'libros', foreignKey: 'autor_id', onDelete: 'SET NULL' })` | No existe |
| `Editorial` | `editorial.model.js` | `editoriales` | `hasMany(models.Libro, { as: 'libros', foreignKey: 'editorial_id', onDelete: 'SET NULL' })` | No existe |
| `Categoria` | `categoria.model.js` | `categorias` | `hasMany(models.Libro, { as: 'libros', foreignKey: 'categoria_id', onDelete: 'SET NULL' })` | No existe |
| `Libro` | `libro.model.js` | `libros` | `belongsTo(models.Autor, { as: 'autor' })`, `belongsTo(models.Editorial, { as: 'editorial' })`, `belongsTo(models.Categoria, { as: 'categoria' })`, `hasMany(models.Inventario, { as: 'inventarios', foreignKey: 'libro_id' })`, `belongsToMany(models.Bodega, { through: models.Inventario, as: 'bodegas', foreignKey: 'libro_id', otherKey: 'bodega_id' })` | No existe |
| `Inventario` | `inventario.model.js` | `inventarios` | `belongsTo(models.Libro, { as: 'libro', foreignKey: 'libro_id' })`, `belongsTo(models.Bodega, { as: 'bodega', foreignKey: 'bodega_id' })`, `hasMany(models.MovimientoInventario, { as: 'movimientos', foreignKey: 'inventario_id' })` | No existe |
| `TipoMovimiento` | `tipoMovimiento.model.js`| `tipo_movimientos` | `hasMany(models.MovimientoInventario, { as: 'movimientos', foreignKey: 'tipo_movimiento_id' })` | No existe |
| `MovimientoInventario` | `movimientoInventario.model.js` | `movimientos_inventario` | `belongsTo(models.Inventario, { as: 'inventario', foreignKey: 'inventario_id' })`, `belongsTo(models.Usuario, { as: 'usuario', foreignKey: 'usuario_id' })`, `belongsTo(models.TipoMovimiento, { as: 'tipo_movimiento', foreignKey: 'tipo_movimiento_id' })`, `belongsTo(models.Venta, { as: 'venta', foreignKey: 'venta_id' })` | No existe |
| `Venta` | `venta.model.js` | `ventas` | `belongsTo(models.Bodega, { as: 'bodega' })`, `belongsTo(models.Usuario, { as: 'vendedor', foreignKey: 'usuario_id' })`, `belongsTo(models.Usuario, { as: 'anulador', foreignKey: 'anulada_por' })`, `hasMany(models.VentaDetalle, { as: 'detalles', foreignKey: 'venta_id' })`, `hasMany(models.MovimientoInventario, { as: 'movimientos', foreignKey: 'venta_id' })`. `numero` usa `defaultValue: literal("nextval('ventas_numero_seq')")`; los importes DECIMAL llegan como string. | No existe |
| `VentaDetalle` | `ventaDetalle.model.js` | `venta_detalles` | `belongsTo(models.Venta, { as: 'venta', foreignKey: 'venta_id' })`, `belongsTo(models.Libro, { as: 'libro', foreignKey: 'libro_id' })` | No existe |
| `CodigoRespaldo` | `codigoRespaldo.model.js` | `codigos_respaldo_2fa` | `belongsTo(models.Usuario, { as: 'usuario', foreignKey: 'usuario_id', onDelete: 'CASCADE' })`. `timestamps: false`. | No existe |

Son 14 modelos (`tests/ventasEsquema.test.js` comprueba `Object.keys(sequelize.models).length === 14`).

### 4.5 Firmas por Capa, Transacciones y Control de Concurrencia

#### Capa de Rutas y Validadores
- `routes/index.js` solo cablea: `/health`, `/bodegas`, `/usuarios`, `/categorias` y monta los routers de `/auth`, `/libros`, `/inventario`, `/movimientos` y `/ventas`. `auth.routes.js` monta `dosFactores.routes.js` en `/auth/2fa` (`routes/index.js` no cambió).
- `middlewares/validator.js` es una **fachada**: reexporta los validadores de dominio, incluidos `validateReporteInventario` y `validateReporteKardex`. Las rutas importan la fachada.
- Implementación en `middlewares/validators/`: `common.js` (`validateIsbn`), `libro.validators.js` (escanear, consultar, registrar, ingreso, actualizar precio, `AUTOR_PLACEHOLDER_VALIDATOR`), `inventario.validators.js` (listar, salida, ajuste), `movimiento.validators.js` (`validateListarMovimientos`), `venta.validators.js` (crear, listar, id y anular) y `reportes.validators.js` (UUID, tipos de movimiento, fechas Guatemala y paginación de reportes).
- Utilidades compartidas: `utils/isbn.js` (`normalizarIsbn`, `normalizarIsbnEstricto`, `hasValidIsbnChecksum`), `utils/uuid.js` (`UUID_REGEX`, `esUuid`) `utils/slug.js` (`slugify`, `shortId`, `buildRef`, `parseRef`) y `utils/ventas.js` (dinero en centavos enteros: `aCentavos`, `deCentavos`, `subtotalLinea`, `MAX_CENTAVOS`; `codigoVenta`; `rangoFechasNegocio` y `OFFSET_GUATEMALA`).

#### Capa de Controladores (`src/controllers/`)
Todos son instancias de clase exportadas (`module.exports = new XController()`).
- `health.controller.js`: `check(req, res)`: llama a `testSequelizeConnection()`; responde 200 `healthy` o 503 `degraded`.
- `bodega.controller.js`: `listar` → `bodegaService.listarActivas`.
- `categoria.controller.js`: `listar`, `listarAdministracion`, `crear`, `renombrar` y `eliminar` delegan en `categoriaService`; el GET público conserva su respuesta `{ status: 'success', data }`.
- `usuario.controller.js`: `listar` → `usuarioService.listarActivosConRol`.
- `auth.controller.js`:
  - `login(req, res, next)`: Extrae `email` y `password`, llama a `authService.login`, responde con HTTP 200.
  - `me(req, res, next)`: Responde con HTTP 200 enviando `req.user`.
- `libro.controller.js`:
  - `escanear`: Extrae `isbn` y `bodegaId`; el `usuarioId` sale de `req.user.id`. Llama a `libroService.escanearLibro`.
  - `listar`: Extrae `q` y `categoriaId` (o `categoria_id`), llama a `catalogoService.listar` (que añade `ref` con `buildRef`).
  - `consultar`: Extrae `isbn`, llama a `libroService.consultarLibro`.
  - `registrar`: Extrae el payload del libro, inyecta `req.user.id` y `req.user.rol`, llama a `libroService.registrarLibro`.
  - `ingreso`: Extrae `id` de params, `bodegaId` y `cantidad` del body, inyecta `req.user.id`, llama a `libroService.ingresoLibro`.
  - `actualizarPrecio`: Extrae `id` de params y `precio` del body, llama a `libroService.actualizarPrecio` y responde 200 con el libro.
  - `detalle`: Extrae `ref` de params y llama a `catalogoService.detalle`.
- `dosFactores.controller.js`: `configurar`, `activar`, `verificar`, `estado`, `regenerarRespaldo` y `restablecer` delegan en `dosFactoresService` con `req.user.id` (y `req.params.id` en `restablecer`); los que devuelven secretos, códigos o tokens ponen `Cache-Control: no-store`.
- `recuperacion.controller.js`: `recuperar` (`req.body.email`) y `restablecer` (`req.body.token`, `req.body.password`) delegan en `recuperacionService`; `Cache-Control: no-store` lo fija la ruta antes del limitador (cubre 200, 400 y 429).
- `venta.controller.js`: `crear` (201), `listar`, `obtener` y `anular` delegan en `ventaService`; `crear` y `anular` toman el actor de `req.user.id` (un `usuarioId` en el body se ignora).
- `inventario.controller.js`: `listar`, `resumen`, `listarMovimientos`, `salida` y `ajuste`; todos delegan en `inventarioService` (`listarInventario`, `obtenerResumen`, `listarMovimientos`, `registrarSalida`, `registrarAjuste`). `salida` y `ajuste` toman el actor de `req.user.id`.

#### Capa de Servicios (`src/services/`)
- `auth.service.js`: `login({ email, password })`: valida presencia de campos, busca usuario por email, compara con `bcrypt.compare`, valida estado `activo` y luego llama a `resolverSegundoPaso` (`services/dosFactores/sesion.js`, importado directo para evitar un ciclo con la fachada): si corresponde devuelve `{ paso, tokenTemporal, expiraEnSegundos }`; si no, `emitirSesion(usuario)`, que firma el JWT de sesión completa y es la misma función que usa el segundo paso 2FA.
- `dosFactores.service.js` es la **fachada** del 2FA (clase con métodos propios que usa los módulos de `services/dosFactores/`): `configurar(usuarioId)`, `activar(usuarioId, codigo)`, `verificar(usuarioId, { codigo, codigoRespaldo })`, `estado(usuarioId)`, `regenerarRespaldo(usuarioId, codigo)`, `restablecer(usuarioId)` (lógica única para el endpoint y el script), `restablecerPorAdministrador(actorId, objetivoId)` y `restablecerPorEmail(email)`. Módulos:
  - `dosFactores/cifrado.js`: `cifrar(texto, usuarioId)` / `descifrar(valor, usuarioId)` con AES-256-GCM (`node:crypto`), IV aleatorio de 12 bytes, etiqueta de 16 bytes, el id del usuario como AAD y prefijo `v1`; `derivarClave(info)` (HKDF-SHA256, `info` distinto para cifrado y para HMAC). `descifrar` falla cerrada con `ErrorDescifrado`.
  - `dosFactores/totp.js`: sobre `otplib` 13.5.0 (`generateSecret`, `generateURI`, `verifySync`, `generateSync`) y `qrcode` (`toDataURL`): `generarSecreto` (20 bytes, base32), `construirUri`, `generarQr`, `normalizarCodigo` y `verificarCodigo(secreto, codigo, epoch?)`, que devuelve el paso TOTP coincidente o `null` (tolerancia ±1 paso; recalcula el paso con `delta` y compara con `crypto.timingSafeEqual`).
  - `dosFactores/respaldo.js`: `generarCodigos` (10 de 10 caracteres de un alfabeto de 31 símbolos sin 0/O/1/I/L, con `crypto.randomInt`, mostrados `XXXXX-XXXXX`), `normalizar` y `hashCodigo(usuarioId, codigo)` (HMAC-SHA256 con subclave HKDF y el `usuario_id` en el mensaje).
  - `dosFactores/sesion.js`: `esObligatorio(rol)`, `firmarTokenTemporal(usuarioId, scope)` (payload `{ sub, scope }`, 600 s) y `resolverSegundoPaso(usuario)`.
  - `dosFactores/intentos.js`: `cargarEstado`, `asegurarNoBloqueado` (429 antes de mirar el código), `reservarIntento` (reserva el intento fuera de transacción ANTES de verificar el código; sin cupo → 429; devuelve `bloqueadoAhora`), `rechazar(bloqueadoAhora, TipoError)` (código incorrecto: 429 si esa reserva fijó el bloqueo, si no 401/400; no registra nada más) y `abrirSecreto` (falla cerrada: registra `[2FA]` sin datos sensibles y responde 500 genérico).
- `bodega.service.js` (`listarActivas`), `categoria.service.js` (`listar`, `listarAdministracion`, `crear`, `renombrar`, `eliminar`) y `usuario.service.js` (`listarActivosConRol`): delegan en sus repositorios. Categorías valida nombres (recorte, no vacío y unicidad case-insensitive) y UUID; impide borrar categorías con libros asociados.
- `catalogo.service.js`: `listar({ q, categoriaId, categoria_id })` (agrega `ref`, excluye libros inactivos en datos y total) y `detalle(ref)` (`parseRef`; `ValidationError` si la ref es inválida, `NotFoundError` si no existe o está inactivo).
- `googleBooks.service.js`: `normalizarIsbn`, `buscarPorIsbn(rawIsbn)` (caché de 1 h; cascada Google Books → OpenLibrary → `FALLBACK_CATALOG`), `_consultarGoogleBooks` y `_consultarFallbackOpenLibrary`.
- `libro.service.js` es una **fachada**: una instancia de la clase `LibroService` vacía a cuyo prototipo se le aplica `Object.assign` con los módulos de `services/libro/`. Los consumidores (controlador, pruebas) importan la fachada, no los módulos internos:
  - `libro/maestros.service.js`: `_upsertMasterRecord(Model, transaction, nombre, defaults, updates)` (savepoint), `_upsertAutor`, `_upsertEditorial`.
  - `libro/movimientoIngreso.service.js`: `_crearMovimientoIngreso(transaction, { inventarioId, usuarioId, cantidad, motivoDetalle })`.
  - `libro/escaneo.service.js`: `escanearLibro({ isbn, bodegaId, usuarioId })` (valida bodega y usuario antes de la transacción; consulta la API externa fuera de la transacción) y `consultarLibro({ isbn })` (sin escribir en BD). Si el libro no existe, arma la sugerencia como objeto nuevo a partir de `buscarPorIsbn`: vacía los campos listados en su `relleno` (un `relleno` ausente se trata como `[]`) y añade `campos_faltantes` con `categoria` al final, sin mutar el objeto del caché ni su arreglo.
  - `libro/registro.service.js`: `registrarLibro({ ..., usuarioId, usuarioRol })`: regla de precio (si `usuarioRol !== 'Administrador'`, `precio = 0` y `precio_pendiente = true`), upsert de autor/editorial, creación del libro, inventario y movimiento `Ingreso`.
  - `libro/ingreso.service.js`: `ingresoLibro({ libroId, bodegaId, cantidad, usuarioId })`.
  - `libro/precio.service.js`: `actualizarPrecio({ libroId, precio })`: delega en `libroRepository.updatePrecio`; `NotFoundError` si el libro no existe.
  - `libro/administracion.service.js`: `actualizarLibro` (transacción, bloqueo de libro, ISBN único y upsert case-insensitive de autor/editorial), `cambiarActivoLibro` (baja lógica reversible e idempotente) y `listarLibrosAdministracion` (filtros y paginación; solo Administrador en rutas).
- `inventario.service.js`:
  - `listarInventario({ estado, q, bodegaId })` y `obtenerResumen()`: aplican `diasStockObsoleto` de `env.js` y consultan el repositorio.
  - `listarMovimientos({ libroId, bodegaId, tipo, limit, offset })`: valida límites y consulta el kardex.
  - `registrarSalida({ inventarioId, cantidad, motivo, usuarioId })`: transacción; bloqueo con `findByIdForUpdate`; valida stock suficiente; inserta movimiento `Salida`.
  - `registrarAjuste({ inventarioId, stockNuevo, motivo, usuarioId })`: transacción; bloqueo con `findByIdForUpdate`; valida cambio; inserta movimiento `Ajuste` con cantidad = `stockNuevo`.
- `reportes.service.js` es una fachada para informes; `services/reportes/` contiene los casos `inventarioValorizado` y `kardex`, más `contrato.service.js` para el sobre paginado común. Los resultados son objetos de datos independientes de futuros formatos de exportación.

- `recuperacion.service.js` es la **fachada** de la recuperación de contraseña (clase con métodos propios sobre `services/recuperacion/`): `solicitar(email)`, `restablecer({ token, password })` y `esperarEnvios()` (espera los envíos iniciados sin `setTimeout`; lo usan las pruebas). Envía los correos sin esperarlos dentro de la petición (un `Set` de tareas pendientes) y registra fallos con `[RECUPERACION]` y el id del usuario. Módulos: `recuperacion/token.js` (`generarToken`: 32 bytes de `crypto.randomBytes` en base64url, 43 caracteres; `hashToken`: SHA-256 hexadecimal; `formatoValido`: `/^[A-Za-z0-9_-]{43}$/`) y `recuperacion/correos.js` (`enlaceRestablecer`, `mensajeEnlace`, `mensajeAviso` → `{ para, asunto, texto, html, adjuntos }`: `texto` de respaldo, `html` con la plantilla base, el logo como adjunto en línea o `adjuntos: []` si no está; `cargarLogo` inyectable para pruebas). `enviarSinEsperar(construir, usuarioId, tipo)` recibe una función y construye el mensaje dentro de la cadena de promesas que captura errores: un fallo de la plantilla, del logo o del enlace solo se registra con `[RECUPERACION]` y el id, y la respuesta HTTP no cambia.
- `mail.service.js` es una **fachada** del correo (`services/mail/`); su único consumidor de la app es `recuperacion.service.js` (además del script `probar-correo.js`). Exporta `enviar`, `verificar`, `esperarPendientes`, `crearServicioCorreo` y, solo con proveedor `consola`, `bandeja` y `vaciarBandeja()` (máx. 100 mensajes), construidos con `env.mail`. `enviar({ para, asunto, texto, html, adjuntos? })` nunca lanza ni rechaza y resuelve `{ ok, intentos, reintentando, motivo? }`; entrada inválida (CR/LF, formato, más de 20 destinatarios, asunto vacío o de más de 200, cuerpo vacío o de más de 100 kB; `adjuntos` que no sea un arreglo de hasta 3 `{ nombre, contenido: Buffer de 1 B a 100 kB, tipo: 'image/png' | 'image/jpeg', cid }` con `nombre` y `cid` en `/^[A-Za-z0-9._-]{1,64}$/`) → `motivo: 'invalido'` sin reintentar. Tras el primer intento hay 3 reintentos en segundo plano (esperas por defecto 5 s, 30 s, 120 s; temporizadores `unref()`; máx. 100 pendientes), salvo error permanente (`EAUTH`, `responseCode` 500-599 o configuración SMTP incompleta). Piezas: `fabrica.service.js` (`crearServicioCorreo`, reintentos), `smtp.provider.js` (Nodemailer, timeouts de 10 s/10 s/20 s; los adjuntos pasan como `attachments` con `cid` y `contentDisposition: 'inline'`, y sin adjuntos no se envía la clave), `consola.provider.js` (memoria + log con destinatario enmascarado; solo el `texto` y solo en `development`, nunca el `html` ni los adjuntos; de los adjuntos la bandeja guarda `{ nombre, tipo, cid, bytes }`; silencioso en `test`), `validacion.mail.js`, `seguridad.mail.js` (sanitizador de secretos y enmascarado), `plantillas.js` (`plantillaCorreo({ preencabezado, titulo, saludo, parrafos, boton: { texto, url }, notas, pie, logoCid })`, `escaparHtml`, `urlSegura`: documento completo con tablas `role="presentation"`, estilos en línea, máx. 600 px, paleta de la página, sin scripts, hojas, fuentes web ni más imagen que `cid:{logoCid}`; escapa todo dato dinámico, omite el botón si la URL no es http(s) y no lanza ante datos extraños; reutilizable por futuros correos) y `logo.js` (`crearCargadorLogo`, `cargarLogo`, `adjuntoLogo`, `LOGO_CID`: lee `src/assets/logo-correo.png` una vez con caché; si falta devuelve `null` y avisa una sola vez con `[MAIL]`, sin rutas). Prueba manual: `npm run correo:probar -- destino@dominio.com`. Vista previa sin enviar: `npm run correo:vista-previa [-- directorio]` (`src/scripts/vista-previa-correos.js`: datos ficticios, token falso, escribe `correo-recuperacion.html` y `correo-aviso.html` en el directorio temporal con el logo como `data:` solo en esos archivos; no lee `.env`, no importa `models` ni usa red).
- `venta.service.js` es una **fachada** (11 líneas, `Object.assign` sobre el prototipo de `VentaService`) de `services/venta/`:
  - `venta/crear.service.js`: `crearVenta({ bodegaId, items, metodoPago, clienteNombre, clienteNit, descuento, notas, usuarioId })`. Una transacción; orden: bodega activa → libros bloqueados en orden de id (`findByIdsForUpdate`; 404 si falta alguno, 409 si están inactivos o `precio <= 0`) → bloqueos de inventarios → validación de stock → importes en centavos → cabecera → líneas → movimientos `Salida` con `ventaId`. Una baja concurrente se serializa con la creación de venta; libros inactivos no persisten ventas, líneas ni movimientos.
  - `venta/anular.service.js`: `anularVenta({ ventaId, motivo, usuarioId })`. Una transacción: `Venta` con `FOR UPDATE` (404/409), bloqueo de inventarios en el mismo orden por id, un `Ingreso` por línea con `ventaId` y "Anulación de venta V-xxxxxx: <motivo>", y un solo UPDATE de `estado`, `anulada_en`, `anulada_por`, `motivo_anulacion`.
  - `venta/consulta.service.js`: `obtenerVenta(id, options)` y `listarVentas({ estado, desde, hasta, limit, offset })`; formatea importes con 2 decimales y agrega `lineas`/`unidades` con una consulta agregada por los ids de la página.
  - `venta/bloqueo.helper.js`: `bloquearInventariosOrdenados(libroIds, bodegaId, txOptions)`: lee los inventarios con `findByLibrosAndBodega`, los ORDENA por `id` y los bloquea uno a uno con `findByIdForUpdate`. Lo comparten crear y anular para evitar deadlocks entre ventas con las mismas líneas en distinto orden.

#### Capa de Repositorios (`src/repositories/`)
- `inventario.repository.js` es una **fachada** (misma técnica `Object.assign` sobre el prototipo) de `repositories/inventario/`: `inventarioBasico.repository.js` (`findByLibroAndBodega`, `findOrCreate`, `findById`, `findByLibrosAndBodega` (varios libros en una bodega, ordenados por `id`, sin bloqueo), `findByLibroId`, `setStockMinimo`, `findByIdForUpdate`), `inventarioListado.repository.js` (`findAllWithDetails`), `inventarioResumen.repository.js` (`getResumen`) y el helper `inventarioSubconsultas.helper.js` (`ULTIMA_SALIDA_SQL`).
- `usuario.repository.js`: `findByEmail`, `findById`, `findAll`, `create`, `update`, `findActivosConRol`, `findConRol`, `findRoleByName`, `emailExists`, `findByIdForUpdate`, `lockRoles` y `countActiveAdministrators`. El listado predeterminado conserva la forma anterior y ordena en memoria con `localeCompare` y desempate por ID para igualar orden de forma determinista. `findAll` y `findActivosConRol` tienen contratos distintos.
- `usuario.service.js` concentra las validaciones y reglas del CRUD. Cambios que afectan roles/estado y altas serializan al bloquear las filas de roles en orden de ID dentro de una transacción. `utils/passwordPolicy.js` exige 10 caracteres, letra, número y un máximo de 72 bytes UTF-8 antes de aplicar bcrypt.
- `dosFactores.repository.js` (solo Sequelize): único repositorio que consulta y devuelve `dos_factores_secreto` (cifrado). `usuario.repository.js` no lo devuelve: `findByEmail`, `findById`, `findAll`, `findConRol` y `findActivosConRol` piden listas fijas de atributos (`findById` incluye además `password_cambiada_en`, que `authenticate` y `exigirAlcance` comparan con el `iat`; no llega a `req.user`) y `create`/`update` devuelven solo `id`, `rol_id`, `nombre_completo`, `email` y `activo`; ninguno incluye el secreto ni `token_recuperacion`, y solo `findByEmail` incluye `password_hash` (login). `findByIdForUpdate` devuelve la instancia completa, que `usuario.service.js` usa dentro de la transacción sin devolverla. Fuera de la capa de datos, `dosFactores.service.js#activar` usa el valor CIFRADO (comprueba que exista y, dentro de la transacción, que no haya cambiado) y `dosFactores/intentos.js#abrirSecreto` lo descifra en memoria. `obtenerEstado(id, { transaction, lock })` (bandera `bloqueado` calculada con `CURRENT_TIMESTAMP` de la BD; con `lock` usa `FOR UPDATE OF "Usuario"`), `buscarIdPorEmail`, `guardarSecretoPendiente`, `reclamarPaso(id, paso, { transaction, where, extra })`, `reservarIntento(id, maxIntentos, bloqueoMinutos)` → `{ permitido, bloqueadoAhora }`, `reiniciarIntentos`, `consumirRespaldo`, `reemplazarRespaldos`, `contarRespaldosRestantes` y `restablecer`. El 2FA no modificó `usuario.repository.js`.
- `recuperacion.repository.js` (solo Sequelize, sin `sequelize.query`; vencimientos con `sequelize.literal('CURRENT_TIMESTAMP …')`): único lugar que lee o escribe `token_recuperacion` y `token_recuperacion_expira` y que escribe `password_cambiada_en`. `buscarActivoPorEmail(email)` (sin distinguir mayúsculas; `id`, `nombre_completo`, `email`), `emitirToken(id, hash, config)` → boolean, `buscarPorTokenVigente(hash)` (incluye `password_hash` para comparar) y `consumirToken(hash, passwordHash, cambiadaEn)` → boolean.
- `venta.repository.js` (solo Sequelize, sin SQL crudo): `createVenta`, `createDetalles`, `findByIdForUpdate` (exige `{ transaction }`), `findLineasByVenta`, `marcarAnulada`, `findDetalleById`, `findPagina` y `contarLineasPorVentas` (COUNT/SUM agrupados).
- `bodega.repository.js` (`findActivas`, `findActivaById`), `categoria.repository.js` (`findAll`, `findAllWithLibroCount`, `findById`, `findByNombre`, `create`, `updateNombre`, `countLibros`, `delete`), `autor.repository.js` y `editorial.repository.js` (`findByNombre`, `findById`, `findAll`, `create`, `upsert`), `libro.repository.js` (`findByIsbn`, `findByIsbnForUpdate`, `findById`, `findByIdForUpdate`, `findByIds`, `findByIdsForUpdate`, `findAdminPage`, `updateBibliografia`, `updateActivo`, `updatePrecio`, `upsert`, `create`, `searchAndList`, `findDetalleByRef`) y `movimiento.repository.js` (`getTipoMovimientoByName`, `ensureTipoMovimiento`, `createMovimiento` (acepta `ventaId` opcional, guardado como `venta_id`), `findAllWithFilters`). `repositories/reportes/` contiene consultas separadas por informe; inventario valorizado usa ORM para filas/paginación y SQL analítico con binds para agregados sin joins multiplicadores; Kardex adapta la consulta existente con filtros de fecha/categoría y `venta_id` opcional, manteniendo intacta la forma de `/api/movimientos`.

#### Manejo de Transacciones y Control de Concurrencia
- **Mecanismo transaccional**: `sequelize.transaction(async (transaction) => { ... })`. Todas las llamadas ORM dentro de la unidad de trabajo reciben `{ transaction }`.
- **Bloqueo pesimista**: Se aplica en `inventarioRepository.findByIdForUpdate(id, { transaction })` mediante `lock: transaction.LOCK.UPDATE` (`SELECT ... FOR UPDATE`) para evitar *race conditions* en decrementos y ajustes simultáneos.
- **Ventas**: crear y anular bloquean los `inventarios` de sus líneas en orden ascendente de `id` (`bloquearInventariosOrdenados`); la anulación bloquea además la fila de `ventas` antes de los inventarios. El stock se pre-valida bajo el bloqueo para responder 409 con el título (el trigger solo lanza un error genérico, mapeado a 400).
- **2FA (sentencias atómicas, cada una un único UPDATE con comprobación de filas afectadas)**: `reclamarPaso` → `UPDATE usuarios SET dos_factores_ultimo_paso = :paso, intentos = 0, bloqueado_hasta = NULL WHERE id = :id AND (ultimo_paso IS NULL OR ultimo_paso < :paso)`; `consumirRespaldo` → `UPDATE codigos_respaldo_2fa SET usado_en = CURRENT_TIMESTAMP WHERE usuario_id = :id AND codigo_hash = :h AND usado_en IS NULL`; `reservarIntento` → `UPDATE usuarios SET intentos = CASE WHEN intentos + 1 >= 5 THEN 0 ELSE intentos + 1 END, bloqueado_hasta = CASE WHEN intentos + 1 >= 5 THEN CURRENT_TIMESTAMP + make_interval(mins => 15) ELSE bloqueado_hasta END WHERE id = :id AND (bloqueado_hasta IS NULL OR bloqueado_hasta <= CURRENT_TIMESTAMP) RETURNING intentos` (en el SET las columnas valen lo anterior; 0 filas → 429; `bloqueadoAhora` = el contador devuelto es 0), sin transacción para que se confirme aunque la operación termine en error. Se ejecuta ANTES de verificar el código, en `activar`, `verificar` (TOTP y respaldo) y `regenerarRespaldo`, después del 429 temprano y de validar el formato (el formato inválido no consume intento; el secreto se descifra antes de reservar, así que un secreto ilegible tampoco). Dos reservas simultáneas se serializan: la segunda espera el bloqueo de fila de la primera y, bajo READ COMMITTED, PostgreSQL reevalúa el WHERE sobre la versión ya confirmada; por eso por cada ventana de bloqueo a lo sumo 5 verificaciones llegan a ejecutarse (comprobado con 30 peticiones simultáneas en `tests/dosFactoresConcurrencia.test.js`, con una sola instancia del backend). El éxito reinicia contador y bloqueo (`reclamarPaso` o `reiniciarIntentos`). En `activar`, un 409 por alta cambiada a mitad deja el intento consumido (sí se verificó un código). `activar` corre en una transacción con la fila del usuario bloqueada (`FOR UPDATE`): reclama el paso, pone activo=true y crea los 10 códigos; `regenerarRespaldo` y `restablecer` reemplazan/borran los códigos en una transacción.
- **Recuperación de contraseña (un UPDATE atómico con comprobación de filas afectadas, sin transacción explícita)**: `emitirToken` → `UPDATE usuarios SET token_recuperacion = :hash, token_recuperacion_expira = CURRENT_TIMESTAMP + make_interval(mins => 30) WHERE id = :id AND (token_recuperacion_expira IS NULL OR token_recuperacion_expira < CURRENT_TIMESTAMP + make_interval(mins => 28))` (0 filas = enlace emitido hace menos de 2 min: no se envía nada); `consumirToken` → `UPDATE usuarios SET password_hash = :nuevo, token_recuperacion = NULL, token_recuperacion_expira = NULL, password_cambiada_en = :ahora WHERE token_recuperacion = :hash AND token_recuperacion_expira > CURRENT_TIMESTAMP AND activo = true` (0 filas → 400 genérico). Dos restablecimientos simultáneos con el mismo enlace: el segundo espera el bloqueo de fila y, bajo READ COMMITTED, reevalúa el WHERE sobre la fila ya sin token → exactamente un 200 y un 400 (`tests/recuperacionRestablecer.test.js`). Sequelize añade `actualizado_en` a ambos UPDATE.
- **Savepoints**: En `_upsertMasterRecord` (`services/libro/maestros.service.js`) y `MovimientoRepository.ensureTipoMovimiento` se usa una transacción anidada (savepoint) para aislar violaciones `UNIQUE` (`23505`) sin abortar la transacción principal.

### 4.6 Autenticación, 2FA y RBAC

#### JWT
- Firmado con `jsonwebtoken` usando `HS256` y clave `env.jwt.secret`.
- Tiempo de vida: configurado en `env.jwt.expiresIn` (por defecto `8h`).
- Payload del token de sesión: `{ sub: usuario.id, rol: usuario.rol_nombre, nombre: usuario.nombre_completo }` (lo firma `authService.emitirSesion`).
- Tokens temporales del 2FA: mismo secreto, payload mínimo `{ sub, scope }` con `scope` `2fa-verify` o `2fa-setup` y `exp` de 600 s. `authenticate` los rechaza (401) y solo los acepta `exigirAlcance` (`middlewares/auth2fa.js`).
- **Invalidación tras restablecer la contraseña**: `authenticate` y `exigirAlcance`, después de cargar al usuario con `findById`, aplican `utils/sesionVigente.js` (`sesionVigente(decoded, password_cambiada_en)`): vigente si `password_cambiada_en` es null o si `iat * 1000 > password_cambiada_en`; sin `iat` y con cambio registrado → no vigente. Si no, 401 "La sesión ya no es válida. Inicie sesión de nuevo.". Es estricta: un token emitido en el mismo segundo del cambio se rechaza. Tokens de usuarios sin cambio registrado (seed, helpers de pruebas que firman `{ sub }`) siguen funcionando.

#### Recuperación de contraseña
- **Endpoints**: `POST /api/auth/recuperar` y `POST /api/auth/restablecer` (§4.3), públicos, `no-store`, con limitadores propios por IP en `middlewares/rateLimitRecuperacion.js` (`limiteRecuperar` 5 y `limiteRestablecer` 10 por 15 min, instancias nuevas de `createRateLimit`; no comparten contador con el login).
- **Token**: 32 bytes aleatorios en base64url (43 caracteres). En la BD solo su SHA-256 hexadecimal en `token_recuperacion` (índice único parcial). El token en claro solo existe en memoria y en el cuerpo del correo; nunca en logs, respuestas ni errores. Enlace: `{FRONTEND_URL}/restablecer#token=<token>` (en el fragmento, que el navegador no envía al servidor ni en `Referer`).
- **Solicitar**: respuesta 200 idéntica en todos los casos con formato válido. Solo cuentas activas, fuera del enfriamiento de 2 min; un enlace nuevo reemplaza al anterior. Vence a los 30 min (hora de la BD). El correo se envía sin esperarlo; subsiste una pequeña diferencia de tiempo cuando la cuenta existe (UPDATE extra a la BD).
- **Restablecer**, en este orden: (1) formato del token (400 genérico); (2) `validarPassword` (400 con su mensaje, sin consumir); (3) búsqueda por hash con vencimiento futuro y `activo = true` (400 genérico); (4) `bcrypt.compare` con la actual: igual → 400 "La nueva contraseña debe ser distinta de la actual." sin consumir; (5) `bcrypt.hash(password, 10)`; (6) `consumirToken` atómico (0 filas → 400 genérico). `password_cambiada_en` usa el reloj de la APP (`new Date()`), porque se compara con el `iat` que firma la app; el vencimiento del enlace usa solo la hora de la BD. No toca columnas ni tablas del 2FA (sigue activo) y no inicia sesión. Tras el éxito envía un correo de aviso sin esperarlo.
- **Configuración**: `env.recuperacion` (§4.1). En producción sin `FRONTEND_URL` falla cerrado: misma respuesta, sin tocar la BD ni enviar, y `[RECUPERACION]` en el log.

#### 2FA (Segundo Factor)
- **Estado real**: implementado en el backend (endpoints en §4.3, flujo en §6.2) y en la interfaz (`Login.jsx` con `useLoginDosPasos`, vista `/cuenta/seguridad`; §5.2). Sin interfaz: restablecer (`/usuarios/:id/restablecer`) y activar el 2FA con sesión completa (el backend no lo permite).
- **Política**: obligatorio para Administrador y Empleado cuando `TWO_FACTOR_ENFORCED` es verdadero (por defecto en producción), con activación forzada en el login; el rol Usuario nunca debe configurarlo, aunque si lo tiene activo se le pide verificar.
- **TOTP**: RFC 6238 vía `otplib` 13.5.0: secreto de 20 bytes en base32, SHA-1, 6 dígitos, 30 s, tolerancia ±1 paso, emisor `Librería Oskar` y etiqueta = email. `otplib` compara en tiempo constante (`constantTimeEqual` de `@otplib/core`) y devuelve `timeStep`; el backend recalcula el paso y compara además con `crypto.timingSafeEqual`. Compatibilidad con apps reales (Google Authenticator, Authy, Microsoft Authenticator, Aegis): no verificada.
- **Secreto**: cifrado con AES-256-GCM (AAD = id del usuario, prefijo `v1`); solo existe en claro en memoria durante la verificación y en la respuesta de `configurar`. Cualquier fallo al descifrar niega el acceso.
- **Anti-reutilización**: solo se acepta un paso TOTP estrictamente mayor que `dos_factores_ultimo_paso` (UPDATE condicional atómico); un código repetido cuenta como fallo.
- **Intentos**: TOTP y respaldo comparten contador persistente; 5 fallos → bloqueo de 15 min (hora de la BD) y 429 en todo intento, aunque el código sea correcto. Un éxito pone el contador en 0 y borra el bloqueo.
- **Códigos de respaldo**: 10, de un solo uso, guardados solo como HMAC; se muestran una vez al activar y al regenerar.
- **Restablecimiento**: `POST /api/auth/2fa/usuarios/:id/restablecer` (Administrador, no a sí mismo) o `npm run reset-2fa -- correo` (dentro de `backend/`; sale con 1 sin argumento o con correo inexistente). Los JWT ya emitidos siguen válidos hasta expirar.

#### RBAC (Control de Acceso Basado en Roles)
- Middleware `authenticate` (`src/middlewares/auth.js`):
  1. Extrae cabecera `Authorization: Bearer <token>`.
  2. Valida firma y expiración del JWT y rechaza con 401 cualquier token que traiga el claim `scope` (tokens temporales del 2FA).
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
- **Campo `relleno`**: arreglo que `buscarPorIsbn` añade al resultado (rutas Google y OpenLibrary, y entradas de `FALLBACK_CATALOG`) con los campos que la fuente no aportó y que quedaron con texto por defecto, en el orden `titulo`, `autor`, `editorial`, `resena`, `imagen_url`. Los valores devueltos no cambian (siguen con el texto genérico, que `tests/googleBooks.test.js` fija). En el catálogo de respaldo solo las dos obras sin portada traen `['imagen_url']`. `escanearLibro` sigue guardando esos textos genéricos (ver §9).

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
- Mapea JSON mal formado a 400 y payload excedido a 413 con mensajes genéricos. Orígenes CORS no autorizados se rechazan con 403.
  - Enmascara errores 500 con `"Error interno del servidor."` y previene la fuga de sentencias SQL, parámetros o trazas internas.
- **Contratos de Respuesta HTTP**:
  - Éxito: `{ "status": "success", "data": ... [, "results": N] }`.
  - Fallo operacional (4xx): `{ "status": "fail", "message": "..." [, "details": [...]] }`.
  - Error no controlado (5xx): `{ "status": "error", "message": "Error interno del servidor." }`.
- **Paginación de catálogo e inventario**: `limit` es entero de 1 a 200; `offset` es entero no negativo. Ausentes: `limit=50` en libros, `limit=200` en inventario y `offset=0` en ambos. Parámetros inválidos responden 400. El catálogo mantiene `results` como tamaño de página y añade `total`, `limit` y `offset`; inventario añade esos tres metadatos sin quitar campos de `data`. Conteos separados usan `COUNT(DISTINCT id)` para respetar filtros sin duplicar filas relacionadas; ordenamientos incluyen el id como desempate estable.

### 4.9 Suite de Pruebas Automatizadas Backend

| Archivo de Prueba | Tests | Tipo | Base de Datos | Cobertura Funcional |
|---|---|---|---|---|
| `tests/isbnValidation.test.js` | 4 | Unitaria | No requiere | Checksum ISBN-10/13, normalización de guiones, rechazo de > 20 chars. |
| `tests/utilsIsbnUuid.test.js` | 14 | Unitaria | No requiere | Caracterización de `utils/isbn.js` y `utils/uuid.js`, incluidos casos límite fijados (ver §9). |
| `tests/validatorsCaracterizacion.test.js` | 47 | Unitaria | No requiere | Caracterización de los validadores de `middlewares/validators/` (incluye comportamientos defectuosos fijados, ver §9). |
| `tests/errorHandler.test.js` | 5 | Unitaria | No requiere | Mapeo de errores Sequelize/PostgreSQL y formato JSON. |
| `tests/googleBooks.test.js` | 10 | Unitaria / Mock | No requiere | Timeouts, errores 429/500, fallback a OpenLibrary y catálogo de contingencia (mock de `global.fetch`). |
| `tests/sugerenciaRelleno.test.js` | 7 | Unitaria / Mock | No requiere | `relleno` de `buscarPorIsbn` en las rutas Google (parcial, `imageLinks` vacío, completa), OpenLibrary (parcial, completa, autor no resuelto) y catálogo de respaldo (con y sin portada), con `global.fetch` simulado. |
| `tests/consultarSugerencia.test.js` | 9 | Integración / End-to-End | `libreria_oskar_test` | `consultarLibro` con `buscarPorIsbn` simulado (relleno, sin relleno, sin la propiedad, sin mutar, caché real, `sugerencia: null`, libro existente) y `POST /api/libros/consultar` por HTTP: 401, 403, 400 y 200 con la forma nueva. |
| `tests/sequelize.test.js` | 5 | Integración | `libreria_oskar_test` | Conectividad ORM y definición de los 13 modelos. |
| `tests/repositories.test.js` | 5 | Integración | `libreria_oskar_test` | `CategoriaRepository`, `AutorRepository`, `EditorialRepository`. |
| `tests/usuarioRepository.test.js` | 5 | Integración | `libreria_oskar_test` | Búsqueda por email/UUID, exclusión de credenciales, transacciones. |
| `tests/usuariosCrud.test.js` | 7 | End-to-End | `libreria_oskar_test` | CRUD administrativo de usuarios: contrato del GET (con opción de inactivos), auth y RBAC, alta con email normalizado sin datos sensibles, edición con protección de campos y del rol propio, activar/desactivar (tokens de cuentas desactivadas fallan, sin auto desactivación) y último Administrador protegido ante desactivaciones concurrentes. |
| `tests/libroPrecio.test.js` | 7 | End-to-End | `libreria_oskar_test` | `PATCH /api/libros/:id/precio`: 401, 403, 400 (id y precios inválidos), 404, 200 con precio persistido, detalle público, KPI `libros_sin_precio` y stock/movimientos intactos. No importa `config/db`. |
| `tests/librosAdmin.e2e.test.js` | 10 | End-to-End | `libreria_oskar_test` | RBAC, edición bibliográfica/ISBN y rollback de maestros, conservación de precio/stock/movimientos, baja reversible, listado admin filtrado/paginado, catálogo/detalle, inventario/Kardex y rechazo 409 de escaneo, consulta, registro, ingreso y venta sin escrituras. |
| `tests/libroRepository.test.js` | 7 | Integración | `libreria_oskar_test` | Búsqueda por ISBN/UUID, inserción, concurrencia y agregaciones de stock. Importa `config/db`. |
| `tests/movimientoRepository.test.js` | 7 | Integración | `libreria_oskar_test` | Tipos de movimiento, trigger y rollback. Importa `config/db`. |
| `tests/inventarioRepository.test.js` | 14 | Integración | `libreria_oskar_test` | Bloqueo `FOR UPDATE`, stock obsoleto, alertas y KPIs. Importa `config/db`. |
| `tests/inventarioService.test.js` | 8 | Integración | `libreria_oskar_test` | Salidas y ajustes vía servicio, saldo insuficiente (409) y concurrencia. Importa `config/db`. |
| `tests/libroServiceSequelize.test.js` | 12 | Integración | `libreria_oskar_test` | Escaneo, registro por rol, ingresos repetidos y atomicidad (mock de `googleBooksService`). Importa `config/db`. |
| `tests/escanear.integration.test.js` | 8 | Integración | `libreria_oskar_test` | Escaneo con sembrado dinámico y rollback inducido. Importa `config/db`. |
| `tests/api.e2e.test.js` | 22 | End-to-End | `libreria_oskar_test` | Endpoints HTTP reales vía servidor Express temporal. Importa `config/db`. |
| `tests/apiSecurity.test.js` | 9 | Unidad / End-to-End HTTP | No requiere BD | CORS y preflight, origen configurado/rechazado, CORS obligatorio en producción, TRUST_PROXY, rate limit/expiración de login con reloj simulado, JSON inválido y payload excedido, regresión público/protegido. |
| `tests/paginacionCatalogoInventario.e2e.test.js` | 3 | End-to-End | `libreria_oskar_test` | Paginación de libros e inventario: defaults, páginas, última/vacía, validación de límites, total filtrado, orden sin duplicados, relaciones, resumen/indicadores y stock agregado. Limpia fixtures temporales. |
| `tests/reportes.e2e.test.js` | 3 | End-to-End | `libreria_oskar_test` | Reportes de inventario/Kardex: RBAC, filtros inválidos, grupos y existencias en varias bodegas, inactivos, ausencia de costo, movimientos de venta/anulación/ajuste, fechas deterministas y paridad con `/api/movimientos`. Limpia fixtures temporales. |
| `tests/reportesVentas.e2e.test.js` | 4 | End-to-End | `libreria_oskar_test` | Reportes de ventas y reposición: RBAC, filtros, corte/resumen, descuentos y anulaciones, ranking histórico, paginación y separación de inventario por bodega; usa fechas fijas y limpia fixtures temporales. |
| `tests/reportesExportacion.e2e.test.js` | 4 | End-to-End | `libreria_oskar_test` | Exportaciones XLSX/PDF de los siete reportes, RBAC, validación, límites, apertura real de XLSX con ExcelJS, PDFs válidos multipágina, filtros/JSON, valores desconocidos e inventario vacío; fixtures fechados y limpieza. |
| `tests/categoriasCrud.e2e.test.js` | 5 | End-to-End | `libreria_oskar_test` | CRUD administrativo de categorías: validación, duplicados, roles, respuestas y GET público; limpia fixtures temporales. |
| `tests/categoriasConteoAdmin.e2e.test.js` | 4 | End-to-End | `libreria_oskar_test` | `GET /api/categorias/admin`: roles, conteos agrupados exactos y regresión del GET público; limpia fixtures temporales. |
| `tests/ventasEsquema.test.js` | 7 | Integración | `libreria_oskar_test` | Esquema de ventas: correlativo `numero`, valores por defecto, CHECK, `uq_venta_libro`, FK RESTRICT, Salida con `venta_id` (trigger) y asociaciones. No importa `config/db`. |
| `tests/ventasUtils.test.js` | 9 | Unitaria | No requiere | `utils/ventas.js`: centavos, redondeo exacto, rechazos, código `V-xxxxxx`, desbordamiento y rango de fechas de Guatemala. |
| `tests/ventasServicio.test.js` | 11 | Integración | `libreria_oskar_test` | Crear venta: importes, precio de BD, actor, defaults, rechazos sin persistir (precio 0, stock, 404, descuento, desborde NUMERIC) y rollback con fallo en la segunda línea. No importa `config/db`. |
| `tests/ventasConcurrencia.test.js` | 6 | Integración | `libreria_oskar_test` | Última unidad vendida a la vez (409), 20 ventas simultáneas [A,B]/[B,A] sin deadlock, anulación (stock, doble anulación, anulaciones simultáneas, rollback). No importa `config/db`. |
| `tests/ventasApi.test.js` | 7 | End-to-End | `libreria_oskar_test` | `POST /api/ventas` y `POST /api/ventas/:id/anular` por HTTP: 401/403, validaciones 400, errores 404/409 y anulación del Administrador. No importa `config/db`. |
| `tests/ventasApiConsulta.test.js` | 5 | End-to-End | `libreria_oskar_test` | `GET /api/ventas` y `/:id`: roles, filtros por estado y fechas (venta a las 23:30 de Guatemala), paginación, `lineas`/`unidades`, parámetros inválidos y compatibilidad de `GET /api/movimientos`. No importa `config/db`. |
| `tests/mailConfig.test.js` | 6 | Unitaria | No requiere | `leerConfigCorreo`: `test` fuerza consola, producción sin variables (aviso, sin lanzar), alias, `MAIL_FROM` y rechazo de proveedor/puerto inválidos. |
| `tests/mailReintentos.test.js` | 8 | Unitaria / Mock | No requiere | `enviar` nunca rechaza; reintentos (2 fallos → 3 intentos, 4 intentos y descarte, error permanente → 1); tope de pendientes; validación sin llamar al proveedor; secretos fuera de logs. |
| `tests/mailAdjuntos.test.js` | 6 | Unitaria / Mock | No requiere | Adjuntos en línea: inválidos (más de 3, tamaño, vacío, tipo, `cid`/`nombre` con CR/LF o formato) → `invalido` sin llamar al proveedor; normalización; sin adjuntos el mensaje no cambia; SMTP con `attachments` (`cid`, `inline`) o sin la clave; bandeja con metadatos y `bytes`; la consola nunca imprime `html` ni adjuntos. |
| `tests/correoPlantillas.test.js` | 10 | Unitaria | No requiere | Plantilla (tablas, viewport, `color-scheme`, paleta, botón y enlace con el mismo URL, escape, `javascript:`/sin protocolo sin botón, datos extraños sin lanzar, sin `<script`/`<link`/`@import`, única `<img` `cid:` solo con `logoCid`), `texto` y `asunto` idénticos a los anteriores, HTML < 15 kB, logo con caché y logo ausente (sin adjuntos, encabezado de texto, un aviso sin rutas). |
| `tests/mailProveedores.test.js` | 3 | Unitaria / Mock | No requiere | SMTP con transporte inyectado (puertos 587 y 465, auth, timeouts, `MAIL_FROM`), configuración incompleta y consola (bandeja de 100, enmascarado, cuerpo solo en `development`). |
| `tests/dosFactoresConfig.test.js` | 6 | Unitaria | No requiere | `leerConfigDosFactores`: valores por defecto, `test` fuerza `enforced=false`, producción sin clave → Error, clave inválida → Error sin mostrar el valor, `TWO_FACTOR_ENFORCED` inválido. |
| `tests/dosFactoresCripto.test.js` | 10 | Unitaria | No requiere | Cifrado (ida y vuelta, IV distinto, manipulación, clave equivocada, AAD de otro usuario, versión, longitud ≤ 128), TOTP (±1 paso con el paso devuelto, ±2 rechazado, URI y QR) y códigos de respaldo (formato, alfabeto, normalización, HMAC con subclave). |
| `tests/dosFactoresLogin.test.js` | 9 | End-to-End | `libreria_oskar_test` | Login sin 2FA igual que antes, `configurar` para Administrador/Empleado con `enforced`, rol Usuario sin exigencia, `verificar` con 2FA activo, errores de hoy y alcance de tokens (temporales rechazados en `/auth/me` y negocio, scope exacto por paso, vencido → 401, sin scope sigue funcionando). |
| `tests/dosFactoresAlta.test.js` | 5 | End-to-End | `libreria_oskar_test` | Alta por HTTP: login → configurar (QR PNG, clave, otpauth, secreto cifrado) → activar erróneo (401, fallo registrado) → activar correcto (token + 10 códigos) → 409 → login pide verificar → TOTP una sola vez → respaldo una sola vez. |
| `tests/dosFactoresGestion.test.js` | 3 | End-to-End | `libreria_oskar_test` | `estado`, `regenerar` (400 con código erróneo, 409 sin 2FA, invalida los anteriores) y no exposición de secreto, hash ni códigos en `/auth/me`, `/usuarios`, login y estado. |
| `tests/dosFactoresBloqueo.test.js` | 8 | End-to-End | `libreria_oskar_test` | 5 fallos → 429, código correcto con bloqueo → 429, bloqueo vencido vuelve a funcionar, éxito reinicia, contador compartido, fallo registrado aunque falle la operación, concurrencia (mismo TOTP, mismo respaldo, 5 fallos simultáneos) y falla cerrada del descifrado. |
| `tests/dosFactoresConcurrencia.test.js` | 5 | End-to-End | `libreria_oskar_test` | 30 peticiones simultáneas con códigos erróneos distintos en `verificar` (TOTP y respaldo), `activar` y `regenerar`: exactamente 5 verificaciones (`totp.verificarCodigo` o `consumirRespaldo` reemplazados temporalmente y restaurados en `finally`), 4×401 (4×400 en regenerar) y 26×429, sin 500; con bloqueo un código correcto → 429 sin verificarse, y con el bloqueo vencido → 200; el formato inválido no consume intento. |
| `tests/dosFactoresRestablecer.test.js` | 5 | End-to-End | `libreria_oskar_test` | Restablecer: 401/403/400/404/403 a sí mismo, éxito (luego el login pide `configurar` con `enforced`), `restablecerPorEmail` y el script `reset-2fa` (código 1 sin argumento o con email inexistente, 0 con éxito, sin secretos en la salida). |
| `tests/recuperacionConfig.test.js` | 7 | Unitaria | No requiere | `leerConfigRecuperacion` (`test` ignora el entorno, desarrollo por defecto, producción sin variable → `faltantes`, URL inválida/con ruta/barra final → Error sin el valor, constantes), `sesionVigente` (estricta, mismo segundo, sin `iat`) y formato/hash del token y del enlace. |
| `tests/recuperacionSolicitar.test.js` | 6 | End-to-End | `libreria_oskar_test` | `POST /api/auth/recuperar`: cuerpo idéntico (existente, inexistente, inactivo), un solo correo con enlace en el fragmento, solo SHA-256 en la BD, 400 por formato, enfriamiento y reemplazo del enlace, falla cerrada sin `FRONTEND_URL`, límites 6.ª/11.ª → 429 sin compartir contador con el login. |
| `tests/recuperacionRestablecer.test.js` | 5 | End-to-End | `libreria_oskar_test` | `POST /api/auth/restablecer`: éxito y aviso, reuso, token mal formado/inexistente/vencido con el mismo mensaje, política o contraseña igual sin consumir el enlace, cuenta desactivada y concurrencia con el mismo enlace (un 200 y un 400; solo la ganadora inicia sesión). |
| `tests/recuperacionCorreoHtml.test.js` | 3 | End-to-End | `libreria_oskar_test` | Correo de recuperación con `texto`, `html` y logo `image/png` cuyo `cid` aparece en el html, enlace `#token=` en botón y texto; aviso con `html` sin botón; si construir el mensaje lanza, respuesta idéntica (estado y cuerpo) a la de un correo inexistente y un solo registro `[RECUPERACION]` sin correo ni token. |
| `tests/recuperacionSesiones.test.js` | 4 | End-to-End | `libreria_oskar_test` | JWT y token temporal 2FA anteriores → 401 en `/auth/me`, `/usuarios` y `/2fa/verificar`; sin cambio registrado siguen; login posterior con la nueva; 2FA intacto y `paso: 'verificar'`; token, hash, contraseñas y correo fuera de consola y respuestas. |
| `tests/seedProduccion.test.js` | 9 | End-to-End | `libreria_oskar_test` | Seed con `NODE_ENV=production`: crea el Administrador central (rol, activo, 2FA apagado, nombre fijo, hash bcrypt) solo si no existe, no modifica uno existente (otra contraseña, inactivo, rol Empleado), rechaza correo ausente/inválido y contraseña ausente/débil con correo nuevo (sin dejar usuario ni sucursal/bodega nuevos), normaliza el correo y no imprime contraseña ni hash. No importa `config/db`. |
| `tests/esperarBaseDatos.test.js` | 12 | Unitaria y de procesos hijo | No requiere | `esperarBaseDatos` con reloj y pausas simulados: éxito al primer intento sin esperas ni logs; dos fallos y luego conexión (pausas de 1000 y 2000 ms, dos líneas de reintento); nunca conecta (relanza el último error, intentos acordes al reloj); `maxEsperaMs = 0` (un intento, error original); errores fatales relanzados de inmediato; códigos reintentables y desconocidos reintentados; pausas acotadas por `pausaMaxMs` y por el tiempo restante; `leerEsperaMaxima` (defecto, válido, inválidos sin mostrar el valor); log con mensajes largos recortados y sin imprimir el objeto de error; y `migrate.js`, `seed.js` y `server.js` como procesos hijo contra un puerto cerrado: reintentan y salen con código 1. |
| **Total** | **420** | | | `npm test`: 420 pasan, 0 fallan (ejecutado el 2026-10-25). |

- **Runner**: Node.js test runner nativo (`node --test --test-concurrency=1 tests/**/*.test.js`), lanzado por `src/run-tests.js`. La columna Tests usa el conteo del runner: una prueba con subpruebas `t.test` cuenta la prueba padre más cada subprueba.
- **Aislamiento**: `src/run-tests.js` aborta si `NODE_ENV === 'production'` y comprueba con Sequelize (`SELECT current_database()`) que la conexión apunta a `libreria_oskar_test`. Requiere `db-test` levantado (puerto host 5435).
- **Cliente `pg` en pruebas**: 7 archivos importan `src/config/db.js` (cliente `pg` nativo) (`db.pool.query` y `pool.end()`) para consultas directas, sembrado o limpieza; ver §9.
- **Frontend**: no tiene pruebas automatizadas.
- **Pruebas de recuperación**: reutilizan la fábrica y el servidor de `tests/helpers/dosFactores.js` y `tests/helpers/recuperacion.js` (reinicio de `limiteRecuperar`/`limiteRestablecer`, `esperarEnvios()`, lectura del token desde la bandeja de consola); simulan el paso del tiempo moviendo `token_recuperacion_expira` o `password_cambiada_en` en la BD (sin esperas) y restauran `console.*` y `env.recuperacion.frontendUrl` en `finally`. `recuperacionSolicitar.test.js` exige ahora que el correo traiga `html` (antes exigía que no lo hubiera).
- **Pruebas 2FA**: crean y borran sus propios usuarios (`tests/helpers/dosFactores.js`), nunca tocan el estado 2FA de los usuarios del seed, no usan red y restauran `env.twoFactor.enforced` en `finally`.

---

## 5. Frontend (React 18 + Vite + Tailwind CSS)

### 5.0 Estructura de `src/`

```text
src/
├── App.jsx, main.jsx, index.css
├── views/                  Orquestadores de ruta (Catalogo, LibroDetalle, RegistrarLibro, Inventario, Usuarios, Categorias, GestionLibros, Login, OlvideContrasena, RestablecerContrasena, Nosotros, Ventas, NuevaVenta, VentaDetalle, Seguridad)
├── components/             Compartidos: Navbar, Footer, Toast, LoadingSpinner, ModalPrecioLibro, ProtectedRoute, BarcodeScanner, EstadoEscaner
│   └── ui/                 Modal, ErrorBox, FieldLabel, Input, ControlCantidad, OpcionesSegmentadas, Select, Paginacion
├── context/                AuthContext.jsx
├── features/
│   ├── catalogo/           components/ + hooks/ (useCatalogo, useLibroDetalle)
│   ├── inventario/         components/ + hooks/ (useInventarioData, useKardex)
│   ├── registrar-libro/    components/ + hooks/ (useRegistrarLibro) + validacion.js + camposFaltantes.js
│   ├── seguridad/          components/ + hooks/ (useLoginDosPasos, useSeguridad, useFocoCodigo, useSolicitarRecuperacion, useRestablecerContrasena) + codigos.js, errores.js y recuperacion.js (puros) + navegador.js (copiar/descargar)
│   ├── ventas/             components/ + hooks/ (useNuevaVenta, useVentas, useVentaDetalle)
│   ├── usuarios/           components/ + hooks/ (useUsuarios)
│   ├── categorias/         components/ + hooks/ (useCategorias)
│   └── libros/             components/ + hooks/ (useGestionLibros)
├── hooks/                  useDebouncedValue.js, useCamaraEscaner.js, useGeometriaEscaner.js, useDiagnosticoEscaner.js
├── services/api/           client.js, auth.api.js, dosFactores.api.js, recuperacion.api.js, catalogo.api.js, bodegas.api.js, categorias.api.js, inventario.api.js, libros.api.js, librosAdmin.api.js, ventas.api.js, usuarios.api.js
└── utils/                  tokenStorage.js, roles.js, formatters.js, parsers.js, dinero.js, cargarDetectorDeCodigos.js, errorCamara.js, geometriaEscaner.js
```

Reglas de la estructura: las llamadas HTTP salen solo de `services/api/`; las vistas son orquestadoras delgadas (leen sesión, invocan el hook de su feature y componen componentes); los roles se consultan con `utils/roles.js` (`ROLES`, `ROLES_OPERATIVOS`, `esAdministrador`) y el token con `utils/tokenStorage.js`.

### 5.1 Entry Point y Enrutamiento (`src/App.jsx`)

| Ruta | Vista Componente | Acceso / Rol Requerido | Comportamiento |
|---|---|---|---|
| `/` | `Navigate` | Público | Redirige a `/catalogo` |
| `/catalogo` | `Catalogo` | Público | Catálogo interactivo de libros con buscador y filtros |
| `/catalogo/:ref` | `LibroDetalle` | Público | Ficha técnica y disponibilidad por sucursal |
| `/nosotros` | `Nosotros` | Público | Información institucional de la empresa |
| `/login` | `Login` | Público | Credenciales y, si el backend lo pide, segundo paso 2FA (verificar o alta) |
| `/olvide-contrasena` | `OlvideContrasena` | Público (sin `ProtectedRoute`; no está en el Navbar) | Pide el enlace de recuperación por correo |
| `/restablecer` | `RestablecerContrasena` | Público (sin `ProtectedRoute`; no está en el Navbar) | Toma el token del fragmento de la URL y permite elegir la contraseña nueva |
| `/registrar` | `RegistrarLibro` | `ROLES_OPERATIVOS` (`Administrador`, `Empleado`) | Consulta por ISBN, ingreso de stock y registro de libros (`ProtectedRoute`) |
| `/inventario` | `Inventario` | `ROLES_OPERATIVOS` | Resumen, existencias y kardex (`ProtectedRoute`) |
| `/ventas` | `Ventas` | `ROLES_OPERATIVOS` | Listado de ventas con filtros y paginación (`ProtectedRoute`) |
| `/ventas/nueva` | `NuevaVenta` | `ROLES_OPERATIVOS` | Registro de una venta (`ProtectedRoute`) |
| `/ventas/:id` | `VentaDetalle` | `ROLES_OPERATIVOS` | Detalle de la venta; el Administrador puede anularla (`ProtectedRoute`) |
| `/usuarios` | `Usuarios` | `ROLES_POR_RUTA.usuarios` (`Administrador`) | Gestión de cuentas, búsqueda, filtros, alta, edición y activación/desactivación (`ProtectedRoute`) |
| `/categorias` | `Categorias` | `ROLES_POR_RUTA.categorias` (`Administrador`) | Gestión de categorías, búsqueda, conteo de libros, alta, renombrado y eliminación protegida (`ProtectedRoute`) |
| `/libros/gestion` | `GestionLibros` | `ROLES_POR_RUTA.gestionLibros` (`Administrador`) | Listado paginado de libros activos e inactivos, edición bibliográfica y baja/reactivación lógica (`ProtectedRoute`) |
| `/reportes` | `Reportes` | `ROLES_POR_RUTA.reportes` (`Administrador`) | Consulta de siete reportes, filtros, paginación backend y descargas XLSX/PDF (`ProtectedRoute`) |
| `/cuenta/seguridad` | `Seguridad` | Cualquier sesión (`ProtectedRoute` sin `roles`) | Estado del 2FA, códigos de respaldo restantes y regeneración |
| `*` | `Navigate` | Público | Redirige cualquier ruta desconocida a `/catalogo` |

La navegación muestra Catálogo y Nosotros para público y cualquier rol; Registrar, Inventario y Ventas solo para Administrador y Empleado; Usuarios, Categorías, Gestión de libros y Reportes aparecen en Administración solo para Administrador. Mi cuenta / Seguridad sigue pendiente. Las capacidades y roles de las rutas se centralizan en `utils/roles.js`.

### 5.2 Análisis Detallado por Vista

#### Gestión de usuarios (`Usuarios.jsx`)
- `views/Usuarios.jsx` orquesta la pantalla; `features/usuarios/hooks/useUsuarios.js` carga `GET /api/usuarios?incluirInactivos=true`, filtra por nombre/correo, rol y estado, calcula tarjetas de resumen y gestiona altas, ediciones y cambios de estado.
- `features/usuarios/components/TablaUsuarios.jsx` presenta tabla en escritorio y tarjetas en móvil con rol, estado y acciones. La cuenta autenticada muestra que no se puede desactivar desde la lista.
- `FormularioUsuario.jsx` reutiliza alta y edición; contraseña solo al crear, con sus requisitos (10 caracteres, letra, número y máximo 72 bytes UTF-8). En edición modifica nombre, correo, rol y estado; solicita confirmación antes de desactivar.
- `FiltrosUsuarios.jsx` ofrece búsqueda y filtros por Administrador/Empleado y estado. La confirmación explica que el backend valida auto desactivación y último administrador; los errores HTTP muestran el `message` del backend.
- `services/api/usuarios.api.js` usa exclusivamente `apiFetch` para GET, POST, PUT y PATCH `/api/usuarios/:id/activo`. Cada operación exitosa vuelve a cargar el listado.
- **Prueba manual pendiente**: Administrador (CRUD, filtros, confirmación y rechazo de auto desactivación/último admin); Empleado y rol `Usuario` (acceso denegado); visitante sin sesión (redirige a login); revisar tabla de escritorio, tarjetas móviles y navegación móvil.

#### Gestión de categorías (`Categorias.jsx`)
- `views/Categorias.jsx` orquesta `features/categorias/hooks/useCategorias.js`, que carga categorías con conteos, busca por nombre y gestiona alta, renombrado y eliminación.
- `TablaCategorias.jsx` muestra tabla en escritorio y tarjetas en móvil; `FormularioCategoria.jsx` reutiliza alta y renombrado, muestra errores del backend y explica la agrupación automática de «Derecho» en el catálogo.
- `services/api/categorias.api.js` usa `apiFetch` para `GET /api/categorias/admin`, `POST /api/categorias`, `PUT /api/categorias/:id` y `DELETE /api/categorias/:id`. El GET público del catálogo sigue siendo `/api/categorias`.
- **Prueba manual pendiente**: Administrador (búsqueda, crear, renombrar, duplicados, borrado vacío y conflicto con conteo de libros); Empleado y Usuario (acceso denegado); visitante (redirige a login); verificar teclado, móvil y escritorio.

#### Gestión administrativa de libros (`GestionLibros.jsx`)
- `views/GestionLibros.jsx` orquesta `features/libros/hooks/useGestionLibros.js`; `/libros/gestion` exige Administrador mediante `ProtectedRoute` y `ROLES_POR_RUTA.gestionLibros`. Navbar la muestra solo en Administración para dicho rol.
- `FiltrosGestionLibros.jsx` ofrece búsqueda por título, categoría y estado admitidos por backend. `TablaGestionLibros.jsx` presenta tabla de escritorio y tarjetas adaptables, con ISBN, estado textual, precio de solo lectura cuando viene en el listado y acciones. `Paginacion` reutiliza el control compartido, con tamaño inicial 20 y opciones 20/50/100.
- `useGestionLibros.js` cancela solicitudes de listado obsoletas, aplica debounce a la búsqueda y conserva filtros/página al recargar tras una operación. `services/api/librosAdmin.api.js` usa `apiFetch` para `GET /api/libros/admin?q=&categoriaId=&estado=&limit=&offset=`, `PUT /api/libros/:id` y `PATCH /api/libros/:id/activo`.
- `FormularioEditarLibro.jsx` precarga título, autor, editorial, categoría, reseña, imagen e ISBN. Valida requeridos, autor marcador e ISBN-10/13 mediante checksum; presenta errores del backend, incluido ISBN duplicado 409. El PUT no incluye precio ni existencias; el precio conserva el flujo independiente `PATCH /api/libros/:id/precio` y `ModalPrecioLibro`.
- La desactivación solicita confirmación y explica que el libro deja el catálogo y no se vende, pero conserva inventario e historial. Reactivar usa el mismo endpoint sin confirmación. El backend sigue siendo la autoridad para impedir operaciones sobre libros inactivos.
- **Prueba manual pendiente**: Administrador (edición, ISBN duplicado, desactivación/reactivación, filtros y páginas); Empleado/Usuario (acceso denegado); visitante sin sesión (redirige a login); comprobar teclado, escritorio y móvil.

#### Panel administrativo de reportes (`Reportes.jsx`)
- `/reportes` está protegido con `ProtectedRoute` y `ROLES_POR_RUTA.reportes` (solo Administrador); Navbar lo incluye en Administración. El servidor conserva sus propios controles de autenticación y rol.
- `views/Reportes.jsx` orquesta `features/reportes/hooks/useReportes.js` y componentes compartidos `SelectorReporte`, `FiltrosReporte`, `ResumenReporte`, `TablaReporte` y `AccionesExportacion`. `reportes.config.js` define títulos, filtros, columnas, arrays y límites por tipo; los datos se renderizan en tabla en escritorio y tarjetas en móvil.
- `services/api/reportes.api.js` utiliza `apiFetch` para los siete GET JSON (`corte-caja`, `resumen-periodo`, `libros-mas-vendidos`, `reposicion`, `inventario-valorizado`, `kardex`, `ventas`) y `GET /api/reportes/:tipo/exportar?formato=xlsx|pdf`. Los binarios se leen como `Blob`, reciben el nombre desde `Content-Disposition` con fallback seguro, se descargan mediante URL temporal y se revoca dicha URL. Los filtros compatibles también se envían al exportar; `limit` y `offset` se omiten para exportar el conjunto filtrado del backend.
- Corte y resumen son agregados sin paginación; libros más vendidos, reposición, inventario valorizado, Kardex y ventas usan `Paginacion` y vuelven a consultar la página al cambiar `limit`, `offset` o filtros. Las solicitudes de consulta se cancelan con `AbortController`; una respuesta obsoleta no sustituye la selección actual. `apiFetch` mantiene JWT, redirección existente en 401 y soporte nativo de `signal`/`Response` binaria.
- Los filtros visibles corresponden a cada contrato: fecha o rango, categoría, bodega, búsqueda por título y selección de libro, tipo de movimiento, estado, vendedor y método de pago donde aplica. La selección del libro busca por título en el listado administrativo existente; categorías, bodegas y vendedores se cargan mediante sus servicios existentes.
- La interfaz conserva las limitaciones de datos: inventario valorizado advierte que no hay costos de adquisición; reposición indica cantidad sugerida “No disponible”; ranking de ventas explica que usa subtotales históricos antes del descuento global; corte diario no representa conciliación física de efectivo. Los valores nulos se presentan como “No disponible” y los importes disponibles en quetzales.
- **Prueba manual pendiente**: Administrador consulta los siete reportes y aplica filtros/paginación; descarga Excel y PDF, incluidos errores 400/401/403/413/429; Empleado/Usuario reciben acceso denegado y visitante sin sesión va a login; probar reportes vacíos, importes/valores desconocidos, respuesta tardía al cambiar de reporte, teclado, móvil y tablas anchas. El frontend no tiene runner de pruebas automatizadas; validar con `npm run frontend:build`.

#### 1. `Catalogo.jsx` (171 líneas)
- **Responsabilidades**: Orquesta la vista; `features/catalogo/hooks/useCatalogo.js` mantiene libros, filtros y paginación. Sincroniza `q` y `categoriaId` con la URL, reinicia el offset al cambiar filtros o tamaño y cancela solicitudes obsoletas. El tamaño inicial es 12 (opciones 12, 24 y 48); la lista solicita `limit` y `offset` al backend y consume `total`.
- **Endpoints consumidos**: `GET /api/categorias` y detalle vía `fetch` directo; la lista paginada `GET /api/libros?q=...&categoriaId=...&limit=...&offset=...` usa `apiFetch` y `AbortSignal`. El backend devuelve `{ status, results, total, limit, offset, data }`.
- **Componentes**: `PanelFiltros`, `DrawerFiltros`, `EtiquetasFiltros`, `BookGrid`, `SinResultados` (en `features/catalogo/components/`; `BtnCategoria` lo usan los paneles), `Paginacion` (`components/ui/`) y `Footer`.
- Los filtros agrupan visualmente bajo «Ramas del Derecho» toda categoría cuyo nombre comienza por «Derecho», sin distinguir mayúsculas. Renombrar una categoría puede cambiar su agrupación visual; el endpoint público y esta regla del catálogo permanecen sin cambios.
- **Precio**: `BookGrid` usa `formatPrecio`: `Q 12.50` o "Precio por confirmar".

#### 2. `LibroDetalle.jsx` (66 líneas)
- **Responsabilidades**: Lee `:ref` y delega en `useLibroDetalle(ref, navigate)`; según el estado muestra `DetalleSkeleton`, `LibroNoEncontrado`, `LibroError` o `FichaLibro` (que incluye disponibilidad por bodega/sucursal con `DisponibilidadItem`). Usa `useAuth` y `esAdministrador(user)`: solo para el Administrador `FichaLibro` muestra el botón "Fijar precio" ("Cambiar precio" si el precio actual es > 0), que abre `ModalPrecioLibro`; al guardar cierra el modal y recarga el libro con `reintentar` de `useLibroDetalle` (ignora el libro que recibe `onSuccess`).
- **Endpoints consumidos**: `GET /api/libros/:ref` (`getLibroDetalle` en `catalogo.api.js`) y `PATCH /api/libros/:id/precio` (`actualizarPrecioLibro` en `libros.api.js`, vía `ModalPrecioLibro`).
- **Precio**: `FichaLibro` usa `formatPrecio` (`Q 12.50` o "Precio por confirmar").

#### 3. `RegistrarLibro.jsx` (194 líneas)
- **Responsabilidades**: Orquestador del asistente. Estado y acciones en `features/registrar-libro/hooks/useRegistrarLibro.js`. `paso` toma los valores `'consulta'` \| `'existe'` \| `'noExiste'` (inicial `'consulta'`).
- **Endpoints consumidos** (vía `bodegas.api.js`, `categorias.api.js`, `libros.api.js`, todos con `apiFetch`): `GET /api/bodegas`, `GET /api/categorias`, `POST /api/libros/consultar`, `POST /api/libros/:id/ingreso`, `POST /api/libros/registrar`. **No llama a `POST /api/libros/escanear`** (sin coincidencias en `src/`).
- **Componentes**: `PanelLateral` (aloja `BarcodeScanner`, que muestra `EstadoEscaner`, e `HistorialSesion`), `PanelConsulta`, `FichaLibroExistente`, `FormularioIngreso`, `ResultadoIngreso`, `FormularioRegistro` (con `AvisoCamposFaltantes`), `ResultadoRegistro`, `LoadingSpinner`, y `components/ui/*`. En el paso `noExiste` el rótulo es "Sugerencia de <fuente real>" (`rotuloSugerencia(sugerencia.fuente)`) o "Libro no encontrado"; si la consulta no halló nada (`sugerencia` null y `camposFaltantes` no vacío) muestra el aviso "No se encontró información de este ISBN. Completa los datos del libro." (no aparece en el registro manual).
- **Validación en cliente**: `features/registrar-libro/validacion.js` (`validarRegistro`): autor obligatorio y distinto del marcador `AUTOR_PLACEHOLDER`, categoría, título, reseña, bodega y cantidad ≥ 1. **No hay validación de checksum de ISBN en el cliente**; el checksum se valida solo en el backend.
- **Precio por rol**: `esAdmin = esAdministrador(user)`. Solo el Administrador ve el precio en `FichaLibroExistente` (`Precio: Q 12.50` o `Precio por confirmar`, con `formatPrecio`) y puede editarlo en `FormularioRegistro`; en la ficha tiene además un botón "Fijar precio" ("Cambiar precio" si el precio es > 0) que abre `ModalPrecioLibro` (estado local de la ficha) y, al guardar, `handlePrecioActualizado` del hook actualiza `precio` de `libroExistente` y muestra un aviso; el hook solo envía `precio` si `esAdmin`.

#### 4. `Inventario.jsx` (187 líneas)
- **Responsabilidades**: Orquestador de pestañas (`activeTab`: `'existencias'` \| `'kardex'`) y modales; `useInventarioData` carga resumen, bodegas y existencias filtradas. Existencias pagina desde el backend con tamaño inicial 20 (opciones 20, 50 y 100), reinicia el offset al cambiar filtros y cancela solicitudes obsoletas. El resumen global sigue cargándose por separado y no depende de la página visible. `useKardex` conserva su paginación propia (`KARDEX_LIMIT = 25`).
- **Endpoints consumidos** (vía `inventario.api.js` y `bodegas.api.js`, con `apiFetch`): `GET /api/bodegas`, `GET /api/inventario/resumen`, `GET /api/inventario?estado=...&q=...&bodegaId=...&limit=...&offset=...`, `GET /api/movimientos?...`, `POST /api/inventario/:id/salida`, `POST /api/inventario/:id/ajuste`. El listado conserva `{ status, total, limit, offset, data }`.
- **Componentes**: `ResumenKpis`, `TablaExistencias` (tabla de escritorio y tarjetas móviles, con paginación compartida), `TablaKardex`, `ModalSalidaInventario`, `ModalAjusteInventario` (sobre `components/ui/Modal`), `Toast`; `EstadoBadge` y `TipoBadge` los usan las tablas.

#### 5. `Login.jsx` (77 líneas)
- **Responsabilidades**: Orquestador delgado del login; el estado está en `features/seguridad/hooks/useLoginDosPasos.js`. `paso`: `'credenciales'` → `'verificar'` (código de 6 dígitos o, con el enlace "Usar un código de respaldo", `XXXXX-XXXXX`) o `'configurar'` (QR, enlace `otpauth://` solo por debajo de `md`, clave agrupada en bloques de 4 con Copiar, primer código) → `'respaldo'` (10 códigos con Copiar, Descargar `.txt` y la casilla "Ya los guardé"). Destino: `location.state.from` o, por defecto, **`/registrar`**; redirige con `<Navigate>` en cuanto existe `user`, por eso tras el alta la sesión se abre solo al pulsar Continuar.
- **Token temporal**: solo en estado de React (ni almacenamiento ni URL); al recargar se vuelve a las credenciales. Si se envía tras `expiraEnSegundos`, no llama al backend y vuelve a las credenciales con "La verificación venció. Inicia sesión de nuevo."; la respuesta se clasifica con `clasificarErrorCodigo` (`features/seguridad/errores.js`). Código inválido (401 con el mensaje exacto "Código inválido o vencido."): el campo y el botón principal quedan deshabilitados, el foco pasa a "Intentar de nuevo", que limpia el campo, lo rehabilita y le devuelve el foco (en el alta no vuelve a llamar a `/configurar` ni cambia el QR); el enlace "Volver" y el cambio app/respaldo siguen disponibles. Bloqueo (429): campo, botón principal y cambio app/respaldo deshabilitados, mensaje del backend con el foco en la alerta y solo "Volver a iniciar sesión". Cualquier otro 401 (token vencido, 2FA restablecido o mensaje desconocido) muestra el mensaje del backend y "Volver a iniciar sesión".
- **`/configurar`**: se llama una sola vez por token temporal, desde el envío de credenciales (no en un efecto, por StrictMode) y con una guardia `useRef`; no hay botón para regenerar el QR.
- **Endpoints consumidos**: `POST /api/auth/login` (vía `AuthContext` y `auth.api.js`) y `POST /api/auth/2fa/configurar`, `/activar`, `/verificar` (vía `dosFactores.api.js`, `fetch` directo).
- **Componentes**: `FormularioCredenciales`, `PasoVerificar`, `PasoConfigurar`, `CodigosRespaldo` (en `features/seguridad/components/`). Solo en el paso de credenciales, bajo el botón principal, `FormularioCredenciales` muestra el enlace "¿Olvidaste tu contraseña?" (`Link` a `/olvide-contrasena`); `Login.jsx` no cambió.

#### Recuperar contraseña (`OlvideContrasena.jsx` y `RestablecerContrasena.jsx`)
- Vistas delgadas sobre `TarjetaAcceso` (misma tarjeta que el login, duplicada a propósito: `Login.jsx` no se refactorizó). El estado vive en `useSolicitarRecuperacion` y `useRestablecerContrasena`; la lógica pura en `features/seguridad/recuperacion.js`.
- **`/olvide-contrasena`**: un campo de correo (`type="email"`, `autoComplete="email"`, recortado). Estados `formulario` → `enviando` → `enviado`. Con 200 reemplaza el formulario por `data.mensaje` del backend en un `role="status"` (mismo texto exista o no el correo) con "Volver a iniciar sesión" y "Usar otro correo". Con 400, 429 u otro error muestra el mensaje en `AlertaError` y conserva el formulario; sin conexión: "No se pudo conectar con el servidor. Inténtalo de nuevo.".
- **`/restablecer`**: estados `formulario` | `enviando` | `exito` | `enlaceInvalido`. El token se lee de `window.location.hash` una sola vez, en el inicializador de `useState` (sobrevive a la doble ejecución de efectos de StrictMode); un efecto idempotente borra el fragmento con `history.replaceState` (conserva `history.state`, sin `navigate`) y nunca toca el token. Sin token con formato válido (`/^[A-Za-z0-9_-]{43}$/`) arranca en `enlaceInvalido` sin llamar al backend. La contraseña se valida en el navegador con `validarPasswordNueva` (misma regla y textos que `passwordPolicy.js`, más "Las contraseñas no coinciden.") antes de enviar. Respuesta clasificada con `clasificarErrorRestablecer`: 200 → `exito` (limpia contraseñas y token); 400 con el mensaje de enlace inválido → `enlaceInvalido`; otro 400 (política o igual a la actual) → muestra el mensaje, conserva el token, limpia los campos y devuelve el foco al primero; 429 y otros → mensaje del backend y formulario usable, sin temporizadores (recargar perdería el token). "Ir a iniciar sesión" es un `<a href="/login">` (navegación completa) para que `AuthContext` revalide la sesión con `/api/auth/me` al cargar.
- Foco: al primer campo en el formulario y al título (`tabIndex={-1}`) en `exito` y `enlaceInvalido`. Token y contraseñas solo en memoria.
- **Endpoints consumidos**: `POST /api/auth/recuperar` y `POST /api/auth/restablecer` (vía `recuperacion.api.js`, `fetch` directo).

#### 6. `Nosotros.jsx` (88 líneas)
- Vista estática institucional (sucursales, horarios, contacto). No consume endpoints.

#### 7. `Ventas.jsx` (55 líneas)
- **Responsabilidades**: Orquestador del listado; estado en `features/ventas/hooks/useVentas.js` (filtros de estado y fechas `desde`/`hasta`, paginación por offset con `VENTAS_LIMIT = 25`; al cambiar un filtro el offset vuelve a 0; si `desde > hasta` no envía la petición y muestra un aviso).
- **Endpoints consumidos** (vía `ventas.api.js`): `GET /api/ventas?estado=&desde=&hasta=&limit=&offset=`.
- **Componentes**: `FiltrosVentas`, `TablaVentas` (tabla en escritorio, tarjetas en móvil; cada fila enlaza a `/ventas/:id`), `EstadoVentaBadge`. Botón "Nueva venta" hacia `/ventas/nueva`.

#### 8. `NuevaVenta.jsx` (97 líneas)
- **Responsabilidades**: Orquestador del formulario; todo el estado en `features/ventas/hooks/useNuevaVenta.js` (bodega, búsqueda con `useDebouncedValue(…, 300)`, líneas, descuento, método de pago, cliente, NIT, notas, envío). Los importes se calculan en centavos enteros con `utils/dinero.js`.
- **Endpoints consumidos** (vía `ventas.api.js` y `bodegas.api.js`, con `apiFetch`): `GET /api/bodegas`, `GET /api/libros?q=` (`buscarLibrosParaVenta`; se eligió porque `GET /api/inventario` no devuelve el precio; usa `id`, `titulo`, `autor_nombre`, `isbn`, `precio`, `stock_total`) y `POST /api/ventas`.
- **Componentes**: `BuscadorLibrosVenta` (máx. 20 resultados; "Sin precio", "Sin stock" o "En la venta" deshabilitan "Agregar"), `LineasVenta` (con `ControlCantidad`, ahora en `components/ui/`: botones − y + alrededor del input de cantidad), `ResumenVenta`, `FormularioCliente` (método de pago con `OpcionesSegmentadas`; la bodega, si hay varias, también).
- **Reglas**: el payload lleva solo `bodegaId`, `items`, `metodoPago` y, si no están vacíos, `clienteNombre`, `clienteNit`, `descuento` y `notas`; nunca precio, subtotal, total ni `usuarioId`. Un `useRef` y el `disabled` evitan el doble envío. Un error 400/404/409 se muestra con `ErrorBox` sin vaciar las líneas; un error de red muestra un aviso con enlace al listado en pestaña nueva (la venta pudo haberse registrado). Un 201 navega a `/ventas/:id` con `state: { recienCreada: true }`.

#### 9. `VentaDetalle.jsx` (88 líneas)
- **Responsabilidades**: Orquestador del detalle; datos en `useVentaDetalle` (carga, 404, error y recarga).
- **Endpoints consumidos** (vía `ventas.api.js`): `GET /api/ventas/:id` y `POST /api/ventas/:id/anular`.
- **Componentes**: `FichaVenta`, `ModalAnularVenta` (sobre `components/ui/Modal`; motivo obligatorio de hasta 500 caracteres), `EstadoVentaBadge`. Con `location.state?.recienCreada` muestra el banner de éxito y limpia el estado. 404 → "Venta no encontrada" con enlace al listado; otro error → mensaje con botón "Reintentar".
- **Rol**: el botón "Anular venta" solo aparece si `esAdministrador(user)` y la venta está `Completada`; el backend exige `Administrador` en la anulación.

#### 10. `Seguridad.jsx` (25 líneas)
- **Responsabilidades**: Orquestador de `/cuenta/seguridad`; datos en `features/seguridad/hooks/useSeguridad.js` y presentación en `PanelSeguridad`. Estados: cargando, error con "Reintentar", inactivo (texto neutro: "Se te pedirá configurarla al iniciar sesión" si `obligatorio`; sin botón de activar, el backend no lo permite con sesión completa) y activo (códigos restantes y `FormularioRegenerar`, que pide un TOTP vigente).
- **Regenerar**: el éxito muestra los códigos nuevos con `CodigosRespaldo` (se descartan del estado al pulsar Listo); 400 (código inválido) muestra el mensaje con la pista de esperar al siguiente código, deshabilita campo y botón y ofrece "Intentar de nuevo" (limpia el campo y le devuelve el foco); 429 deshabilita el formulario con el mensaje del backend y sin reintento (hasta recargar la vista); 409 muestra su mensaje.
- **Endpoints consumidos** (vía `dosFactores.api.js`, `apiFetch`): `GET /api/auth/2fa/estado` y `POST /api/auth/2fa/respaldo/regenerar`.

### 5.3 Catálogo de Componentes Compartidos (`src/components/`)

| Componente | Archivo | Props Aceptadas | Descripción |
|---|---|---|---|
| `Navbar` | `components/Navbar.jsx` | Ninguna | Barra superior responsive. Con sesión muestra Registrar, Inventario y Ventas según rol, y Usuarios solo para Administrador; Catálogo y Nosotros son públicos. Sin sesión muestra Catálogo y Nosotros. La sección "Mi cuenta / Seguridad" tiene el enlace "Seguridad de la cuenta" (`soloSesion`: cualquier sesión, nunca visitantes). El chip del usuario (y el avatar en móvil) es un `NavLink` a `/cuenta/seguridad` con `aria-label` "`{nombre_completo}`, mi cuenta y seguridad" (empieza con el nombre visible, WCAG 2.5.3). |
| `Footer` | `components/Footer.jsx` | Ninguna | Pie de página. |
| `LoadingSpinner` | `components/LoadingSpinner.jsx` | `message` (String, default: "Cargando...") | Spinner para llamadas asíncronas. |
| `Toast` | `components/Toast.jsx` | `toast` (Objeto), `onClose` (Función) | Notificación flotante con temporizador; capa `z-[60]`, por encima de Navbar, `Modal`, `LoadingSpinner` y `DrawerFiltros` (`z-50`). |
| `ModalPrecioLibro` | `components/ModalPrecioLibro.jsx` | `libro`, `onClose`, `onSuccess` | Modal (sobre `ui/Modal`) que muestra título y precio actual, pide el nuevo precio y llama a `actualizarPrecioLibro` (`PATCH /api/libros/:id/precio`); muestra `message` y `details` con `ErrorBox`. Llama `onSuccess(json.data)` con el libro actualizado. Lo usan `LibroDetalle` y `FichaLibroExistente`; gestión bibliográfica no modifica precios. |
| `ControlCantidad` | `components/ui/ControlCantidad.jsx` | `cantidad` (texto), `onChange`, `max` (opcional), `disabled`, `titulo` (opcional) | Botones − y + alrededor de un input numérico (mín. 1, 44 px). Sin `max` no hay tope y el input no lleva `max`. Lo usan `LineasVenta` (con `max` = stock), `FormularioIngreso` y `FormularioRegistro` (sin `max`). |
| `Paginacion` | `components/ui/Paginacion.jsx` | `paginaActual`, `totalResultados`, `tamanoPagina`, `opcionesTamano`, `onCambiarPagina`, `onCambiarTamano`, `cargando`, `etiquetaResultados` | Control accesible y adaptable para cambiar página y tamaño; deshabilita acciones durante carga y en los extremos. Se usa en catálogo e inventario. |
| `BarcodeScanner` | `components/BarcodeScanner.jsx` | `onScanSuccess`, `isProcessing`, `onClose` (opcional) | Vista del escáner (139 líneas): JSX (selector de cámara, entrada manual, «Cerrar visor», visor con el overlay de error dentro, `EstadoEscaner` debajo del visor), el estado de la entrada manual y el cableado de los tres hooks de abajo. Se usa desde `PanelLateral`. Lee solo EAN-13, EAN-8, UPC-A y UPC-E; el resto del comportamiento (resolución ideal 1280x720, `qrbox` en función, ancho lógico de 800 px con `transform: scale()`, alto visible máximo 1:1 (`MAX_VISIBLE_RATIO = 1`), apagado según `getState()`, arranque único con callback e `isProcessing` por `useRef`, cooldown de 3 s, fases `iniciando`/`buscando`/`ayuda` con ayuda tras 8 s, `navigator.vibrate?.(80)`, espera de `cargarDetectorDeCodigos()` antes de `new Html5Qrcode` y su lector de respaldo WASM) vive en los hooks y utilidades descritos en las filas siguientes. En desarrollo hay un botón «Diag escáner» con una línea de diagnóstico (incluye `motor: nativo \| wasm \| js`); no llega al build. Lectura real con cámara pendiente de prueba manual (ver §9). |
| `useCamaraEscaner` | `hooks/useCamaraEscaner.js` | `{ onScanSuccess, isProcessing, abrirEntradaManual }` (el último debe ser estable) | Ciclo de vida de `Html5Qrcode`: cola de promesas (`enqueue`), `stopInstance`, `startScanner`, `initCameras` (con id de enumeración contra el doble montaje de StrictMode), `handleDecoded` (cooldown, vibración), fase y su temporizador. Exporta `READER_ELEMENT_ID`. Devuelve `cameras`, `selectedCameraId`, `cameraError`, `isCameraActive`, `fase`, `reintentar`, `cambiarCamara` y `refsDiagnostico`. |
| `useGeometriaEscaner` | `hooks/useGeometriaEscaner.js` | — | `ResizeObserver` sobre marco y lector; devuelve `frameRef`, `readerRef`, `frameStyle` y `stageStyle`. |
| `useDiagnosticoEscaner` | `hooks/useDiagnosticoEscaner.js` | refs del escáner | Solo en desarrollo (`import.meta.env.DEV`): arma la línea de diagnóstico cada segundo; devuelve `diag`, `showDiag` y `alternarDiag`. |
| `geometriaEscaner` / `errorCamara` | `utils/geometriaEscaner.js`, `utils/errorCamara.js` | — | Puras. `geometriaEscaner`: constantes de geometría, `calcularQrbox`, `GEOMETRIA_INICIAL`, `calcularEstilosVisor`. `errorCamara`: `describeCameraError`. |
| `EstadoEscaner` | `components/EstadoEscaner.jsx` | `fase` (`iniciando` \| `buscando` \| `ayuda`), `onEscribir` (opcional) | Presentacional, sin lógica de cámara. Se renderiza debajo del visor, en el flujo normal (no superpuesto), con un alto mínimo de dos líneas (`min-h-[2.5rem]`). Muestra el texto de la fase en una región `role="status"` con `aria-live="polite"`, con una animación de espera en las fases `iniciando` y `buscando`; en `ayuda` añade el botón «Escribir el ISBN». Lo usa `BarcodeScanner`. |
| `ProtectedRoute` | `components/ProtectedRoute.jsx` | `children`, `roles` (opcional) | Guardián de navegación: verifica sesión y rol. |
| `Modal`, `ErrorBox`, `FieldLabel`, `Input`, `Select` | `components/ui/*.jsx` | Ver cada archivo | Primitivas de UI reutilizadas por los formularios y modales de las features. |
| `OpcionesSegmentadas` | `components/ui/OpcionesSegmentadas.jsx` | `opciones` (`{ valor, etiqueta }`), `valor`, `onChange`, `ariaLabel`, `disabled` | Botones táctiles (`role="radiogroup"`/`radio`, mín. 44 px) en lugar de un `<select>`; hoy los usa la interfaz de ventas. |

Los componentes específicos de cada vista viven en `features/<feature>/components/`. Los del 2FA (`features/seguridad/components/`): `FormularioCredenciales`, `PasoVerificar`, `PasoConfigurar`, `CodigosRespaldo`, `FormularioRegenerar`, `PanelSeguridad`, `CampoCodigoTotp` (`inputMode="numeric"`, `autoComplete="one-time-code"`, solo 6 dígitos), `BotonCopiar` (`navigator.clipboard` si existe y el contexto es seguro; si no, `execCommand('copy')` en un textarea temporal; si falla, "Selecciónalo y cópialo manualmente."), `BotonPrincipal` y `AlertaError` (`ErrorBox` dentro de `role="alert"`; con `onReintentar` añade el botón "Intentar de nuevo" y `refFoco` apunta a él o, sin reintento, a la región). `PasoVerificar`, `PasoConfigurar` y `FormularioRegenerar` reciben `estadoCodigo` (`'invalido'` | `'bloqueado'` | `null`) y comparten `hooks/useFocoCodigo.js` para el foco. Los de la recuperación de contraseña: `TarjetaAcceso` (logo, título con etiqueta dorada y `max-w-md`; exporta `Etiqueta`), `CampoAcceso` (etiqueta, ícono e `input` con `forwardRef`), `EnlaceSecundario`, `FormularioOlvide`, `ConfirmacionSolicitud` y `FormularioRestablecer`. `BookCard.jsx` fue eliminado (nadie lo importaba).

### 5.4 Hooks, Contextos y Cliente HTTP

#### `services/api/client.js` (`apiFetch`)
- Envoltorio de `fetch`. Lee el token con `getToken()` (`utils/tokenStorage.js`, clave `oskar_token` en `localStorage`) e inyecta `Authorization: Bearer <token>`.
- Inyecta `Content-Type: application/json` si hay cuerpo que no es `FormData`.
- Si la respuesta es 401 y había token, llama a `clearToken()` y redirige con `window.location.assign('/login')`.
- Conserva las opciones de `fetch`, incluido `signal`, para cancelar solicitudes. La lista pública paginada de `catalogo.api.js` lo usa; categorías y detalle de catálogo mantienen `fetch` directo.
- Módulos por dominio que lo usan: `bodegas.api.js`, `categorias.api.js`, `inventario.api.js`, `libros.api.js`, `ventas.api.js`, `usuarios.api.js` y el listado paginado de `catalogo.api.js`. `auth.api.js` conserva `fetch` directo. `recuperacion.api.js` (`solicitarRecuperacion(email)` → `POST /api/auth/recuperar`, `restablecerContrasena(token, password)` → `POST /api/auth/restablecer`) usa `fetch` directo sin `Authorization`: son endpoints públicos sin sesión y un 401 no debe purgar nada; devuelve `{ ok, status, data, message, details }` (tolera una respuesta sin JSON) y solo lanza si falla la red. `dosFactores.api.js` mezcla ambos: `configurarDosFactores`, `activarDosFactores` y `verificarDosFactores` usan `fetch` directo con `Authorization: Bearer <tokenTemporal>` (un 401 del token temporal no debe purgar la sesión ni redirigir); `getEstadoDosFactores` y `regenerarCodigosRespaldo` usan `apiFetch` (sesión completa; un código inválido al regenerar responde 400).

#### Otros módulos
- `utils/formatters.js` (`formatFecha`, `formatPrecio`, `formatFechaVenta`: fecha en `America/Guatemala`, "—" si es nula o inválida), `utils/dinero.js` (centavos enteros sin punto flotante: `aCentavos`, `deCentavos`, `formatQuetzales`, `formatMonto`), `services/api/ventas.api.js` (`crearVenta`, `getVentas`, `getVenta`, `anularVenta`, `buscarLibrosParaVenta`), `utils/parsers.js` (`orNull`, `toNum`), `hooks/useDebouncedValue.js`.
- `components/ModalPrecioLibro.jsx`: modal (sobre `components/ui/Modal`) que muestra el título y el precio actual, pide el nuevo precio y llama a `actualizarPrecioLibro(libroId, precio)` (`libros.api.js`, `PATCH`); muestra `message` y `details` del backend con `ErrorBox`.
- Hooks de feature: `useCatalogo`, `useLibroDetalle`, `useInventarioData`, `useKardex`, `useRegistrarLibro`, `useNuevaVenta`, `useVentas`, `useVentaDetalle`, `useUsuarios`, `useLoginDosPasos`, `useSeguridad`, `useFocoCodigo`.
- `features/seguridad/codigos.js` (puro, sin React): `limpiarCodigoTotp`, `formatearCodigoRespaldo`, `totpCompleto`, `respaldoCompleto`, `agruparClave` y `textoArchivoCodigos` (usa `formatFechaVenta`). `features/seguridad/errores.js` (puro): `MENSAJE_CODIGO_INVALIDO` (copia del texto del backend) y `clasificarErrorCodigo(contexto, status, message)` → `'invalido'` | `'bloqueado'` | `'sesionTerminada'` | `'otro'`. `features/seguridad/recuperacion.js` (puro): `MENSAJE_ENLACE_INVALIDO` y `MENSAJE_MISMA_PASSWORD` (copias del texto del backend), `extraerTokenDelHash(hash)` → token o `null`, `validarPasswordNueva(password, confirmacion)` → `null` o mensaje y `clasificarErrorRestablecer(status, message)` → `'enlaceInvalido'` | `'password'` | `'limite'` | `'otro'`. `features/seguridad/navegador.js`: `copiarTexto` (nunca lanza) y `descargarTexto` (`Blob` + enlace `download`, archivo `codigos-respaldo-libreria-oskar.txt`).

#### `context/AuthContext.jsx` (`AuthProvider` y `useAuth`)
- Estado: `user` (`{ id, nombre_completo, email, rol }`), `token`, `loading`.
- Al montar, si hay token llama a `GET /api/auth/me` (`fetchSesion`); si falla, limpia el token.
- `login(email, password)` (`loginRequest` → `POST /api/auth/login`): con sesión completa guarda el token, fija `user` y resuelve `{ paso: 'sesion', usuario }`; con segundo paso resuelve `{ paso: 'verificar' | 'configurar', tokenTemporal, expiraEnSegundos }` sin guardar token ni fijar `user`. Su único consumidor es `useLoginDosPasos`.
- `establecerSesion({ token, usuario })` guarda el token y fija `user` (tras `verificar` y tras el Continuar del alta) y `logout()` limpia token y estado.

### 5.5 Guardas de Rutas y Manejo de Sesión en Cliente
- Implementadas en `ProtectedRoute.jsx`. Mientras `loading === true` muestra `LoadingSpinner`.
- Si `user === null`, redirige a `/login` con `state: { from: location }`.
- Si `roles` está definido y no incluye `user.rol`, renderiza una pantalla "Acceso denegado" (403 visual) con botón al catálogo. Los roles de ruta se evalúan mediante `puedeAcceder` de `utils/roles.js`; el rol `Usuario` conserva acceso a las rutas públicas y no ve enlaces operativos.
- `Navbar.jsx` filtra la navegación por rol y presenta un menú móvil desplegable accesible. Su configuración contempla grupos de Administración y Mi cuenta / Seguridad que permanecen ocultos mientras no tengan vistas implementadas.

### 5.6 Ajustes de experiencia móvil y controles táctiles (Tarea 1.8)
- `Input`, `Select` y `Paginacion` usan objetivos de 44 px; se amplían los botones de categoría del catálogo, filtros/paginación de inventario, acciones móviles de existencias, acciones en tarjetas administrativas, cierres de modales y botones de navegación. `ControlCantidad` ya usaba 44 px y conserva su contrato.
- `index.css` añade un indicador de foco visible global para navegación por teclado. `Modal` limita su altura al viewport y permite desplazamiento interno para formularios en pantallas bajas.
- `Navbar` muestra el menú plegado hasta 2XL para evitar que los enlaces administrativos y operativos se aprieten en tabletas y portátiles estrechas; el menú móvil desplaza su contenido si supera la altura disponible, cierra al navegar o con Escape y devuelve el foco al botón. El destino de `aria-controls` permanece montado también cuando el menú está cerrado. Los destinos continúan filtrados por los mismos roles, sin rutas duplicadas.
- Catálogo: filtros y categorías conservan su agrupación; los controles de categoría, búsqueda, limpieza y paginación cumplen el tamaño táctil. Inventario usa tarjetas de existencias hasta el breakpoint `lg` y tarjetas de Kardex hasta `xl`, dejando tablas con desplazamiento horizontal controlado para anchos mayores. Reportes conserva tarjetas en móvil y una envoltura desplazable para tablas anchas.
- Usuarios, Categorías y Gestión de libros conservan sus tarjetas móviles, separación entre acciones y confirmaciones existentes para eliminación/desactivación; se amplían controles y cierres. No cambian permisos, filtros ni lógica de negocio.
- **Revisión de Ventas (sin cambios)**: `FiltrosVentas` usa chips inferiores a 44 px; `LineasVenta` tiene botón de quitar inferior a 44 px; `TablaVentas` usa paginación de 40 px; `ModalAnularVenta` tiene cierre sin etiqueta accesible y controles pequeños. Se deja para el desarrollador propietario del módulo.
- **Revisión final**: la inspección de clases y contenedores no encontró anchos de viewport ni tablas sin un contenedor desplazable en los módulos revisados; las existencias pasan a tabla desde `lg` y Kardex/Gestión de libros desde `xl`, usando tarjetas por debajo, lo que evita forzar tablas en el rango tablet/portátil. `Paginacion` conserva sus propiedades y comportamiento, con controles táctiles de 44 px. Los estilos compartidos solo agregan foco visible global y altura mínima a controles reutilizables; no se alteraron reglas de negocio ni permisos. Se corrigió que el `id` referenciado por `aria-controls` exista también con el menú cerrado. El build completó correctamente; Vite mantiene una advertencia de chunk JS mayor a 500 kB. La revisión fue estática, no visual: siguen pendientes comprobaciones manuales a 360, 390, 430, 768, 1024 px y escritorio, incluyendo modales, confirmaciones, navegación, tablas y descarga de reportes. En ventas no se hicieron cambios; quedan pendientes de confirmar sus hallazgos con su desarrollador.

### 5.7 Configuración de Tailwind CSS y Vite
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
1. **Vista**: `Login.jsx` captura `email` y `password` y llama a `login(email, password)` del contexto.
2. **Cliente**: `AuthContext.jsx` usa `loginRequest` (`services/api/auth.api.js`, `fetch` directo) para `POST /api/auth/login`.
3. **Servidor**: `src/app.js` procesa el JSON y enruta a `src/routes/auth.routes.js`.
4. **Controlador**: `authController.login` invoca a `authService.login`.
5. **Servicio**: `authService.login` invoca `usuarioRepository.findByEmail(email)` (Sequelize, con include de `Rol`).
6. **Servicio**: Valida con `bcrypt.compare(password, usuario.password_hash)` y que el usuario esté activo. Si no corresponde segundo factor, genera el JWT con `emitirSesion` (`jwt.sign`); si corresponde, responde `paso` y `tokenTemporal` (ver §6.2).
7. **Cliente**: sin segundo paso, `AuthContext.jsx` guarda el token con `setToken` (`utils/tokenStorage.js`, clave `oskar_token`) y establece `user`; con `paso`, `useLoginDosPasos` sigue el flujo de §6.2. `Login.jsx` redirige a la ruta previa (`location.state.from`) o, por defecto, a **`/registrar`**.

### 6.2 Flujo 2: Autenticación de Dos Factores (2FA)
- **Estado en código**: backend implementado y probado por HTTP; interfaz implementada en `Login.jsx` (`useLoginDosPasos`) y `/cuenta/seguridad`, compila con `npm run frontend:build`. El flujo de la interfaz contra el backend real y con una app de autenticación no está verificado (pendiente de prueba manual).
1. **Login**: `POST /api/auth/login` valida credenciales como antes. Con 2FA activo responde `{ paso: 'verificar', tokenTemporal, expiraEnSegundos: 600 }` (scope `2fa-verify`); con `TWO_FACTOR_ENFORCED` y rol Administrador/Empleado sin 2FA responde `paso: 'configurar'` (scope `2fa-setup`). En ambos casos no hay `token` de sesión.
2. **Alta** (scope `2fa-setup`): `POST /api/auth/2fa/configurar` devuelve `qrDataUrl`, `secretoManual` y `otpauthUrl` (en el celular se puede abrir el enlace o copiar la clave). `POST /api/auth/2fa/activar { codigo }` verifica el primer código y devuelve `{ token, usuario, codigosRespaldo }`.
3. **Verificación** (scope `2fa-verify`): `POST /api/auth/2fa/verificar` con `{ codigo }` o `{ codigoRespaldo }` devuelve `{ token, usuario }` con el mismo JWT que el login normal.
4. **Con sesión completa**: `GET /api/auth/2fa/estado` y `POST /api/auth/2fa/respaldo/regenerar { codigo }`.
5. **Recuperación**: un Administrador restablece a otro usuario con `POST /api/auth/2fa/usuarios/:id/restablecer`; el administrador bloqueado usa `npm run reset-2fa -- correo` en el servidor. No hay recuperación del 2FA por correo (la recuperación de contraseña, §6.12, no desactiva el 2FA).
6. **Interfaz**: credenciales → `verificar` → `establecerSesion` → redirección; o credenciales → `configurar` (una sola llamada por token) → `activar` → códigos de respaldo en estado del flujo → "Ya los guardé" + Continuar → `establecerSesion` → redirección. El token temporal vive solo en memoria; vencido (`venceEn`) vuelve a credenciales sin llamar al backend. `/cuenta/seguridad` (enlace desde el chip del `Navbar`) muestra el estado y regenera los códigos.

### 6.3 Flujo 3: Escaneo Directo por API (`POST /api/libros/escanear`)
**El frontend no consume este endpoint** (sin coincidencias de `escanear` en `frontend/src/`); se usa solo por API y en pruebas (`tests/escanear.integration.test.js`, `tests/api.e2e.test.js`). La UI sigue el flujo consultar → ingreso o registrar (§6.4 y §6.5).
1. **Cliente**: Envía `POST /api/libros/escanear` con `{ isbn, bodegaId }` y cabecera Bearer JWT.
2. **Middlewares**:
   - `auth.authenticate`: Valida el JWT y que el usuario exista y esté activo en BD.
   - `auth.authorize('Administrador', 'Empleado')`: 403 al rol `Usuario` (401 si no hay `req.user`).
   - `validateEscanearLibro` (`middlewares/validators/libro.validators.js`): normaliza el ISBN, valida su checksum y el formato UUID de `bodegaId`. Un `usuarioId` en el body se ignora.
3. **Controlador**: `libroController.escanear` toma `usuarioId` de `req.user.id` y llama a `libroService.escanearLibro` (implementado en `services/libro/escaneo.service.js`).
4. **Servicio (fase externa)**: Valida que existan la bodega y el usuario, comprueba con `libroRepository.findByIsbn` si el libro ya existe y, si no, consulta `googleBooksService.buscarPorIsbn`.
5. **Servicio (fase transaccional)**: En `sequelize.transaction(...)`: si el libro no existía, `_upsertAutor`, `_upsertEditorial` y `libroRepository.upsert`; luego `inventarioRepository.findOrCreate` y `movimientoRepository.createMovimiento` con tipo `Ingreso` y `cantidad = 1`.
6. **Base de Datos (Trigger)**: `tg_movimientos_inventario_stock` suma 1 a `stock_actual` bajo `FOR UPDATE`.
7. **Servicio**: Relee el stock dentro de la transacción y confirma. Responde HTTP 201 (libro nuevo) o 200 (ya existía).

### 6.4 Flujo 4: Consulta por ISBN y Registro Manual de Libro
1. **Consulta (paso `consulta`)**: `PanelConsulta` (ISBN escrito o leído por `BarcodeScanner`) → `handleConsultar` en `useRegistrarLibro` → `POST /api/libros/consultar` (`libros.api.js`). No hay validación de checksum en el cliente; el backend valida el ISBN con `validateConsultarLibro`. Si `data.existe` es true, `paso = 'existe'` (ver §6.5); si no, `paso = 'noExiste'` con la `sugerencia` precargada en el formulario. Desde el backend la sugerencia trae vacío (no texto genérico) en lo que la fuente no aportó y `campos_faltantes` lista esos campos más `categoria`; el frontend lo consume: `prellenarDesdeSugerencia` (`features/registrar-libro/camposFaltantes.js`, módulo puro) devuelve los valores del formulario y `camposFaltantes` (claves de `regForm`: lo listado en `campos_faltantes` más lo que llegó vacío, y siempre `categoriaId`; si `sugerencia` es null, todos los campos que se rellenan). `useRegistrarLibro` guarda `camposFaltantes` (se vacía en `handleAgregarManual` y `reiniciar`). Al prellenar (`aplicarPrellenado`, mismo módulo) cada consulta que llega a `noExiste` reinicia `categoriaId` a `''`, `cantidad` a 1 y `stockMinimo` a 5 (`REINICIO_CONSULTA`, constante que también usa `handleAgregarManual`) y conserva `bodegaId`; así la categoría de un libro anterior no queda seleccionada.
2. **Vista (paso `noExiste`)**: `FormularioRegistro`. Con `camposFaltantes` no vacío (consulta, no registro manual) muestra el aviso "Falta completar: …" (`AvisoCamposFaltantes`, `role="status"`) con los obligatorios (Título, Autor, Categoría, Reseña) aún vacíos, resalta esos campos en ámbar mientras sigan vacíos y muestra la pista "No se encontró; es opcional." en editorial y portada vacías. El botón "Registrar Libro" se deshabilita también si faltan título o reseña y una línea bajo el botón dice qué falta (`pendientesParaGuardar`: los vacíos y, si el autor es el placeholder "Autor de Biblioteca Internacional", "Autor (nombre real)"). `validarRegistro` (`validacion.js`) revisa campos obligatorios antes de enviar.
   - `Administrador`: edita `precio`.
   - `Empleado`: ve "El administrador asignará el precio" y el hook no envía `precio`.
3. **Cliente**: `registrarLibro` (`libros.api.js`, `apiFetch`) → `POST /api/libros/registrar`.
4. **Middlewares**: `authenticate`, `authorize('Administrador', 'Empleado')`, `validateRegistrarLibro`.
5. **Controlador**: `libroController.registrar` inyecta `req.user.id` y `req.user.rol` y delega en `libroService.registrarLibro` (`services/libro/registro.service.js`).
6. **Servicio**: Si `usuarioRol !== 'Administrador'`, fuerza `precio = 0` y `precio_pendiente = true`. En una transacción: valida bodega y categoría, upsert de autor y editorial (savepoints), `libroRepository.create`, `inventarioRepository.findOrCreate` con el `stock_minimo` indicado y movimiento `Ingreso` por la cantidad inicial (`_crearMovimientoIngreso`).
7. **Base de Datos (Trigger)**: suma la cantidad inicial al inventario.
8. **Confirmación**: `ResultadoRegistro` muestra el resultado y advierte si el precio quedó pendiente.

### 6.5 Flujo 5: Ingreso de Stock a Libro Existente
1. **Vista**: `RegistrarLibro.jsx` con `paso = 'existe'`: `FichaLibroExistente` y `FormularioIngreso` (bodega y cantidad).
2. **Cliente**: `ingresarLibro` (`libros.api.js`) → `POST /api/libros/:id/ingreso`.
3. **Middlewares**: `authenticate`, `authorize('Administrador', 'Empleado')`, `validateIngresoLibro`.
4. **Controlador**: `libroController.ingreso` delega en `libroService.ingresoLibro` (`services/libro/ingreso.service.js`).
5. **Servicio**: En una transacción valida libro y bodega, asegura el inventario con `inventarioRepository.findOrCreate` e inserta el movimiento `Ingreso` con `_crearMovimientoIngreso`.
6. **Base de Datos (Trigger)**: Suma la cantidad al inventario bajo `FOR UPDATE`.
7. **Confirmación**: HTTP 201 con stock anterior y actualizado; `ResultadoIngreso` lo muestra.

### 6.6 Flujo 6: Salida de Mercancía
1. **Vista**: `Inventario.jsx` (pestaña Existencias). El botón "Salida" de `TablaExistencias` abre `ModalSalidaInventario`.
2. **Cliente**: `postSalida` (`inventario.api.js`) envía `POST /api/inventario/:id/salida` con `{ cantidad, motivo }`.
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
1. **Vista**: `Inventario.jsx` (pestaña Existencias). El botón "Ajuste" de `TablaExistencias` abre `ModalAjusteInventario`.
2. **Cliente**: `postAjuste` (`inventario.api.js`) envía `POST /api/inventario/:id/ajuste` con `{ stockNuevo, motivo }`.
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
1. **Vista**: `Catalogo.jsx` (vía `useCatalogo`) carga `GET /api/categorias` y `GET /api/libros` con `catalogo.api.js`.
2. **Backend**: `libroController.listar` → `catalogoService.listar` → `libroRepository.searchAndList` (`Libro.findAll` con joins a `Autor`, `Editorial`, `Categoria` e `Inventario`, sumando el stock de todas las bodegas con `COALESCE(SUM(stock_actual), 0)`); el servicio agrega `ref` con `buildRef`.
3. **Interacción**: `BookGrid` enlaza a `/catalogo/:ref` (`slug-shortId`).
4. **Vista Detalle**: `LibroDetalle.jsx` (vía `useLibroDetalle`) pide `GET /api/libros/:ref`.
5. **Backend**: `libroController.detalle` → `catalogoService.detalle` (`parseRef`; 400 si es inválida, 404 si no existe) → `libroRepository.findDetalleByRef`, que desglosa la disponibilidad por sucursal y bodega.
6. El catálogo y su total excluyen libros inactivos; el detalle público de uno inactivo conserva la respuesta 404. La baja lógica no borra inventarios ni ventas históricas.

### 6.9 Flujo 9: Dashboard y Resumen de Inventario
1. **Vista**: `Inventario.jsx` (vía `useInventarioData`) consulta `GET /api/inventario/resumen`, `GET /api/inventario` y `GET /api/bodegas`.
2. **Repositorio**: `inventarioRepository.getResumen` ejecuta agregaciones SQL:
   - Total unidades en almacenes (`SUM(stock_actual)`).
   - Títulos con existencias disponibles (`COUNT(DISTINCT libro_id)` donde `stock_actual > 0`).
   - Registros en bajo stock (`stock_actual <= stock_minimo`).
   - Registros agotados (`stock_actual = 0`).
   - Registros obsoletos (sin salidas en los últimos `DIAS_STOCK_OBSOLETO` días, 90 por defecto).
   - Libros sin precio asignado (`precio = 0 OR precio IS NULL`).
   - Top 10 alertas críticas de desabastecimiento ordenadas por déficit.
3. **Vista**: `ResumenKpis` renderiza las tarjetas de KPIs.

### 6.10 Flujo 10: Registro de Venta
1. **Vista**: `NuevaVenta.jsx` (`/ventas/nueva`, hook `useNuevaVenta`): busca libros con `GET /api/libros?q=`, arma las líneas y calcula subtotal, descuento y total en centavos; al recibir el 201 navega a `/ventas/:id`.
2. **Cliente**: `crearVenta` (`ventas.api.js`) envía `POST /api/ventas` con `{ bodegaId, items: [{ libroId, cantidad }], metodoPago, clienteNombre?, clienteNit?, descuento?, notas? }`.
3. **Middlewares**: `authenticate`, `authorize('Administrador', 'Empleado')`, `validateCrearVenta`.
4. **Controlador**: `ventaController.crear` delega a `ventaService.crearVenta` con `usuarioId = req.user.id` (se ignoran `usuarioId`, `precio`, `subtotal` y `total` del body).
5. **Servicio** (`services/venta/crear.service.js`), en una sola `sequelize.transaction(...)`:
   - Verifica la bodega activa (404) y lee los libros con `libroRepository.findByIds` (404 si falta alguno; 409 si algún `precio <= 0`).
   - Bloquea los inventarios de las líneas en orden de `id` (`bloquearInventariosOrdenados`) y valida el stock leído bajo el bloqueo; un libro sin inventario cuenta como stock 0. Si falta stock, `ConflictError` (409) con el título de cada libro afectado.
   - Calcula subtotal, descuento y total en centavos enteros (400 si el descuento supera el subtotal o si se excede `99999999.99`).
   - Inserta la venta (el `numero` lo asigna `ventas_numero_seq`), sus líneas con el precio como snapshot y un movimiento `Salida` por línea con `venta_id` y motivo "Venta V-xxxxxx".
6. **Base de Datos (Trigger)**: cada movimiento resta de `stock_actual`. Si algo falla, no queda nada (puede quedar un hueco en el correlativo).
7. **Confirmación**: 201 con el detalle de la venta.

### 6.11 Flujo 11: Anulación de Venta
1. **Vista**: `VentaDetalle.jsx` (`/ventas/:id`): el botón "Anular venta" (solo `Administrador` y venta `Completada`) abre `ModalAnularVenta`; al tener éxito se cierra el modal y se recarga el detalle.
2. **Cliente**: `anularVenta` (`ventas.api.js`) envía `POST /api/ventas/:id/anular` con `{ motivo }`.
3. **Middlewares**: `authenticate`, `authorize('Administrador')`, `validateAnularVenta`.
4. **Controlador**: `ventaController.anular` delega a `ventaService.anularVenta` con `usuarioId = req.user.id`.
5. **Servicio** (`services/venta/anular.service.js`), en una sola transacción:
   - Bloquea la venta con `FOR UPDATE` (404 si no existe; 409 si ya está `Anulada`, también ante dos anulaciones simultáneas).
   - Bloquea los inventarios de sus líneas en orden de `id` y registra un movimiento `Ingreso` por línea con `venta_id` y motivo "Anulación de venta V-xxxxxx: <motivo>".
   - Actualiza `estado`, `anulada_en`, `anulada_por` y `motivo_anulacion` en un solo UPDATE (cumple `ck_ventas_anulacion`).
6. **Base de Datos (Trigger)**: cada `Ingreso` suma a `stock_actual`.
7. **Confirmación**: 200 con el detalle actualizado. No hay anulación parcial, edición ni devoluciones.

### 6.12 Flujo 12: Recuperación de Contraseña por Correo
- **Estado en código**: backend probado por HTTP con el proveedor de correo `consola`; interfaz implementada (`/olvide-contrasena` y `/restablecer`, §5.2). **Dato aportado por el usuario, no verificado por el agente**: el 2026-10-24 recorrió a mano el flujo completo (enlace en el login, solicitud, apertura del enlace con el fragmento borrado de la URL, validaciones, restablecimiento y enlace ya usado) y comprobó que el enlace del correo abre desde Gmail en su celular (Xiaomi, Android). No verificados: Outlook, modo oscuro, lectores de pantalla y otros navegadores o clientes de correo; entrega real del correo desde Cloud Run y varias instancias.
1. **Solicitud**: `POST /api/auth/recuperar { email }` (público, límite 5 por 15 min por IP). Formato inválido → 400; cualquier otro caso → 200 con el mismo `{ mensaje }`.
2. **Servicio** (`recuperacionService.solicitar`): sin `FRONTEND_URL` registra `[RECUPERACION]` y responde. Busca la cuenta activa por correo sin distinguir mayúsculas; genera el token, guarda su SHA-256 con `emitirToken` (UPDATE atómico; 0 filas por enfriamiento → no envía) y lanza el envío sin esperarlo.
3. **Correo**: texto plano con saludo, enlace `{FRONTEND_URL}/restablecer#token=<43 caracteres>`, vencimiento de 30 min, "si no lo pediste, ignora este mensaje" y el contacto del administrador, más una versión HTML con el diseño de la página (encabezado con el logo circular en línea por `cid`, "Librería" y la etiqueta "Oskar"; botón "Restablecer contraseña" y el mismo enlace en texto debajo). El mensaje se construye dentro de la tarea de envío, así que un fallo al construirlo no cambia la respuesta. El aviso de cambio también lleva HTML, sin botón.
4. **Restablecimiento**: `POST /api/auth/restablecer { token, password }` (público, límite 10 por 15 min por IP). Orden: formato → política → búsqueda por hash vigente y cuenta activa → distinta de la actual → bcrypt → `consumirToken` atómico (§4.5, §4.6).
5. **Efectos**: nuevo `password_hash`, token y vencimiento en NULL y `password_cambiada_en` con el reloj de la app. El 2FA queda igual. Responde 200 `{ restablecido: true }` sin iniciar sesión y envía el correo de aviso.
6. **Sesiones anteriores**: todo JWT de sesión o temporal del 2FA con `iat` anterior o igual (en segundos) al cambio recibe 401 "La sesión ya no es válida. Inicie sesión de nuevo.". El usuario inicia sesión de nuevo con la contraseña nueva (y su 2FA si lo tiene activo).
7. **Pantallas**: en `/login`, "¿Olvidaste tu contraseña?" lleva a `/olvide-contrasena`, que llama a `/recuperar` y muestra el mensaje genérico del backend. El enlace del correo abre `/restablecer#token=…`: la vista lee el token del fragmento, lo borra de la URL y, tras validar la contraseña en el navegador, llama a `/restablecer`. Con 200 muestra "Contraseña actualizada" y un `<a href="/login">` (carga completa) que fuerza la revalidación de la sesión local; un enlace inválido, vencido o ya usado lleva a "Solicitar un enlace nuevo".

---

## 7. Infraestructura y DevOps

### 7.1 Dockerfiles
- **Backend (`app/backend/Dockerfile`)**:
  - Construcción multi-stage optimizada para producción. El contexto de build es `app/` (no `backend/`); se construye desde `app/` con `docker build -f backend/Dockerfile .`.
  - **`.dockerignore`** (`app/.dockerignore`): lista blanca; ignora todo (`*`) salvo `backend/package.json`, `backend/package-lock.json`, `backend/src` y `database/migrations`.
  - **Etapa 1 (`dependencies`)**: Base `node:22-alpine`, instala `libc6-compat`, copia `backend/package.json` y `backend/package-lock.json`, ejecuta `npm ci --omit=dev --ignore-scripts` y limpia caché npm.
  - **Etapa 2 (`runner`)**: Base `node:22-alpine`, variables `NODE_ENV=production`, `PORT=8080`. Copia `node_modules` desde la etapa 1, `backend/package.json`, `backend/src/` (a `./src/`) y `database/migrations/` (a `./database/migrations/`), y define `ENV MIGRATIONS_DIR=/usr/src/app/database/migrations`, la variable que `src/database/migrate.js` lee en lugar de su ruta por defecto. Así un Job de Cloud Run con la misma imagen puede ejecutar `node src/database/migrate.js` y `node src/database/seed.js`. `schema.sql` y `package-lock.json` no entran a la imagen final (la BD nueva se inicializa aparte con `psql`).
  - **Seguridad**: Ejecuta bajo usuario no privilegiado `USER node`.
  - **Healthcheck**: Sondeo cada 30s al endpoint `/api/health` mediante `node -e fetch(...)`.
  - **Puerto expuesto**: `8080` (estándar de Cloud Run). Comando de inicio: `CMD ["node", "src/server.js"]`.
- **Frontend Dockerfile**: No existe en el repositorio.

### 7.2 Docker Compose (`app/docker-compose.yml`)
- **Versión**: `3.8` (campo obsoleto en Compose v2, ver §9).
- **Servicios declarados**:
  1. `db`: Imagen `postgres:15-alpine`. Expone puerto host `5434:5432`. Base `libreria_oskar`. Monta `./database/schema.sql` en `/docker-entrypoint-initdb.d/01_schema.sql` para inicialización automática. Volumen `pgdata`.
  2. `db-test`: Imagen `postgres:15-alpine`. Expone puerto host `5435:5432`. Perfil `["test"]`. Base `libreria_oskar_test`. Volumen `pgdata_test`.
  3. `backend`: Construye con `context: .` (`app/`) y `dockerfile: backend/Dockerfile`. Expone puerto host `3000:8080`. Variables: `NODE_ENV=production`, `DB_HOST=db`, `DB_PORT=5432`, `PORT=8080`, `JWT_SECRET` (con valor por defecto de desarrollo), `TWO_FACTOR_ENFORCED` (por defecto `false`), `TWO_FACTOR_ENCRYPTION_KEY` (clave falsa de desarrollo por defecto) `CORS_ORIGINS` (por defecto `http://localhost:5173,http://localhost:4173`; se sobreescribe desde la terminal) y `FRONTEND_URL` (por defecto `http://localhost:5173`; base de los enlaces de recuperación de contraseña). Como `NODE_ENV=production` exige `CORS_ORIGINS`, sin ella el backend no arranca (`security.config.js`). No define `TRUST_PROXY` ni `LOGIN_RATE_*`. Espera estado saludable de `db`.
- **Servicio Frontend en Compose**: No existe declarado en `docker-compose.yml`; el frontend corre en el host con `npm run frontend:dev` (proxy de `/api` a `localhost:3000`).
- **Arranque y cierre del backend**: `server.js` espera la BD con `esperarBaseDatos()` (reintentos en producción, ver §4.2) antes de escuchar y, ante `SIGINT`/`SIGTERM`, cierra el servidor HTTP y luego `sequelize.close()` (ver §4.2).

### 7.3 Workflows CI/CD (`app/.github/workflows/deploy.yml`)
- **Estado**: ese workflow construye la imagen con contexto `backend` (`--file backend/Dockerfile backend`), por lo que quedará obsoleto frente al Dockerfile actual (contexto `app/`) al rehacerlo. El archivo está en `app/.github/workflows/deploy.yml`, pero GitHub solo ejecuta workflows ubicados en `.github/workflows` en la raíz del repositorio, por lo que hoy NO se ejecuta. Además sus rutas (`backend/`, `database/`) suponen que `app/` es la raíz. Su funcionamiento no está verificado y será rehecho. Lo que sigue describe el contenido del archivo, no un comportamiento comprobado.
- **Disparadores declarados**: `push` a la rama `main` o ejecución manual `workflow_dispatch` (sin efecto mientras el archivo siga en esa ubicación).
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
| Administrar libros (listar, editar, activar/desactivar) | `GET /api/libros/admin`, `PUT /api/libros/:id`, `PATCH /api/libros/:id/activo` | Denegado (401) | Denegado (403) | Permitido | Denegado (403) |
| Listar bodegas y categorías | `GET /api/bodegas`, `GET /api/categorias` | Permitido | Permitido | Permitido | Permitido |
| Healthcheck | `GET /api/health` | Permitido | Permitido | Permitido | Permitido |
| Ver Sedes y Nosotros | Vista `/nosotros` | Permitido | Permitido | Permitido | Permitido |
| Iniciar Sesión | `POST /api/auth/login` | Permitido | Permitido | Permitido | Permitido |
| Consultar Perfil | `GET /api/auth/me` | Denegado (401) | Permitido | Permitido | Permitido |
| Solicitar enlace de recuperación de contraseña | `POST /api/auth/recuperar` | Permitido (5 por 15 min por IP) | Permitido | Permitido | Permitido (misma respuesta; solo cuentas activas reciben correo) |
| Restablecer contraseña con enlace | `POST /api/auth/restablecer` | Permitido con token válido (10 por 15 min por IP) | Permitido | Permitido | Permitido |
| Administrar Usuarios | `GET/POST/PUT/PATCH /api/usuarios...` | Denegado (401) | Denegado (403) | Permitido | Denegado (403) |
| Alta y verificación 2FA | `POST /api/auth/2fa/configurar`, `/activar`, `/verificar` | Solo con el token temporal del scope correspondiente (401 sin él) | Permitido | Permitido | Permitido (solo `verificar` si lo tiene activo; nunca se le exige alta) |
| Estado 2FA y regenerar respaldo | `GET /api/auth/2fa/estado`, `POST /api/auth/2fa/respaldo/regenerar` | Denegado (401) | Permitido | Permitido | Permitido |
| Restablecer 2FA de otro usuario | `POST /api/auth/2fa/usuarios/:id/restablecer` | Denegado (401) | Denegado (403) | Permitido (no a sí mismo: 403) | Denegado (403) |
| Escanear ISBN Directo | `POST /api/libros/escanear` | Denegado (401) | Permitido | Permitido | Denegado (403) |
| Consultar ISBN Previo | `POST /api/libros/consultar` | Denegado (401) | Permitido | Permitido | Denegado (403) |
| Ingreso Stock Existente | `POST /api/libros/:id/ingreso`| Denegado (401) | Permitido | Permitido | Denegado (403) |
| Registro Manual de Libro | `POST /api/libros/registrar` | Denegado (401) | Permitido (Precio = 0) | Permitido (Define Precio) | Denegado (403) |
| Fijar Precio de Libro | `PATCH /api/libros/:id/precio` | Denegado (401) | Denegado (403) | Permitido | Denegado (403) |
| Ver Dashboard / Resumen | `GET /api/inventario/resumen` | Denegado (401) | Permitido | Permitido | Denegado (403) |
| Listar Existencias | `GET /api/inventario` | Denegado (401) | Permitido | Permitido | Denegado (403) |
| Registrar Salida Stock | `POST /api/inventario/:id/salida`| Denegado (401) | Permitido | Permitido | Denegado (403) |
| Registrar Ajuste Stock | `POST /api/inventario/:id/ajuste`| Denegado (401) | Permitido | Permitido | Denegado (403) |
| Consultar Kardex | `GET /api/movimientos` | Denegado (401) | Permitido | Permitido | Denegado (403) |
| Registrar Venta | `POST /api/ventas` | Denegado (401) | Permitido | Permitido | Denegado (403) |
| Listar y Consultar Ventas | `GET /api/ventas`, `GET /api/ventas/:id` | Denegado (401) | Permitido (todas las ventas) | Permitido | Denegado (403) |
| Anular Venta | `POST /api/ventas/:id/anular` | Denegado (401) | Denegado (403) | Permitido | Denegado (403) |

### 8.2 Diferencias con lo Declarado en AGENTS.md
1. **Rol Usuario**: `AGENTS.md` lo describe como existente en BD y sin acceso a nada protegido. Así es en el backend (403 en endpoints protegidos). En el frontend, el menú ofrece solo las rutas públicas a este rol y `ProtectedRoute` mantiene el 403 visual ante acceso directo. No existe endpoint de autorregistro.
2. **Escaneo por ISBN (`POST /api/libros/escanear`)**: La ruta exige `authenticate` + `authorize('Administrador', 'Empleado')`; el rol `Usuario` recibe 403 y sin token se responde 401. El frontend no lo consume.
3. **Gestión administrativa de usuarios**: implementada en backend y en la ruta protegida `/usuarios`; solo Administrador. La gestión de categorías sigue en el roadmap separado.
4. **"El Empleado ve precios"**: AGENTS.md dice que el Empleado ve precios pero no los fija. En el código, el Empleado ve el precio en el Catálogo y el Detalle públicos, pero NO en la ficha del libro existente de `RegistrarLibro` (`FichaLibroExistente.jsx` la condiciona a `esAdmin`). Inventario no muestra precios.
5. **Administración de libros**: backend y pantalla `/libros/gestion` implementados. `GET /api/libros/admin`, `PUT /api/libros/:id` y `PATCH /api/libros/:id/activo` requieren Administrador. `PATCH /api/libros/:id/precio` se conserva como flujo separado. Inactivos se excluyen del catálogo y de ventas/ingresos, pero permanecen en inventario e historial; no se borran físicamente. Prueba manual de roles, formularios y navegación adaptable pendiente.

### 8.3 Ocultamiento de Precios al Empleado (Comportamiento Exacto)
- **En Backend (`POST /api/libros/registrar`)**: `libroService.registrarLibro` (`services/libro/registro.service.js`) evalúa `esAdmin = (usuarioRol === 'Administrador')`. Si el usuario no es Administrador, ignora cualquier `precio` enviado, fuerza `precio = 0` y devuelve `"precio_pendiente": true`.
- **En Backend (`POST /api/libros/consultar`)**: La sugerencia de un libro inexistente omite el precio recuperado de Google Books para evitar fijaciones no autorizadas; su forma es `{ isbn, titulo, autor, editorial, resena, imagen_url, fuente, campos_faltantes }` (sin precio).
- **En Frontend (`RegistrarLibro`)**:
  - Paso `existe`: `FichaLibroExistente.jsx` muestra `Precio: Q 12.50` o `Precio por confirmar` (`formatPrecio`) solo si `esAdmin`, con un botón "Fijar precio" ("Cambiar precio" si el precio es > 0) que abre `ModalPrecioLibro`.
  - Paso `noExiste`: `FormularioRegistro.jsx` muestra el `<Input>` de precio al Administrador; al Empleado le muestra "El administrador asignará el precio", y `useRegistrarLibro` solo incluye `precio` en el cuerpo si `esAdmin`.
- **En Catálogo Público y Detalle**: el precio no se oculta a nadie. `formatPrecio` (`utils/formatters.js`) muestra `Q 12.50` (con espacio) si es mayor que 0, o "Precio por confirmar" si es 0.

---

## 9. Deuda Técnica Observada

Cada ítem cita su archivo como evidencia. Resueltos y retirados de esta sección: duplicación de validación de ISBN/UUID (ahora `utils/isbn.js` y `utils/uuid.js`), componentes de vista monolíticos, handlers inline de `routes/index.js` y el JSON mal formado que respondía 500 (ahora 400 en `middlewares/errorHandler.js`, cubierto por `tests/apiSecurity.test.js`).

| Ítem / Problema | Archivo afectado | Evidencia en código |
|---|---|---|
| **Cliente `pg` en pruebas** | `backend/src/config/db.js`; 7 pruebas (`api.e2e`, `escanear.integration`, `inventarioRepository`, `inventarioService`, `libroRepository`, `libroServiceSequelize`, `movimientoRepository`) | La app ya no usa `pg` directo; solo estas pruebas importan `config/db`. Se retira en fase 2 junto con esas pruebas (el archivo lo indica en su cabecera). |
| **Chequeo muerto de `connectionString`** | `backend/src/run-tests.js` | `env.js` fuerza `connectionString: undefined` si `NODE_ENV=test`, así que `env.db.connectionString` en la guardia nunca es verdadero. |
| **Duplicación en el escaneo** | `backend/src/services/libro/escaneo.service.js` | `escanearLibro` valida bodega y usuario antes y dentro de la transacción, y repite el bloque de tipo `Ingreso` en lugar de reutilizar `_crearMovimientoIngreso` (`movimientoIngreso.service.js`). |
| **`escanearLibro` guarda el relleno** | `backend/src/services/libro/escaneo.service.js`, `backend/src/services/googleBooks.service.js` | `POST /api/libros/escanear` persiste lo que devuelve `buscarPorIsbn`, incluidos los textos por defecto ("Título sin especificar", "Autor de Biblioteca Internacional", "Editorial Desconocida", reseña autogenerada); no usa `relleno`, solo `consultarLibro` lo aprovecha. |
| **Marcador de autor triplicado** | `backend/src/middlewares/validators/libro.validators.js` (`AUTOR_PLACEHOLDER_VALIDATOR`), `backend/src/services/googleBooks.service.js` (`AUTOR_PLACEHOLDER`), `frontend/src/features/registrar-libro/validacion.js` | La misma cadena `'Autor de Biblioteca Internacional'` definida en tres lugares. |
| **Bloques repetidos en los modales de Inventario** | `frontend/src/features/inventario/components/ModalSalidaInventario.jsx`, `ModalAjusteInventario.jsx` | Repiten el bloque de error y la ficha del libro. |
| **Filtros duplicados en Catálogo** | `frontend/src/features/catalogo/components/PanelFiltros.jsx`, `DrawerFiltros.jsx` | Ambos repiten el cálculo de `ramasDerecho` y `otrasCateg`. |
| **`validateListarMovimientos` lanza TypeError** | `backend/src/middlewares/validators/movimiento.validators.js` | Con `?tipo[]=x` llama `tipo.toLowerCase()` sobre un arreglo y lanza `TypeError` (500) en vez de `ValidationError`. Fijado en `tests/validatorsCaracterizacion.test.js`. |
| **`UUID_REGEX.test` convierte a string** | `backend/src/utils/uuid.js` | `esUuid(valor)` es `UUID_REGEX.test(valor)`, que convierte a string: por razonamiento sobre el código, un arreglo con un solo UUID pasaría. `tests/utilsIsbnUuid.test.js` cubre números y objetos, pero no ese caso de arreglo (no verificado por prueba). |
| **`normalizarIsbn(0)` y `normalizarIsbnEstricto` con números** | `backend/src/utils/isbn.js` | `normalizarIsbn(0)` devuelve `''`; `normalizarIsbnEstricto` lanza `TypeError` con números. Fijado en `tests/utilsIsbnUuid.test.js`. |
| **Ausencia de tests en Frontend** | `frontend/` | No hay pruebas ni Vitest/Jest/Testing Library en `frontend/package.json`. Se verifica con `npm run frontend:build` y prueba manual. |
| **Bundle grande sin code splitting** | `frontend/vite.config.js` | `npm run frontend:build` (2026-10-24) genera `index-*.js` de 801.99 kB (~802 kB; 220.41 kB gzip) con el aviso de más de 500 kB de Vite; sin `manualChunks` ni carga diferida de vistas. Aparte, `zxing_reader-*.wasm` (946.86 kB) es el lector de respaldo del escáner. |
| **Limitador de login por IP, en memoria y para toda petición** | `backend/src/middlewares/rateLimit.js`, `backend/src/config/security.config.js`, `backend/src/routes/auth.routes.js` | Cubre `POST /api/auth/login` (la recuperación tiene instancias propias, ver la fila de recuperación). Cuenta por `req.ip` en un `Map` del proceso y suma TODAS las peticiones antes de `next()`, también las exitosas (10 por 15 min por defecto: `LOGIN_RATE_LIMIT`, `LOGIN_RATE_WINDOW_MS`). `TRUST_PROXY` vale 0 por defecto, así que detrás de un proxy de la nube `req.ip` sería la del proxy y todos los usuarios compartirían el contador. Con varias réplicas cada una cuenta por separado. Las pruebas 2FA lo reinician antes de cada login con `loginRateLimit.reset()` (`tests/helpers/dosFactores.js`). |
| **`version` obsoleta en Compose** | `docker-compose.yml` | Declara `version: '3.8'`, campo obsoleto en Docker Compose v2. |
| **Monorepo sin `workspaces`** | `package.json` | Usa scripts con `--prefix`; no declara `"workspaces"`. |
| **Sin Dockerfile de frontend** | `frontend/` | Solo existe `backend/Dockerfile`; el frontend corre en el host con `npm run frontend:dev`. |
| **Escáner de cámara (visor 1:1 y mensaje debajo pendientes de prueba manual)** | `frontend/src/components/BarcodeScanner.jsx` | Se corrigieron formatos, resolución, zona de escaneo y reinicios de cámara por dependencias inestables. Después, la geometría del visor: el marco ya no recorta el recuadro con video vertical, el recorte analizado se agranda con un ancho lógico de 800 px y el apagado usa `getState()`. Después, retroalimentación durante el escaneo: texto por fase (iniciando, buscando, ayuda tras 8 s), vibración corta al leer y diagnóstico técnico oculto tras un botón y solo en desarrollo. Se añadió un lector de respaldo (`barcode-detector` 3.2.3 con `zxing-wasm`) que se carga solo si el navegador no trae `BarcodeDetector`, para laptops con Chromium/Firefox; con `BarcodeDetector` nativo el comportamiento no cambia. El comportamiento previo se verificó a mano el 2026-10-22 en un celular (Chrome, detector nativo) y en una laptop (lector de respaldo WASM). Después, `BarcodeScanner.jsx` se dividió sin cambiar comportamiento en tres hooks (`useCamaraEscaner`, `useGeometriaEscaner`, `useDiagnosticoEscaner`) y dos utilidades (`geometriaEscaner`, `errorCamara`); se eliminó la variable de módulo `lastQrbox`. El usuario verificó a mano el 2026-10-23 que, tras esa división en hooks, el escáner lee en un celular y en una laptop (dato aportado por el usuario, no verificado por el agente). Después, el alto visible máximo del visor pasó de 4:3 a 1:1 (`MAX_VISIBLE_RATIO` 0.75 → 1; el `qrbox` no cambia) y el texto de estado pasó de superponerse al visor a mostrarse debajo de él; ambos cambios están pendientes de prueba manual (aspecto real, tamaño en el celular, recuadro entero, que la cámara no se reinicie). |
| **Reintentos de correo solo en memoria** | `backend/src/services/mail/fabrica.service.js` | Los reintentos pendientes viven en memoria y se pierden si el proceso se apaga; no hay cola persistente. En Cloud Run podrían pausarse sin peticiones activas (no verificado). El envío SMTP real y el puerto 587 desde Cloud Run tampoco se han verificado. |
| **2FA: JWT emitidos no se revocan** | `backend/src/middlewares/auth.js` | Tras un restablecimiento (o al activar el 2FA) los JWT de sesión ya emitidos siguen válidos hasta 8 h (`JWT_EXPIRES_IN`, `8h` por defecto en `config/env.js`); no hay lista de revocación. Solo el restablecimiento de contraseña por correo los invalida (`password_cambiada_en`, §4.6). |
| **2FA: restablecimiento sin confirmación** | `backend/src/services/dosFactores.service.js` | El Administrador no puede restablecerse a sí mismo (usa `npm run reset-2fa`) y el restablecimiento de otro usuario no le pide su propio código TOTP. |
| **2FA: alta solo en el login** | `backend/src/config/twoFactor.config.js`, `frontend/src/features/seguridad/` | El alta solo ocurre en el login cuando `TWO_FACTOR_ENFORCED` está encendido (en producción por defecto; Compose lo fija en `false`); con la bandera apagada nadie puede activarla desde la interfaz. Quien conozca la contraseña de un usuario sin alta puede dar de alta su propio autenticador. Recargar la página durante el segundo paso vuelve a las credenciales (el token temporal solo vive en memoria). |
| **2FA: sin gestión en la interfaz de usuarios** | `backend/src/repositories/usuario.repository.js` (`findActivosConRol`, `findConRol`), `frontend/src/features/usuarios/` | El listado de `GET /api/usuarios` no expone `dos_factores_activo` y la vista `/usuarios` no tiene botón de restablecer: el frontend no llama a `POST /api/auth/2fa/usuarios/:id/restablecer` (solo API o `npm run reset-2fa`). |
| **2FA: sin límite por IP ni rotación de clave** | `backend/src/services/dosFactores/` | El contador es por usuario; `/2fa/*` no tiene límite por IP propio (el limitador por IP solo cubre `POST /api/auth/login`). Por ser por usuario, quien conozca la contraseña (obtiene el token temporal de `verificar`) puede bloquear a ese usuario 15 minutos enviando 5 códigos erróneos. La reserva atómica (`reservarIntento`) acota también los intentos concurrentes a 5 por ventana de bloqueo con una instancia; con varias instancias del backend debería valer igual porque la serialización la hace PostgreSQL, pero no está verificado. El prefijo `v1` permite rotar `TWO_FACTOR_ENCRYPTION_KEY`, pero no hay procedimiento de rotación: cambiar la clave invalida todos los secretos y códigos de respaldo. |
| **2FA: índice redundante y alfabeto de 31 símbolos** | `database/migrations/010_dos_factores.sql`, `backend/src/services/dosFactores/respaldo.js` | `idx_codigos_respaldo_2fa_usuario_id` duplica el prefijo del UNIQUE (`usuario_id`, `codigo_hash`). El alfabeto sin 0/O/1/I/L tiene 31 símbolos (no 32): cada código tiene ≈49,5 bits. |
| **2FA: no verificado** | — | Compatibilidad con apps TOTP reales, Node 22 en el contenedor (las pruebas corrieron con Node 24.18.0), varias instancias del backend, equivalencia `pg_dump` de `schema.sql` frente a BD anterior + 010 e interfaz: flujo contra el backend real, app de autenticación real, enlace `otpauth://` en un celular, copiado en HTTP por IP, descarga del `.txt`, aspecto y lectores de pantalla (solo se verificó que compila). |
| **Recuperación de contraseña: límites conocidos** | `backend/src/services/recuperacion.service.js`, `backend/src/middlewares/rateLimitRecuperacion.js`, `backend/src/utils/sesionVigente.js` | (1) Tiempo de respuesta: el correo no se espera, pero si la cuenta existe y está activa hay un UPDATE extra, una diferencia pequeña y medible. (2) Relojes: `password_cambiada_en` usa el reloj de la app y el vencimiento del enlace el de la BD; con varias instancias desfasadas, un JWT emitido por una instancia atrasada justo después del cambio podría rechazarse (o uno anterior aceptarse) por el desfase. (3) Estricto: un JWT emitido en el mismo segundo del cambio se rechaza (falla cerrada). (4) Sin límite por cuenta: los límites son solo por IP, en memoria (por proceso; se pierden al reiniciar y cada réplica cuenta por separado) y con `TRUST_PROXY=0` detrás de un proxy todos compartirían el contador; el único freno por cuenta es el enfriamiento de 2 min. (5) Entrega real por Gmail/Cloud Run no verificada; sin `FRONTEND_URL` en producción no se envía nada. (6) No existe cambio de contraseña con sesión iniciada ni script de emergencia para fijarla. (7) Interfaz: `clasificarErrorRestablecer` distingue el enlace terminal por el texto exacto del backend (si cambia, se tratará como error de contraseña y el usuario reintentará); recargar `/restablecer` pierde el token por diseño (el fragmento se borra de la URL; el enlace del correo sigue vigente hasta usarse o vencer); si el navegador tiene sesión local de esa cuenta, tras el éxito la navegación completa a `/login` la revalida con `/api/auth/me`; la interfaz no limita por cuenta, y tras un 429 el formulario sigue usable. Sin prueba automática de estas pantallas. Prueba manual: dato aportado por el usuario, no verificado por el agente (2026-10-24: flujo completo, ver §6.12); sin verificar en otros navegadores, lectores de pantalla ni modo oscuro. |
| **Correos HTML y logo en línea sin verificar en clientes reales** | `backend/src/services/mail/plantillas.js`, `backend/src/services/mail/logo.js`, `backend/src/assets/logo-correo.png` | El HTML solo se revisó en Chromium sin cabeza con la vista previa local (`npm run correo:vista-previa`), donde el logo va como `data:`. El usuario lo verificó a mano el 2026-10-24 en Gmail (logo circular y en línea, enlace con la IP de la red y correo de aviso) y que el enlace abre desde Gmail en su celular (Xiaomi, Android); dato aportado por el usuario, no verificado por el agente. No verificados: Outlook, otros clientes de correo y navegadores, lectores de pantalla, modo oscuro (se declara `color-scheme: light`, pero cada cliente decide), en Outlook, que el logo se muestre en línea sin aparecer como adjunto ni bloqueado, y la entrega por SMTP desde un entorno desplegado. El PNG (144×144, 8 782 bytes, paleta de 128 colores, esquinas con alfa 0) se generó a mano desde `frontend/src/assets/logo.jpg` con Pillow: recorte del disco (centro 193.6, 188.9; radio 193 px, con una franja superior de 8 px rellena replicando la fila del borde), máscara circular con borde suave de 1 px y cuantización con libimagequant; si cambia `logo.jpg` no se actualiza solo. |
| **Placeholder del modal de salida desactualizado** | `frontend/src/features/inventario/components/ModalSalidaInventario.jsx` | El placeholder del motivo sugiere "Venta en mostrador" aunque ahora existe el módulo de ventas (que registra sus propias salidas). |

---

## 10. Funcionalidad Incompleta o Ausente (respecto a AGENTS.md)

1. **Autenticación de Dos Factores (2FA)**:
   - AGENTS.md la da por implementada en «Seguridad»; diseño de referencia en `app/docs/roadmap/auth-2fa/`.
   - **Estado real**: backend implementado (alta con QR, verificación TOTP y de respaldo, anti-reutilización, bloqueo, restablecimiento y script `reset-2fa`; ver §4.6 y §6.2). Interfaz implementada (login en dos pasos, alta con QR y códigos de respaldo, `/cuenta/seguridad`), pendiente de prueba manual; sin botón de restablecer. El 2FA no se recupera por correo: se restablece por `POST /api/auth/2fa/usuarios/:id/restablecer` (Administrador, otro usuario) o con `npm run reset-2fa`, y ese restablecimiento no invalida los JWT ya emitidos (siguen válidos hasta que expiren; `dosFactores.repository.js#restablecer` no escribe `password_cambiada_en`). Lo que sí invalida los JWT anteriores (de sesión y temporales del 2FA) es restablecer la contraseña por correo (§6.12); no hay lista de revocación.
2. **Notificaciones por Correo de Desabastecimiento y Libros Sin Precio**:
   - Roadmap; spec en `app/docs/roadmap/inventory-email-alerts/`.
   - **Estado real**: Existe el módulo de correo `services/mail/` (`mail.service.js`, dependencia `nodemailer`); hoy solo lo consume la recuperación de contraseña (`recuperacion.service.js`). La plantilla HTML base (`services/mail/plantillas.js`) y el logo en línea (`services/mail/logo.js`) quedan disponibles para reutilizarlos. Las alertas de inventario siguen sin implementar y no hay tareas programadas.
3. **CRUD Administrativo de Catálogo y Empleados**:
   - Diseño en `app/docs/roadmap/catalog-employee-crud/` (su cabecera ya dice "IMPLEMENTADO", verificado el 2026-10-24). Los CRUD de usuarios/categorías están integrados; la gestión administrativa de libros también cuenta con backend y vista protegida.
   - **Estado real**: El CRUD administrativo de usuarios está disponible en `GET/POST/PUT/PATCH /api/usuarios` y la vista protegida `/usuarios`. La gestión de libros está disponible en `/libros/gestion`, respaldada por `GET /api/libros/admin`, `PUT /api/libros/:id` y `PATCH /api/libros/:id/activo`; el precio conserva su endpoint independiente `PATCH /api/libros/:id/precio`.
4. **Ventas**:
   - Diseño en `app/docs/roadmap/ventas/SPEC.md`.
   - **Estado real**: Esquema, API e interfaz implementados; los reportes de ventas viven en el módulo de reportes (`/api/reportes`, solo Administrador). La venta de libros inactivos se rechaza con 409 antes de persistir. Ambos roles operativos siguen viendo todas las ventas.
5. **Validación de Sesión en el Lector Móvil**:
   - `BarcodeScanner.jsx` no valida permisos de rol; depende de la vista contenedora y del guardián de ruta.

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
  - Vistas y componentes en PascalCase (`Catalogo.jsx`, `BarcodeScanner.jsx`); hooks `useNombre.js`; módulos HTTP `dominio.api.js` en `services/api/`; carpetas de feature en kebab-case (`registrar-libro`).
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
- **`app/AGENTS.md`**: guía concisa que se carga en cada sesión. Describe la estructura real (14 modelos), los roles, las reglas de persistencia e inventario, el 2FA como implementado en «Seguridad» (política y puntero a §4.6), da por implementados el CRUD admin de usuarios y categorías, la edición/baja de libros, ventas y reportes, y deja solo las alertas de inventario por correo como "Roadmap (NO implementado)" (`app/docs/roadmap/`).
- **7 skills activas (`app/.agents/skills/`)**: `backend-engineer-nodejs`, `backend-testing`, `database-architect`, `devops-gcp-automation`, `frontend-engineer-react`, `inventory-transactions`, `sequelize-orm`. Las skills de funciones no implementadas viven como especificaciones en `app/docs/roadmap/`; `auth-2fa` sigue allí como referencia de diseño ya implementada.
- **Carga en Claude Code**: Claude Code lee `AGENTS.md` mediante un `CLAUDE.md` local que contiene `@AGENTS.md`, y las skills mediante un symlink `.claude/skills`. Esa configuración es local y no está versionada (`CLAUDE.md` y `.claude/` aparecen como no rastreados en `git status`).

### 12.3 Catálogo de Archivos de Documentación

| Archivo | Propósito en una línea | Estado y Alineación |
|---|---|---|
| `README.md` (raíz del repo) | Qué es el sistema, cómo arrancarlo y roles. | Reescrito; remite a esta especificación. |
| `documentacion/estructura-paqueteria.md` | Capas y carpetas del backend y del frontend. | Reescrito; sin conteos de líneas. |
| `app/AGENTS.md` | Reglas de arquitectura y comportamiento para agentes. | Alineado con la estructura actual (14 modelos; 2FA implementado). |
| `app/backend/README.md` | Puesta en marcha y mapa del backend. | Reescrito; remite a esta especificación. `migrate`, `correo:probar` y `reset-2fa` se corren con `npm --prefix backend run ...` desde `app/`. |
| `app/frontend/README.md` | Puesta en marcha y mapa del frontend. | Reescrito; remite a esta especificación. |
| `app/.github/DEPLOYMENT_GUIDE.md` | Manual de despliegue en Google Cloud. | No revisado en esta actualización (fuera de alcance); el despliegue está planeado, no ejecutado. |
| `app/docs/PROJECT_SPECS.md` | Fuente de verdad técnica. | Verificada contra el código el 2026-10-22; §2.1, §2.2, §4.9 y §9 reverificados por script el 2026-10-24. |
| `app/docs/roadmap/auth-2fa/SKILL.md` | Spec de 2FA TOTP. | Implementado (cabecera verificada el 2026-10-24, remite a §4.6); el punto 6 recoge la política real y una sección anota las diferencias con lo planeado. |
| `app/docs/roadmap/catalog-employee-crud/SKILL.md` | Spec de CRUD de catálogo y empleados. | Implementado (CRUD de usuarios y categorías; edición/baja de libros aparte, también implementada). La cabecera se actualizó el 2026-10-24 y anota las diferencias entre el diseño y el código. |
| `app/docs/roadmap/inventory-email-alerts/SKILL.md` | Spec de alertas de inventario por correo. | No implementado. |
| `app/docs/roadmap/ventas/SPEC.md` | Documento de diseño del módulo de ventas. | Esquema, API e interfaz creados; reportes en un módulo aparte. Incluye las secciones "API implementada (backend)" e "Interfaz implementada". |
| `app/.agents/skills/*/SKILL.md` (7) | Directrices por dominio de ingeniería. | Revisadas el 2026-10-22; correcciones puntuales donde contradecían la estructura real (2FA implementado en `backend-engineer-nodejs` y `frontend-engineer-react`, 2026-10-24). |
