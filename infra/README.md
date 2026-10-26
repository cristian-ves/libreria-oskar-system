# Infraestructura como código — Librería Oskar

Terraform que describe lo que **ya existe** en Google Cloud (proyecto `libreria-oskar-seminario`, región `us-central1`). Se escribió a mano para importarlo sin cambiar nada. **Ya se importó**: un `apply` registró los 27 recursos en el estado (el único cambio fue `deletion_policy = "PREVENT"` en la base, un atributo propio de Terraform) y el `plan` siguiente, también tras la primera corrida del despliegue continuo, dio `No changes`.

**El CD no ejecuta Terraform.** Se corre a mano desde Cloud Shell (abajo).

| Archivo | Contenido |
|---|---|
| `terraform.tf` | Versión de Terraform, proveedor `hashicorp/google ~> 8.0`, estado remoto en GCS |
| `variables.tf` | Valores públicos (proyecto, región, URLs, correo remitente, imagen inicial) |
| `cuentas_servicio.tf` | `oskar-api` y `oskar-deployer` |
| `identidad_github.tf` | Pool `github` y proveedor `github-oskar` (WIF) |
| `secretos.tf` | Los 5 secretos de Secret Manager (solo el contenedor) |
| `registro_imagenes.tf` | Repositorio Docker `oskar` |
| `base_datos.tf` | Instancia `oskar-db` y base `libreria_oskar` |
| `cloud_run.tf` | Servicio `libreria-oskar-api` y Job `oskar-migrar` |
| `permisos.tf` | Permisos IAM, todos `*_iam_member` (no autoritativos) |
| `imports.tf` | Un bloque `import` por recurso existente (ya aplicados; quedan como registro de IDs) |
| `outputs.tf` | URL del servicio, conexión de Cloud SQL, datos del CD |
| `.terraform.lock.hcl` | Versión exacta del proveedor (`hashicorp/google` 8.8.1); se versiona |
| `.gitignore` | Excluye `.terraform/`, el estado local y los `crash.log` |

## Cómo correrlo (Cloud Shell)

En Cloud Shell ya están las credenciales de tu usuario, pero Terraform **no** viene instalado: requiere Terraform instalado (1.17.0, binario oficial en `~/bin`; ver `app/docs/RUNBOOK.md` §12.3, "Instalar Terraform y crear el bucket del estado (una sola vez)"). El estado vive en el bucket `libreria-oskar-seminario-tfstate` (prefijo `libreria-oskar`), que ya existe y no lo gestiona esta configuración.

```bash
cd ~/oskar/infra            # o donde esté clonado el repo
terraform init              # descarga el proveedor y conecta con el estado en GCS
terraform fmt -check        # formato
terraform validate          # sintaxis y esquema
terraform plan              # esperado: "No changes. Your infrastructure matches the configuration."
```

`terraform apply` solo se corre cuando se cambió un `.tf` a propósito y el `plan` muestra exactamente ese cambio y nada más.

- Si `plan` muestra cambios (`~`), **no hagas `apply`**: el HCL no refleja la nube. Ajusta el `.tf` (o lleva la salida del plan a quien lo mantiene) y repite.
- Con el estado ya importado no se espera ningún cambio: cualquier `+`, `~` o `-` que no venga de un `.tf` editado es una diferencia real (alguien tocó la consola o el HCL no refleja la nube).
- `.terraform.lock.hcl` lo genera `terraform init` y se versiona: fija la versión exacta del proveedor.
- Los bloques de `imports.tf` se quedan como documentación de los IDs de importación: con los recursos ya en el estado, Terraform los ignora y no importan, cambian ni borran nada. Solo hay que quitarlos al reconstruir desde cero (paso 3 de abajo).

## Relación con el despliegue continuo

El CD (`.github/workflows/deploy.yml`) es el que despliega versiones y **no ejecuta Terraform** (ningún paso del workflow lo invoca); Terraform se corre a mano. No se pelean:

- **Imagen** del servicio y del Job: la cambia el CD en cada despliegue (`gcloud run jobs update --image` y `gcloud run services update --image`). Terraform la ignora (`ignore_changes`); `var.imagen_inicial` solo cuenta al crear desde cero.
- **Tráfico** del servicio: el CD lo manda a la última revisión o lo fija a la anterior en un rollback. Terraform lo ignora.
- **`client` / `client_version`**: los rellena `gcloud` en cada despliegue. Terraform los ignora.
- Todo lo demás (entorno, recursos, sondeo, escalado, cuentas, permisos) **lo manda Terraform**: un cambio hecho a mano en la consola aparecerá como diferencia en el siguiente `plan`, y un `apply` lo revertirá.

## Qué NO se gestiona y por qué

| Elemento | Motivo |
|---|---|
| Usuarios de la BD (`oskar_app`, `postgres`) | Su contraseña quedaría en texto plano en el estado. |
| Valores y versiones de los secretos | Igual: quedarían en el estado. Se cargan a mano (ver abajo). |
| Base `postgres` | La crea Cloud SQL y no es de la aplicación. |
| Cuenta de servicio de Compute por defecto | La crea Google; tocarla puede romper otros servicios. |
| Cuenta `firebase-adminsdk` | La crea Firebase y la administra él. |
| Roles de las personas del equipo | Se administran a mano; por eso los permisos de aquí son `*_iam_member` y no tocan los ajenos. |
| APIs habilitadas | Fuera del alcance de esta primera importación; deshabilitar una por error apaga servicios. |
| Sitio de Firebase Hosting `libreria-oskar` | Solo existe en el proveedor `google-beta`; se publica con Firebase CLI y `app/firebase.json`. |
| Escaneo de vulnerabilidades del repositorio | Fuera del alcance; `registro_imagenes.tf` lo ignora. |
| Bucket del estado `libreria-oskar-seminario-tfstate` | Tiene que existir antes que Terraform. |

## Reconstruir desde cero

Solo para un proyecto nuevo o tras perder los recursos. **Advertencia: los valores de los secretos no están en Terraform y deben cargarse a mano.**

1. Crear el proyecto, el bucket del estado (versionado) y habilitar las APIs (Cloud Run, Cloud SQL Admin, Secret Manager, Artifact Registry, IAM, IAM Credentials, STS, Firebase Hosting).
2. Si el proyecto cambia, ajustar `project_id`, `project_number` y las URLs en `variables.tf` y el bucket en `terraform.tf`.
3. Borrar o comentar `imports.tf` (no hay nada que importar).
4. Crear primero lo que no depende de la imagen ni de los secretos:
   `terraform apply -target=google_secret_manager_secret.secretos -target=google_artifact_registry_repository.oskar -target=google_sql_database_instance.oskar_db`
5. Cargar a mano una versión de cada secreto (`gcloud secrets versions add <secreto> --data-file=-`, sin imprimir el valor) y crear el usuario `oskar_app` con la misma contraseña que `db-password` (`app/docs/RUNBOOK.md` §8 y §6).
6. Construir y publicar una imagen y poner su etiqueta en `imagen_inicial` (Cloud Run no crea el servicio sin imagen).
7. `terraform apply` completo, ejecutar el Job (`gcloud run jobs execute oskar-migrar --region us-central1 --wait`) y publicar el frontend con Firebase CLI.

## Diferencias conocidas y puntos por verificar

El primer `plan` real (Terraform 1.17.0, proveedor google 8.8.1) confirmó sin diferencias el volumen `cloudsql`, el nombre del contenedor, el escalado (incluido el tope de 3 del servicio), el sondeo de arranque, el entorno y su orden, y el nombre visible de `oskar-api`. Queda:

- **`deletion_policy = "PREVENT"` en la base `libreria_oskar`**: es un atributo solo de Terraform. Tras importar, el estado traía `DELETE`, así que el `apply` de la importación mostró `1 to change`: solo actualizó ese valor en el estado, sin cambiar nada en la nube. Ya está aplicado y no vuelve a aparecer.
- **`deletion_protection` en Cloud SQL** está en `true` (guarda de Terraform) mientras `settings.deletion_protection_enabled` refleja la nube (`false`); activarla en GCP es otra tarea.
- **Cloud SQL**: no se declaran ventana de mantenimiento, `point_in_time_recovery_enabled` ni flags. El plan no mostró diferencias, pero la doc del recurso advierte que algunos campos no muestran diferencia si faltan en el HCL; antes de reconstruir desde cero conviene revisarlos.
