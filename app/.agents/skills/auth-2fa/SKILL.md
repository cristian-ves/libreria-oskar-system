---
name: auth-2fa
description: Implementar autenticación de dos factores sin debilitar bcrypt, JWT, roles o secretos existentes.
---

# Autenticación 2FA

## Procedimiento
1. Revisar `auth.service.js`, `auth.routes.js`, `usuario.model.js` y columnas `dos_factores_*`/`token_recuperacion` efectivas, sin asumir que la funcionalidad está implementada solo porque existan campos.
2. Definir enrolamiento seguro (provisión TOTP, confirmación con código, activación), desafío en login y recuperación.
3. Si 2FA está activo, la contraseña válida NO debe entregar un JWT plenamente autorizado antes de superar segundo factor. Usar estado/ticket temporal de corta duración si es necesario.
4. Proteger secretos y códigos de recuperación: no logs, no respuestas involuntarias, controles anti-fuerza-bruta y caducidad.
5. Garantizar RBAC y compatibilidad de rutas; separar pruebas para usuarios con 2FA activado/desactivado, código inválido, reutilizado o vencido.
6. No activar automáticamente 2FA para todos ni cambiar el contrato de login sin coordinar frontend y tests.
