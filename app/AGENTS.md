# Librería Oskar — Instrucciones de desarrollo compartidas

> Documento de trabajo para todo el equipo, independientemente de si usa Codex CLI, agy CLI u otro asistente. Las instrucciones de este archivo prevalecen sobre indicaciones antiguas de fase 2 que entren en conflicto. Antes de aplicar una skill, comprobar su compatibilidad con la arquitectura actual.

## 1. Contexto y alcance

- Aplicación web de **catálogo informativo e inventario interno de libros**; no implementar carrito, reservas o pagos sin requerimiento explícito.
- Estructura del repositorio: `frontend/`, `backend/`, `database/`, `docker-compose.yml` (usar las rutas reales verificadas en el repositorio; no asumir que existe un directorio adicional `src/` en la raíz).
- Frontend: React 18, Vite, Tailwind CSS, JavaScript/JSX, `lucide-react` y `html5-qrcode`. Mantener diseño mobile-first, interfaz en español y componentes reutilizables (`Navbar`, `BookCard`, `Toast`, `BarcodeScanner`, `LoadingSpinner`, cuando existan).
- Backend: Node.js/Express (CommonJS), con separación `routes → controllers → services → repositories → models` y configuración en `backend/src/config/`.
- Base de datos: PostgreSQL, UUID, esquema y scripts en `database/`; Sequelize 6 como ORM principal. `pg` sigue presente **temporalmente** donde aún no se ha migrado.
- Preservar contratos HTTP y formatos de respuesta existentes (por ejemplo `{ status: 'success', data }` donde aplique). Verificar el código antes de dar por hecho que un endpoint o campo existe.
- Roles de autenticación actuales: **Administrador** y **Empleado**, según la configuración real del sistema. El catálogo público puede ser visitado sin iniciar sesión. No inventar un rol autenticado `Usuario` sin validar el esquema y los requisitos.
- Registro bibliográfico mediante ISBN, lector de cámara y entrada manual; integraciones existentes con Google Books y fuentes alternativas.

## 2. Alcance de la fase 3

Trabajar únicamente en la funcionalidad solicitada. Entre los objetivos planificados están:

- Completar la migración de consultas directas de `pg` a Sequelize ORM.
- CRUD administrativo de catálogo y empleados.
- Autenticación de dos factores (2FA).
- Notificaciones por correo de desabastecimiento y libros sin precio.
- Mantener y verificar infraestructura, pruebas y despliegue existentes cuando la tarea lo requiera.

No asumir que una funcionalidad está terminada solo porque existe un modelo, una pantalla o una configuración: confirmar el flujo extremo a extremo y sus pruebas.

## 3. Reglas de arquitectura y persistencia

- PostgreSQL y su esquema vigente son la **fuente de verdad** para nombres de tablas, columnas, UUID, claves foráneas, valores por defecto y restricciones.
- En código nuevo, preferir métodos de Sequelize (`findOne`, `findAll`, `create`, `update`, asociaciones, agregaciones). Migrar el SQL heredado de forma incremental.
- No usar `sequelize.query()` como sustitución silenciosa de una consulta ORM; justificar y documentar cualquier excepción para reportes analíticos complejos.
- No ejecutar `sequelize.sync()` ni `sync({ force: true })`, `sync({ alter: true })`, ni modificar esquema, migraciones o triggers sin autorización explícita.
- Conservar contratos de repositorios y servicios: nombres públicos, valores nulos, tipos de datos, alias, ordenamientos y estructura JSON. Sequelize devuelve instancias; convertirlas a objetos planos cuando corresponda.
- Mantener una sola transacción para cada operación de negocio atómica. Pasar el mismo objeto `{ transaction }` a **todas** las operaciones ORM involucradas.
- Mientras un servicio use un cliente de `pg`, mantener sus operaciones en **esa misma conexión**. Nunca mezclar operaciones de `pg` y Sequelize suponiendo que comparten transacción.
- Los adaptadores de compatibilidad con `pg` solo se retirarán después de migrar los servicios dependientes y superar pruebas de regresión.

## 4. Integridad de inventarios

- El único responsable de actualizar `inventarios.stock_actual` tras ingresos, salidas o ajustes es el trigger PostgreSQL `tg_movimientos_inventario_stock`, asociado a `fn_actualizar_stock_por_movimiento`.
- El backend registra un movimiento; **no incrementa, decrementa ni ajusta directamente** `stock_actual`. Se permite inicializarlo en `0` al crear un inventario.
- Preservar `UNIQUE (libro_id, bodega_id)` y las validaciones de existencias; no aceptar stock negativo.
- Conservar bloqueos pesimistas (`SELECT ... FOR UPDATE` o `lock: transaction.LOCK.UPDATE` dentro de una transacción) cuando sean necesarios para operaciones concurrentes.
- Bajo stock: respetar la comparación de `stock_actual` con `stock_minimo` implementada en el sistema.
- Stock muerto: respetar la lógica basada en la última **salida** del inventario, o su fecha de creación si no tuvo salidas, y el período configurable (90 días por defecto según la implementación previa).
- No cambiar cálculos de alertas, orden de prioridad o formatos de reportes sin requerimiento explícito.

## 5. Seguridad y autenticación

- Usar bcrypt para **hash y verificación** de contraseñas; no denominarlo cifrado reversible.
- Preservar autenticación JWT y RBAC existentes. Verificar permisos también en el backend, no solo en React.
- Mantener secretos 2FA, tokens de recuperación, hashes y credenciales fuera de las respuestas HTTP y de los logs.
- No imprimir, copiar a respuestas ni versionar valores de `.env`, claves privadas o secretos de producción. Si es indispensable verificar una variable, comprobar su presencia sin exponer su valor.
- Implementar 2FA únicamente cuando esa tarea sea solicitada; no introducir cambios de autenticación durante una migración de repositorios.

## 6. Desarrollo colaborativo y Git

Distintos integrantes trabajan con **Codex CLI, agy CLI u otras herramientas**. Este documento describe reglas comunes, pero cada agente debe comprobar que realmente lo está leyendo. Si una herramienta no reconoce `AGENTS.md` o skills automáticamente, proporcionar sus rutas explícitamente en el prompt.

- **Cada integrante trabaja en su propia rama de funcionalidad.** No imponer `feature/sequelize-orm` a otros: es una rama de ejemplo para quien esté migrando Sequelize, no una regla global.
- Antes de modificar archivos, revisar `git branch --show-current`, `git status --short`, diferencias relevantes y archivos sin seguimiento.
- No cambiar de rama, hacer `commit`, `push`, `merge`, `rebase`, `reset`, `clean`, `stash` o `checkout` forzado sin autorización explícita.
- No editar `main` directamente. Integrar preferentemente mediante Pull Requests, con revisión y pruebas.
- No sobrescribir ni descartar cambios previos, especialmente cuando provienen de otro integrante o asistente.
- Si una tarea requiere modificar archivos compartidos (`database/schema.sql`, migraciones, `backend/src/models/`, configuración, servicios comunes, rutas, `package.json`, `docker-compose.yml`, workflows, este `AGENTS.md` o `.agents/skills/`), advertir sobre posibles conflictos y coordinar antes de cambios incompatibles.
- Mantener cambios pequeños, revisables y acotados. No reescribir código funcional ni crear endpoints duplicados.
- Un conflicto de Git se resuelve comparando ambas implementaciones; nunca borrando automáticamente una rama o el trabajo de otra persona.

## 7. Pruebas, calidad y datos de desarrollo

- Leer solo los archivos necesarios para la tarea, pero ampliar la revisión cuando las dependencias o la seguridad lo requieran.
- Ejecutar primero pruebas específicas de lo modificado y después pruebas de regresión apropiadas; para backend, usar `npm test` desde `backend/` cuando corresponda.
- Las pruebas de integración pueden ejecutar seeds y modificar registros: **confirmar que apuntan a una base aislada de pruebas** y que limpian los datos creados. Nunca ejecutarlas contra producción o una base compartida sin autorización.
- `libros.isbn` está definido como `VARCHAR(20)` en el esquema examinado: los fixtures deben respetar ese límite; usar ISBN-13 válido cuando la prueba requiera validez bibliográfica. No ampliar columnas para corregir datos de prueba inválidos.
- En operaciones críticas, cubrir transacciones/rollback, inserción del movimiento y ejecución del trigger, concurrencia, stocks no negativos y ausencia de duplicados.
- No afirmar que todas las pruebas pasan si alguna falla, que un despliegue está activo porque existe un workflow, ni prometer tiempos de respuesta sin medición.
- No instalar dependencias o ejecutar migraciones fuera del alcance sin justificarlo y, para acciones riesgosas, obtener autorización.

## 8. Perfiles y skills disponibles

Skills especializadas ubicadas en `.agents/skills/<nombre>/SKILL.md`. Leer **solo las relevantes** para la tarea y verificar que sus instrucciones no contradigan este archivo:

| Skill | Uso principal |
|---|---|
| `database-architect` | Esquema PostgreSQL, integridad, índices y triggers. |
| `backend-engineer-nodejs` | Express, arquitectura por capas y servicios. |
| `frontend-engineer-react` | React, componentes y experiencia de usuario. |
| `devops-gcp-automation` | Docker, GitHub Actions y Google Cloud. |
| `sequelize-orm` | Modelos, repositorios y migración ORM. |
| `inventory-transactions` | Stock, triggers, transacciones y concurrencia. |
| `backend-testing` | Pruebas, regresiones y fallos. |
| `catalog-employee-crud` | Administración de catálogo y empleados. |
| `auth-2fa` | Segundo factor, recuperación y seguridad. |
| `inventory-email-alerts` | Avisos por correo de bajo stock y libros sin precio. |

No asumir que todas las skills están instaladas: verificar su presencia en el repositorio. No editar skills compartidas sin autorización.

## 9. Comunicación, autonomía y uso de tokens

- Antes de una tarea compleja, indicar brevemente alcance, archivos previstos y riesgos; preguntar solo cuando exista una decisión relevante que no pueda resolverse de forma segura.
- Si hay trabajo local sin confirmar, describirlo y preservarlo. No usarlo como excusa para eliminar o sobrescribir archivos.
- Si se pidió **solo analizar**, no modificar código. Si se autorizó implementar, avanzar dentro del alcance acordado, ejecutar verificaciones seguras y reportar resultados, sin pedir autorización de nuevo por cada cambio menor.
- Evitar exploraciones indiscriminadas, dependencias innecesarias y respuestas extensas sin información útil.
- Cerrar con un reporte breve: archivos modificados, comportamiento conservado, pruebas ejecutadas (aprobadas/fallidas) y riesgos o pendientes.
