# Arquitectura

> [← Volver al README](../README.md)

## Vista general

Monorepo npm con workspaces:

```
apps/
├── api/    API REST Express 5 (TypeScript, zod, drizzle-orm + better-sqlite3, jose, bcryptjs)
└── web/    Interfaz React (Vite, Tailwind 4, React Router, TanStack Query, Zustand)
```

La API sirve también el frontend compilado (`STATIC_DIR`) con fallback SPA.
En desarrollo, Vite hace proxy de `/api` a la API.

## Componentes clave (previsto)

- **Almacenamiento**: SQLite vía Drizzle (`users`, `refresh_tokens`,
  `password_reset_tokens`, `groups`, `bookmarks`, `search_engines`).
- **Sesiones**: access token JWT (15 min) en memoria + cookie httpOnly
  `tolocha-refresh` rotatoria. `REGISTRATION_ENABLED=false` cierra el alta.
- **Startpage**: grupos + speed dial de favoritos con previsualización
  (favicon / og:image o inicial), contador de visitas, búsqueda directa
  (Google, Wikipedia, DuckDuckGo + personalizados), tema `auto|light|dark`.
- **Import/export**: Netscape HTML (intercambio con navegadores) + JSON propio.

## Referencia rápida

| Tema | Documento |
| --- | --- |
| Instalación y arranque | [instalacion](instalacion.md) |
| Despliegue + proxy inverso | [despliegue](despliegue.md) |
| API REST | [api](api.md) |
| Desarrollo y release | [desarrollo](desarrollo.md) |
