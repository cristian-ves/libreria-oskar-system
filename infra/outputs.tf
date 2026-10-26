# Datos públicos útiles para el CD y para operar. Ninguno es secreto.

output "url_servicio" {
  description = "URL directa del servicio Cloud Run."
  value       = google_cloud_run_v2_service.api.uri
}

output "sql_connection_name" {
  description = "Nombre de conexión de Cloud SQL (socket /cloudsql/...)."
  value       = google_sql_database_instance.oskar_db.connection_name
}

output "repositorio_imagenes" {
  description = "Prefijo de las imágenes Docker del backend."
  value       = "${var.region}-docker.pkg.dev/${var.project_id}/${google_artifact_registry_repository.oskar.repository_id}"
}

output "wif_provider" {
  description = "Valor de workload_identity_provider en deploy.yml."
  value       = google_iam_workload_identity_pool_provider.github_oskar.name
}

output "cuenta_deployer" {
  description = "Valor de service_account en deploy.yml."
  value       = google_service_account.deployer.email
}
