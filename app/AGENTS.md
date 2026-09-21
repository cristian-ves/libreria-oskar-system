# Equipo de Ingeniería - Fase 2 (Sistema de Inventario y Catálogo de Libros)

Este documento define la configuración del equipo de perfiles especializados para el desarrollo del proyecto en este espacio de trabajo:

## Perfiles Activos

### 1. `database-architect`
* **Especialidad:** Diseño relacional, índices y triggers en PostgreSQL.
* **Competencias Clave:**
  - Integridad referencial con UUIDs y claves foráneas en cascada/restringidas.
  - Triggers avanzados en PL/pgSQL para actualización automática y atómica de existencias (`tg_movimientos_inventario_stock`).
  - Índices condicionales para alertas inmediatas (`idx_inventario_alertas`).
  - Control de concurrencia y prevención de race conditions (`SELECT FOR UPDATE`).

### 2. `backend-engineer-nodejs`
* **Especialidad:** Arquitectura limpia, Express, transacciones ACID y consumo de APIs externas.
* **Competencias Clave:**
  - Arquitectura en capas: Routes -> Controllers -> Services -> DAOs/Repositories.
  - Transacciones atómicas seguras en PostgreSQL mediante `pg` pool.
  - Autenticación con JWT, contraseñas cifradas y soporte 2FA (TOTP).
  - Control de acceso basado en roles (RBAC: Administrador, Empleado, Usuario).
  - Integración segura y resiliente con Google Books API (timeouts y fallback).

### 3. `frontend-engineer-react`
* **Especialidad:** React SPA, TailwindCSS, hooks avanzados y APIs del navegador.
* **Competencias Clave:**
  - Experiencia fluida con React SPA y tiempos de respuesta < 2 segundos.
  - Integración de escáner de códigos de barras e ISBN usando cámara web con `html5-qrcode` y fallback manual.
  - Búsqueda en catálogo en tiempo real con debounce.
  - Autenticación y flujos 2FA intuitivos con notificaciones interactivas.

### 4. `devops-gcp-automation`
* **Especialidad:** Docker multi-etapa, Google Cloud Run, Cloud SQL y CI/CD con GitHub Actions.
* **Competencias Clave:**
  - Dockerfiles optimizados y seguros para backend y frontend.
  - Orquestación local con `docker-compose.yml`.
  - Despliegue en Google Cloud Run y conexión a Cloud SQL.
  - Pipelines de integración y despliegue continuo (CI/CD) con GitHub Actions hacia Artifact Registry y Cloud Run.
