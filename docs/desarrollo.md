# Desarrollo y release

> [← Volver al README](../README.md)

## Comandos

```bash
npm run typecheck    # todos los workspaces
npm run lint         # todos los workspaces
npm test             # API (vitest + supertest)
npm run build        # API (dist/) + web (dist/)
npm start            # API compilada (sirve la web si STATIC_DIR apunta a ella)
```

DB manual (`@tolochahome/api`):

```bash
npm run db:generate
npm run db:migrate
```

Docker tras cambios de backend:

```bash
docker compose up --build -d
curl -fsS http://127.0.0.1:3000/api/v1/health
curl -fsS http://127.0.0.1:3000/ | head
```

## OpenSpec (resumen)

Crear changes con `scripts/new_change.sh <tipo> "<título>" [rama]`
(`feature|bug|docs|infra|refactor|test|chore`, nombre `<tipo>-<id8>-<slug>`,
`meta.yaml` con `tipo,id,titulo,autor,fecha,branch`). Valida con
`bash scripts/check_changes.sh` (también en CI). Ramas: `main` producción,
`dev` integración y destino de PR. `DEFAULT_BRANCH=dev`. Detalle en `AGENTS.md` §7.

Al aplicar un change, sincronizar `todowrite` con el `tasks.md`.
Archivar = commitear TODO (código + specs) antes del merge; comprobar `git status`.

## CI/CD y versionado automático

- **`ci`**: en `push` a `dev`/`main` y PR a `dev`/`main`: valida changes,
  typecheck, lint, tests, build y smoke Docker (`/api/v1/health` + `/`).
- **`version`**: al hacer merge/push a `dev` (salvo `chore(release):`),
  `scripts/determine-bump.js` decide `major|minor|patch` desde los commits
  y `node scripts/bump.js <bump>` crea commit `chore(release): vX.Y.Z` + tag.
- **`release`**: con tag `v*` publica en GHCR `:vX.Y.Z` y `:dev`;
  con push a `main` publica `:latest`.

Reglas semver (`AGENTS.md` §8):

| Situación | Bump |
| --- | --- |
| `feat` / tipo `feature` | `minor` |
| `fix` / `bug` | `patch` |
| `BREAKING CHANGE` / `!` | `major` |
| `infra/docs/refactor/test/chore` | `patch` salvo `BREAKING` |

Manual si hace falta:

```bash
npm run release:spec   # minor
npm run release:fix    # patch
npm run release:major  # major
git push origin dev && git push origin --tags
```

**A prueba de `openspec update`**: las reglas de release viven en `AGENTS.md`
(que openspec no regenera). Si un update borra pasos de algún skill,
se re-aplican a mano desde `AGENTS.md`.
