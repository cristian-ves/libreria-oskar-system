# Pruebas de aceptación en producción — Librería Oskar

Checklist manual por rol para validar el sistema desplegado en https://libreria-oskar.web.app. Cada caso cita el requisito de `docs/PROJECT_SPECS.md` (sección y línea) que verifica; los casos de alertas citan `docs/RUNBOOK.md` §9.4 y el script del Job.

## 1. Objetivo, alcance y cómo usar este documento

**Objetivo.** Confirmar, con una persona ejecutando a mano en producción, que cada rol puede hacer lo que el sistema promete y no puede hacer lo que tiene prohibido.

**Alcance.** Funciones existentes según `PROJECT_SPECS.md` y el código: login y 2FA, recuperación de contraseña, catálogo público, libros, categorías, inventario y kardex, ventas, usuarios, los 7 reportes con Excel y PDF, lector de códigos con cámara, permisos por rol y alertas diarias de stock mínimo. Lo que no se cubre está en la sección 7.

**Cómo usar este documento.**
1. **No marques este archivo del repositorio.** Copia `app/docs/PRUEBAS_ACEPTACION.md` a una carpeta FUERA del repositorio (por ejemplo `~/pruebas-oskar/PRUEBAS_ACEPTACION-AAAA-MM-DD.md`) y marca solo esa copia. El original queda siempre con todos los casos en ☐.
2. Ejecuta los casos en el orden de la sección 2.6. Cada caso debe poder verificarse en menos de 3 minutos.
3. Cambia la columna Estado de cada fila:

| Símbolo | Significado |
|---|---|
| ☐ | Pendiente |
| ✅ | Aprobado: el resultado coincide con el esperado |
| ❌ | Falló: el resultado no coincide |
| ➖ | No aplica: falta una precondición indicada en el caso (escribe cuál en Notas) |

4. **Evidencia.** 📷 en Notas = guarda una captura FUERA del repositorio con el nombre del ID (por ejemplo `AC-ADM-07.png`). No subas capturas al repositorio: pueden mostrar nombres, correos o códigos 2FA. Nunca captures la clave del QR ni los códigos de respaldo.
5. **Si un caso falla:** márcalo ❌, toma la captura, anota hora, navegador y mensaje exacto, regístralo en la tabla de defectos (sección 8) y continúa con el siguiente caso que no dependa de él. Si el fallo deja un dato `PRUEBA-` en un estado inesperado (por ejemplo, stock distinto del esperado), anótalo y no intentes "arreglarlo" tocando datos reales. Si el fallo afecta datos SIN el prefijo `PRUEBA-`, detén las pruebas y avisa al dueño.

**Regla de oro.** Producción tiene datos reales de la librería. Solo se crean, modifican, venden, ajustan, desactivan o eliminan datos cuyo nombre empieza con `PRUEBA-`. Si un paso te lleva a un libro, venta, categoría o usuario sin ese prefijo, solo míralo: no confirmes ninguna acción sobre él.

## 2. Preparación

### 2.1 Entorno
- URL: https://libreria-oskar.web.app (frontend en Firebase Hosting; la API responde en la misma URL bajo `/api`, RUNBOOK §9.2).
- Una PC con Chrome o Firefox actualizados.
- Un celular con Chrome (para la cámara, el QR del 2FA y los casos móviles).
- Una app autenticadora TOTP instalada en el celular (por ejemplo Google Authenticator, Microsoft Authenticator o Aegis). La compatibilidad con apps reales figura como no verificada en PROJECT_SPECS §4.6 (L1022): si una app falla, anota cuál y prueba con otra.
- Una ventana privada o un segundo navegador para los casos de visitante y de sesiones simultáneas.

### 2.2 Cuentas necesarias (sin contraseñas en este documento)
Las contraseñas se eligen al crear la cuenta y se guardan en un gestor de contraseñas, nunca en este archivo ni en su copia. La contraseña debe tener al menos 10 caracteres, una letra y un número (PROJECT_SPECS §5.2, L1202).

| Cuenta | Para qué | Cómo se crea |
|---|---|---|
| Administrador real del dueño | Solo para crear la cuenta de Administrador de prueba (2.3) y, si hace falta, ejecutar los casos de alertas | Ya existe; no se usa para nada más |
| Cuenta de Administrador de prueba (nombre `PRUEBA-Administrador`) | Todos los casos AC-ADM | El Administrador real la crea en `/usuarios` → "Nuevo usuario", rol Administrador (2.3) |
| Cuenta de Empleado de prueba (nombre `PRUEBA-Empleado`) | Todos los casos AC-EMP y los de recuperación de contraseña | La crea la cuenta de Administrador de prueba en el caso AC-ADM-03 |
| Cuenta con rol Usuario de prueba | Casos AC-USR con sesión | **La aplicación no permite crearla**: `POST /api/usuarios` solo acepta Administrador o Empleado (`backend/src/services/usuario.service.js:8`). Solo se usa si ya existe una cuenta con rol Usuario cuyo nombre empiece con `PRUEBA-`; si no, esos casos se marcan ➖ |

Correos de las cuentas de prueba: usa buzones de prueba a los que tenga acceso quien ejecuta (la recuperación de contraseña envía un correo real). No uses correos personales del dueño ni de clientes.

### 2.3 Alta de la cuenta de Administrador de prueba
1. Inicia sesión con el Administrador real y abre `/usuarios` → "Nuevo usuario".
2. Nombre completo `PRUEBA-Administrador`, correo de un buzón de prueba, contraseña segura, Rol Administrador, Estado Activo → "Crear usuario".
3. Pulsa "Salir" (cierra la sesión del Administrador real; no la vuelvas a usar salvo para alertas).

### 2.4 Alta del autenticador (2FA) en cada cuenta de prueba
En producción el 2FA es obligatorio para Administrador y Empleado (PROJECT_SPECS §4.6, L1022; §6.2, L1376). La primera vez que una cuenta de prueba inicia sesión:
1. En `/login` escribe correo y contraseña → "Ingresar al Sistema". Aparece el paso de configuración con un QR.
2. En el celular, abre la app autenticadora y escanea el QR (o, en el celular, usa el enlace o copia la clave que aparece bajo "O escribe esta clave en la app:").
3. Escribe el código de 6 dígitos en "Código que muestra la app" y confírmalo.
4. Aparecen 10 códigos de respaldo: usa "Descargar .txt" y guárdalos FUERA del repositorio y fuera de la copia de este documento. Marca "Ya los guardé" → "Continuar".
5. El token temporal de este paso vence a los 10 minutos; si recargas la página vuelves a las credenciales (PROJECT_SPECS §5.2, L1254).

### 2.5 Convención `PRUEBA-` y datos que se crearán
Todo dato creado por estas pruebas lleva el prefijo `PRUEBA-` en su nombre, título, cliente, motivo o nota.

| Dato | Nombre | Lo crea |
|---|---|---|
| Categoría para libros de prueba | `PRUEBA-Categoria` | AC-ADM-06 |
| Categoría temporal | `PRUEBA-Cat-Temporal` (luego `PRUEBA-Cat-Renombrada`, se elimina) | AC-ADM-07 |
| Libro A (con ISBN, con precio) | `PRUEBA-Libro-A`, ISBN `9780000000002` | AC-ADM-10 |
| Libro B (registrado por el Empleado) | `PRUEBA-Libro-B`, ISBN `9780000000019` | AC-EMP-05 |
| Libro C (sin ISBN, para baja lógica) | `PRUEBA-Libro-C` | AC-ADM-11 |
| Ventas de prueba | Cliente `PRUEBA-Cliente`, nota `PRUEBA-venta` | AC-ADM-19, AC-EMP-11 |

Los dos ISBN tienen dígito verificador válido y no corresponden a libros de la librería. Si al consultarlos el sistema dice "Libro encontrado en catálogo" con un título SIN `PRUEBA-`, detente: no ingreses stock a ese libro y anótalo.

Advertencias para el dueño antes de empezar:
- Los libros de prueba con precio aparecen en el catálogo público hasta la limpieza; conviene ejecutar en horario de poca visita.
- Las ventas de prueba se anulan durante las pruebas, pero quedan en el listado de ventas, en el kardex y en los reportes como anuladas (las anulaciones no se borran, PROJECT_SPECS §6.11, L1478).
- La limpieza de los datos `PRUEBA-` se hace aparte; este documento no la describe.

### 2.6 Orden recomendado de ejecución
1. Sección 2 completa (cuenta de Administrador de prueba y su 2FA).
2. AC-TRV-15 (arranque en frío), justo al empezar, si el sistema llevaba un rato sin uso.
3. Día 1, ANTES de crear libros de prueba: AC-TRV-14 (alertas en seco) y, solo si dio `alertas` = 0, AC-TRV-17 (caso sin alertas).
4. AC-ADM-01 a AC-ADM-29 en orden (crean la cuenta de Empleado de prueba, las categorías, los libros y una venta).
5. AC-TRV-01 (alta del 2FA del Empleado) y luego AC-EMP-01 a AC-EMP-17.
6. AC-ADM-30 (el Administrador anula la venta del Empleado).
7. AC-USR-01 a AC-USR-08.
8. AC-TRV-02 a AC-TRV-13 en orden.
9. AC-TRV-16 (alertas reales) y, el mismo día, AC-TRV-18 (segunda ejecución). Si AC-TRV-17 se ejecutó el día 1, estos van otro día, porque ese día ya quedó cerrado.

## 3. Casos del Administrador

Sesión: cuenta de Administrador de prueba, salvo que el caso diga otra cosa.

| ID | Requisito (PROJECT_SPECS.md) | Pasos | Resultado esperado | Estado | Notas o evidencia |
|---|---|---|---|---|---|
| AC-ADM-01 | §6.1 L1367, §6.2 L1376 | 1. Abre `/login` en la PC.<br>2. Ingresa con la cuenta de Administrador de prueba.<br>3. Escribe el código actual de la app autenticadora → "Verificar". | Entra sin errores y queda en `/registrar` ("Módulo de Recepción e Inventario"). El menú muestra Catálogo, Nosotros, Registrar, Inventario, Ventas y el grupo Administración. | ☐ | |
| AC-ADM-02 | §5.1 L1188-1191, §5.5 L1337 | 1. Abre el menú.<br>2. Revisa el grupo Administración.<br>3. Entra a Usuarios, Categorías, Gestión de libros y Reportes, uno tras otro. | Administración tiene Usuarios, Categorías, Gestión de libros y Reportes; las cuatro vistas cargan sin "Acceso denegado". | ☐ | |
| AC-ADM-03 | §4.3 L842, §5.2 L1199 | 1. `/usuarios` → "Nuevo usuario".<br>2. Nombre `PRUEBA-Empleado`, correo de un buzón de prueba, contraseña segura, Rol Empleado, Estado Activo.<br>3. "Crear usuario". | El formulario se cierra, el listado se recarga y muestra `PRUEBA-Empleado` con rol Empleado y estado Activo. | ☐ | |
| AC-ADM-04 | §4.3 L842, §5.2 L1202 | 1. "Nuevo usuario".<br>2. Nombre `PRUEBA-Duplicado`, el MISMO correo de `PRUEBA-Empleado`, contraseña segura, Rol Empleado.<br>3. "Crear usuario".<br>4. Repite con otro correo y contraseña `abc` (corta, sin número). | Paso 3: "Ya existe un usuario con ese correo electrónico." y no se crea la cuenta. Paso 4: mensaje de los requisitos de contraseña (10 caracteres, letra y número) y no se crea la cuenta. | ☐ | |
| AC-ADM-05 | §4.3 L843-844, §5.2 L1199-1202 | 1. En `PRUEBA-Empleado`, edita: cambia el nombre a `PRUEBA-Empleado-Editado` → "Guardar cambios"; vuelve a ponerlo como `PRUEBA-Empleado`.<br>2. Desactiva `PRUEBA-Empleado` → "Confirmar desactivación".<br>3. Filtra por estado inactivo y luego reactívalo → "Confirmar activación".<br>4. Intenta desactivar la cuenta de Administrador de prueba (la propia). | Paso 1: el nombre cambia y se restaura. Pasos 2-3: el estado pasa a Inactivo y luego a Activo; el filtro lo encuentra. Paso 4: la lista indica que la propia cuenta no se puede desactivar (o el servidor lo rechaza con mensaje) y sigue activa. | ☐ | |
| AC-ADM-06 | §4.3 L838, §5.2 L1207 | 1. `/categorias` → "Nueva categoría".<br>2. Nombre `PRUEBA-Categoria` → "Crear categoría".<br>3. Busca "PRUEBA" en "Buscar categorías...". | Aparece `PRUEBA-Categoria` con 0 libros; la búsqueda la encuentra. | ☐ | |
| AC-ADM-07 | §4.3 L838-840, §5.2 L1207-1210 | 1. "Nueva categoría" `PRUEBA-Cat-Temporal` → "Crear categoría".<br>2. Renómbrala a `PRUEBA-Cat-Renombrada` → "Guardar cambios".<br>3. Elimínala → "Confirmar eliminación". | Se crea, cambia de nombre y desaparece del listado (no tenía libros). | ☐ | |
| AC-ADM-08 | §4.3 L838-839 | 1. "Nueva categoría" con nombre `prueba-categoria` (minúsculas) → "Crear categoría".<br>2. Intenta crear una con nombre vacío. | Paso 1: rechazo por duplicado (sin distinguir mayúsculas) y no se crea. Paso 2: "El nombre de la categoría es obligatorio." | ☐ | |
| AC-ADM-09 | §6.4 L1398, §8.3 L1609 | 1. `/registrar`, escribe `9780000000003` (dígito verificador incorrecto) en "Código ISBN" → "Consultar". | Mensaje de ISBN inválido del servidor; no abre el formulario de registro ni crea nada. | ☐ | |
| AC-ADM-10 | §6.4 L1398, §8.3 L1609, §3.4 L717 | 1. `/registrar`, escribe `9780000000002` → "Consultar".<br>2. En el formulario: Título `PRUEBA-Libro-A`, Autor `PRUEBA-Autor`, Categoría `PRUEBA-Categoria`, Reseña `PRUEBA-reseña`, Precio `1.00`, Cantidad inicial `10`, Stock mínimo `5`, una bodega.<br>3. "Registrar Libro". | Muestra el resultado del registro con 10 unidades; NO aparece el aviso "El libro quedó pendiente de asignación de precio por el Administrador." Si la consulta traía sugerencia externa, se sustituyó por los datos `PRUEBA-`. | ☐ | 📷 |
| AC-ADM-11 | §6.4 L1398 | 1. "Registrar otro" → "Agregar manualmente sin ISBN".<br>2. Título `PRUEBA-Libro-C`, Autor `PRUEBA-Autor`, Categoría `PRUEBA-Categoria`, Reseña `PRUEBA-reseña`, Precio `1.00`, Cantidad inicial `1`, Stock mínimo `0`, una bodega.<br>3. "Registrar Libro". | Se registra sin ISBN con 1 unidad. | ☐ | |
| AC-ADM-12 | §6.4 L1398 (L1400) | 1. "Agregar manualmente sin ISBN".<br>2. Deja Título y Reseña vacíos; en Autor escribe `Autor de Biblioteca Internacional`. | "Registrar Libro" queda deshabilitado y la línea bajo el botón indica lo que falta, incluido "Autor (nombre real)". No se registra nada. | ☐ | |
| AC-ADM-13 | §6.5 L1410, §3.4 L717 | 1. "Registrar otro", consulta `9780000000002`.<br>2. Verifica "Libro encontrado en catálogo" con `PRUEBA-Libro-A` y su precio `Q 1.00`.<br>3. Anota el stock, elige la bodega, Cantidad `2` → "Confirmar Ingreso". | El resultado muestra stock anterior y actualizado (+2). | ☐ | |
| AC-ADM-14 | §4.3 L864, §5.2 L1237 | 1. En el catálogo abre la ficha de `PRUEBA-Libro-A` → "Cambiar precio".<br>2. "Nuevo precio (Q)" = `-5` → "Guardar precio".<br>3. Cambia a `2.50` → "Guardar precio". | Paso 2: mensaje de error y el precio no cambia. Paso 3: el modal se cierra y la ficha muestra `Q 2.50`. | ☐ | |
| AC-ADM-15 | §6.9 L1453, §5.2 L1249 | 1. Abre `/inventario`.<br>2. Revisa las tarjetas de resumen.<br>3. En "Existencias", busca `PRUEBA`. | Cargan los KPI (unidades, bajo stock, agotados, obsoletos, sin precio) y la tabla muestra `PRUEBA-Libro-A` y `PRUEBA-Libro-C` con su bodega y stock. | ☐ | |
| AC-ADM-16 | §6.6 L1419, §3.4 L717 | 1. En Existencias, fila de `PRUEBA-Libro-A` → "Salida".<br>2. Cantidad `1`, motivo `PRUEBA-salida` → "Confirmar Salida". | El modal se cierra y el stock baja en 1. | ☐ | |
| AC-ADM-17 | §6.6 L1419 (L1427) | 1. Fila de `PRUEBA-Libro-C` → "Salida".<br>2. Cantidad mayor que su stock (por ejemplo `5`) → "Confirmar Salida". | Error de stock insuficiente (409) en el modal; el stock no cambia y no se crea movimiento. | ☐ | |
| AC-ADM-18 | §6.7 L1432, §3.4 L717 | 1. Fila de `PRUEBA-Libro-A` → "Ajuste".<br>2. Escribe el MISMO stock actual, motivo `PRUEBA-ajuste` → "Fijar Stock".<br>3. Cambia a stock actual − 1 → "Fijar Stock".<br>4. Abre "Kardex de Movimientos" y filtra o busca `PRUEBA-Libro-A`. | Paso 2: error porque el stock nuevo es igual al actual. Paso 3: el stock queda en el valor fijado. Paso 4: aparecen Ingreso (registro), Ingreso (+2), Salida y Ajuste, con usuario `PRUEBA-Administrador`. | ☐ | 📷 |
| AC-ADM-19 | §6.10 L1465, §4.3 L878 | 1. `/ventas` → "Nueva venta".<br>2. Busca `PRUEBA-Libro-A`, agrégalo, cantidad 1.<br>3. Método Efectivo, Cliente `PRUEBA-Cliente`, Notas `PRUEBA-venta`.<br>4. Anota el stock antes → "Registrar venta". | Navega al detalle con "Venta V-xxxxxx registrada correctamente." (número correlativo). En `/inventario` el stock de `PRUEBA-Libro-A` bajó 1 y el kardex tiene una Salida con motivo "Venta V-xxxxxx". | ☐ | 📷 |
| AC-ADM-20 | §6.10 L1465 (L1473), §5.2 L1276 | 1. "Nueva venta", agrega `PRUEBA-Libro-A` cantidad 1.<br>2. "Descuento (Q)" mayor que el subtotal (por ejemplo `100`), Cliente `PRUEBA-Cliente` → "Registrar venta". | Mensaje de error; las líneas se conservan y no se crea venta. | ☐ | |
| AC-ADM-21 | §6.11 L1478, §4.3 L881 | 1. Abre el detalle de la venta de AC-ADM-19 → "Anular venta".<br>2. Deja el motivo vacío → "Confirmar anulación".<br>3. Motivo `PRUEBA-anulación` → "Confirmar anulación". | Paso 2: "El motivo de la anulación es obligatorio." Paso 3: estado Anulada, desaparece "Anular venta" y el stock de `PRUEBA-Libro-A` vuelve a subir 1 (Ingreso "Anulación de venta V-xxxxxx: PRUEBA-anulación" en el kardex). | ☐ | |
| AC-ADM-22 | §5.2 L1213, §4.3 L857 | 1. `/libros/gestion`, busca `PRUEBA-Libro-C` → "Editar".<br>2. Cambia la reseña a `PRUEBA-reseña-editada` → guardar.<br>3. "Editar" de nuevo e ingresa el ISBN `9780000000002` (el de `PRUEBA-Libro-A`) → guardar. | Paso 2: el cambio se guarda; precio y stock no cambian. Paso 3: rechazo por ISBN duplicado (409) y el libro sigue sin ISBN. | ☐ | |
| AC-ADM-23 | §5.2 L1213, §6.8 L1445, §4.3 L858 | 1. En `/libros/gestion`, `PRUEBA-Libro-C` → "Desactivar" y confirma.<br>2. En una ventana privada busca `PRUEBA-Libro-C` en `/catalogo`.<br>3. Vuelve y pulsa "Reactivar". | Paso 1: estado Inactivo. Paso 2: no aparece en el catálogo. Paso 3: estado Activo y vuelve al catálogo. Inventario e historial se conservan. | ☐ | |
| AC-ADM-24 | §5.2 L1221, §4.3 L870-877 | 1. `/reportes`, elige "Corte de caja diario".<br>2. "Fecha del corte" = hoy.<br>3. "Descargar Excel" y "Descargar PDF". | Muestra ventas completadas, formas de pago, vendedores y anuladas (incluida la venta `PRUEBA-` anulada). Se descargan un `.xlsx` y un `.pdf` que abren y tienen título, filtros y los mismos datos. | ☐ | 📷 |
| AC-ADM-25 | §5.2 L1221, §4.3 L870-877 | 1. "Resumen del período".<br>2. Desde = hace 7 días, Hasta = hoy.<br>3. "Descargar Excel" y "Descargar PDF".<br>4. Borra "Desde" e intenta consultar. | Pasos 1-3: métricas del período y comparación con el anterior; ambos archivos abren. Paso 4: "Indica las fechas inicial y final." | ☐ | |
| AC-ADM-26 | §5.2 L1221, §4.3 L870-877 | 1. "Libros más vendidos", rango de los últimos 30 días.<br>2. "Descargar Excel" y "Descargar PDF". | Ranking con posición, unidades e ingresos; la venta `PRUEBA-` anulada NO suma unidades. Ambos archivos abren. | ☐ | |
| AC-ADM-27 | §5.2 L1221, §4.3 L870-877 | 1. "Reposición sugerida", filtra la categoría `PRUEBA-Categoria`.<br>2. "Descargar Excel" y "Descargar PDF". | Filas de los libros `PRUEBA-` con existencias y stock mínimo; "Cantidad sugerida" = "No disponible". Ambos archivos abren con el mismo filtro. | ☐ | |
| AC-ADM-28 | §5.2 L1221, §4.3 L870-877 | 1. "Inventario valorizado", categoría `PRUEBA-Categoria`.<br>2. "Descargar Excel" y "Descargar PDF".<br>3. "Kardex", busca el libro `PRUEBA-Libro-A` (al menos 2 caracteres) y selecciónalo.<br>4. "Descargar Excel" y "Descargar PDF". | Inventario: existencias por bodega con costo y valor "No disponible" y la advertencia de que no hay costos de adquisición. Kardex: los movimientos de AC-ADM-13 a AC-ADM-21. Los cuatro archivos abren. | ☐ | |
| AC-ADM-29 | §5.2 L1221, §4.3 L870-877 | 1. "Listado de ventas", Desde = Hasta = hoy, Estado Anulada.<br>2. "Descargar Excel" y "Descargar PDF". | Aparece la venta de AC-ADM-19 con estado Anulada y su motivo; ambos archivos abren con el filtro aplicado. | ☐ | |
| AC-ADM-30 | §6.11 L1478, §4.3 L881 | (Después de AC-EMP-11.)<br>1. `/ventas`, abre la venta del Empleado (cliente `PRUEBA-Cliente`, vendedor `PRUEBA-Empleado`).<br>2. "Anular venta", motivo `PRUEBA-anulación` → "Confirmar anulación". | La venta queda Anulada y el stock del libro vendido sube 1. | ☐ | |

## 4. Casos del Empleado

Sesión: cuenta de Empleado de prueba (2FA dado de alta en AC-TRV-01).

| ID | Requisito (PROJECT_SPECS.md) | Pasos | Resultado esperado | Estado | Notas o evidencia |
|---|---|---|---|---|---|
| AC-EMP-01 | §5.1 L1195, §5.5 L1337 | 1. Inicia sesión con la cuenta de Empleado de prueba.<br>2. Abre el menú. | Ve Catálogo, Nosotros, Registrar, Inventario y Ventas, y "Seguridad de la cuenta". NO ve el grupo Administración. | ☐ | |
| AC-EMP-02 | §6.5 L1410, §8.1 L1590 | 1. `/registrar`, consulta `9780000000002`.<br>2. Revisa la ficha de `PRUEBA-Libro-A`.<br>3. Cantidad `1`, una bodega → "Confirmar Ingreso". | La ficha NO muestra precio ni "Fijar precio" (PROJECT_SPECS §8.2 L1606). El ingreso se registra y el stock sube 1. | ☐ | |
| AC-EMP-03 | §6.6 L1419, §8.1 L1595 | 1. `/inventario`, `PRUEBA-Libro-A` → "Salida".<br>2. Cantidad `1`, motivo `PRUEBA-salida-empleado` → "Confirmar Salida". | El stock baja 1. | ☐ | |
| AC-EMP-04 | §6.7 L1432, §8.1 L1596-1597 | 1. `PRUEBA-Libro-A` → "Ajuste", stock actual − 1, motivo `PRUEBA-ajuste-empleado` → "Fijar Stock".<br>2. Abre "Kardex de Movimientos". | El stock queda en el valor fijado; el kardex muestra la Salida y el Ajuste del Empleado con su nombre de usuario. | ☐ | |
| AC-EMP-05 | §6.4 L1398 (L1406), §8.3 L1609 | 1. `/registrar`, consulta `9780000000019`.<br>2. Revisa el formulario.<br>3. Título `PRUEBA-Libro-B`, Autor `PRUEBA-Autor`, Categoría `PRUEBA-Categoria`, Reseña `PRUEBA-reseña`, Cantidad `3`, Stock mínimo `1`, una bodega → "Registrar Libro". | No hay campo Precio: aparece "El administrador asignará el precio". El resultado avisa "El libro quedó pendiente de asignación de precio por el Administrador." | ☐ | 📷 |
| AC-EMP-06 | §6.8 L1445, §8.3 L1609 (L1615) | 1. Abre `/catalogo` y la ficha de `PRUEBA-Libro-B`.<br>2. Abre la ficha de `PRUEBA-Libro-A`. | `PRUEBA-Libro-B` muestra "Precio por confirmar"; `PRUEBA-Libro-A` muestra su precio. En ninguna aparece "Fijar precio" ni "Cambiar precio" (negativo: el Empleado no fija precios). | ☐ | |
| AC-EMP-07 | §5.1 L1188, §8.1 L1584 | 1. Escribe en la barra de direcciones `/usuarios`. | Pantalla "Acceso denegado" con "Ir al Catálogo de Libros" (negativo: no administra usuarios). | ☐ | |
| AC-EMP-08 | §5.1 L1189, §4.3 L838-840 | 1. Escribe `/categorias`. | "Acceso denegado" (negativo: no administra categorías). | ☐ | |
| AC-EMP-09 | §5.1 L1190, §8.1 L1576 | 1. Escribe `/libros/gestion`. | "Acceso denegado" (negativo: no edita ni desactiva libros). | ☐ | |
| AC-EMP-10 | §5.1 L1191, §4.3 L883 | 1. Escribe `/reportes`. | "Acceso denegado" (negativo: no consulta ni exporta reportes). | ☐ | |
| AC-EMP-11 | §6.10 L1465, §8.1 L1598 | 1. `/ventas` → "Nueva venta".<br>2. Busca `PRUEBA-Libro-A`, cantidad 1, Método Transferencia, Cliente `PRUEBA-Cliente`, Notas `PRUEBA-venta`.<br>3. Anota el stock → "Registrar venta". | Muestra "Venta V-xxxxxx registrada correctamente."; el stock de `PRUEBA-Libro-A` baja 1. | ☐ | |
| AC-EMP-12 | §5.2 L1282 (L1286), §8.1 L1600 | 1. En el detalle de la venta de AC-EMP-11, busca el botón "Anular venta".<br>2. Abre también la venta anulada de AC-ADM-19. | No aparece "Anular venta" en ninguna (negativo: el Empleado no anula ventas). Ve el detalle completo de ambas. | ☐ | |
| AC-EMP-13 | §5.2 L1276 (L1279) | 1. "Nueva venta", busca `PRUEBA-Libro-B`. | El resultado muestra "Sin precio" y el botón "Agregar" está deshabilitado. | ☐ | |
| AC-EMP-14 | §6.10 L1465 (L1472) | 1. "Nueva venta", agrega `PRUEBA-Libro-C` (1 unidad en stock).<br>2. Sube la cantidad a 5 con "+" o escribiéndola → Cliente `PRUEBA-Cliente` → "Registrar venta". | El buscador o el servidor rechazan la cantidad por stock insuficiente (409 con el título del libro); no se crea venta y el stock no cambia. | ☐ | |
| AC-EMP-15 | §5.2 L1271 | 1. `/ventas`, filtra por fechas con "Desde" posterior a "Hasta".<br>2. Corrige el rango a hoy. | Paso 1: aviso de rango inválido y no consulta. Paso 2: lista las ventas de hoy, incluidas las `PRUEBA-`. | ☐ | |
| AC-EMP-16 | §6.9 L1453, §8.1 L1593-1594 | 1. `/inventario`.<br>2. Revisa resumen y existencias. | Ve KPI y existencias igual que el Administrador; la tabla de inventario no muestra precios. | ☐ | |
| AC-EMP-17 | §5.2 L1288 | 1. Pulsa el chip con su nombre (o "Seguridad de la cuenta").<br>2. Revisa `/cuenta/seguridad`. | Muestra 2FA activo y el número de códigos de respaldo restantes. | ☐ | |

## 5. Casos de Usuario (sin acceso) y de visitantes sin sesión

Casos de visitante: ventana privada, sin sesión. Casos con sesión de rol Usuario: solo si existe una cuenta `PRUEBA-` con ese rol (sección 2.2); si no, ➖.

| ID | Requisito (PROJECT_SPECS.md) | Pasos | Resultado esperado | Estado | Notas o evidencia |
|---|---|---|---|---|---|
| AC-USR-01 | §6.8 L1445, §5.2 L1230 | 1. Abre https://libreria-oskar.web.app sin sesión.<br>2. Escribe `PRUEBA` en el buscador.<br>3. Cambia el tamaño de página y avanza de página si hay más de una. | Redirige a `/catalogo`; la búsqueda muestra `PRUEBA-Libro-A`, `B` y `C`; la URL refleja `q`; la paginación funciona. El menú solo tiene Catálogo y Nosotros. | ☐ | |
| AC-USR-02 | §5.2 L1230 (L1231) | 1. En `/catalogo`, filtra por la categoría `PRUEBA-Categoria`.<br>2. Quita el filtro. | Solo aparecen los libros `PRUEBA-`; al quitar el filtro vuelve el catálogo completo. | ☐ | |
| AC-USR-03 | §6.8 L1445, §5.2 L1237 | 1. Abre la ficha de `PRUEBA-Libro-A`.<br>2. Revisa precio y disponibilidad. | Muestra la ficha con su precio y la disponibilidad por sucursal y bodega; NO aparece "Fijar precio". | ☐ | |
| AC-USR-04 | §6.8 L1445 (L1450) | 1. Copia la URL de la ficha de `PRUEBA-Libro-C`.<br>2. Cambia la parte final de la URL por texto inventado (por ejemplo `/catalogo/no-existe-abc123`). | Muestra la pantalla de libro no encontrado o un mensaje de error legible con opción de reintentar; nunca una pantalla en blanco. | ☐ | |
| AC-USR-05 | §5.5 L1337, §5.1 L1182-1193 | 1. Sin sesión, escribe `/inventario`, luego `/reportes`, luego `/cuenta/seguridad`.<br>2. Escribe `/ruta-que-no-existe`. | Paso 1: cada ruta redirige a `/login`. Paso 2: redirige a `/catalogo`. | ☐ | |
| AC-USR-06 | §5.1 L1179 | 1. Abre `/nosotros`. | Muestra la información institucional (sucursales, horarios, contacto). | ☐ | |
| AC-USR-07 | §8.2 L1603, §6.2 L1376 | (Precondición: cuenta `PRUEBA-` con rol Usuario.)<br>1. Inicia sesión con ella. | No se le pide alta de 2FA. Tras entrar, `/registrar` muestra "Acceso denegado" y el menú solo tiene Catálogo, Nosotros y "Seguridad de la cuenta". | ☐ | |
| AC-USR-08 | §8.1 L1570, §5.5 L1337 | (Precondición: AC-USR-07.)<br>1. Escribe `/inventario`, `/ventas` y `/usuarios`. | Las tres muestran "Acceso denegado". | ☐ | |

## 6. Casos transversales

| ID | Requisito (PROJECT_SPECS.md / RUNBOOK.md) | Pasos | Resultado esperado | Estado | Notas o evidencia |
|---|---|---|---|---|---|
| AC-TRV-01 | §6.2 L1376, §5.2 L1254 | 1. Primer login de la cuenta de Empleado de prueba.<br>2. Sigue la sección 2.4 (QR, código, códigos de respaldo, "Ya los guardé", "Continuar"). | No entra sin 2FA: pide configurarlo. Tras "Continuar" queda en `/registrar`. Los 10 códigos se ven una sola vez. | ☐ | No capturar QR ni códigos |
| AC-TRV-02 | §5.2 L1254 (L1256) | 1. Cierra sesión e inicia otra vez con el Empleado de prueba.<br>2. Escribe `000000` → "Verificar".<br>3. "Intentar de nuevo" y escribe el código actual. | Paso 2: "Código inválido o vencido." con el campo deshabilitado y el botón "Intentar de nuevo". Paso 3: entra. | ☐ | |
| AC-TRV-03 | §4.6 L1022 (L1029), §5.2 L1288 | 1. Login del Empleado de prueba → "Usar un código de respaldo".<br>2. Escribe uno de sus códigos → "Verificar".<br>3. Abre `/cuenta/seguridad`. | Entra con el código de respaldo; la vista muestra 9 códigos restantes. Tacha ese código en tu archivo `.txt`. | ☐ | |
| AC-TRV-04 | §5.2 L1288 (L1290) | 1. En `/cuenta/seguridad`, regenera los códigos con el código actual de la app.<br>2. Guarda los nuevos fuera del repo → "Listo". | Muestra 10 códigos nuevos; al volver indica 10 restantes. Los anteriores dejan de servir. | ☐ | |
| AC-TRV-05 | §6.1 L1367, §4.3 L845 | 1. En `/login` ingresa el correo del Empleado de prueba con una contraseña incorrecta. | Mensaje "Credenciales inválidas"; no avanza al paso del código. | ☐ | |
| AC-TRV-06 | §6.12 L1490, §5.2 L1261 | 1. En `/login` pulsa "¿Olvidaste tu contraseña?".<br>2. Escribe el correo del Empleado de prueba → enviar.<br>3. Repite con `inexistente-prueba@example.com` en "Usar otro correo". | En ambos casos aparece EXACTAMENTE el mismo mensaje genérico (no revela si la cuenta existe). Llega un correo al buzón de prueba con el botón "Restablecer contraseña" (puede tardar). | ☐ | 📷 del correo |
| AC-TRV-07 | §6.12 L1490, §5.2 L1261 (L1263) | 1. Abre el enlace del correo.<br>2. Revisa la barra de direcciones.<br>3. Escribe una contraseña corta (`abc`) en ambos campos → enviar.<br>4. Escribe dos contraseñas válidas distintas entre sí → enviar. | Paso 2: la URL queda en `/restablecer` sin `#token=`. Paso 3: mensaje de la política de contraseña. Paso 4: "Las contraseñas no coinciden." El enlace sigue usable. | ☐ | |
| AC-TRV-08 | §6.12 L1490 (L1495-1497) | 1. Con sesión del Empleado de prueba abierta en OTRO navegador, sigue en la pestaña del enlace.<br>2. Escribe una contraseña nueva válida dos veces → enviar.<br>3. En el otro navegador, navega a `/inventario`.<br>4. "Ir a iniciar sesión" con la contraseña nueva. | Paso 2: "Contraseña actualizada". Llega un correo de aviso de cambio. Paso 3: la sesión vieja deja de valer y lleva a `/login`. Paso 4: pide el código 2FA (sigue activo) y entra. | ☐ | |
| AC-TRV-09 | §6.12 L1490 (L1498) | 1. Vuelve a abrir el MISMO enlace del correo de AC-TRV-06. | Pantalla de enlace inválido o vencido con "Solicitar un enlace nuevo"; no permite cambiar la contraseña. | ☐ | |
| AC-TRV-10 | §5.5 L1337, §6.1 L1367 | 1. Con sesión del Empleado de prueba en `/inventario`, pulsa "Salir".<br>2. Usa el botón Atrás del navegador.<br>3. Sin sesión, abre `/ventas` e inicia sesión desde ahí. | Paso 1: queda fuera de la vista protegida y aparece `/login`. Paso 2: no vuelve a mostrar datos protegidos. Paso 3: tras el login (y el 2FA) vuelve a `/ventas`, no a `/registrar`. | ☐ | |
| AC-TRV-11 | §6.4 L1398, §9 L1641 (escáner) | 1. En el celular (Chrome), inicia sesión con el Empleado de prueba y abre `/registrar`.<br>2. "Activar Cámara" y acepta el permiso.<br>3. Apunta al código de barras de cualquier libro físico de la tienda. | La cámara abre por HTTPS sin aviso de sitio inseguro; al leer, el ISBN aparece en "Código ISBN" y se consulta solo. Si el libro es real (sin `PRUEBA-`), NO pulses "Confirmar Ingreso": pulsa "Registrar otro". | ☐ | 📷 |
| AC-TRV-12 | §6.4 L1398, `frontend/src/utils/errorCamara.js:6-7` | 1. En el celular, bloquea el permiso de cámara del sitio (ajustes del sitio en Chrome).<br>2. "Activar Cámara".<br>3. Usa "Entrada manual", escribe `9780000000002` y consulta. | Paso 2: "Permiso de cámara denegado. Habilítalo en tu navegador o ingresa el ISBN manualmente." y "Reintentar acceso a cámara". Paso 3: encuentra `PRUEBA-Libro-A`. Restaura el permiso al terminar. | ☐ | |
| AC-TRV-13 | §5.2 L1282 (L1285), §6.8 L1445 | 1. Con sesión de Administrador de prueba, abre `/ventas/00000000-0000-0000-0000-000000000000`.<br>2. Abre `/ventas/abc`. | Paso 1: "Venta no encontrada" con enlace al listado. Paso 2: mensaje de error legible (id inválido), sin pantalla en blanco. | ☐ | |
| AC-TRV-14 | RUNBOOK §9.4 L518, `backend/src/scripts/enviar-alertas-inventario.js:10-12` | **Quién:** una persona con acceso a Cloud Shell del proyecto (no el Empleado). Precondición: Job `oskar-alertas-inventario` creado y migración 020 aplicada (RUNBOOK §9.4); si no, ➖.<br>1. En Cloud Shell ejecuta `gcloud run jobs execute oskar-alertas-inventario --region us-central1 --wait --args="src/scripts/enviar-alertas-inventario.js,--dry-run"`.<br>2. Abre los logs de esa ejecución (Cloud Run → Jobs → `oskar-alertas-inventario`). | Termina con éxito e imprime un JSON con `"dry_run":true`, `fecha_local`, `alertas`, `administradores_validos` y `snapshot`. No envía correos ni escribe registros (`backend/src/services/alertasInventario.service.js:25-31`). Antes de crear libros de prueba el `snapshot` no tiene títulos `PRUEBA-`: solo libros reales activos con existencias menores o iguales a su mínimo. Anota `alertas` y `administradores_validos`: si `alertas` es 0 se puede ejecutar AC-TRV-15 hoy; si no, AC-TRV-15 se marca ➖. | ☐ | Sintaxis de `--args` no probada: si falla, anota el error y marca ➖ |
| AC-TRV-15 | RUNBOOK §2 L99, §9.2 L507 | 1. Tras un rato sin uso (más de 15 minutos sin visitas), abre `/catalogo`.<br>2. Mide cuánto tarda en cargar la primera vez y luego recarga.<br>3. Abre `https://libreria-oskar.web.app/api/health`. | La primera carga tarda unos segundos más (arranque en frío: NO es un fallo); la recarga es rápida. Health responde `healthy`. Solo es ❌ si da error o no carga. | ☐ | |
| AC-TRV-16 | RUNBOOK §9.4 L518-536, `backend/src/services/alertasInventario.correo.js:24` | **Advertencia:** correo a todos los Administradores activos reales con todos los libros en alerta; avisa al dueño antes. **Quién:** persona con Cloud Shell. Precondición: Job creado y que hoy no se haya ejecutado ya (ni a mano ni por el Scheduler de las 07:00, si ya existe).<br>1. En `/inventario`, fija con "Ajuste" el stock de `PRUEBA-Libro-A` en `3` (mínimo 5), motivo `PRUEBA-alerta`.<br>2. Ejecuta `gcloud run jobs execute oskar-alertas-inventario --region us-central1 --wait`.<br>3. Revisa el buzón de la cuenta de Administrador de prueba. | Paso 2: log con `"estado":"completado"`, `alertas` ≥ 1 y `enviados` igual a `administradores_validos` de AC-TRV-14. Paso 3: un correo individual con asunto "Alerta de stock mínimo — <fecha>" que lista `PRUEBA-Libro-A` con bodega, existencias 3, mínimo 5 y déficit. El correo no muestra los demás destinatarios. | ☐ | 📷 del correo |
| AC-TRV-17 | RUNBOOK §9.4 L520, `backend/src/services/alertasInventario.service.js:41-44` | **Advertencia:** si hay alertas reales, enviaría correos a todos los Administradores; por eso solo se ejecuta si AC-TRV-14 dio `alertas` = 0. Precondición: no existen libros `PRUEBA-` en alerta y hoy no se ha ejecutado el Job.<br>1. Ejecuta `gcloud run jobs execute oskar-alertas-inventario --region us-central1 --wait`. | Log con `"estado":"sin_alertas"`, `alertas` 0 y `enviados` 0; no llega ningún correo. Nota: ese día ya no se podrá probar AC-TRV-16 (el día queda cerrado), por eso AC-TRV-16 va en otro día. | ☐ | |
| AC-TRV-18 | RUNBOOK §9.4 L536 | (Mismo día que AC-TRV-16 y después de él.)<br>1. Repite `gcloud run jobs execute oskar-alertas-inventario --region us-central1 --wait`.<br>2. Revisa los buzones. | Log con `"omitido":true` y el mismo estado del reporte del día; no llega un segundo correo a nadie. | ☐ | |

## 7. Qué NO cubre este documento y por qué

| Fuera de alcance | Por qué |
|---|---|
| Restauración de respaldos (RUNBOOK §7) | Restaurar sobrescribe la base de producción; se prueba en un entorno aparte, nunca sobre datos reales. |
| Rotación de secretos (RUNBOOK §8) | Puede cortar el servicio, invalidar sesiones y los secretos del 2FA; es una operación de mantenimiento, no de aceptación. |
| Pruebas de carga | El servicio corre con una sola instancia (RUNBOOK §2 L99) y la exportación tiene límites de memoria (PROJECT_SPECS §4.3 L883); cargarla afectaría a la librería real. |
| Seguridad avanzada (pentest, fuerza bruta, bloqueo 2FA de 15 min, límites por IP) | Provocar bloqueos o límites afectaría a usuarios reales y exige autorización específica. |
| Restablecer el 2FA de otro usuario | No tiene interfaz: solo API o el script `reset-2fa` (PROJECT_SPECS §9 L1646, RUNBOOK §9.5). |
| Escaneo directo `POST /api/libros/escanear` | El frontend no lo usa (PROJECT_SPECS §6.3 L1385); solo API y pruebas automáticas. |
| Desactivar al último Administrador | Requeriría dejar una sola cuenta de Administrador activa en producción. |
| Respuestas 413 y 429 de exportación | Exigen más de 5000 registros o exportaciones simultáneas; no se fuerzan en producción. |
| Limpieza de los datos `PRUEBA-` | Se hace aparte, con su propio procedimiento. La app no borra usuarios. |
| Clientes de correo distintos de Gmail, lectores de pantalla y modo oscuro | Figuran como no verificados en PROJECT_SPECS §9; se anotan como observación si se prueban, no como caso. |

### Casos pendientes de agregar
Estos módulos aún no están en la rama; sus casos se agregarán cuando lleguen. Los prefijos quedan reservados:
- **Sucursales (CRUD)** — prefijo `AC-SUC-`.
- **Stock obsoleto** — prefijo `AC-OBS-`.

## 8. Resumen de resultados y registro de defectos

Completa esta tabla en la copia, al terminar.

| Rol / grupo | Total | ✅ Aprobados | ❌ Fallidos | ➖ No aplica | ☐ Pendientes |
|---|---|---|---|---|---|
| Administrador (AC-ADM) | 30 | | | | |
| Empleado (AC-EMP) | 17 | | | | |
| Usuario y visitante (AC-USR) | 8 | | | | |
| Transversales (AC-TRV) | 18 | | | | |
| **Total** | **73** | | | | |

Para contarlos en la copia (cambia la ruta por la de tu copia):

```bash
ARCHIVO=~/pruebas-oskar/PRUEBAS_ACEPTACION-AAAA-MM-DD.md
for p in ADM EMP USR TRV; do
  for e in ☐ ✅ ❌ ➖; do
    printf '%s %s: ' "$p" "$e"
    grep -E "^\| AC-$p-[0-9]+ " "$ARCHIVO" | awk -F'|' -v e="$e" '$6 ~ e' | wc -l
  done
done
```

### Registro de defectos

| N.º | ID del caso | Fecha y hora | Navegador / dispositivo | Qué pasó (mensaje exacto) | Evidencia (archivo fuera del repo) | Gravedad (alta/media/baja) | Estado |
|---|---|---|---|---|---|---|---|
| 1 | | | | | | | |
