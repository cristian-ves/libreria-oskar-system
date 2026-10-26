# Cuentas de servicio.
# Doc: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account

locals {
  # Correos conocidos de antemano: los usan los IDs de import, que deben
  # resolverse en el plan sin depender de los propios recursos
  api_email      = "oskar-api@${var.project_id}.iam.gserviceaccount.com"
  deployer_email = "oskar-deployer@${var.project_id}.iam.gserviceaccount.com"
}

# Identidad del servicio y del Job en tiempo de ejecución.
resource "google_service_account" "api" {
  account_id   = "oskar-api"
  display_name = "Libreria Oskar API (Cloud Run)"
}

# Identidad que asume GitHub Actions (WIF) para desplegar.
resource "google_service_account" "deployer" {
  account_id   = "oskar-deployer"
  display_name = "Despliegue desde GitHub Actions"
}
