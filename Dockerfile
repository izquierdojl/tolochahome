# syntax=docker/dockerfile:1

# -- deps: instala dependencias de los workspaces ---------------------------
FROM node:24-alpine AS deps
WORKDIR /app
COPY package.json package-lock.json ./
COPY apps/api/package.json apps/api/package.json
COPY apps/web/package.json apps/web/package.json
RUN apk add --no-cache python3 make g++ \
  && npm ci

# -- build: compila la API y la web -----------------------------------------
FROM deps AS build
WORKDIR /app
COPY tsconfig*.json ./
COPY apps apps
RUN npm run build \
  && npm prune --omit=dev

# -- runtime: imagen final del servicio --------------------------------------
FROM node:24-alpine AS runtime
ENV NODE_ENV=production \
    PORT=3000 \
    DATABASE_PATH=/data/tolochahome.db \
    STATIC_DIR=/app/apps/web/dist
WORKDIR /app
COPY --from=build /app/apps/api/dist ./apps/api/dist
COPY --from=build /app/apps/api/package.json ./apps/api/package.json
COPY --from=build /app/apps/api/drizzle ./apps/api/drizzle
COPY --from=build /app/apps/web/dist ./apps/web/dist
COPY --from=build /app/node_modules ./node_modules
RUN apk add --no-cache su-exec \
  && mkdir -p /data \
  && chown -R node:node /app /data
COPY docker-entrypoint.sh /usr/local/bin/docker-entrypoint.sh
RUN chmod +x /usr/local/bin/docker-entrypoint.sh
# El entrypoint arranca como root para fijar permisos en el volumen /data y
# despues baja privilegios a node antes de lanzar la aplicacion.
ENTRYPOINT ["docker-entrypoint.sh"]
EXPOSE 3000
VOLUME ["/data"]
HEALTHCHECK --interval=30s --timeout=5s --start-period=10s --retries=3 \
  CMD node -e "fetch('http://127.0.0.1:3000/api/v1/health').then(r=>process.exit(r.ok?0:1)).catch(()=>process.exit(1))"
CMD ["node", "apps/api/dist/index.js"]
