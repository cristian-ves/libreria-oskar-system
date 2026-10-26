# Valores públicos del proyecto. Ninguno es secreto.

variable "project_id" {
  description = "ID del proyecto de Google Cloud."
  type        = string
  default     = "libreria-oskar-seminario"
}

variable "project_number" {
  description = "Número del proyecto (lo usa el principalSet de WIF)."
  type        = string
  default     = "916083567697"
}

variable "region" {
  description = "Región de Cloud Run, Cloud SQL y Artifact Registry."
  type        = string
  default     = "us-central1"
}

variable "sql_zone" {
  description = "Zona preferida de la instancia Cloud SQL."
  type        = string
  default     = "us-central1-a"
}

variable "github_repository" {
  description = "Repositorio de GitHub autorizado a desplegar por WIF."
  type        = string
  default     = "cristian-ves/libreria-oskar-system"
}

variable "imagen_inicial" {
  description = "Imagen con la que se describe el servicio y el Job. Solo se usa al crear: luego la cambia el CD y Terraform la ignora."
  type        = string
  default     = "us-central1-docker.pkg.dev/libreria-oskar-seminario/oskar/api:c5f0cba"
}

variable "frontend_url" {
  description = "URL pública del frontend (Firebase Hosting)."
  type        = string
  default     = "https://libreria-oskar.web.app"
}

variable "cors_origins" {
  description = "Orígenes permitidos por CORS, separados por coma."
  type        = string
  default     = "https://libreria-oskar.web.app,https://libreria-oskar.firebaseapp.com"
}

variable "mail_user" {
  description = "Cuenta remitente de Gmail; también es el Administrador central sembrado por el Job."
  type        = string
  default     = "libreriaoskar@gmail.com"
}
