# Versiones, estado remoto y proveedor.
# El bucket del estado ya existe (versionado) y no lo gestiona esta configuración.

terraform {
  # Probado con Terraform 1.17.0 (instalado a mano en Cloud Shell); los bloques import con for_each requieren >= 1.7
  required_version = ">= 1.7"

  required_providers {
    google = {
      source  = "hashicorp/google"
      version = "~> 8.0"
    }
  }

  backend "gcs" {
    bucket = "libreria-oskar-seminario-tfstate"
    prefix = "libreria-oskar"
  }
}

provider "google" {
  project = var.project_id
  region  = var.region
}
