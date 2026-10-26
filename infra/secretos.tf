# Secret Manager: solo el contenedor del secreto.
# Los valores (versiones) se cargan a mano y NUNCA pasan por Terraform,
# para que no queden en el estado.
# Doc: https://registry.terraform.io/providers/hashicorp/google/latest/docs/resources/secret_manager_secret

locals {
  secretos = toset([
    "admin-password",
    "db-password",
    "jwt-secret",
    "mail-password",
    "two-factor-key",
  ])
}

resource "google_secret_manager_secret" "secretos" {
  for_each  = local.secretos
  secret_id = each.key

  replication {
    auto {}
  }
}
