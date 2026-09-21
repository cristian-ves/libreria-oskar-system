# Backend - Sistema de Inventario y Catálogo (Librería Oskar)

Servicio RESTful desarrollado en **Node.js** con **Express** y **PostgreSQL**, implementando una arquitectura limpia por capas (**Clean Layered Architecture**), transacciones ACID y consumo seguro de APIs externas de catalogación (Google Books API).

---

## 🏛️ Arquitectura Limpia por Capas

El proyecto está organizado en capas independientes con responsabilidades desacopladas:

```text
backend/
├── src/
│   ├── config/             # Configuración de variables de entorno y pool PostgreSQL
│   │   ├── env.js
│   │   └── db.js
│   ├── controllers/        # Controladores HTTP y serialización de respuestas
│   │   └── libro.controller.js
│   ├── services/           # Lógica de negocio, orquestación y transacciones
│   │   ├── libro.service.js
│   │   └── googleBooks.service.js
│   ├── repositories/       # Acceso a datos con SQL parametrizado y atomicidad
│   │   ├── autor.repository.js
│   │   ├── editorial.repository.js
│   │   ├── libro.repository.js
│   │   ├── inventario.repository.js
│   │   └── movimiento.repository.js
│   ├── middlewares/        # Validaciones de entrada y manejador central de errores
│   │   ├── validator.js
│   │   └── errorHandler.js
│   ├── routes/             # Enrutamiento modular de endpoints de la API
│   │   ├── libro.routes.js
│   │   └── index.js
│   ├── database/           # Semillas y scripts de mantenimiento
│   │   └── seed.js
│   ├── utils/              # Clases de error (AppError, ValidationError, NotFoundError)
│   │   └── errors.js
│   ├── app.js              # Inicialización y middlewares de Express
│   └── server.js           # Punto de entrada y arranque del servidor HTTP
├── tests/                  # Suite de pruebas unitarias, de integración y E2E
│   ├── googleBooks.test.js
│   ├── escanear.integration.test.js
│   └── api.e2e.test.js
├── .env.example
├── .env
└── package.json
```

---

## ⚙️ Configuración y Variables de Entorno

El archivo `.env` controla la configuración del pool de conexiones PostgreSQL y servicios externos:

```bash
PORT=3000
NODE_ENV=development

DB_HOST=localhost
DB_PORT=5434
DB_USER=postgres
DB_PASSWORD=postgres
DB_NAME=libreria_oskar

# Opcional (para ampliar cuotas de consulta externa)
GOOGLE_BOOKS_API_KEY=
```

---

## 🚀 Comandos de Ejecución

```bash
# Instalar dependencias
npm install

# Sembrar datos maestros (sucursal, bodega y usuario de prueba)
npm run seed

# Ejecutar en modo desarrollo con recarga en vivo
npm run dev

# Iniciar en modo producción
npm start

# Ejecutar suite de pruebas completa (unitarias + integración + E2E)
npm test
```

---

## 📖 Endpoint: `POST /api/libros/escanear`

Permite registrar un libro en el inventario mediante su código de barras o ISBN.

### Flujo de Ejecución y Garantías ACID:
1. **Validación de Parámetros**: Verifica formato de `isbn`, `bodegaId` y `usuarioId` (UUID v4).
2. **Inicio de Transacción (`BEGIN`)**: Se reserva un cliente dedicado del pool `pg`.
3. **Comprobación Local**: Si el libro existe en la tabla `libros`, se reutiliza.
4. **Consulta a Google Books API**: Si no existe localmente:
   - Se consulta `https://www.googleapis.com/books/v1/volumes?q=isbn:${isbn}` con timeout de 3 segundos.
   - Si no hay respuesta o se agota la cuota (429), entra el fallback multinivel a OpenLibrary o catálogo de contingencia.
   - Se registran autor, editorial y libro de forma atómica con `ON CONFLICT` evitando duplicados concurrentes.
5. **Inventario por Bodega**: Se asegura la existencia del registro en la tabla `inventarios` para la pareja `(libro_id, bodega_id)` con `ON CONFLICT`.
6. **Inserción de Movimiento**: Se inserta un registro en `movimientos_inventario` con `tipo_movimiento = 'Ingreso'` y `cantidad = 1`.
7. **Disparador PL/pgSQL**: El trigger `tg_movimientos_inventario_stock` se activa automáticamente en PostgreSQL, bloqueando la fila con `SELECT ... FOR UPDATE` y sumando 1 unidad al stock de forma pesimista y atómica.
8. **Confirmación Transaccional (`COMMIT`)**: En caso de cualquier error durante la ejecución, se ejecuta `ROLLBACK` y se libera el cliente (`client.release()`).

### Petición de Ejemplo:
```http
POST /api/libros/escanear
Content-Type: application/json

{
  "isbn": "9780307474728",
  "bodegaId": "0ad5fc81-8d82-4120-8bc4-e560608a23c4",
  "usuarioId": "c06fd5b4-0ae6-4e4a-8532-6008f47bf416"
}
```

### Respuesta Exitosa (201 Created / 200 OK):
```json
{
  "status": "success",
  "data": {
    "mensaje": "Libro nuevo registrado desde API externa e ingresado exitosamente al inventario.",
    "es_nuevo_en_catalogo": true,
    "libro": {
      "id": "7ad658b2-fded-4621-a674-71d69eb2e6f2",
      "titulo": "Cien años de soledad",
      "isbn": "9780307474728",
      "resena": "Una de las obras maestras de la literatura universal que relata la historia de la familia Buendía en el pueblo mítico de Macondo.",
      "imagen_url": null,
      "precio": 15.99,
      "autor": "Gabriel García Márquez",
      "editorial": "Vintage Español"
    },
    "inventario": {
      "id": "ef736ab1-c653-4c1f-8e31-f11067853466",
      "bodega_id": "0ad5fc81-8d82-4120-8bc4-e560608a23c4",
      "stock_anterior": 0,
      "stock_actual": 1
    },
    "movimiento": {
      "id": "2602b176-4afb-41b9-b358-b558955d53fb",
      "tipo": "Ingreso",
      "cantidad": 1,
      "motivo": "Ingreso atómico por escaneo de código de barras / ISBN",
      "fecha_movimiento": "2026-09-20T11:58:15.654Z"
    }
  }
}
```

## Migraciones de Base de Datos
Ejecuta `npm run migrate` para aplicar en orden alfabético y transaccional los scripts pendientes registrados en `schema_migrations`.
Para añadir una nueva migración, crea un archivo `NNN_nombre.sql` en `database/migrations` estructurado con sentencias idempotentes (`IF NOT EXISTS`).
