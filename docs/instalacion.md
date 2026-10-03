# Instalación y arranque local

> [← Volver al README](../README.md)

## Requisitos

- Node.js >= 22 (ver `.nvmrc`)
- npm >= 10
- (Opcional) Docker >= 24 para despliegue en contenedor

## Puesta en marcha

```bash
npm install          # instala todos los workspaces
cp .env.example .env # crea tu .env local (la API lo carga automáticamente)
# opcional: genera secretos reales con `openssl rand -hex 32` y edita JWT_ACCESS_SECRET/JWT_REFRESH_SECRET

npm run dev          # arranca API (puerto 3000) y web (puerto 5173, proxy /api) a la vez
```

> El fichero `.env` de la raíz está ignorado por git. La API lo carga al
> arrancar y `docker compose up -d` también lo lee para interpolar variables;
> en producción usa variables de entorno reales o un `.env` propio.

## Comandos raíz

```bash
npm run typecheck    # typecheck de todos los workspaces
npm run lint         # eslint de todos los workspaces
npm test             # tests de la API (vitest + supertest)
npm run build        # compila API (dist/) y web (dist/)
npm start            # arranca la API compilada (sirviendo la web si STATIC_DIR apunta a ella)
```

## Migraciones

Las migraciones se aplican automáticamente al arrancar la API. Gestión manual
dentro de `@tolochahome/api`:

```bash
npm run db:generate   # genera migración desde el esquema Drizzle
npm run db:migrate    # aplica migraciones pendientes
```

## Variables de entorno

| Variable | Por defecto | Descripción |
| --- | --- | --- |
| `PORT` | `3000` | Puerto HTTP |
| `NODE_ENV` | `development` | `production` exige secretos y cookies `Secure` |
| `DATABASE_PATH` | `./data/tolochahome.db` | Fichero SQLite |
| `STATIC_DIR` | — | Frontend compilado para servir con fallback SPA |
| `JWT_ACCESS_SECRET` | *dev* | Secreto access token (≥32 en producción) |
| `JWT_REFRESH_SECRET` | *dev* | Secreto refresh token (≥32 en producción) |
| `JWT_ACCESS_TTL` | `15m` | Duración access token |
| `JWT_REFRESH_TTL` | `30d` | Duración refresh token |
| `REFRESH_ROTATE_THRESHOLD` | `24h` | Vida mínima para no rotar al renovar |
| `REFRESH_GRACE_MS` | `60000` | Gracia del token anterior tras rotar (ms) |
| `REGISTRATION_ENABLED` | `true` | `false` cierra el registro (mantiene login) |
| `CORS_ORIGINS` | `-` | Orígenes permitidos coma-separados; vacío desactiva CORS |
