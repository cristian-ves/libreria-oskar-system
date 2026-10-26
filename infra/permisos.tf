# Permisos. Solo recursos *_iam_member (no autoritativos): agregan un miembro a
# un rol sin tocar los demás, así no se pisan los roles de las personas ni los
# que Google asigna solo.
# Doc proyecto:   https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_project_iam
# Doc secretos:   https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret_iam
# Doc Cloud Run:  https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/cloud_run_v2_service_iam
# Doc registro:   https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/artifact_registry_repository_iam
# Doc cuentas:    https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/google_service_account_iam

locals {
  # Identidades de GitHub Actions que vienen del repo autorizado
  wif_principal_set = "principalSet://iam.googleapis.com/projects/${var.project_number}/locations/global/workloadIdentityPools/github/attribute.repository/${var.github_repository}"

  permisos_proyecto = {
    "api-cloudsql-client"            = { role = "roles/cloudsql.client", member = "serviceAccount:${local.api_email}" }
    "deployer-run-developer"         = { role = "roles/run.developer", member = "serviceAccount:${local.deployer_email}" }
    "deployer-firebasehosting-admin" = { role = "roles/firebasehosting.admin", member = "serviceAccount:${local.deployer_email}" }
    "deployer-serviceusage-consumer" = { role = "roles/serviceusage.serviceUsageConsumer", member = "serviceAccount:${local.deployer_email}" }
  }
}

# --- Proyecto ---------------------------------------------------------------

resource "google_project_iam_member" "proyecto" {
  for_each = local.permisos_proyecto
  project  = var.project_id
  role     = each.value.role
  member   = each.value.member
}

# --- Secretos: solo oskar-api los lee, cada uno por separado ---------------

resource "google_secret_manager_secret_iam_member" "api_lee_secretos" {
  for_each  = google_secret_manager_secret.secretos
  secret_id = each.value.secret_id
  role      = "roles/secretmanager.secretAccessor"
  member    = "serviceAccount:${google_service_account.api.email}"
}

# --- Servicio público: la SPA llega por el rewrite de Firebase Hosting ------

resource "google_cloud_run_v2_service_iam_member" "invocador_publico" {
  location = google_cloud_run_v2_service.api.location
  name     = google_cloud_run_v2_service.api.name
  role     = "roles/run.invoker"
  member   = "allUsers"
}

# --- Registro: el CD publica la imagen --------------------------------------

resource "google_artifact_registry_repository_iam_member" "deployer_escribe" {
  location   = google_artifact_registry_repository.oskar.location
  repository = google_artifact_registry_repository.oskar.repository_id
  role       = "roles/artifactregistry.writer"
  member     = "serviceAccount:${google_service_account.deployer.email}"
}

# --- Cuentas de servicio ----------------------------------------------------

# GitHub Actions (vía WIF) puede actuar como oskar-deployer
resource "google_service_account_iam_member" "github_usa_deployer" {
  service_account_id = google_service_account.deployer.name
  role               = "roles/iam.workloadIdentityUser"
  member             = local.wif_principal_set
}

# oskar-deployer puede desplegar revisiones que corren como oskar-api
resource "google_service_account_iam_member" "deployer_actua_como_api" {
  service_account_id = google_service_account.api.name
  role               = "roles/iam.serviceAccountUser"
  member             = "serviceAccount:${google_service_account.deployer.email}"
}
