---
name: auth-2fa
description: Implementar autenticación de dos factores sin debilitar bcrypt, JWT, roles o secretos existentes.
---

> **ESTADO: IMPLEMENTADO (verificado contra el código el 2026-10-24).** El backend y la interfaz del 2FA existen; el comportamiento real está en `app/docs/PROJECT_SPECS.md` §4.6. Este documento queda como referencia de diseño; si discrepa del código, manda el código.

# Autenticación 2FA

## Procedimiento
1. Revisar `auth.service.js`, `auth.routes.js`, `usuario.model.js` y columnas `dos_factores_*`/`token_recuperacion` efectivas, sin asumir que la funcionalidad está implementada solo porque existan campos.
2. Definir enrolamiento seguro (provisión TOTP, confirmación con código, activación), desafío en login y recuperación.
3. Si 2FA está activo, la contraseña válida NO debe entregar un JWT plenamente autorizado antes de superar segundo factor. Usar estado/ticket temporal de corta duración si es necesario.
4. Proteger secretos y códigos de recuperación: no logs, no respuestas involuntarias, controles anti-fuerza-bruta y caducidad.
5. Garantizar RBAC y compatibilidad de rutas; separar pruebas para usuarios con 2FA activado/desactivado, código inválido, reutilizado o vencido.
6. Política vigente: el 2FA es obligatorio para Administrador y Empleado cuando `TWO_FACTOR_ENFORCED` está activo (por defecto solo en producción; siempre apagado con `NODE_ENV=test`), con activación forzada en el login; el rol Usuario queda fuera. El login cambió a dos pasos coordinado con el frontend y las pruebas.

## Diferencias con lo planeado
- No hay activación voluntaria con sesión completa: el alta solo se ofrece con el token temporal `2fa-setup` del login.
- La recuperación del 2FA no usa `token_recuperacion` (esa columna la usa la recuperación de contraseña por correo): son 10 códigos de respaldo de un solo uso y el restablecimiento por el Administrador (endpoint, aún sin botón en la interfaz) o con `npm --prefix backend run reset-2fa -- correo`.
