# Artifact Registry: repositorio Docker de la imagen del backend.
# Doc: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository

resource "google_artifact_registry_repository" "oskar" {
  location      = var.region
  repository_id = "oskar"
  format        = "DOCKER"
  mode          = "STANDARD_REPOSITORY"
  description   = "Imagenes Libreria Oskar"

  lifecycle {
    # El escaneo de vulnerabilidades queda fuera del alcance (ver README)
    ignore_changes = [vulnerability_scanning_config]
  }
}
