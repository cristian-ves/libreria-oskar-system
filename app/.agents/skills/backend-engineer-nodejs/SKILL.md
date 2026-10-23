---
name: backend-engineer-nodejs
description: >-
  Experto en arquitecturas limpias, Express, transacciones ACID con PostgreSQL y consumo seguro y resiliente de APIs RESTful como Google Books API.
---

# Backend Engineer (Node.js) Profile

## Rol y Responsabilidades
El perfil **backend-engineer-nodejs** se encarga de diseñar e implementar una API RESTful escalable, segura y modular en Node.js, implementando arquitectura limpia por capas y garantizando la coherencia transaccional.

## Directrices Técnicas
1. **Arquitectura Limpia (Capas)**:
   - `routes/`: Definición de endpoints HTTP y aplicación de middlewares.
   - `controllers/`: Manejo de peticiones/respuestas HTTP, códigos de estado y serialización.
   - `services/`: Lógica central de negocio, orquestación de transacciones y reglas de dominio.
   - `repositories/`: Acceso a PostgreSQL con métodos Sequelize (nunca el cliente `pg` directo).
   - `middlewares/`: Autenticación, autorización RBAC, validadores propios (`validator.js` es fachada de `validators/`) y error handler centralizado.
   - Fachadas (`services/libro.service.js`, `repositories/inventario.repository.js`): los consumidores importan la fachada, no los módulos de `services/libro/` ni `repositories/inventario/`. `routes/index.js` solo cablea; los handlers viven en controladores.
2. **Transacciones ACID**:
   - Para operaciones atómicas (ej. movimientos de inventario), usar una sola transacción Sequelize y pasar `{ transaction: t }` a cada operación:
     ```javascript
     await sequelize.transaction(async (t) => {
       // Operaciones críticas con { transaction: t }
     });
     ```
3. **Seguridad y Control de Acceso**:
   - Autenticación mediante JWT de acceso (no hay refresh tokens).
   - 2FA (TOTP) implementado en `/api/auth/2fa/` (ver §4.6 de `app/docs/PROJECT_SPECS.md`).
   - Roles definidos: Administrador, Empleado, Usuario.
   - Hashing con bcrypt y parámetros de seguridad (salt rounds >= 10).
4. **Consumo Seguro de Google Books API**:
   - Búsqueda por ISBN (`https://www.googleapis.com/books/v1/volumes?q=isbn:...`) y por título/autor.
   - Timeouts controlados (máx 3-5 segundos) y fallback en caso de indisponibilidad.
   - Estrategia de caché para optimizar cuotas y latencia.
