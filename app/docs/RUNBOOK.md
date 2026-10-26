# Runbook de despliegue y operación — Librería Oskar

## 1. Qué es este documento y cómo leerlo

Este documento explica cómo está publicado el sistema en Google Cloud y cómo hacer las tareas de mantenimiento (publicar una versión nueva, volver atrás, respaldar, rotar claves, revisar errores). Está escrito para personas sin experiencia en la nube: cada término técnico se explica la primera vez que aparece.

- **Google Cloud**: la plataforma de Google donde corre el sistema. El proyecto se llama `libreria-oskar-seminario` y la región (el centro de datos) es `us-central1`.
- **`gcloud`**: el programa de línea de comandos para manejar Google Cloud.
- **Cloud Shell**: una terminal que Google ofrece dentro del navegador, con `gcloud`, `git` y `node` ya instalados. Usa `bash`.
- **Laptop (zsh)**: la terminal de la computadora personal.

**Dónde se pega cada comando.** Cada bloque de comandos empieza con una línea que dice **Cloud Shell (bash)** o **Laptop (zsh)**. Pégalo solo ahí. Los despliegues los hace hoy **GitHub Actions** de forma automática en cada push a `main` (sección 12); Cloud Shell queda para el despliegue manual de contingencia (sección 4), la operación diaria y Terraform. El repositorio está clonado en `~/oskar` (rama `develop`) y la carpeta de trabajo es `~/oskar/app`.

**Marcas de estado.** Cada procedimiento lleva una de estas marcas (el detalle está en la sección 11):

- **Ejecutado en producción**: se hizo de verdad en este sistema y funcionó.
- **No probado**: está escrito a partir de la documentación oficial o de memoria, pero nunca se ejecutó aquí. Pruébalo con cuidado y avisa si algo difiere.
- **POR VERIFICAR / POR PROBAR**: el comando o un detalle no está confirmado; no lo ejecutes a ciegas.

**Reglas de seguridad.** Nunca pegues contraseñas, llaves ni códigos de autorización en un chat, correo o commit. Este documento no contiene valores secretos, solo nombres.

---

## 2. Arquitectura y diagrama de despliegue

En palabras simples: el navegador entra a **Firebase Hosting**, que entrega las páginas del sitio (la SPA, una aplicación web de una sola página) y reenvía todo lo que empieza con `/api/` al servicio **Cloud Run**, que ejecuta el backend (Node.js + Express). El backend guarda los datos en **Cloud SQL** (PostgreSQL administrado por Google) y lee sus claves de **Secret Manager**.

```mermaid
flowchart LR
    NAV["Navegador (usuario)"]
    HOST["Firebase Hosting<br/>sitio libreria-oskar<br/>regla: /api/** va a Cloud Run<br/>el resto sirve la SPA"]
    RUN["Cloud Run servicio<br/>libreria-oskar-api<br/>min 0 / max 1 instancia"]
    JOB["Cloud Run Job<br/>oskar-migrar<br/>migraciones y seed"]
    ALERTS["Cloud Run Job<br/>oskar-alertas-inventario<br/>reporte diario"]
    SCHED["Cloud Scheduler<br/>07:00 America/Guatemala"]
    SQL[("Cloud SQL<br/>oskar-db PostgreSQL 15")]
    SEC["Secret Manager<br/>db-password, jwt-secret,<br/>two-factor-key, mail-password,<br/>admin-password"]
    AR["Artifact Registry<br/>oskar/api (imagen Docker)"]
    CB["Cloud Build<br/>construye la imagen<br/>(solo despliegue manual)"]
    MAIL["Gmail SMTP<br/>puerto 587"]
    DEV["Cloud Shell / desarrollador<br/>~/oskar/app<br/>contingencia y Terraform"]
    GH["GitHub Actions<br/>workflow Despliegue<br/>push a main (camino normal)"]

    NAV -->|"HTTPS"| HOST
    HOST -->|"reescritura /api/**"| RUN
    RUN -->|"socket /cloudsql/..."| SQL
    JOB -->|"socket /cloudsql/..."| SQL
    ALERTS -->|"socket /cloudsql/..."| SQL
    SCHED -->|"ejecuta el Job"| ALERTS
    RUN -.->|"lee al arrancar"| SEC
    JOB -.->|"lee al arrancar"| SEC
    RUN -->|"correos de recuperación"| MAIL
    ALERTS -->|"correos de stock mínimo"| MAIL
    GH -->|"docker push"| AR
    GH -->|"run jobs update y execute"| JOB
    GH -->|"run services update --image"| RUN
    GH -->|"firebase deploy (frontend)"| HOST
    DEV -->|"gcloud builds submit"| CB
    CB -->|"publica la imagen"| AR
    DEV -->|"run services update --image"| RUN
    DEV -->|"run jobs update y execute"| JOB
    DEV -->|"firebase deploy (frontend)"| HOST
    AR -.->|"misma imagen"| RUN
    AR -.->|"misma imagen"| JOB
```

### Cómo leer el diagrama

- **Línea sólida**: una comunicación o una acción (alguien llama o publica algo). **Línea punteada**: algo que se lee al arrancar o que "usa la misma imagen".
- **"socket /cloudsql/..."** no es una conexión por Internet. Es como un buzón dentro de la propia casa: Cloud Run coloca dentro del contenedor un archivo especial (un *socket*) en la ruta `/cloudsql/NOMBRE_DE_CONEXIÓN`, y la aplicación lo usa como dirección de la base de datos (variable `DB_HOST`) en lugar de una IP.
- El nombre de conexión tiene la forma `proyecto:región:instancia`; aquí es `libreria-oskar-seminario:us-central1:oskar-db` (`infra/cloud_run.tf:8`).
- Dónde se configura: el volumen de Cloud SQL `cloudsql` montado en `/cloudsql`, en el servicio (`infra/cloud_run.tf:114-117, 121-126`) y en el Job (`infra/cloud_run.tf:194-205`), y `DB_HOST = /cloudsql/...` en el entorno común de ambos (`infra/cloud_run.tf:12`).
- La instancia no tiene redes autorizadas: nadie entra a la base por una IP. Según la documentación de Google, el socket aparece en `/cloudsql/INSTANCE_CONNECTION_NAME` y, en instancias con IP pública, la conexión va cifrada mediante el Cloud SQL Auth Proxy (https://docs.cloud.google.com/run/docs/configuring/connect-cloudsql).

Versión en imagen del mismo diagrama, para documentos Word o PDF: [diagrama-despliegue.png](diagramas/diagrama-despliegue.png). El Mermaid de arriba es la fuente: si cambia, hay que regenerar la imagen.

Las flechas que salen de GitHub Actions son el camino normal: el workflow "Despliegue" (`.github/workflows/deploy.yml` en la raíz del repositorio) las ejecuta solo en cada push a `main` (sección 12). Las que salen de Cloud Shell son el mismo proceso hecho a mano, para contingencias (sección 4). Las flechas punteadas son lecturas o relaciones, no acciones.

### Tabla de recursos

| Recurso | Nombre | Para qué sirve |
|---|---|---|
| Proyecto | `libreria-oskar-seminario` | Contenedor de todo lo demás. Región `us-central1`. |
| Cloud Run servicio | `libreria-oskar-api` | Ejecuta el backend. Cuenta de servicio `oskar-api` (la identidad con la que el servicio pide permisos). `--min-instances 0 --max-instances 1`. Se conecta a la BD por el socket `/cloudsql/libreria-oskar-seminario:us-central1:oskar-db`. |
| Cloud Run Job | `oskar-migrar` | Misma imagen que el servicio. Ejecuta `node src/database/migrate.js && node src/database/seed.js`. Lo actualiza y lo ejecuta el CD en cada despliegue, antes de tocar el servicio; también se puede lanzar a mano. |
| Cloud Run Job | `oskar-alertas-inventario` | Declarado en Terraform, pendiente de aplicar. Misma imagen, ejecuta `node src/scripts/enviar-alertas-inventario.js`; sin endpoints HTTP. |
| Cloud Scheduler | `oskar-alertas-inventario-diario` (nombre sugerido) | Pendiente de crear por Alejandro. Frecuencia: 07:00, zona `America/Guatemala`. |
| Cloud SQL | `oskar-db` | PostgreSQL 15, máquina `db-f1-micro`, base `libreria_oskar`, usuario `oskar_app`. Respaldo automático diario (ventana de 4 h desde las 08:00 UTC), se conservan 7. |
| Secret Manager | `db-password`, `jwt-secret`, `two-factor-key`, `mail-password`, `admin-password` | Guarda las claves; ver sección 3. |
| Artifact Registry | `us-central1-docker.pkg.dev/libreria-oskar-seminario/oskar/api` | Almacén de imágenes. La etiqueta (tag) son los 7 primeros caracteres del commit (`.github/workflows/deploy.yml:53-54`). La vigente cambia con cada despliegue: cómo consultarla en la sección 12.2. |
| Cloud Build | (servicio de Google) | Construye la imagen desde `~/oskar/app` en Cloud Shell, solo en el despliegue manual. El CD construye con Docker dentro de GitHub Actions (`deploy.yml:57-62`). |
| Firebase Hosting | sitio `libreria-oskar` (https://libreria-oskar.web.app) | Sirve el frontend y reenvía `/api/**` al servicio. |
| Correo | Gmail SMTP, puerto 587 | Contraseña de aplicación (clave especial de Google para programas). La cuenta remitente es también el Administrador central. |
| GitHub Actions | `.github/workflows/ci.yml` y `.github/workflows/deploy.yml` (raíz del repo) | `ci.yml`: pruebas y builds en cada push a cualquier rama. `deploy.yml` ("Despliegue"): en cada push a `main` (o a mano) corre el CI y despliega backend y frontend (sección 12). |
| Workload Identity Federation | pool `github`, proveedor `github-oskar` | Deja que GitHub Actions entre a Google Cloud **sin llaves** guardadas. Solo acepta tokens de este repositorio en `refs/heads/main` (`infra/identidad_github.tf:20`). |
| Cuenta de servicio de despliegue | `oskar-deployer` | La identidad del CD. Roles: Cloud Run Developer, Firebase Hosting Admin, Service Usage Consumer (`infra/permisos.tf:16-18`), Artifact Registry Writer solo sobre el repositorio `oskar` (`permisos.tf:51-56`) y Service Account User sobre `oskar-api` (`permisos.tf:68-72`). |
| Terraform | carpeta `infra/` (estado en el bucket `libreria-oskar-seminario-tfstate`) | Describe la infraestructura como código. Se corre a mano desde Cloud Shell; el CD no lo ejecuta (sección 12.3). |

**Por qué solo una instancia.** El limitador de intentos de login guarda sus contadores en la memoria de cada proceso (`backend/src/middlewares/rateLimit.js:8`). Con varias instancias, cada una contaría por separado; con `--max-instances 1` el conteo es consistente. Con `--min-instances 0` el servicio se apaga si nadie lo usa y la primera visita tarda unos segundos más ("arranque en frío").

**Verificado en el código**

- La carpeta del frontend publicada es `frontend/dist`; el sitio es `libreria-oskar`; `/api/**` se reescribe hacia el servicio `libreria-oskar-api` en `us-central1`, y todo lo demás cae en `/index.html`: `firebase.json:3-4, 8-12, 14-17`.
- El proxy: `app.set('trust proxy', env.trustProxy)` en `backend/src/app.js:15`; `TRUST_PROXY` (por defecto 0) y `LOGIN_RATE_LIMIT` (por defecto 10) se leen en `backend/src/config/security.config.js:33-34`. En producción están puestos a `TRUST_PROXY=1` y `LOGIN_RATE_LIMIT=100` de forma **provisional** (decididos mirando `X-Forwarded-For`).

---

## 3. Variables y secretos

Una **variable de entorno** es un valor que el programa lee al arrancar. Un **secreto** es una variable sensible guardada en Secret Manager; Cloud Run la entrega al programa como variable de entorno. Esta tabla no contiene valores.

### Secretos (Secret Manager)

| Secreto | Variable | Servicio | Job | Qué pasa si falta |
|---|---|---|---|---|
| `db-password` | `DB_PASSWORD` | sí | sí | **No hay error claro de configuración**: el código usa una contraseña por defecto (`backend/src/config/env.js:49`) y la conexión a PostgreSQL falla por credenciales (código `28P01`, tratado como fatal, sin reintentos: `backend/src/database/esperarBaseDatos.js:23`). `/api/health` responde 503 y el Job termina con error. |
| `jwt-secret` | `JWT_SECRET` | sí | `oskar-migrar` sí; alertas no | API y Job de migraciones lo requieren. El Job de alertas usa el perfil batch y no carga JWT. |
| `two-factor-key` | `TWO_FACTOR_ENCRYPTION_KEY` | sí | `oskar-migrar` sí; alertas no | API y Job de migraciones lo requieren. No es necesario para alertas. |
| `mail-password` | `MAIL_PASSWORD` | sí | sí | Gmail SMTP para recuperación y reportes. El Job de alertas registra fallos del transporte. |
| `admin-password` | `SEED_ADMIN_PASSWORD` | no | sí | Solo la usa el Job, y solo si el Administrador central **aún no existe**: sin ella (o si no cumple la política de contraseñas) `seed.js` falla (`backend/src/database/seed.js:35-38`). |

> **Entornos de Jobs separados.** `oskar-migrar` conserva su entorno común y variables del seed. `oskar-alertas-inventario` usa `APP_PROCESS_MODE=alertas-inventario`, `DB_*`, `MAIL_USER`, `DB_PASSWORD` y `MAIL_PASSWORD`; no recibe JWT, llave 2FA, CORS ni secretos del seed. `config/env.js` omite validaciones HTTP solo en el perfil batch; `server.js` lo rechaza.

> **Nota: el entorno lo manda Terraform.** Las variables y secretos del servicio y del Job están declarados en `infra/cloud_run.tf`. Un cambio hecho a mano (consola o `gcloud ... --update-env-vars`) aparecerá como diferencia en el siguiente `terraform plan`, y un `apply` lo revertiría (`infra/README.md`, "Relación con el despliegue continuo"). Cambia el `.tf` y aplícalo (sección 12.3).

### Variables solo del Job (siembra del Administrador central)

| Variable | Origen | Qué pasa si falta |
|---|---|---|
| `SEED_ADMIN_EMAIL` | Variable no secreta del Job | **Obligatoria en producción**: sin ella `seed.js` falla antes de tocar nada (`backend/src/database/seed.js:13-14`); debe ser un correo válido (`seed.js:15-17`). |
| `SEED_ADMIN_PASSWORD` | Secreto `admin-password` (solo el Job) | Solo se usa si el Administrador central aún no existe; sin ella, o si no cumple la política de contraseñas, `seed.js` falla (`seed.js:35-38`). Si el administrador ya existe no se lee y nunca se modifica (`seed.js:21-22, 54-61`). |

### Variables no secretas (se ven en la configuración del servicio)

| Variable | Origen | Qué pasa si falta |
|---|---|---|
| `NODE_ENV=production` y `PORT=8080` | Dockerfile (`backend/Dockerfile:35-36`) | Vienen en la imagen. |
| `MIGRATIONS_DIR` | Dockerfile (`backend/Dockerfile:48`) | Viene en la imagen; apunta a `/usr/src/app/database/migrations`. |
| `DB_HOST`, `DB_NAME`, `DB_USER`, `DB_PORT` | Configuración del servicio y del Job | `DB_HOST` es el socket de Cloud SQL. Si faltan se usan valores locales (`localhost`, `libreria_oskar`, `postgres`, 5432) y la conexión falla (`backend/src/config/env.js:46-50`). |
| `CORS_ORIGINS` | Configuración del servicio **y del Job** (`infra/cloud_run.tf:16`) | En producción el proceso **no arranca** sin ella (`backend/src/config/security.config.js:17`). Como el Job carga la misma configuración, también la necesita. |
| `FRONTEND_URL` | Configuración del servicio y del Job (`infra/cloud_run.tf:17`) | Solo aviso: sin ella la recuperación de contraseña no envía enlaces (`backend/src/config/recuperacion.config.js:34`, `env.js:36-39`). |
| `MAIL_USER` (y opcionalmente `MAIL_FROM`, `MAIL_HOST`, `MAIL_PORT`) | `MAIL_USER`: configuración del servicio y del Job (`infra/cloud_run.tf:18`); los opcionales no están definidos | Sin `MAIL_USER` los correos fallan (`mail.config.js:41`). Por defecto `smtp.gmail.com` y 587 (`mail.config.js:5-6`). |
| `SEED_EMPLEADO_PASSWORD` | Opcional (Job) | Si falta, en producción solo se avisa y no se crea el empleado de ejemplo (`seed.js:164-165`). |
| `TRUST_PROXY`, `LOGIN_RATE_LIMIT` | Configuración del servicio y del Job (`infra/cloud_run.tf:19-20`) | Provisionales: `1` y `100`. Sin ellas: 0 y 10 (`security.config.js:33-34`); con 0 el limitador vería la IP del proxy de Google y todos los usuarios compartirían el mismo contador. |
| `TWO_FACTOR_ENFORCED` | Opcional | Por defecto está **activo** en producción: el segundo factor es obligatorio para Administrador y Empleado (`twoFactor.config.js:25`). |
| `DB_CONNECT_MAX_WAIT_MS` | Opcional | Por defecto, en producción, el servidor y los scripts reintentan conectar hasta 120 000 ms (`backend/src/database/esperarBaseDatos.js:17, 26-28`). |
| `APP_PROCESS_MODE` | Terraform del Job de alertas | `alertas-inventario`; omite configuración exclusiva del servidor, sin cambiar los requisitos de la API. |

El Job consulta `usuarios` activos con rol `Administrador`, valida cada correo y envía un mensaje individual. Usa el transporte existente (`MAIL_HOST`, `MAIL_PORT`, `MAIL_USER`, `MAIL_PASSWORD`, `MAIL_FROM`); por defecto SMTP es `smtp.gmail.com:587`. No requiere credenciales nuevas.

**Dónde ver los nombres de los secretos** (sin valores):

Cloud Shell (bash)
```bash
gcloud secrets list --format="value(name)"
```
Marca: **Ejecutado en producción**.

---

## 4. Desplegar una versión nueva

Orden obligatorio: **1) construir la imagen → 2) actualizar el Job y correr migraciones → 3) actualizar el servicio → 4) frontend → 5) prueba de humo.** Las migraciones van antes que el servicio para que el código nuevo nunca encuentre una base de datos vieja.

**Camino principal: el despliegue continuo (CD).** Basta con llevar el cambio a `main` (push o merge acordado): GitHub Actions corre el CI y, si pasa, hace los cinco pasos en ese mismo orden, backend y frontend siempre, sin intervención (sección 12). Marca: **Ejecutado en producción** (primera corrida con el commit `a29735a`, sección 12.1).

**Despliegue manual (contingencia).** Las subsecciones 4.1 a 4.5 son el mismo proceso hecho a mano desde Cloud Shell. Úsalas solo si GitHub Actions no está disponible o si una corrida del CD falló y hay que terminarla a mano. No las mezcles con una corrida del CD en curso.

### 4.1 Preparar y construir la imagen

Una **imagen** es un paquete con el programa y todo lo que necesita para correr. Se construye con **Cloud Build** y queda guardada en Artifact Registry. El tag es el hash corto del commit, así cada imagen se puede ubicar y recuperar.

Cloud Shell (bash)
```bash
cd ~/oskar/app
git pull
TAG=$(git rev-parse --short HEAD)
IMG=us-central1-docker.pkg.dev/libreria-oskar-seminario/oskar/api:$TAG
echo "Imagen a construir: $IMG"
```

El archivo de configuración de Cloud Build vive en `/tmp`, que se puede perder al reiniciar Cloud Shell; **se regenera cada vez**. Este contenido está **reconstruido** (no se conserva una copia en el repositorio): un solo paso con el constructor de Docker de Cloud Build.

Cloud Shell (bash)
```bash
cat > /tmp/cloudbuild.yaml <<EOF
steps:
  - name: gcr.io/cloud-builders/docker
    args: ['build', '-f', 'backend/Dockerfile', '-t', '$IMG', '.']
images:
  - '$IMG'
EOF
gcloud builds submit --config=/tmp/cloudbuild.yaml .
```

Marca: **Ejecutado en producción** (el comando `gcloud builds submit`; el YAML es reconstruido).

Si tu cuenta tiene solo el rol **Viewer** no verás los registros en vivo del build. En ese caso copia el ID del build que imprime `gcloud` y espera así hasta que diga `SUCCESS`:

Cloud Shell (bash)
```bash
gcloud builds describe ID --format='value(status)'
```
Marca: **Ejecutado en producción**.

**Qué entra en la imagen.** El Dockerfile copia todo `backend/src/` (`backend/Dockerfile:43`) y la lista blanca de `app/.dockerignore` deja pasar `backend/src` completo (`.dockerignore:7`), por lo que **`src/scripts/` sí está en la imagen** (incluye `reset-2fa.js`). También copia las migraciones (`Dockerfile:47`; `.dockerignore:9`). `database/schema.sql` **no** va en la imagen (comentario en `Dockerfile:45-46`).

### 4.2 Actualizar el Job y ejecutar las migraciones

Cloud Shell (bash)
```bash
gcloud run jobs update oskar-migrar --region us-central1 --image $IMG
gcloud run jobs execute oskar-migrar --region us-central1 --wait
```
Marca: **Ejecutado en producción** (los dos comandos los corre el CD en cada despliegue, `deploy.yml:76-80`; en la primera corrida el Job quedó con la imagen `:a29735a`). Si el Job termina con error, **no sigas**: revisa la sección 9 (logs) y la sección 6.

El workflow también actualiza la imagen del Job `oskar-alertas-inventario`, pero no lo ejecuta. Si todavía no existe, consulta su lista y omite ese paso con una advertencia; los errores de autenticación o de `gcloud` siguen deteniendo el despliegue. Para el primer despliegue, Alejandro debe revisar y aplicar Terraform para crear Job y cuenta de servicio, y luego volver a ejecutar el workflow para que el Job use la imagen con el script actual. Después puede configurar Cloud Scheduler. Terraform no crea Scheduler.

### 4.3 Actualizar el servicio

Cloud Shell (bash)
```bash
gcloud run services update libreria-oskar-api --region us-central1 --image $IMG
```
Marca: **Ejecutado en producción** (lo corre el CD, `deploy.yml:82-84`; la primera corrida creó la revisión `libreria-oskar-api-00003-6kw` con la imagen `:a29735a`). Cada actualización crea una **revisión** (una versión inmutable del servicio) y le manda el 100 % del tráfico, salvo que antes se haya movido el tráfico a mano (ver advertencia en la sección 5). El CD, además, ejecuta siempre `update-traffic --to-latest` después de actualizar (`deploy.yml:87-88`).

Para ver las revisiones:

Cloud Shell (bash)
```bash
gcloud run revisions list --service libreria-oskar-api --region us-central1
```
Marca: **No probado**.

### 4.4 Publicar el frontend

A mano solo hace falta si cambió algo en `frontend/` (el CD lo publica siempre). Firebase Hosting es el servicio que sirve las páginas. El CD publica con el mismo `firebase-tools deploy` usando la cuenta `oskar-deployer` (`deploy.yml:144-148`), así que no necesita el inicio de sesión de abajo.

Primera vez (o si caducó la sesión), iniciar sesión en Firebase:

Cloud Shell (bash)
```bash
npx firebase-tools login --no-localhost
```
Imprime un enlace; ábrelo en el navegador, acepta y pega el **código de autorización** en la terminal. **Ese código nunca se comparte con nadie.** Si pide credenciales de `gcloud`:

Cloud Shell (bash)
```bash
gcloud auth login
```

Construir y publicar:

Cloud Shell (bash)
```bash
cd ~/oskar/app
git pull && npm ci --prefix frontend && npm run frontend:build && npx firebase-tools deploy --only hosting --project libreria-oskar-seminario
```
Marca: **Ejecutado en producción**. El sitio publicado es `libreria-oskar` (`firebase.json:3`); las páginas llevan `Cache-Control: no-cache` y solo `/assets/**` se cachea un año (`firebase.json:20-29`).

### 4.5 Prueba de humo

Una **prueba de humo** es una comprobación rápida de que lo esencial funciona. Se puede pegar en cualquiera de las dos terminales:

Laptop (zsh) o Cloud Shell (bash)
```bash
curl -s https://libreria-oskar.web.app/api/health
```
Debe responder con `"status":"healthy"` y `"connected":true` (HTTP 200, `backend/src/controllers/health.controller.js:12-13`). Si la base de datos no responde, el estado es `degraded` con HTTP 503 (`health.controller.js:23-24`). La primera llamada tras un rato sin uso puede tardar unos segundos (arranque en frío). Después abre https://libreria-oskar.web.app e inicia sesión.

Marca: **Ejecutado en producción** (comprobación de salud). El CD hace esta misma comprobación dos veces: contra la URL directa de Cloud Run al terminar el backend (`deploy.yml:91-96`) y contra el sitio al terminar el frontend (`deploy.yml:151-155`).

---

## 5. Volver atrás

### 5.1 Backend (Cloud Run)

**Automático (CD).** El job `backend` guarda el nombre de la revisión vigente antes de cambiar nada (`deploy.yml:67-72`). Si algún paso falla **después** de actualizar el servicio (por ejemplo, la prueba de humo), devuelve el 100 % del tráfico a esa revisión con `update-traffic --to-revisions` (`deploy.yml:98-103`) y el job queda marcado como fallido; el frontend no se publica porque depende del backend (`deploy.yml:109`). Si el fallo ocurre antes (imagen o migraciones), el servicio no se tocó y no hay nada que revertir. Marca: **No probado** (la única corrida verificada fue exitosa; el paso nunca se ha visto dispararse). Limitación: guarda `latestReadyRevisionName`, que no es la revisión que servía si el tráfico estaba fijado a mano a otra (`deploy.yml:64-66`).

**Manual.** Volver atrás es mover el 100 % del tráfico a una revisión anterior. Primero lista las revisiones (sección 4.3) y elige el nombre de la que funcionaba.

Cloud Shell (bash)
```bash
gcloud run services update-traffic libreria-oskar-api --region us-central1 --to-revisions REVISION=100
```
Marca: **No probado**.

> **ADVERTENCIA — el reparto de tráfico se queda fijo.** Después de mover el tráfico a una revisión anterior (a mano o por el rollback automático), los despliegues **manuales** siguientes **mantienen ese reparto**: una imagen nueva quedará creada pero sin recibir tráfico. El CD sí lo corrige, porque ejecuta `--to-latest` en cada despliegue (`deploy.yml:87-88`): el siguiente push a `main` vuelve a mandar el tráfico a lo más nuevo. Para hacerlo a mano:
>
> Cloud Shell (bash)
> ```bash
> gcloud run services update-traffic libreria-oskar-api --region us-central1 --to-latest
> ```
> Marca: **Ejecutado en producción** (lo corre el CD en cada despliegue).

> **ADVERTENCIA — las migraciones NO se revierten.** El sistema no tiene migraciones "hacia atrás" (`backend/src/database/migrate.js:43-65` solo aplica archivos nuevos). Si la versión nueva ya cambió la base de datos (columnas o tablas nuevas) y vuelves a código viejo, el código viejo corre contra un esquema más nuevo: normalmente sigue funcionando si los cambios solo agregaron cosas, pero puede fallar si se renombró o eliminó algo. Antes de volver atrás tras una migración, haz un respaldo a demanda (sección 7) y revisa qué cambió el archivo SQL nuevo. Esto vale también para el rollback automático: el CD corre las migraciones antes del servicio y no las deshace.

### 5.2 Frontend (Firebase Hosting)

**El CD no vuelve atrás el frontend.** Si falla el job `frontend` (por ejemplo, la prueba de humo del sitio), el backend nuevo ya quedó publicado y el sitio queda con lo último que se haya alcanzado a publicar; el rollback de Hosting se hace a mano (`deploy.yml:105-106`).

Firebase guarda el historial de versiones publicadas. Por la consola web: https://console.firebase.google.com → proyecto → **Hosting** → historial de versiones del sitio `libreria-oskar` → menú de la versión anterior → **"Roll back"**. Marca: **No probado**.

Por línea de comandos: `POR VERIFICAR` (no hay un comando confirmado en este documento).

Alternativa segura y probada: volver el repositorio al commit anterior en `~/oskar/app` y repetir la sección 4.4. Otra opción es llevar a `main` un commit que revierta el cambio: el CD vuelve a desplegar todo, backend incluido (**No probado**).

---

## 6. Migraciones

Una **migración** es un archivo SQL que cambia la estructura de la base de datos (crear tablas, agregar columnas). Viven en `database/migrations/` (hoy: `002`, `003`, `004`, `010`, `011`).

**Cómo funcionan** (`backend/src/database/migrate.js`):

1. Crean, si no existe, la tabla `schema_migrations` con el nombre de cada archivo ya aplicado (`migrate.js:17-22`).
2. Leen la carpeta indicada por la variable `MIGRATIONS_DIR` (en la imagen es `/usr/src/app/database/migrations`; si no está definida, usan una ruta relativa al código, `migrate.js:12-14`).
3. Ordenan los archivos `.sql` por nombre (`migrate.js:37-40`) y se saltan los ya aplicados (`migrate.js:44-47`).
4. Cada migración pendiente corre en **su propia transacción** junto con su registro en `schema_migrations`: si falla, ese archivo no queda aplicado a medias (`migrate.js:52-61`) y el proceso termina con error (`migrate.js:62-65, 77`).
5. Ejecutarlo dos veces es seguro (idempotente).

Después de migrar, el Job corre `seed.js`, que es el sembrado de datos básicos (roles, sucursal, bodega, tipos de movimiento y el Administrador central). **En producción `seed.js` crea al Administrador central solo si no existe y nunca modifica uno existente** (`seed.js:21-22, 32-52, 54-61`).

**Cómo agregar una migración nueva**

1. Pide autorización para cambiar el esquema (regla del proyecto) y respeta el reparto de números: `005-009` el otro desarrollador, `010-019` seguridad.
2. Crea `database/migrations/NNN_descripcion.sql`; el orden es alfabético, así que el número manda.
3. Refleja el cambio también en `database/schema.sql` y en los modelos.
4. Prueba en la base aislada de pruebas (`npm test` desde `app/`, con `db-test` arriba).
5. Haz commit y despliega con la sección 4: la imagen nueva lleva el archivo, y el Job lo aplica **antes** de cambiar el servicio.

**Cosas a saber**

- Si una migración falla, el Job termina con error y el servicio **no** se debe actualizar (sección 4.2). Corrige el SQL y vuelve a construir.
- Una migración ya aplicada **no se vuelve a ejecutar aunque cambies el archivo**: crea otra con número nuevo.
Marca: el Job de migraciones **Ejecutado en producción**.

### Cargar el esquema base en una base nueva

`app/database/schema.sql` es la fuente de verdad para una base nueva: define las 14 tablas (`CREATE TABLE` en `schema.sql:19, 29, 44, 51, 71, 84, 91, 98, 104, 123, 134, 144, 172, 183`), con extensiones, índices y triggers. **No viaja en la imagen** (`backend/Dockerfile:45-46`; tampoco lo deja pasar `.dockerignore`, que solo admite `backend/package*.json`, `backend/src` y `database/migrations`, líneas 4-9). Por eso **el Job `oskar-migrar` no puede crear una base vacía**: no hay migración `001` y las migraciones existentes (`002`, `003`, `004`, `010`, `011`) asumen que tablas como `libros`, `usuarios` o `movimientos_inventario` ya existen (por ejemplo `002_categorias.sql:13-14` hace `ALTER TABLE libros` y `004_ventas.sql:51-52` hace `ALTER TABLE movimientos_inventario`). Solo se aplican sobre una base que ya tiene el esquema.

**Cómo interactúan en una base nueva** (leído en el código; no ejecutado en producción):

- `schema.sql` ya incluye lo que añaden las migraciones: la tabla `categorias` (`schema.sql:98`) y sus datos adicionales (comentario en `schema.sql:343`, equivalente a `003`), `ventas` y `venta_detalles` (`schema.sql:144, 172`) y la columna `venta_id` de `movimientos_inventario` (`schema.sql:191`), las columnas y la tabla de 2FA (`schema.sql:63-65, 71`) y las de recuperación de contraseña (`schema.sql:59, 66`, índice en `299-300`).
- `schema.sql` **no menciona `schema_migrations`** (búsqueda sin resultados), así que `migrate.js` no sabe que esas migraciones "ya están": las considera pendientes (`migrate.js:31-34, 44-47`).
- Al ejecutarlas, las ejecuta de verdad, pero resultan inofensivas porque todas están escritas de forma idempotente: `CREATE TABLE/SEQUENCE/INDEX IF NOT EXISTS` y `ADD COLUMN IF NOT EXISTS` (`002_categorias.sql:7, 13-16`; `004_ventas.sql:10, 12, 40, 51-58`; `010_dos_factores.sql:10-17, 20, 29`; `011_recuperacion_contrasena.sql:10-17`) e `INSERT ... ON CONFLICT DO NOTHING` (`002_categorias.sql:18-25`; `003_categorias_adicionales.sql:7-22`). Cada una queda registrada en `schema_migrations` (`migrate.js:56-59`), y desde entonces se omiten.
- El mismo `schema.sql` se usa en local: `docker-compose.yml:18` y `:41` lo montan en `docker-entrypoint-initdb.d`.

**Procedimiento** — todo `POR VERIFICAR`: es la forma en que se cree que se cargó el esquema en producción, pero nadie lo ha confirmado y no se ha ejecutado para este documento. La creación de la base de datos `libreria_oskar` y del usuario `oskar_app` dentro de Cloud SQL también es `POR VERIFICAR` (no se incluyen comandos porque no están confirmados).

Se usa el **proxy de Cloud SQL** (un programa que abre un túnel seguro desde Cloud Shell hasta la base) porque `gcloud sql connect` no hereda la variable `PGPASSWORD`. Se carga con el usuario `oskar_app` para que sea dueño de las tablas (esto es una inferencia, `POR VERIFICAR`).

Cloud Shell (bash) — `POR VERIFICAR`
```bash
# 1) Abrir el túnel en segundo plano
cloud-sql-proxy libreria-oskar-seminario:us-central1:oskar-db --port 9470 &

# 2) Guardar la contraseña en una variable de esta sesión, sin imprimirla
export PGPASSWORD="$(gcloud secrets versions access latest --secret=db-password)"

# 3) Cargar el esquema base
psql "host=127.0.0.1 port=9470 user=oskar_app dbname=libreria_oskar" -f ~/oskar/app/database/schema.sql

# 4) Borrar la contraseña de la sesión y cerrar el túnel
unset PGPASSWORD
kill %1
```
Luego, **5) ejecutar el Job de migraciones** (sección 4.2): `gcloud run jobs execute oskar-migrar --region us-central1 --wait`. Crea `schema_migrations`, registra las migraciones y siembra roles, sucursal, bodega y el Administrador central. Marca de todo el procedimiento: **POR VERIFICAR**. (`kill %1` cierra el proceso en segundo plano del paso 1; también `fg` y Ctrl+C.)

---

## 7. Respaldos, exportación y restauración

Un **respaldo** (backup) es una copia completa de la instancia que Google guarda y que sirve para restaurarla.

### 7.1 Respaldo automático

`oskar-db` hace un respaldo diario dentro de una ventana de 4 horas que empieza a las 08:00 UTC y conserva 7. Para ver la configuración:

Cloud Shell (bash)
```bash
gcloud sql instances describe oskar-db --format="yaml(settings.backupConfiguration)"
```
Marca: **Ejecutado en producción**.

### 7.2 Respaldo a demanda y listado

Hazlo **antes** de cualquier migración riesgosa, restauración o rollback con cambios de esquema.

Cloud Shell (bash)
```bash
gcloud sql backups create --async --instance=oskar-db
gcloud sql backups list --instance oskar-db
```
`--async` devuelve el control de inmediato: vuelve a listar hasta que el estado sea correcto (`SUCCESSFUL`). El `ID` que muestra el listado se usa para restaurar. Marca: **Ejecutado en producción**.

### 7.3 Exportar a un archivo (copia que tú puedes guardar)

Un **bucket** es una carpeta en la nube (Cloud Storage). Reemplaza `BUCKET` por un nombre único global y `FECHA` por la fecha (por ejemplo `2026-10-25`).

Cloud Shell (bash)
```bash
# 1) Crear el bucket (una sola vez)
gcloud storage buckets create gs://BUCKET --project=libreria-oskar-seminario --location=us-central1

# 2) Ver la cuenta de servicio de la instancia (copia el valor que imprime; marca M: formato de memoria)
gcloud sql instances describe oskar-db --format="value(serviceAccountEmailAddress)"

# 3) Darle permiso de escritura en el bucket (reemplaza CUENTA por el valor anterior;
#    si el paso 2 salió vacío, busca el campo serviceAccountEmailAddress en el YAML completo
#    de `describe`, sin pegarlo en ningún chat porque incluye la IP de la base de datos)
gcloud storage buckets add-iam-policy-binding gs://BUCKET --member=serviceAccount:CUENTA --role=roles/storage.objectAdmin

# 4) Exportar
gcloud sql export sql oskar-db gs://BUCKET/copia-FECHA.gz --database=libreria_oskar --offload

# 5) Descargar a Cloud Shell
gcloud storage cp gs://BUCKET/copia-FECHA.gz .
```
Marca: **No probado**. El paso 5 es de memoria.

### 7.4 Importar un archivo

Cloud Shell (bash)
```bash
gcloud sql import sql oskar-db gs://BUCKET/ARCHIVO --database=libreria_oskar
```
Marca: **No probado**. Importar sobre una base que **ya tiene datos** puede fallar por duplicados. Para una recuperación completa se usa la restauración (7.5), no la importación.

### 7.5 Restaurar un respaldo

> **ADVERTENCIA — la restauración sobrescribe TODOS los datos de la instancia** con los del respaldo y la deja **sin conexiones** mientras dura. Todo lo registrado después del respaldo se pierde. Antes: (1) crea un respaldo a demanda (7.2), (2) avisa a los usuarios de que el sistema no estará disponible.

Cloud Shell (bash)
```bash
gcloud sql backups list --instance oskar-db
gcloud sql backups restore BACKUP_ID --restore-instance=oskar-db --backup-instance=oskar-db
```
Marca: **No probado**. Al terminar, haz la prueba de humo (4.5).

**Restaurar a otra instancia** (por ejemplo, para probar sin tocar producción): el destino debe estar en estado `RUNNABLE` y tener la misma versión de PostgreSQL (15). Después habría que apuntar el servicio a esa instancia (con `--add-cloudsql-instances` y cambiando `DB_HOST`). Marca: **No probado**, solo documentación.

---

## 8. Rotar secretos

**Rotar** un secreto es cambiar su valor, por ejemplo si se filtró. Secret Manager guarda **versiones** numeradas. Los secretos entregados como variable de entorno se leen **al arrancar** la instancia, y Google recomienda fijar un número de versión: por eso, tras crear la versión nueva hay que actualizar el servicio (y el Job) apuntando a ella.

Plantilla general (ejemplo con una llave de 32 bytes = 64 caracteres hexadecimales, que es el formato que exige `two-factor-key`):

Cloud Shell (bash)
```bash
# Crea una versión nueva; el valor nunca se imprime ni se guarda en archivos
openssl rand -hex 32 | gcloud secrets versions add NOMBRE --data-file=-

# Aplica la versión nueva (N = número de la versión recién creada) al servicio...
gcloud run services update libreria-oskar-api --region us-central1 --update-secrets=VARIABLE=NOMBRE:N

# ...y al Job
gcloud run jobs update oskar-migrar --region us-central1 --update-secrets=VARIABLE=NOMBRE:N
```
Marca: **No probado** (`--data-file=-` y `--update-secrets` por documentación; `openssl` y `jobs update --update-secrets` de memoria). **Ojo con Terraform:** `infra/cloud_run.tf:108` y `:188` declaran los secretos con `version = "latest"`; fijar un número con `--update-secrets` aparecerá como diferencia en el siguiente `terraform plan`, y un `apply` lo devolvería a `latest`. Cómo conciliar la rotación con Terraform: `POR VERIFICAR`. `openssl rand -hex 32` solo sirve para llaves aleatorias (`two-factor-key`, `jwt-secret`); las contraseñas de base de datos y de correo no se generan así.

**Leer la clave inicial del Administrador central** (guardada en `admin-password`):

Cloud Shell (bash)
```bash
gcloud secrets versions access latest --secret=admin-password
```
Marca: **Ejecutado en producción**. **Ojo:** esa es solo la clave **inicial**. `seed.js` nunca modifica a un Administrador existente (`seed.js:21, 59`), por lo que si el Administrador cambió su contraseña desde la pantalla de la aplicación (o la recuperó por correo), `admin-password` queda **desactualizado** y ya no sirve para entrar. Tampoco hay que rotarlo para "cambiar la clave del administrador": no tiene efecto sobre un usuario que ya existe.

### Consecuencias de cada secreto

| Secreto | Variable | Qué ocurre al rotarlo |
|---|---|---|
| `jwt-secret` | `JWT_SECRET` | **Se cierran todas las sesiones abiertas.** Los usuarios deben iniciar sesión otra vez. No se pierde ningún dato. |
| `two-factor-key` | `TWO_FACTOR_ENCRYPTION_KEY` | **Se invalidan todos los secretos 2FA ya guardados.** Los secretos de la app autenticadora están cifrados con esta llave; con otra no se pueden abrir. Cuando alguien con 2FA activo intente entrar, el código falla "cerrado": no se concede acceso, se imprime en logs `[2FA] No se pudo descifrar el secreto del usuario ...` y la persona recibe un error 500 "No fue posible completar la verificación en dos pasos" (`backend/src/services/dosFactores/intentos.js:41-47`, llamado desde `dosFactores.service.js:28`). **Cada Administrador y Empleado con 2FA necesitará que se le aplique `reset-2fa`** (sección 9.4), lo que borra su secreto y códigos de respaldo (`backend/src/repositories/dosFactores.repository.js:135-141`) y le obliga a configurar el autenticador de nuevo. Como el Administrador central también lo usa, **aplícale `reset-2fa` primero** desde el Job. `reset-2fa` no necesita descifrar nada, así que funciona aunque la llave haya cambiado. |
| `db-password` | `DB_PASSWORD` | Exige **cambiar también la contraseña del usuario `oskar_app` dentro de Cloud SQL**; si solo cambias el secreto, la API deja de poder conectar (`/api/health` en 503). Comando para cambiarla en Cloud SQL: `POR VERIFICAR`. La contraseña nueva se teclea en la terminal, **nunca se pega en un chat**. Orden sugerido: cambiar en Cloud SQL, crear la versión del secreto, actualizar servicio y Job, y comprobar `/api/health`. |
| `mail-password` | `MAIL_PASSWORD` | Se regenera como **contraseña de aplicación** de la cuenta de Gmail (en la configuración de seguridad de esa cuenta de Google), se guarda como versión nueva y se aplica. Mientras no se actualice, los correos de recuperación fallan. |
| `admin-password` | `SEED_ADMIN_PASSWORD` | Solo la lee el Job y solo al crear al Administrador central. Rotarlo no cambia la clave de un administrador que ya existe. |

---

## 9. Operación diaria

### 9.1 Ver los logs

Un **log** es el registro de lo que escribe el programa. Con `console.log`/`console.error` el backend deja ahí sus mensajes (por ejemplo `[DATABASE CONNECTED]` al arrancar: `backend/src/server.js:10`).

Cloud Shell (bash)
```bash
gcloud run services logs read libreria-oskar-api --region us-central1 --limit 50
```
Solo errores:

Cloud Shell (bash)
```bash
gcloud run services logs read libreria-oskar-api --region us-central1 --limit 50 --log-filter="severity>=ERROR"
```
Marca: **No probado** (comandos de la documentación oficial).

Logs de una ejecución del Job: consola de Google Cloud → Cloud Run → **Jobs** → `oskar-migrar` → la ejecución → pestaña **Registros**. `POR VERIFICAR` (de memoria).

### 9.2 Revisar la salud

Ver sección 4.5: `curl -s https://libreria-oskar.web.app/api/health`. `healthy` = todo bien; 503 `degraded` = la API vive pero no llega a la base de datos (revisa Cloud SQL y `db-password`). Una pausa larga sin visitas provoca arranque en frío, no error.

### 9.3 Síntomas comunes

| Síntoma | Causa probable | Qué mirar |
|---|---|---|
| La revisión nueva no arranca | Falta `JWT_SECRET`, `TWO_FACTOR_ENCRYPTION_KEY` o `CORS_ORIGINS`, o la llave 2FA no tiene 64 hex | Logs de errores; sección 3 |
| `/api/health` da 503 | Base de datos inaccesible o `DB_PASSWORD` incorrecta | Logs; sección 8 (`db-password`) |
| Login responde 429 "Demasiados intentos" | Se superó `LOGIN_RATE_LIMIT` en la ventana de 15 min (`rateLimit.js:27-29`, `security.config.js:35`) | Esperar o reiniciar el servicio (los contadores viven en memoria) |
| Nadie recibe correos | `MAIL_PASSWORD`/`MAIL_USER`/`FRONTEND_URL` faltan o la contraseña de aplicación fue revocada | Logs al arrancar (`[WARN CONFIG]`) |

### 9.4 Alertas automáticas de inventario

El proceso diario detecta libros activos con `stock_actual <= stock_minimo`, incluye todas las bodegas y conserva el snapshot de ese día. Envía un correo separado a cada Administrador activo. No cambia stock ni crea movimientos.

**Ejecución y prueba local segura.** Desde `app/`, con PostgreSQL de pruebas iniciado (`docker compose --profile test up -d db-test`) y schema actual aplicado:

```bash
NODE_ENV=test TEST_DB_HOST=127.0.0.1 TEST_DB_PORT=5435 TEST_DB_USER=postgres TEST_DB_PASSWORD=postgres npm --prefix backend run alertas:inventario -- --dry-run
```

`--dry-run` consulta datos y muestra un resumen JSON con alertas y conteos; no escribe reportes/entregas ni envía correos. Con `NODE_ENV=test`, el transporte de correo es consola aunque se quite el flag; las pruebas automatizadas también inyectan SMTP simulado. No usar datos de producción para la prueba local.

**Ejecución manual del Job.** Cloud Shell (bash), solo después de crear el Job y aplicar la migración 020:

```bash
gcloud run jobs execute oskar-alertas-inventario --region us-central1 --wait
```

Una ejecución normal es idempotente por día: entregas `enviado` no se reenvían; fallos SMTP reintentables se limitan a tres intentos persistidos. Un resultado `incierto` (por ejemplo, corte durante la sesión SMTP) nunca se reintenta automáticamente. No existe garantía "exactamente una vez": SMTP puede aceptar el correo antes de que PostgreSQL confirme el resultado.

**Scheduler e IAM para Alejandro.** Crear una cuenta de servicio dedicada para Scheduler y darle `roles/run.invoker` únicamente sobre el Job. La identidad que crea el trigger necesita `iam.serviceAccounts.actAs` sobre esa cuenta. Habilitar `cloudscheduler.googleapis.com`. Ejemplo desde Cloud Shell (la cuenta y el trigger son recursos nuevos; revisar proyecto y permisos antes de correrlo):

```bash
gcloud iam service-accounts create oskar-alertas-scheduler --display-name="Invoca el Job diario de alertas"
gcloud services enable cloudscheduler.googleapis.com
gcloud run jobs add-iam-policy-binding oskar-alertas-inventario --region us-central1 --member="serviceAccount:oskar-alertas-scheduler@libreria-oskar-seminario.iam.gserviceaccount.com" --role="roles/run.invoker"
gcloud scheduler jobs create http oskar-alertas-inventario-diario --location us-central1 --schedule="0 7 * * *" --time-zone="America/Guatemala" --uri="https://run.googleapis.com/v2/projects/libreria-oskar-seminario/locations/us-central1/jobs/oskar-alertas-inventario:run" --http-method=POST --oauth-service-account-email="oskar-alertas-scheduler@libreria-oskar-seminario.iam.gserviceaccount.com"
```

El Job usa Cloud SQL por `/cloudsql/libreria-oskar-seminario:us-central1:oskar-db`, timeout 600 s, una tarea y un reintento de tarea de Cloud Run. Corre como `oskar-alertas`, con `roles/cloudsql.client` y acceso de Secret Manager únicamente a `db-password` y `mail-password`. Gmail usa `MAIL_USER` y `MAIL_PASSWORD`; `MAIL_HOST`, `MAIL_PORT` y `MAIL_FROM` son opcionales (`smtp.gmail.com`, `587` y `MAIL_USER` por defecto). No necesita JWT, 2FA ni secretos del seed. El ejemplo de Scheduler sigue la [guía oficial de Cloud Run Jobs programados](https://docs.cloud.google.com/run/docs/execute/jobs-on-schedule).

**Comprobaciones de base de datos previas al primer Job.** Sin modificar datos, confirma en la base `libreria_oskar` que la extensión y la función UUID existen, y que la cuenta de migraciones puede crear tablas en `public`:

```sql
SELECT extname FROM pg_extension WHERE extname = 'uuid-ossp';
SELECT to_regprocedure('uuid_generate_v4()') IS NOT NULL AS uuid_v4_disponible;
SELECT has_schema_privilege('oskar_app', 'public', 'CREATE') AS puede_crear_en_public;
```

La migración 020 crea ambas tablas con `oskar_app` desde `oskar-migrar`; esa misma cuenta será dueña de las tablas y el Job la usará para consultar/actualizar sus registros. Cloud SQL PostgreSQL 15 soporta `uuid-ossp`, pero la extensión debe estar habilitada en la base. Si las consultas no confirman esas condiciones, detener el primer Job y resolver los permisos/extensión con el DBA (la cuenta `oskar_app` no debe recibir privilegios de superusuario).

**Leer resultados y recuperar.** Revisa Cloud Run → Jobs → `oskar-alertas-inventario` → ejecución → logs. Cada ejecución imprime JSON con `fecha_local`, estado, número de alertas, envíos, fallos e inciertos; no registra direcciones. Consulta de solo lectura en Cloud SQL Studio:

```sql
SELECT r.fecha_local, r.estado AS estado_reporte, r.cantidad_alertas,
       e.nombre_administrador, e.estado AS estado_entrega, e.intentos,
       e.enviado_en, e.error
FROM alertas_inventario_reportes r
LEFT JOIN alertas_inventario_entregas e ON e.reporte_id = r.id
WHERE r.fecha_local = (CURRENT_TIMESTAMP AT TIME ZONE 'America/Guatemala')::date
ORDER BY e.nombre_administrador;
```

Ante `fallido`, corrige SMTP/datos y vuelve a ejecutar el Job: solo se reclaman pendientes o fallos clasificados como seguros y dentro del límite. Ante `incierto`, compara primero con Gmail (carpeta Enviados y registros disponibles); si no se puede confirmar la aceptación, deja la entrega en revisión y no la restablezcas automáticamente a pendiente. Si se confirma que no fue aceptada, un DBA autorizado puede rearmar esa entrega de forma controlada antes de reejecutar.

Marca de los comandos de ejecución de Cloud Run/Scheduler: **No ejecutados por esta implementación**. Alejandro debe aplicar Terraform y configurar Scheduler tras revisar el plan.

### 9.5 Restablecer el 2FA de un usuario en la nube (`reset-2fa`) y administrador bloqueado

El **2FA** (verificación en dos pasos) pide, además de la contraseña, un código de 6 dígitos de una app autenticadora. Es obligatorio para Administrador y Empleado en producción. Si alguien pierde el teléfono, o si cambió la llave `two-factor-key`, hay que restablecerlo.

- **Script real:** `backend/src/scripts/reset-2fa.js`. Dentro de la imagen queda en `/usr/src/app/src/scripts/reset-2fa.js` (el directorio de trabajo es `/usr/src/app`, `backend/Dockerfile:32`, y el `COPY` está en `backend/Dockerfile:43`), es decir, `src/scripts/reset-2fa.js`.
- **Argumentos:** un único argumento, el correo (`process.argv[2]`, `reset-2fa.js:7`). Sin él imprime el uso y sale con error (`reset-2fa.js:8-11`).
- **Qué borra** (`dosFactores.repository.js:135-141`): el secreto de 2FA, marca el 2FA como inactivo, reinicia el último paso usado, el contador de intentos y el bloqueo, y elimina todos sus códigos de respaldo. **No cambia la contraseña.**
- **Si el correo no existe**: imprime "No existe un usuario con el correo ..." y sale con error (`reset-2fa.js:18-19`).
- **Qué ve la persona después:** el mensaje del script dice que "deberá configurarla de nuevo al iniciar sesión" (`reset-2fa.js:15`). Entra con su contraseña y debe escanear un código QR nuevo y guardar códigos de respaldo nuevos.
- El propio endpoint de administración no permite que un Administrador se restablezca a sí mismo y remite a este script (`dosFactores.service.js:141-142`): por eso es el camino para el **administrador bloqueado**.

**En la nube** se reutiliza el Job `oskar-migrar` ejecutándolo **una sola vez** con otros argumentos (misma imagen y mismas variables y secretos):

Cloud Shell (bash)
```bash
gcloud run jobs execute oskar-migrar --region us-central1 --wait --args="-c,node src/scripts/reset-2fa.js CORREO"
```
Marca: **No probado**. `--args` en `execute` está en la documentación; **la sintaxis exacta (coma entre argumentos, espacios dentro del texto) y que el comando base del Job sea una shell (`sh`) que acepte `-c`: POR PROBAR.** Si el Job está definido con otro comando, el resultado cambia. Revisa los logs de la ejecución: debe aparecer `[2FA] Verificación en dos pasos restablecida para ...`. Los argumentos dados al ejecutar valen solo para esa ejecución; la definición del Job no cambia.

Reemplaza `CORREO` por el correo real (sin escribirlo en documentos compartidos).

**Administrador bloqueado.** Hay dos causas distintas:
- *Bloqueo temporal por intentos fallidos de 2FA*: 5 intentos fallidos bloquean 15 minutos (`backend/src/config/twoFactor.config.js:12-13`). Se espera o se aplica `reset-2fa`, que también reinicia el bloqueo.
- *Perdió el autenticador o cambió la llave*: `reset-2fa` como arriba.
- *Olvidó la contraseña*: usar "olvidé mi contraseña" (requiere correo funcionando). `admin-password` **no** sirve si ya la cambió (sección 8).

---

## 10. Límites y deudas conocidas

- **Una sola instancia del servicio** (`--max-instances 1`): el limitador de login está en memoria. Si algún día se permiten más, hay que mover los contadores a un almacén compartido.
- **`TRUST_PROXY=1` y `LOGIN_RATE_LIMIT=100` son provisionales**: se decidieron observando `X-Forwarded-For`; deben revisarse.
- **`min-instances 0`**: la primera visita tras un rato de inactividad es más lenta.
- **`db-f1-micro`**: la máquina de base de datos más pequeña; sin alta disponibilidad.
- **`admin-password` se desactualiza** si el Administrador cambia su clave (`seed.js:21, 59`).
- **La clave 2FA es un punto único**: rotarla obliga a restablecer a todos los usuarios con 2FA (sección 8).
- **Esquema base fuera de la imagen**: `schema.sql` no está en la imagen y no hay migración `001`; el procedimiento de la sección 6 para crear una base nueva sigue `POR VERIFICAR`.
- **El YAML de Cloud Build no está versionado**: se reconstruye a mano (sección 4.1). Solo afecta al despliegue manual.
- **`reset-2fa` en la nube depende de reutilizar el Job** y su sintaxis no está probada (sección 9.4).
- **Datos de prueba en producción**: fuera del alcance de este documento.
- **Todo push a `main` lanza el despliegue completo** (CI, imagen, migraciones, servicio y frontend), incluso si solo cambia documentación. Mejora pendiente: filtrar por rutas.
- **Sin rollback automático del frontend**: si falla el job `frontend`, se vuelve atrás a mano (sección 5.2).
- **El rollback automático del backend usa `latestReadyRevisionName`**: si el tráfico estaba fijado a mano a otra revisión, no vuelve a la que servía (sección 5.1).
- **Terraform se ejecuta a mano** y no administra usuarios de la BD, valores de secretos, la base `postgres`, las APIs, las cuentas por defecto, los roles de las personas, el sitio de Hosting ni el escaneo de vulnerabilidades (`infra/README.md`, "Qué NO se gestiona").

---

## 11. Estado de verificación de los procedimientos

**Ejecutado en producción:**

- Construir con Cloud Build, crear y desplegar el servicio, crear y ejecutar el Job, desplegar Hosting, respaldo a demanda y su listado, leer secretos.
- Despliegue continuo completo (primera corrida: push de `a29735a` a `main`). Verificado en la nube: revisión nueva `libreria-oskar-api-00003-6kw`, servicio y Job con la imagen `:a29735a`, `/api/health` `healthy` con la base conectada. El estado verde de los jobs lo reportó el usuario. Con eso quedan ejecutados por el CD: actualizar la imagen del Job y del servicio y mandar el tráfico a la última revisión (`--to-latest`).
- Terraform: importación de los 27 recursos con `apply` y `plan` en `No changes`, también después de ese despliegue.
- Instalar Terraform 1.17.0 en Cloud Shell (`~/bin`, suma SHA256 verificada) y crear el bucket del estado versionado (sección 12.3).
- Configurar la identidad de GitHub: cuenta `oskar-deployer`, pool `github`, proveedor `github-oskar` y permisos (sección 12.4).
- `terraform plan` y `terraform apply` desde Cloud Shell, y despliegue por GitHub Actions (sección 12).

**No probado (solo documentación):**

- Rollback manual de Cloud Run y de Hosting, restauración de un respaldo, exportar/importar, rotación de secretos, `reset-2fa` por Job.
- Rollback automático del backend en el CD (nunca se ha visto dispararse) y ejecución manual del CD (`workflow_dispatch`).

**Detalles por verificar (marcados en el texto):**

- Rollback de Hosting por línea de comandos.
- Comando para cambiar la contraseña del usuario `oskar_app` en Cloud SQL.
- Dónde ver los registros de una ejecución del Job.
- Sintaxis de `--args` para `reset-2fa` y comando base del Job (`POR PROBAR`).
- Cómo se cargó el esquema base en producción (`schema.sql` en `oskar-db`; procedimiento de la sección 6, todo `POR VERIFICAR`), incluida la creación de la base `libreria_oskar` y del usuario `oskar_app`.
- Formato `--format="value(serviceAccountEmailAddress)"` (de memoria, sección 7.3).
- Comandos para ver la imagen vigente del servicio y del Job, y `gh run list` (sección 12.2).
- Que `workflow_dispatch` desde una rama distinta de `main` falle al autenticar (sección 12.2).
- Cómo conciliar la rotación de secretos (versión fija) con Terraform (`version = "latest"`, sección 8).

---

## 12. Despliegue automático y Terraform

El **despliegue continuo** (CD, *continuous deployment*) es un proceso que publica solo cada versión nueva, sin pasos a mano. **Terraform** es un programa de **infraestructura como código**: describe en archivos de texto los recursos de Google Cloud (servicio, Job, base de datos, permisos) para poder revisarlos y recrearlos. Archivos: [`.github/workflows/deploy.yml`](../../.github/workflows/deploy.yml) y [`infra/README.md`](../../infra/README.md).

### 12.1 Cómo funciona el despliegue continuo

- **Cuándo corre**: el workflow se llama "Despliegue" y se dispara con cada push a `main` y a mano (`workflow_dispatch`) (`deploy.yml:5-10`). No corre en otras ramas; en ellas solo corre el CI (`ci.yml`).
- **Uno a la vez**: grupo de concurrencia `despliegue-produccion` sin cancelar (`deploy.yml:13-15`); si llega otro push mientras uno corre, el nuevo espera en vez de cortar el anterior a medias.
- **Tres jobs encadenados**: `ci` → `backend` → `frontend` (`deploy.yml:21-23, 29, 109`). Si uno falla, los siguientes no corren.
  1. **`ci` ("Integración continua")**: reutiliza `.github/workflows/ci.yml` (que acepta `workflow_call`, `ci.yml:10`): pruebas del backend, build del frontend y build de la imagen.
  2. **`backend` ("Backend (Cloud Run)")**: construye y publica la imagen con el tag de 7 caracteres del commit (`deploy.yml:53-62`), guarda la revisión vigente (`:67-72`), actualiza el Job de migraciones y lo ejecuta (`:76-80`), actualiza el servicio (`:82-84`), manda el tráfico a la revisión nueva (`:87-88`) y hace la prueba de humo contra la URL directa de Cloud Run (`:91-96`). Si falla después de actualizar el servicio, vuelve solo a la revisión previa (`:98-103`, sección 5.1).
  3. **`frontend` ("Frontend (Firebase Hosting)")**: construye el frontend, lo publica en Firebase Hosting y hace la prueba de humo por el sitio (`deploy.yml:126-155`). Si falla **no** hay rollback automático (sección 5.2).
- **Sin llaves**: cada job se autentica con Workload Identity Federation como `oskar-deployer` (`deploy.yml:40-44, 135-141`). El proveedor `github-oskar` solo acepta tokens de este repositorio en `refs/heads/main` (`infra/identidad_github.tf:20`). En GitHub no hay ningún secreto guardado para esto.
- **Primera corrida**: push de `a29735a` a `main`. Verificado en la nube: revisión nueva `libreria-oskar-api-00003-6kw`, servicio y Job con la imagen `:a29735a`, `/api/health` `healthy` con la base conectada y `terraform plan` en `No changes` después del despliegue. El estado verde de los jobs lo reportó el usuario.

Marca: **Ejecutado en producción**.

### 12.2 Consultar una corrida y lo que está desplegado

**En GitHub (navegador):** pestaña **Actions** del repositorio → workflow **Despliegue** → la corrida (una por push a `main`) → cada job muestra sus pasos y sus registros. Así se vio el estado verde de la primera corrida (dato del usuario). Para lanzarlo a mano: la misma página → **Run workflow** → rama `main`. Marca del lanzamiento a mano: **No probado**. Desde otra rama debería fallar al autenticar, porque el proveedor solo acepta `refs/heads/main`: `POR VERIFICAR`.

Desde la terminal, con la CLI de GitHub (`gh`), si está instalada y con sesión:

Laptop (zsh) — `POR VERIFICAR`
```bash
gh run list --workflow deploy.yml --limit 5
```

**En Google Cloud:** la última revisión lista del servicio (el mismo comando que usa el CD para el rollback, `deploy.yml:70`):

Cloud Shell (bash)
```bash
gcloud run services describe libreria-oskar-api --region us-central1 --format="value(status.latestReadyRevisionName)"
```
Marca: **Ejecutado en producción** (lo corre el CD). Ojo: si el tráfico está fijado a otra revisión, la que sirve no es esta; mira el listado de revisiones de la sección 4.3.

La imagen (y por tanto el commit) que usan el servicio y el Job:

Cloud Shell (bash) — `POR VERIFICAR` (ruta de `--format` de memoria)
```bash
gcloud run services describe libreria-oskar-api --region us-central1 --format="value(spec.template.spec.containers[0].image)"
gcloud run jobs describe oskar-migrar --region us-central1 --format="value(spec.template.spec.template.spec.containers[0].image)"
```

### 12.3 Terraform

- **Qué es aquí**: la carpeta `infra/` (14 archivos, incluido `.terraform.lock.hcl`) describe el servicio y el Job de Cloud Run, la base de datos, los secretos (solo el contenedor, sin valores), el repositorio de imágenes, las cuentas de servicio, la identidad de GitHub (WIF) y los permisos. Terraform 1.17.0; proveedor `hashicorp/google ~> 8.0`, fijado en 8.8.1 por `.terraform.lock.hcl`. El **estado** (el registro de qué recursos reales corresponden a cada bloque) vive en el bucket `libreria-oskar-seminario-tfstate` (versionado), prefijo `libreria-oskar` (`infra/terraform.tf:15-18`).
- **Situación**: los 27 recursos que ya existían se importaron con un `apply` (el único cambio fue `deletion_policy = "PREVENT"` en la base, un atributo propio de Terraform) y el `plan` siguiente dio `No changes`. Marca: **Ejecutado en producción**.
- **Qué NO administra**: usuarios de la BD, valores de los secretos, la base `postgres`, las APIs, las cuentas por defecto, los roles de las personas, el sitio de Hosting (solo existe en el proveedor `google-beta`) y el escaneo de vulnerabilidades (`infra/README.md`, "Qué NO se gestiona y por qué").

**Cómo correrlo.** Siempre a mano, desde Cloud Shell, donde ya están tus credenciales pero Terraform **no** viene instalado: requiere Terraform instalado (ver la subsección siguiente). El CD **no** ejecuta Terraform.

Cloud Shell (bash)
```bash
cd ~/oskar && git pull
cd ~/oskar/infra
terraform init              # descarga el proveedor y conecta con el estado en GCS
terraform fmt -check        # formato
terraform validate          # sintaxis y esquema
terraform plan              # para esta tarea: 6 recursos nuevos (cuenta oskar-alertas, sus permisos y el Job), sujeto a revisión
```
Marca: el procedimiento base fue **Ejecutado en producción**; el cambio de alertas está **pendiente de revisión**. Este plan debe mostrar el Job `oskar-alertas-inventario` nuevo y ninguna diferencia inesperada. No ejecutar `apply` hasta que Alejandro confirme que el plan contiene solo cambios aprobados. Los bloques `import` de `infra/imports.tf` se quedan como registro de los IDs y ya no hacen nada.

**Por qué no se pelea con el CD.** Cada uno tiene su parte:

- **Del CD**: la imagen del servicio y del Job, el reparto de tráfico y los campos `client`/`client_version` que rellena `gcloud`. Terraform los ignora (`ignore_changes` en `infra/cloud_run.tf:134-141` y `:209-215`), así que un despliegue no deja diferencias en el `plan`.
- **De Terraform**: todo lo demás (entorno, secretos referenciados, recursos, sondeo, escalado, cuentas, permisos). Un cambio hecho a mano en la consola aparece como diferencia en el siguiente `plan`, y un `apply` lo revertiría.
- Por eso el `plan` dio `No changes` después de la primera corrida del CD. La excepción a vigilar es la rotación de secretos con versión fija (sección 8).

#### Instalar Terraform y crear el bucket del estado (una sola vez)

Terraform **no** viene instalado en Cloud Shell: se instaló a mano el binario oficial 1.17.0, con su suma SHA256 verificada, en `~/bin`. El directorio `~/bin` está en tu carpeta personal, que persiste entre sesiones de Cloud Shell (de memoria), así que basta con hacerlo una vez.

Comprobar que la máquina es de 64 bits Intel/AMD (el binario descargado es `linux_amd64`):

Cloud Shell (bash)
```bash
uname -m   # debe decir x86_64
```

Descargar el binario y su lista de sumas, verificar la suma (debe decir `OK`) y descomprimirlo en `~/bin`:

Cloud Shell (bash)
```bash
cd /tmp && curl -sSLO https://releases.hashicorp.com/terraform/1.17.0/terraform_1.17.0_linux_amd64.zip && curl -sSLO https://releases.hashicorp.com/terraform/1.17.0/terraform_1.17.0_SHA256SUMS && sha256sum -c --ignore-missing terraform_1.17.0_SHA256SUMS && mkdir -p ~/bin && unzip -o terraform_1.17.0_linux_amd64.zip -d ~/bin && cd ~
```

Agregar `~/bin` al `PATH` (la lista de carpetas donde la terminal busca programas) en las sesiones futuras, solo si aún no está:

Cloud Shell (bash)
```bash
grep -q 'HOME/bin' ~/.bashrc || echo 'export PATH="$HOME/bin:$PATH"' >> ~/.bashrc
```

Agregarlo también en la sesión actual y comprobar la versión (debe decir `Terraform v1.17.0`):

Cloud Shell (bash)
```bash
export PATH="$HOME/bin:$PATH"; terraform version
```

Crear el bucket del estado (con acceso uniforme a nivel de bucket) y activar el versionado, para poder recuperar un estado anterior si uno se daña:

Cloud Shell (bash)
```bash
gcloud storage buckets create gs://libreria-oskar-seminario-tfstate --project=libreria-oskar-seminario --location=us-central1 --uniform-bucket-level-access
gcloud storage buckets update gs://libreria-oskar-seminario-tfstate --versioning
```
Marca de toda la subsección: **Ejecutado en producción**. El bucket ya existe: no vuelvas a crearlo.

### 12.4 Preparar la identidad de GitHub (una sola vez, ya hecho)

Es la identidad con la que GitHub Actions entra a Google Cloud **sin llaves**: GitHub presenta un token de corta duración, el proveedor `github-oskar` del pool `github` lo valida y le deja actuar como la cuenta de servicio `oskar-deployer`, con solo los permisos del despliegue. Se creó a mano con los comandos de abajo y después quedó descrita también en `infra/` (cuentas en `cuentas_servicio.tf`, pool y proveedor en `identidad_github.tf`, permisos en `permisos.tf`). **No hay que repetirlo**; queda como registro y para un proyecto nuevo.

Quien lo corre necesita poder administrar IAM del proyecto. Reemplaza `TU_CORREO` por la cuenta de Google de esa persona (sin escribirla en documentos compartidos).

**Bloque 1**: variables, permiso para crear pools, APIs, cuenta `oskar-deployer` y sus roles:

Cloud Shell (bash)
```bash
PROJECT=libreria-oskar-seminario; NUM=916083567697; REPO=cristian-ves/libreria-oskar-system; SA=oskar-deployer@$PROJECT.iam.gserviceaccount.com
gcloud config set project $PROJECT
gcloud projects add-iam-policy-binding $PROJECT --member=user:TU_CORREO --role=roles/iam.workloadIdentityPoolAdmin --condition=None --format=none
gcloud services enable iamcredentials.googleapis.com sts.googleapis.com
gcloud iam service-accounts create oskar-deployer --display-name="Despliegue desde GitHub Actions"
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/run.developer --condition=None --format=none
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/firebasehosting.admin --condition=None --format=none
gcloud projects add-iam-policy-binding $PROJECT --member=serviceAccount:$SA --role=roles/serviceusage.serviceUsageConsumer --condition=None --format=none
gcloud artifacts repositories add-iam-policy-binding oskar --location=us-central1 --member=serviceAccount:$SA --role=roles/artifactregistry.writer --format=none
gcloud iam service-accounts add-iam-policy-binding oskar-api@$PROJECT.iam.gserviceaccount.com --member=serviceAccount:$SA --role=roles/iam.serviceAccountUser --format=none
```

> **Nota — el permiso tarda en llegar.** Según la documentación de Google, un cambio de política de IAM tarda típicamente 2 minutos en aplicarse y puede tardar 7 o más. Por eso el bloque 2 reintenta crear el pool cada 60 s, hasta 8 veces, en vez de fallar a la primera.

**Bloque 2**: pool, proveedor (con la condición de repositorio y rama), permiso para que GitHub actúe como `oskar-deployer` y comprobación. Si es otra sesión de Cloud Shell, repite antes la primera línea del bloque 1 (las variables):

Cloud Shell (bash)
```bash
for i in 1 2 3 4 5 6 7 8; do if gcloud iam workload-identity-pools create github --location=global --display-name="GitHub Actions" 2>/dev/null; then echo "OK pool creado"; break; fi; echo "Aún sin permiso, reintento $i/8 en 60 s"; sleep 60; done
gcloud iam workload-identity-pools providers create-oidc github-oskar --location=global --workload-identity-pool=github --issuer-uri="https://token.actions.githubusercontent.com" --attribute-mapping="google.subject=assertion.sub,attribute.repository=assertion.repository" --attribute-condition="assertion.repository == '$REPO' && assertion.ref == 'refs/heads/main'"
gcloud iam service-accounts add-iam-policy-binding $SA --role=roles/iam.workloadIdentityUser --member="principalSet://iam.googleapis.com/projects/$NUM/locations/global/workloadIdentityPools/github/attribute.repository/$REPO" --format=none
gcloud iam workload-identity-pools providers describe github-oskar --location=global --workload-identity-pool=github --format="value(name)"
```
Marca de los dos bloques: **Ejecutado en producción**. El último comando imprime el nombre completo del proveedor, que es el valor de `workload_identity_provider` en `.github/workflows/deploy.yml`.

> **ADVERTENCIA — solo este repositorio y solo `main`.** La condición del proveedor (`--attribute-condition`, igual que `infra/identidad_github.tf:20`) solo acepta tokens del repositorio `cristian-ves/libreria-oskar-system` en la rama `refs/heads/main`. Un workflow de otra rama, de un fork o de otro repositorio no puede autenticarse. Si cambian el nombre o el dueño del repositorio, habría que actualizar la condición (`POR VERIFICAR`).
