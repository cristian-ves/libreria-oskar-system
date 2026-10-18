---
name: inventory-email-alerts
description: Implementar alertas por correo de desabastecimiento y libros sin precio sin spam ni consultas destructivas.
---

> **ESTADO: NO IMPLEMENTADO (roadmap).** Esta skill describe una función planificada que aún no existe en el código. No usar como instrucción de trabajo hasta su implementación.

# Alertas por correo de inventario

## Procedimiento
1. Verificar lógica existente de inventario: `stock_actual <= stock_minimo`, libros activos con `precio IS NULL OR precio = 0`; diferenciar alertas visuales de envíos programados.
2. Definir destinatarios administradores autorizados, frecuencia, estado de alerta y deduplicación antes de programar envíos.
3. Enviar emails después del commit de la operación que disparó la condición, mediante job/cola cuando esté disponible; no mantener bloqueos de BD mientras se espera SMTP.
4. Mantener configuración SMTP en variables de entorno o secret manager, nunca credenciales en repositorio.
5. Diseñar reintentos idempotentes y registro de entregas/fallos; evitar correos repetidos por cada visita al dashboard.
6. Validar que no se envíen alertas falsas de inventarios agotados eliminados, usuarios inactivos o libros con precio actualizado.
7. Probar con transporte de email simulado, cron/job de prueba y consulta real de la base sin enviar correos externos involuntariamente.
