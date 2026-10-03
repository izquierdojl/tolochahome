# TolochaHome

Startpage autoalojada por usuario: grupos y favoritos a modo de speed dial,
barra de búsqueda directa y modo claro/oscuro. Pensada como página principal
de navegadores de PC y móvil.

- Speed dial con grupos, favoritos y previsualización.
- Importación / exportación de marcadores (Netscape HTML + JSON).
- Búsqueda directa: Google, Wikipedia, DuckDuckGo + buscadores configurables.
- Claro/oscuro automático (`prefers-color-scheme`) con conmutador manual.
- Control de usuarios con `REGISTRATION_ENABLED=false` para cerrar registros.
- Stack: Node.js + Vite + React, SQLite (Drizzle/better-sqlite3).
- Look & Feel pine/ocre heredado de `tolocharadio`.

## Documentación

| Página | Contenido |
| --- | --- |
| [Instalación](docs/instalacion.md) | Requisitos, arranque local, variables de entorno |
| [Despliegue](docs/despliegue.md) | Docker, GHCR y proxy inverso |
| [Arquitectura](docs/arquitectura.md) | Monorepo, almacenamiento, sesiones |
| [API](docs/api.md) | OpenAPI y endpoints (previsto) |
| [Desarrollo](docs/desarrollo.md) | Comandos, CI/CD y versionado |

Arranque rápido:

```bash
npm install
cp .env.example .env
npm run dev
```

Ver `AGENTS.md` para el flujo OpenSpec y las reglas de versionado.
