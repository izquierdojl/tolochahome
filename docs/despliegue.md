# Despliegue con Docker y proxy inverso

> [← Volver al README](../README.md)

## Imagen publicada en GHCR (recomendado)

Cada merge a `dev` publica `:vX.Y.Z` y `:dev`; el merge `dev`→`main` promueve `:latest`
(ver [desarrollo](desarrollo.md)).

```bash
docker compose pull
docker compose up -d
```

El contenedor expone API + web en el puerto `3000`, guarda SQLite en `/data`
(volumen nombrado) y arranca con `HEALTHCHECK`. El entrypoint ajusta permisos
del volumen automáticamente.

Sin Compose:

```bash
docker run -d --name tolochahome -p 127.0.0.1:3000:3000 \
  -e JWT_ACCESS_SECRET='...' -e JWT_REFRESH_SECRET='...' \
  -v tolochahome_data:/data \
  ghcr.io/izquierdojl/tolochahome:latest
```

### Actualizar una instancia en producción

```bash
docker compose pull
docker compose up -d --force-recreate
```

> El `docker-compose.yml` define a la vez `image:` y `build: .`. Por eso
> `docker compose up -d` a secas **no** actualiza (reutiliza la imagen local),
> y si alguna vez has construido la imagen en ese host, su etiqueta `:latest`
> local "tapa" a la del registro hasta que hagas `docker compose pull`.
> Verifica la versión tras actualizar con `curl -s http://127.0.0.1:3000/api/v1/health`.
> En el navegador, haz una recarga forzada (`Ctrl+Shift+R`) para descartar el
> bundle cacheado.

## Build local

```bash
docker build -t tolochahome .
```

## Proxy inverso (obligatorio para exponer)

La app **no** termina TLS: escucha en `127.0.0.1:3000` y el proxy (Nginx,
Caddy, Traefik, NPM) hace de frontal HTTPS. Publica solo el subdominio o
ruta que quieras como página principal de tus navegadores.

Requisitos del proxy:

- Reenviar `Host`, `X-Forwarded-For`, `X-Forwarded-Proto: https`
  (las cookies `Secure` y el fallback SPA lo exigen).
- Aumentar `client_max_body_size` si importas HTML de marcadores grandes.
- Cabeza de salud: `GET /api/v1/health`.

### Nginx (subdominio)

```nginx
server {
  listen 443 ssl;
  server_name home.ejemplo.com;

  ssl_certificate     /etc/letsencrypt/live/home.ejemplo.com/fullchain.pem;
  ssl_certificate_key /etc/letsencrypt/live/home.ejemplo.com/privkey.pem;

  client_max_body_size 5m;

  location / {
    proxy_pass http://127.0.0.1:3000;
    proxy_http_version 1.1;
    proxy_set_header Host $host;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Proto $scheme;
  }
}
```

### Caddy (subdominio, TLS automático)

```caddy
home.ejemplo.com {
  reverse_proxy 127.0.0.1:3000
}
```

### Traefik (labels en compose)

Añade al servicio `tolochahome` (red `proxy` externa ya creada):

```yaml
labels:
  - "traefik.enable=true"
  - "traefik.http.routers.tolochahome.rule=Host(`home.ejemplo.com`)"
  - "traefik.http.routers.tolochahome.entrypoints=websecure"
  - "traefik.http.routers.tolochahome.tls.certresolver=letsencrypt"
  - "traefik.http.services.tolochahome.loadbalancer.server.port=3000"
```

Y quita el `ports:` público (basta `expose: ["3000"]`) si Traefik y la app
comparten red Docker.

## Variables críticas

`JWT_ACCESS_SECRET` y `JWT_REFRESH_SECRET` son obligatorias en producción
(`NODE_ENV=production`). Para cerrar registros: `REGISTRATION_ENABLED=false`.
Tabla completa en [instalacion](instalacion.md).
