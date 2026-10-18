---
name: catalog-employee-crud
description: Implementar CRUD de catálogo y empleados con Express, Sequelize, RBAC y validaciones.
---

> **ESTADO: NO IMPLEMENTADO (roadmap).** Esta skill describe una función planificada que aún no existe en el código. No usar como instrucción de trabajo hasta su implementación.

# CRUD de catálogo y empleados

## Procedimiento
1. Revisar rutas, controladores, servicios, repositorios, modelos y pantallas actuales para no duplicar endpoints.
2. Definir contratos de listar, crear, mostrar, editar y desactivar; preferir baja lógica si hay historial referenciado.
3. Validar campos y permisos en backend, no solo en React. Administrador gestiona empleados y precios según reglas actuales.
4. Usar Sequelize, `include` solo cuando es necesario, paginación y filtros parametrizados.
5. Para empleados: normalizar email, unicidad, hash bcrypt al crear/cambiar contraseña; nunca devolver `password_hash`, secretos 2FA ni tokens.
6. Para catálogo: respetar ISBN `VARCHAR(20)`, relaciones autor/editorial/categoría y existencia por bodega. Evitar cambiar stock directamente en CRUD.
7. Añadir tests RBAC (401/403), validación (400/409), casos correctos y regresión de endpoints existentes.
