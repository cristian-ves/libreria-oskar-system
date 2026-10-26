# Importación de lo que ya existe en Google Cloud (bloques import, Terraform >= 1.5;
# con for_each, >= 1.7). Doc del bloque: https://developer.hashicorp.com/terraform/language/block/import
# Tras el primer apply exitoso estos bloques no hacen nada y pueden borrarse.

locals {
  proyecto = "projects/${var.project_id}"
}

# --- Cuentas de servicio ----------------------------------------------------
# Formato: projects/{{project_id}}/serviceAccounts/{{email}}

import {
  to = google_service_account.api
  id = "${local.proyecto}/serviceAccounts/${local.api_email}"
}

import {
  to = google_service_account.deployer
  id = "${local.proyecto}/serviceAccounts/${local.deployer_email}"
}

# --- Workload Identity Federation -------------------------------------------
# Pool:      projects/{{project}}/locations/global/workloadIdentityPools/{{workload_identity_pool_id}}
# Proveedor: .../workloadIdentityPools/{{workload_identity_pool_id}}/providers/{{workload_identity_pool_provider_id}}

import {
  to = google_iam_workload_identity_pool.github
  id = "${local.proyecto}/locations/global/workloadIdentityPools/github"
}

import {
  to = google_iam_workload_identity_pool_provider.github_oskar
  id = "${local.proyecto}/locations/global/workloadIdentityPools/github/providers/github-oskar"
}

# --- Secretos (solo el contenedor) ------------------------------------------
# Formato: projects/{{project}}/secrets/{{secret_id}}

import {
  for_each = local.secretos
  to       = google_secret_manager_secret.secretos[each.key]
  id       = "${local.proyecto}/secrets/${each.key}"
}

# --- Artifact Registry ------------------------------------------------------
# Formato: projects/{{project}}/locations/{{location}}/repositories/{{repository_id}}

import {
  to = google_artifact_registry_repository.oskar
  id = "${local.proyecto}/locations/${var.region}/repositories/oskar"
}

# --- Cloud SQL --------------------------------------------------------------
# Instancia: projects/{{project}}/instances/{{name}}
# Base:      projects/{{project}}/instances/{{instance}}/databases/{{name}}

import {
  to = google_sql_database_instance.oskar_db
  id = "${local.proyecto}/instances/oskar-db"
}

import {
  to = google_sql_database.libreria_oskar
  id = "${local.proyecto}/instances/oskar-db/databases/libreria_oskar"
}

# --- Cloud Run --------------------------------------------------------------
# Servicio: projects/{{project}}/locations/{{location}}/services/{{name}}
# Job:      projects/{{project}}/locations/{{location}}/jobs/{{name}}

import {
  to = google_cloud_run_v2_service.api
  id = "${local.proyecto}/locations/${var.region}/services/libreria-oskar-api"
}

import {
  to = google_cloud_run_v2_job.migrar
  id = "${local.proyecto}/locations/${var.region}/jobs/oskar-migrar"
}

# --- Permisos (IAM member: ID separado por espacios "recurso rol miembro") ---

# Proyecto: "{{project_id}} {{role}} {{member}}"
import {
  for_each = local.permisos_proyecto
  to       = google_project_iam_member.proyecto[each.key]
  id       = "${var.project_id} ${each.value.role} ${each.value.member}"
}

# Secretos: "projects/{{project}}/secrets/{{secret_id}} {{role}} {{member}}"
import {
  for_each = local.secretos
  to       = google_secret_manager_secret_iam_member.api_lee_secretos[each.key]
  id       = "${local.proyecto}/secrets/${each.key} roles/secretmanager.secretAccessor serviceAccount:${local.api_email}"
}

# Servicio: "projects/{{project}}/locations/{{location}}/services/{{name}} {{role}} {{member}}"
import {
  to = google_cloud_run_v2_service_iam_member.invocador_publico
  id = "${local.proyecto}/locations/${var.region}/services/libreria-oskar-api roles/run.invoker allUsers"
}

# Registro: "projects/{{project}}/locations/{{location}}/repositories/{{repository}} {{role}} {{member}}"
import {
  to = google_artifact_registry_repository_iam_member.deployer_escribe
  id = "${local.proyecto}/locations/${var.region}/repositories/oskar roles/artifactregistry.writer serviceAccount:${local.deployer_email}"
}

# Cuentas: "projects/{{project_id}}/serviceAccounts/{{email}} {{role}} {{member}}"
import {
  to = google_service_account_iam_member.github_usa_deployer
  id = "${local.proyecto}/serviceAccounts/${local.deployer_email} roles/iam.workloadIdentityUser ${local.wif_principal_set}"
}

import {
  to = google_service_account_iam_member.deployer_actua_como_api
  id = "${local.proyecto}/serviceAccounts/${local.api_email} roles/iam.serviceAccountUser serviceAccount:${local.deployer_email}"
}
