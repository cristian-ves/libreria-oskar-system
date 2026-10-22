---
name: catalog-employee-crud
description: Implementar CRUD de catálogo y empleados con Express, Sequelize, RBAC y validaciones.
---

> **ESTADO: NO IMPLEMENTADO (roadmap).** Esta skill describe una función planificada que aún no existe en el código. No usar como instrucción de trabajo hasta su implementación.

# CRUD de catálogo y empleados

## Alcance de esta implementación
- **EN ALCANCE**: CRUD administrativo de **usuarios** y de **categorías**.
- **FUERA**: edición completa y baja de libros (`PUT /api/libros/:id`), que sigue pendiente y se hace aparte. Fijar el precio ya quedó implementado con `PATCH /api/libros/:id/precio` (solo Administrador), prerrequisito de ventas (`docs/roadmap/ventas/SPEC.md`).
- Los cambios de esquema que hagan falta usan la migración 005 en adelante (la 004 es la de ventas) y requieren autorización explícita.

## Puntos de partida verificados
- `GET /api/usuarios` existe, solo Administrador (`backend/src/routes/index.js`, `authenticate` + `authorize('Administrador')`).
- Contrato a conservar: arreglo de `{ id, nombre_completo, email, rol_nombre }`, solo usuarios con `activo = true`, ordenado por `nombre_completo` ASC, sin `password_hash` ni secretos 2FA (`backend/src/repositories/usuario.repository.js`, `findActivosConRol`; `backend/src/services/usuario.service.js`, `listarActivosConRol`).
- `usuarioRepository` ya tiene `create` y `update` (`backend/src/repositories/usuario.repository.js`).
- `categoriaRepository` tiene `findAll`, `findById`, `findByNombre` y `create`; no tiene `update` ni `delete` (`backend/src/repositories/categoria.repository.js`).
- `movimientos_inventario.usuario_id` es `ON DELETE RESTRICT`: un usuario con movimientos no se puede borrar, solo desactivar (`database/schema.sql`).
- `categorias` no tiene columna `activo` (solo `id`, `nombre` único y `creado_en`) (`database/schema.sql`).
- `libros.categoria_id` es `ON DELETE SET NULL`: borrar una categoría deja sus libros sin categoría (`database/schema.sql`).

## Decisiones pendientes (NO resueltas)
- Baja lógica o borrado físico de categorías: **no decidido**.
- Si se añade `activo` a `categorias` mediante la migración 005: **no decidido**.


## Procedimiento
1. Revisar rutas, controladores, servicios, repositorios, modelos y pantallas actuales para no duplicar endpoints.
2. Definir contratos de listar, crear, mostrar, editar y desactivar; preferir baja lógica si hay historial referenciado.
3. Validar campos y permisos en backend, no solo en React. Administrador gestiona empleados y precios según reglas actuales.
4. Usar Sequelize, `include` solo cuando es necesario, paginación y filtros parametrizados.
5. Para empleados: normalizar email, unicidad, hash bcrypt al crear/cambiar contraseña; nunca devolver `password_hash`, secretos 2FA ni tokens.
6. Para catálogo: respetar ISBN `VARCHAR(20)`, relaciones autor/editorial/categoría y existencia por bodega. Evitar cambiar stock directamente en CRUD.
7. Añadir tests RBAC (401/403), validación (400/409), casos correctos y regresión de endpoints existentes.
