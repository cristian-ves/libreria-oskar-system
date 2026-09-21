# ============================================================================
# DOCKERFILE MULTI-STAGE OPTIMIZADO PARA PRODUCCIÓN (Google Cloud Run)
# Perfil: devops-gcp-automation
# Servicio: API RESTful Librería Oskar (Node.js + Express)
# ============================================================================

# ----------------------------------------------------------------------------
# Etapa 1: Dependencias de Producción (Dependencies Stage)
# ----------------------------------------------------------------------------
FROM node:22-alpine AS dependencies

WORKDIR /usr/src/app

# Instalar herramientas básicas si fuera necesario para compilación nativa
RUN apk add --no-cache libc6-compat

# Copiar manifiestos de paquetes
COPY package.json package-lock.json ./

# Instalar exclusivamente dependencias de producción de forma reproducible y limpia
RUN npm ci --omit=dev --ignore-scripts && \
    npm cache clean --force

# ----------------------------------------------------------------------------
# Etapa 2: Imagen de Ejecución Ligera y Segura (Runner Stage)
# ----------------------------------------------------------------------------
FROM node:22-alpine AS runner

WORKDIR /usr/src/app

# Variables de entorno por defecto en contenedor de producción
ENV NODE_ENV=production
ENV PORT=8080

# Copiar dependencias de producción desde la etapa anterior
COPY --from=dependencies --chown=node:node /usr/src/app/node_modules ./node_modules

# Copiar código fuente de la aplicación
COPY --chown=node:node package.json ./
COPY --chown=node:node src/ ./src/

# Verificación de salud del contenedor para orquestadores y Cloud Run
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://localhost:' + (process.env.PORT || 8080) + '/api/health').then(r => process.exit(r.ok ? 0 : 1)).catch(() => process.exit(1))"

# Seguridad: Ejecutar bajo usuario sin privilegios root
USER node

# Puerto expuesto por defecto en Google Cloud Run
EXPOSE 8080

# Comando de inicio del servidor
CMD ["node", "src/server.js"]
