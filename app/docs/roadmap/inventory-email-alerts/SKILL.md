---
name: inventory-email-alerts
description: Implementar alertas por correo de desabastecimiento y libros sin precio sin spam ni consultas destructivas.
---

> **ESTADO: IMPLEMENTADO EN BACKEND.** El proceso, persistencia y pruebas están en código. El aprovisionamiento del Job en Cloud Run y Cloud Scheduler permanece pendiente; este documento conserva el diseño original como referencia.

# Alertas por correo de inventario

## Procedimiento
1. Verificar lógica existente de inventario: `stock_actual <= stock_minimo`, libros activos con `precio IS NULL OR precio = 0`; diferenciar alertas visuales de envíos programados.
2. Definir destinatarios administradores autorizados, frecuencia, estado de alerta y deduplicación antes de programar envíos.
3. Enviar emails después del commit de la operación que disparó la condición, mediante job/cola cuando esté disponible; no mantener bloqueos de BD mientras se espera SMTP.
4. Mantener configuración SMTP en variables de entorno o secret manager, nunca credenciales en repositorio.
5. Diseñar reintentos idempotentes y registro de entregas/fallos; evitar correos repetidos por cada visita al dashboard.
6. Validar que no se envíen alertas falsas de inventarios agotados eliminados, usuarios inactivos o libros con precio actualizado.
7. Probar con transporte de email simulado, cron/job de prueba y consulta real de la base sin enviar correos externos involuntariamente.
