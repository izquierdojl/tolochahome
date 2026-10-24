# AGENTS.md — TolochaHome

## 1. Proyecto

Startpage autoalojada por usuario para usar como página principal en navegadores de PC y móvil.

- Grupos y favoritos a modo de speed dial, con previsualización.
- Importación / exportación de marcadores.
- Barra de búsqueda directa (Google, Wikipedia, DuckDuckGo + buscadores configurables).
- Modo claro / oscuro automático (sigue `prefers-color-scheme`, conmutador manual).
- Control de usuarios, con posibilidad de cerrar nuevos registros (`REGISTRATION_ENABLED=false`).
- Responsive (móvil y PC).
- Stack: Node.js + Vite + React. Base de datos SQLite sencilla y rápida
  (`apps/api`: Express 5 + Drizzle/better-sqlite3; `apps/web`: React + Vite + Tailwind).
- Look & Feel como `tolocharadio`: paleta pine/ocre, variables CSS `--surface/--foreground/--brand`,
  `data-theme="dark"|"light"`, fondo con degradados fijos. Reutilizar `apps/web/src/index.css` de referencia.
- Instalación vía Docker + proxy inverso (ver `docs/despliegue.md`). Imagen publicada en GHCR.

## 2. Reglas generales

- Hablar y escribir textos (UI, commits, docs) en **español**.
- No publicar secretos: `.env` está gitignored; no comitearlo ni exponerlo.
- No empezar implementaciones nuevas sin que exista un change OpenSpec propuesto.
- Calidad antes de terminar una tarea: `npm run verify` (typecheck + lint + test + build).
  Para iterar: `npm run verify:fast` (solo tests afectados por los cambios).
- Mantener `npm audit` sin vulnerabilidades altas/críticas en producción. Dependabot
  propone las actualizaciones cada semana y CI ejecuta la auditoría.
- Confirmar en Docker tras cambios del backend: `docker compose up --build -d` + smoke
  (`/api/v1/health` y `/` sirve la web).
- **Archivar = commitear TODO incluido código.** Al archivar un change, los cambios de código
  (componentes, CSS, etc.) DEBEN estar commiteados en la rama de trabajo **antes** del merge a `dev`.
  No commitear solo los openspec y el bump: verificar con `git status` que no quedan archivos sin commitear.

## 3. Estructura

```
apps/
├── api/    API REST Express 5 (TypeScript, zod, drizzle-orm + better-sqlite3, jose, bcryptjs)
└── web/    Interfaz React (Vite, Tailwind 4, React Router, TanStack Query, Zustand)
openspec/
├── specs/      Especificaciones archivadas
└── changes/    Changes activos <tipo>-<id8>-<slug>/ (proposal.md, tasks.md, specs/, meta.yaml)
scripts/
├── new_change.sh      Crea changes (DEFAULT_BRANCH=dev)
├── spec_id.py         Genera id8 hex único
├── check_changes.sh   Valida meta.yaml (CI)
├── bump.js            Sube versión root + workspaces + lock, commit + tag
└── determine-bump.js  Decide major|minor|patch desde commits (job release de ci.yml)
docs/
├── instalacion.md  Requisitos, arranque local, variables de entorno
├── despliegue.md   Docker, GHCR y proxy inverso (obligatorio leer para exponer)
├── arquitectura.md Monorepo, almacenamiento, sesiones
├── api.md          OpenAPI y endpoints
└── desarrollo.md   Comandos, CI/CD y versionado
```

## 4. Base de datos (previsto)

SQLite vía Drizzle. Tablas previstas (se concretan en cada change, un change = una capacidad):

- `users`, `refresh_tokens`, `password_reset_tokens`
- `groups` (id, user_id, nombre, orden)
- `bookmarks` (id, group_id, user_id, titulo, url, icono/preview, orden, visitas)
- `search_engines` (id, user_id, nombre, url_template, alias, orden, por defecto)

Migraciones automáticas al arrancar la API (`npm run db:migrate` manual en `@tolochahome/api`).

## 5. Sesiones y API (previsto, heredado de tolocharadio)

- Access token JWT (15 min) en memoria + cookie httpOnly `tolocha-refresh` rotatoria.
- `REGISTRATION_ENABLED=false` cierra el registro pero mantiene login.
- Prefijo API: `/api/v1` (`/health`, `/auth/*`, `/groups`, `/bookmarks`, `/search-engines`, `/import`, `/export`).
- La API sirve el frontend compilado (`STATIC_DIR`) con fallback SPA. En desarrollo, Vite hace proxy de `/api`.

## 6. Frontend (previsto)

- Rutas: `/` (startpage), `/login`, `/registro`, `/perfil` + gestión de grupos/favoritos (RequireAuth).
- Speed-dial responsive (grid), previsualización (favicon / og:image cacheada o letra inicial).
- Búsqueda: input central con motor seleccionable (`g`, `w`, `d` + personalizados), `Enter` abre en misma/pestaña nueva.
- Tema: `data-theme` en `<html>`, `auto|light|dark` en localStorage, por defecto `auto` (media query).
- Import/export: Netscape HTML + JSON propio.

## 7. Flujo de trabajo OpenSpec

Toda funcionalidad empieza como change en `openspec/changes/` creado con
`scripts/new_change.sh <tipo> "<título>" [rama]`. El flujo de `/opsx-propose` lo hace él mismo:
pregunta tipo, título y rama si faltan (al inicio o tras explorar) y ejecuta el script;
no hace falta correrlo antes de proponer.

Tipos (clasificación del change): `feature | bug | docs | infra | refactor | test | chore`.

Nombre del change: `<tipo>-<id8>-<slug>`, p. ej. `feature-a3f9c21b-alta-grupos`.
El `id8` son 8 hex únicos estilo git, generados por `scripts/spec_id.py`.

Metadata obligatoria en `meta.yaml` dentro del change: `tipo`, `id`, `titulo`, `autor` (git user),
`fecha` (ISO 8601 con zona horaria), `branch`. La valida `scripts/check_changes.sh` (se ejecuta en CI).

Ramas: `main` = producción; `dev` = integración y destino de todos los PR. Cada change declara
`branch: dev` (trabajo directo sobre `dev`) o `branch: feature` (rama `feature/<tipo>-<id8>-<slug>`
con PR a `dev`). El usuario lo define por change; el defecto es `dev` y se configura en
`scripts/new_change.sh` (`DEFAULT_BRANCH`).

Archivar un change = commitear TODO (código + specs) en la rama de trabajo antes del merge.
Verificar con `git status` que no queda nada sin commitear.

Sincronizar todowrite con el plan: el panel lateral "Todo" solo refleja la herramienta todowrite
y no se actualiza solo. Al aplicar un change, inicializar todowrite con las tareas del `tasks.md`
y actualizarla tras completar cada tarea (mismo estado que el checkbox `- [ ]` → `- [x]`;
la tarea en curso como `in_progress`). Nunca dejar la lista en el estado de llamadas anteriores.

Los cambios pequeños se archivan pronto: un change = una capacidad. Los módulos fundacionales
(Seguridad/auth, Grupos, Favoritos/bookmarks, Búsqueda, Import/export) van en changes separados.

## 8. Versionado y releases

Formato semver `X.Y.Z`. Automático **al liberar en `main`**, no en cada merge a `dev`:

- `feat` o tipo `feature` → `minor`; `fix`/`bug` → `patch`; `BREAKING CHANGE`/`!` → `major`.
- `infra`/`docs`/`refactor`/`test`/`chore` → `patch` salvo `BREAKING`.
- Flujo: merge `dev`→`main` → `ci` valida (quality) → el job `release` de
  `ci.yml` analiza los commits desde el último tag y ejecuta
  `node scripts/bump.js <bump>`. El script sincroniza versión en root,
  workspaces y `package-lock.json`, crea `chore(release): vX.Y.Z [skip ci]` + tag y el
  job construye, prueba y escanea **una sola imagen**. Solo entonces publica
  el commit/tag y la imagen en GHCR.
- GHCR: `:latest`, `:vX.Y.Z`, `:vX.Y` y `:node<versión>` solo desde `main`.
  No se publican `:pr-<n>` ni imágenes desde `dev`. Si un release falla
  después de publicar el commit/tag (por ejemplo, al subir la imagen), una
  re-ejecución reutiliza el tag de `HEAD` y reconstruye la misma versión.
- `main` tiene el ruleset `main-ci`, que exige el check `ci-ok`. El push del
  commit/tag de versión usa la deploy key `release-bot` (secreto
  `RELEASE_DEPLOY_KEY`) con bypass; el usuario también puede saltarlo.
- `release.yml` (`release-node`) comprueba cada 6 horas la última versión
  `24.x` de Node y, si `:latest` lleva una anterior, la reconstruye y publica
  `:latest` y `:node<versión>` sin cambiar la versión de la app. `security.yml`
  escanea `:latest` a diario y `cleanup.yml` borra tags `pr-*` y, si no comparte
  versión con tags históricos, el `:dev` obsoleto con más de 7 días.
- Los skills de OpenSpec se regeneran con `openspec update`: las reglas de release viven aquí,
  en `AGENTS.md`, y se re-aplican a mano si un update las borra de algún skill.

Detalle operativo en `docs/desarrollo.md`.
