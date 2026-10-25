---
name: catalog-employee-crud
description: Implementar CRUD de catálogo y empleados con Express, Sequelize, RBAC y validaciones.
---

> **ESTADO: IMPLEMENTADO** (verificado en el código el 2026-10-24). Este archivo queda como diseño de referencia; lo que existe hoy está descrito en `docs/PROJECT_SPECS.md` (§4.3 endpoints, §5.2 vistas, §10 punto 3). Donde el diseño y el código discrepan, manda el código.

# CRUD de catálogo y empleados

## Alcance (diseño original)
- **EN ALCANCE**: CRUD administrativo de **usuarios** y de **categorías**.
- **FUERA**: edición completa y baja de libros, que se hizo aparte. El precio se fija con `PATCH /api/libros/:id/precio` (solo Administrador), prerrequisito de ventas (`docs/roadmap/ventas/SPEC.md`).
- Cambios de esquema: la numeración de migraciones se reparte 005-009 para el otro desarrollador y 010-019 para seguridad (reparto acordado entre el equipo, **no verificable en el código**). Hoy existen 002, 003, 004 (ventas), 010 (2FA) y 011 (recuperación de contraseña); el CRUD no necesitó ninguna.

## Lo implementado (verificado)
- Usuarios, solo Administrador (`backend/src/routes/index.js:19-22`): `GET /api/usuarios`, `POST /api/usuarios`, `PUT /api/usuarios/:id`, `PATCH /api/usuarios/:id/activo`. No hay `DELETE`: se desactiva.
- Categorías (`backend/src/routes/index.js:25-29`): `GET /api/categorias/admin` (Administrador, con conteo de libros), `GET /api/categorias` (público), `POST`, `PUT /:id` y `DELETE /:id` (Administrador).
- Libros (`backend/src/routes/libro.routes.js:18-19, 27-28, 35-36`): `GET /api/libros/admin`, `PUT /api/libros/:id` y `PATCH /api/libros/:id/activo`, sobre `backend/src/services/libro/administracion.service.js` (`actualizarLibro`, `cambiarActivoLibro`, `listarLibrosAdministracion`).
- Contrato del listado por defecto, que se conserva: arreglo de `{ id, nombre_completo, email, rol_nombre }`, solo `activo = true`, orden `nombre_completo` ASC, sin `password_hash` ni secretos 2FA (`backend/src/repositories/usuario.repository.js:205-226`; `backend/src/services/usuario.service.js:27-32`).
- `usuarioRepository` tiene, entre otros, `create`, `update`, `findActivosConRol` y `findConRol` (`backend/src/repositories/usuario.repository.js:172, 188, 205, 229`).
- `categoriaRepository` tiene `findAll`, `findAllWithLibroCount`, `findById`, `findByNombre`, `create`, `updateNombre`, `countLibros` y `delete` (`backend/src/repositories/categoria.repository.js:9-107`).

## Diferencias entre el diseño y lo implementado
- `GET /api/usuarios` sigue devolviendo solo activos por defecto; añade el parámetro `incluirInactivos=true` (`backend/src/controllers/usuario.controller.js:11`).
- Categorías: el diseño dejaba abierta la baja lógica o física; se implementó borrado físico (`categoriaRepository.delete`) y el servicio responde 409 si la categoría tiene libros (`backend/src/services/categoria.service.js:48-56`), en vez de dejarlos sin categoría por el `ON DELETE SET NULL`.
- No se añadió `activo` a `categorias` (`database/schema.sql:98-102`: `id`, `nombre` único, `creado_en`) ni hubo migración 005.
- Hechos del diseño que siguen vigentes: `movimientos_inventario.usuario_id` es `ON DELETE RESTRICT` (`database/schema.sql:186`) y `libros.categoria_id` es `ON DELETE SET NULL` (`database/schema.sql:108`).

## Procedimiento (diseño original)
1. Revisar rutas, controladores, servicios, repositorios, modelos y pantallas actuales para no duplicar endpoints.
2. Definir contratos de listar, crear, mostrar, editar y desactivar; preferir baja lógica si hay historial referenciado.
3. Validar campos y permisos en backend, no solo en React. Administrador gestiona empleados y precios según reglas actuales.
4. Usar Sequelize, `include` solo cuando es necesario, paginación y filtros parametrizados.
5. Para empleados: normalizar email, unicidad, hash bcrypt al crear/cambiar contraseña; nunca devolver `password_hash`, secretos 2FA ni tokens.
6. Para catálogo: respetar ISBN `VARCHAR(20)`, relaciones autor/editorial/categoría y existencia por bodega. Evitar cambiar stock directamente en CRUD.
7. Añadir tests RBAC (401/403), validación (400/409), casos correctos y regresión de endpoints existentes.
