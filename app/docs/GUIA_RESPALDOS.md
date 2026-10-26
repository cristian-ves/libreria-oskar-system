# Guía de respaldos y continuidad — Librería Oskar

**Para:** la persona dueña de la librería. Las secciones 1, 2 y 5 se leen sin saber de informática; las secciones 3 y 4 las ejecuta una persona técnica.
**Preparada:** 26 de octubre de 2026, por el equipo de desarrollo.
**Cómo leer los estados:** cada procedimiento dice si **ya se ejecutó en el sistema real** o si **solo está documentado**.

---

## 1. Lo esencial en un minuto

- Tu información (libros, existencias, ventas y usuarios) vive en **una base de datos** en Google Cloud, dentro del proyecto `libreria-oskar-seminario`.
- Google hace **una copia automática cada día** y guarda las **últimas 7**. Sirven para deshacer un error reciente.
- Esas copias viven **dentro del mismo proyecto**. Si el proyecto se cierra o se elimina, las copias se van con él. Por eso hay que **guardar una copia propia fuera de Google Cloud** (sección 3): al menos **una vez al mes**, y **siempre una final** cuando termine el piloto.
- Cuando se acabe la prueba gratuita, el sistema **deja de ser gratis**. Hay que decidir si continúa o se cierra (sección 5).

---

## 2. Qué hay y cómo está protegido

| Qué | Dónde vive | Cómo se protege |
|---|---|---|
| **Datos del negocio** (libros, existencias, ventas, usuarios) | Base de datos `oskar-db` (Cloud SQL) | Copia automática diaria a las 08:00 UTC (7 copias), copia manual antes de cada cambio grande y la copia propia de la sección 3 (carpeta `libreria-oskar-seminario-respaldos`). |
| **Código del sistema** | Repositorio de GitHub `cristian-ves/libreria-oskar-system` | Historial completo. Con solo clonar el repositorio se tiene el código, la automatización de despliegue y la descripción de la nube. |
| **Cómo está armada la nube** | Carpeta `infra/` del repositorio (Terraform) | Se puede volver a crear a partir de esa carpeta. |
| **Pantallas del sitio web** | Firebase Hosting | No necesita respaldo: se reconstruye desde el código. |
| **Contraseñas y llaves del sistema** | Google Secret Manager (5 secretos) | No están en el código. Ver el párrafo siguiente. |
| **Correo que envía los avisos** | Cuenta de Gmail de la librería | Su "contraseña de aplicación" se puede generar de nuevo desde Google. |

**Los 5 secretos:** `db-password`, `jwt-secret`, `two-factor-key`, `mail-password` y `admin-password`. Casi todos se pueden volver a generar. **El que no:** `two-factor-key`. Si se pierde o se cambia, **todas las personas con verificación en dos pasos (2FA) tienen que volver a configurarla**. Guárdala en un gestor de contraseñas. Para leerla, una persona con acceso al proyecto ejecuta, en una pantalla privada y sin pegar el resultado en chats ni correos:

Cloud Shell (bash)
```bash
gcloud secrets versions access latest --secret=two-factor-key
```
Estado: **ejecutado en el sistema real** (leer secretos).

---

## 3. Sacar una copia propia (exportar la base de datos)

**Quién:** una persona técnica con acceso a Cloud Shell del proyecto. **Cuándo:** antes de cualquier cambio grande, una vez al mes y una final al terminar el piloto.

Cloud Shell (bash)
```bash
B=libreria-oskar-seminario-respaldos; F=copia-$(date +%F).gz
SA=$(gcloud sql instances describe oskar-db --format="value(serviceAccountEmailAddress)")

# Una sola vez: crear el bucket (una carpeta en la nube) y darle permiso a la base de datos
gcloud storage buckets create gs://$B --project=libreria-oskar-seminario --location=us-central1 --uniform-bucket-level-access
gcloud storage buckets add-iam-policy-binding gs://$B --member=serviceAccount:$SA --role=roles/storage.objectAdmin

# Cada vez: exportar y descargar
gcloud sql export sql oskar-db gs://$B/$F --database=libreria_oskar --offload -q
gcloud storage cp gs://$B/$F .
gzip -t $F && echo "archivo íntegro"
```

Después, **guarda el archivo fuera de Google Cloud** (disco externo o el almacenamiento personal de la persona responsable) y anota la fecha.

> **El archivo es confidencial:** contiene correos y datos de usuarios. No lo envíes por correo ni lo subas a un sitio público.

Estado: **ejecutado en el sistema real el 26 de octubre de 2026.** La exportación terminó, el archivo (`copia-2026-10-26.gz`, 8.5 KiB) se descargó íntegro (`gzip -t`) y contiene las 15 tablas de la base. El bucket `libreria-oskar-seminario-respaldos` ya existe (se creó a mano, no lo administra Terraform), así que los dos comandos de "una sola vez" no se repiten.

Para llevarte el archivo a tu computadora, en Cloud Shell usa el menú ⋮ → Descargar y escribe el nombre del archivo.

**Costo:** la exportación con `--offload` tiene un cargo pequeño adicional por uso. Quitar esa opción evita el cargo, pero la exportación usa la propia base mientras dura.

La **importación** de este archivo en una base nueva no se ha probado.

---

## 4. Si algo sale mal (restaurar)

- **Error de datos reciente** (por ejemplo, se borró o se alteró información): una persona técnica puede restaurar una de las últimas 7 copias automáticas. **La restauración reemplaza TODOS los datos por los de esa copia**; lo registrado después se pierde, y el sistema no está disponible mientras dura. Antes de hacerlo hay que crear una copia manual nueva y avisar a los usuarios. Pasos en `app/docs/RUNBOOK.md`, sección 7.5.
- **Pérdida máxima:** la recuperación a un minuto exacto (PITR) **no está activada** (la configuración revisada el 26 de octubre de 2026 no la muestra). Por eso, al restaurar solo se puede volver al momento de una de las copias diarias: se pueden perder **hasta 24 horas** de registros. Activarla tiene un costo adicional y puede requerir reiniciar la base; queda como decisión pendiente del responsable.
- **Copia manual en cualquier momento** (por ejemplo, antes de un cambio):

Cloud Shell (bash)
```bash
gcloud sql backups create --async --instance=oskar-db
gcloud sql backups list --instance oskar-db
```
Estado: la copia manual y su listado están **ejecutados en el sistema real**. La **restauración nunca se probó**: solo está documentada. Se recomienda ensayarla en una instancia aparte antes de necesitarla de verdad (nunca sobre `oskar-db`).

---

## 5. Cuando termine el piloto o la prueba gratuita

Hay tres caminos. Elige uno **antes** de que se acaben los créditos.

**A. Seguir usando el sistema**
1. Asociar al proyecto una **cuenta de facturación propia** (consola de Google Cloud → Facturación).
2. Activar alertas de presupuesto y revisarlas. Un presupuesto solo avisa, **no impide** que el gasto supere el límite.
3. Seguir haciendo la copia mensual de la sección 3.

**B. Cerrar el sistema**
1. Hacer la **copia final** (sección 3) y guardarla fuera de Google Cloud.
2. Guardar `two-factor-key` y los datos de acceso que se quieran conservar.
3. Detener las tareas programadas (el aviso diario de inventario) y apagar o eliminar los recursos que cobran: base de datos, servicio, Job, repositorio de imágenes y bucket de copias.
4. Revisar en Facturación que no queden cargos pendientes.
5. Si se elimina el proyecto completo, **se pierde todo** lo que no se haya exportado. La base de datos tiene una protección contra borrado en la configuración de Terraform: es intencional, y una persona técnica debe quitarla a conciencia.

**C. Traspasar el sistema a otra persona**
1. Agregarla como **Propietario** en el proyecto de Google Cloud (IAM), en la cuenta de facturación, en Firebase y como administradora del repositorio de GitHub (o transferirlo).
2. Después, **quitar los permisos temporales** de las personas que desarrollaron el sistema.

---

## 6. Revisión mensual (5 minutos)

1. Hacer la copia propia de la sección 3 y anotar la fecha.
2. Comprobar que haya una copia automática reciente: `gcloud sql backups list --instance oskar-db` debe mostrar una `SUCCESSFUL` de las últimas 24 horas.
3. Revisar el gasto en Facturación.
4. Entrar al sitio y confirmar que responde.
5. Confirmar quién tiene permisos de Propietario y quitar a quien ya no deba tenerlo.

---

## 7. Lo que NO se ha probado

- **Restaurar** una copia (sección 4): solo está documentado.
- **Importar** el archivo exportado en una base nueva: solo está documentado (`app/docs/RUNBOOK.md`, sección 7.4).
- **PITR** (volver a un minuto exacto): no está activado. La pérdida máxima ante un error es de hasta un día (sección 4).

Referencia técnica completa: `app/docs/RUNBOOK.md`, secciones 7 (respaldos), 8 (rotar secretos) y 10 (límites conocidos).
