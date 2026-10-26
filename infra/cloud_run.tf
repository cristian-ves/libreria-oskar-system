# Cloud Run: servicio del backend y Job de migraciones (misma imagen).
# El CD (.github/workflows/deploy.yml) cambia la imagen de ambos y mueve el
# tráfico del servicio; por eso esos campos están en ignore_changes.
# Doc servicio: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service
# Doc Job:      https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_job

locals {
  sql_connection_name = "${var.project_id}:${var.region}:oskar-db"

  # Listas (no mapas) para conservar el orden en que Cloud Run guarda el entorno
  entorno_comun = [
    { name = "DB_HOST", value = "/cloudsql/${local.sql_connection_name}" },
    { name = "DB_PORT", value = "5432" },
    { name = "DB_USER", value = "oskar_app" },
    { name = "DB_NAME", value = "libreria_oskar" },
    { name = "CORS_ORIGINS", value = var.cors_origins },
    { name = "FRONTEND_URL", value = var.frontend_url },
    { name = "MAIL_USER", value = var.mail_user },
    { name = "TRUST_PROXY", value = "1" },
    { name = "LOGIN_RATE_LIMIT", value = "100" },
  ]

  # Variable de entorno ← secreto (siempre la última versión)
  entorno_secreto_comun = [
    { name = "DB_PASSWORD", secret = "db-password" },
    { name = "JWT_SECRET", secret = "jwt-secret" },
    { name = "TWO_FACTOR_ENCRYPTION_KEY", secret = "two-factor-key" },
    { name = "MAIL_PASSWORD", secret = "mail-password" },
  ]

  # El Job además siembra el Administrador central (seed.js)
  entorno_job = concat(local.entorno_comun, [
    { name = "SEED_ADMIN_EMAIL", value = var.mail_user },
  ])

  entorno_secreto_job = concat(local.entorno_secreto_comun, [
    { name = "SEED_ADMIN_PASSWORD", secret = "admin-password" },
  ])
}

resource "google_cloud_run_v2_service" "api" {
  name     = "libreria-oskar-api"
  location = var.region
  ingress  = "INGRESS_TRAFFIC_ALL"

  # Guarda de Terraform contra destroy accidental
  deletion_protection = true

  # Tope a nivel de servicio (antes anotación run.googleapis.com/maxScale)
  scaling {
    max_instance_count = 3
  }

  template {
    service_account                  = google_service_account.api.email
    timeout                          = "300s"
    max_instance_request_concurrency = 80

    # Una sola instancia: el limitador de login guarda sus contadores en memoria
    scaling {
      min_instance_count = 0
      max_instance_count = 1
    }

    containers {
      image = var.imagen_inicial

      ports {
        name           = "http1"
        container_port = 8080
      }

      resources {
        limits = {
          cpu    = "1000m" # la API lo devuelve en milicores
          memory = "1Gi"
        }
        # CPU siempre asignada y arranque con CPU extra
        cpu_idle          = false
        startup_cpu_boost = true
      }

      startup_probe {
        period_seconds    = 240
        timeout_seconds   = 240
        failure_threshold = 1

        tcp_socket {
          port = 8080
        }
      }

      dynamic "env" {
        for_each = local.entorno_comun
        content {
          name  = env.value.name
          value = env.value.value
        }
      }

      dynamic "env" {
        for_each = local.entorno_secreto_comun
        content {
          name = env.value.name
          value_source {
            secret_key_ref {
              secret  = google_secret_manager_secret.secretos[env.value.secret].secret_id
              version = "latest"
            }
          }
        }
      }

      volume_mounts {
        name       = "cloudsql"
        mount_path = "/cloudsql"
      }
    }

    # Socket de Cloud SQL en /cloudsql (equivale a la anotación cloudsql-instances de v1)
    volumes {
      name = "cloudsql"
      cloud_sql_instance {
        instances = [google_sql_database_instance.oskar_db.connection_name]
      }
    }
  }

  traffic {
    type    = "TRAFFIC_TARGET_ALLOCATION_TYPE_LATEST"
    percent = 100
  }

  lifecycle {
    ignore_changes = [
      template[0].containers[0].image, # la cambia el CD en cada despliegue
      traffic,                         # el CD lo mueve en despliegues y rollbacks
      client,                          # lo rellena gcloud
      client_version,
    ]
  }
}

resource "google_cloud_run_v2_job" "migrar" {
  name     = "oskar-migrar"
  location = var.region

  # Guarda de Terraform contra destroy accidental
  deletion_protection = true

  template {
    task_count = 1

    template {
      service_account       = google_service_account.api.email
      execution_environment = "EXECUTION_ENVIRONMENT_GEN2"
      timeout               = "600s"
      # Las migraciones no se reintentan solas: un fallo se revisa a mano
      max_retries = 0

      containers {
        image   = var.imagen_inicial
        command = ["sh"]
        args    = ["-c", "node src/database/migrate.js && node src/database/seed.js"]

        resources {
          limits = {
            cpu    = "1000m" # la API lo devuelve en milicores
            memory = "512Mi"
          }
        }

        dynamic "env" {
          for_each = local.entorno_job
          content {
            name  = env.value.name
            value = env.value.value
          }
        }

        dynamic "env" {
          for_each = local.entorno_secreto_job
          content {
            name = env.value.name
            value_source {
              secret_key_ref {
                secret  = google_secret_manager_secret.secretos[env.value.secret].secret_id
                version = "latest"
              }
            }
          }
        }

        volume_mounts {
          name       = "cloudsql"
          mount_path = "/cloudsql"
        }
      }

      volumes {
        name = "cloudsql"
        cloud_sql_instance {
          instances = [google_sql_database_instance.oskar_db.connection_name]
        }
      }
    }
  }

  lifecycle {
    ignore_changes = [
      template[0].template[0].containers[0].image, # la cambia el CD antes de las migraciones
      client,                                      # lo rellena gcloud (jobs update)
      client_version,
    ]
  }
}
