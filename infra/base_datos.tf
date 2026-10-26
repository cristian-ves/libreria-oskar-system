# Cloud SQL: instancia PostgreSQL y base de la aplicación.
# Los usuarios de la BD NO se gestionan aquí: su contraseña quedaría en el estado.
# Doc instancia: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database_instance
# Doc base:      https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/sql_database

resource "google_sql_database_instance" "oskar_db" {
  name             = "oskar-db"
  region           = var.region
  database_version = "POSTGRES_15"

  # Guarda de Terraform: impide destroy o reemplazo desde Terraform
  deletion_protection = true

  settings {
    tier              = "db-f1-micro"
    edition           = "ENTERPRISE"
    availability_type = "ZONAL"
    activation_policy = "ALWAYS"
    pricing_plan      = "PER_USE"

    disk_type             = "PD_SSD"
    disk_size             = 10
    disk_autoresize       = true
    disk_autoresize_limit = 0

    connector_enforcement       = "NOT_REQUIRED"
    enable_dataplex_integration = true

    # Refleja la nube (protección de GCP apagada); activarla es otra tarea
    deletion_protection_enabled = false

    location_preference {
      zone = var.sql_zone
    }

    # IPv4 pública sin redes autorizadas: solo se entra por el conector de Cloud SQL
    ip_configuration {
      ipv4_enabled = true
      ssl_mode     = "ALLOW_UNENCRYPTED_AND_ENCRYPTED"
    }

    backup_configuration {
      enabled                        = true
      start_time                     = "08:00"
      transaction_log_retention_days = 7

      backup_retention_settings {
        retained_backups = 7
        retention_unit   = "COUNT"
      }
    }
  }

  lifecycle {
    # Con autoaumento el disco crece solo; sin esto Terraform intentaría
    # volver a 10 GB (lo recomienda la doc del recurso en disk_size)
    ignore_changes = [settings[0].disk_size]
  }
}

resource "google_sql_database" "libreria_oskar" {
  name     = "libreria_oskar"
  instance = google_sql_database_instance.oskar_db.name

  # Contiene los datos del sistema: Terraform no debe borrarla nunca
  deletion_policy = "PREVENT"
}
