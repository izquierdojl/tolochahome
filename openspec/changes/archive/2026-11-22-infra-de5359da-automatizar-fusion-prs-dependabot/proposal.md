# Automatizar la fusión de PRs de Dependabot

## Resumen

Los PRs de Dependabot con el CI en verde se acumulan porque el repositorio no
tiene auto-merge: hay que fusionarlos a mano. Además, algunas actualizaciones
major no son compatibles todavía con el resto del stack y se vuelven a proponer
cada semana.

## Alcance

- Workflow que fusiona automáticamente los PRs de Dependabot de tipo
  minor/patch cuando todos los checks han terminado en verde.
- Reglas `ignore` para las actualizaciones major que aún no se pueden adoptar.
- Alinear `@types/node` con el runtime real (Node 24).
- Documentar el flujo en `docs/desarrollo.md`.
- Fuera de alcance: actualizar TypeScript 7, Vite 8 y ESLint 10. Se harán en
  changes propios cuando sus dependencias lo soporten.

## Diseño

- `.github/workflows/dependabot-auto-merge.yml` se dispara con `pull_request`
  (con `permissions` elevados, que es como se da token de escritura a un
  workflow lanzado por Dependabot), comprueba con `dependabot/fetch-metadata`
  que la actualización no es major, espera a que `statusCheckRollup` esté en
  verde (excluyendo el check del propio workflow) y fusiona con
  `--squash --match-head-commit`.
- `dependabot.yml` ignora las majors de `@types/node`, `typescript`, `vite` y
  `@eslint/js`, y limita el grupo de GitHub Actions a minor/patch para que
  también pueda entrar en el auto-merge.
- No se usa `gh pr merge --auto` porque `dev` no exige checks: el auto-merge de
  GitHub fusionaría al instante, antes de que corra el CI. El workflow espera
  explícitamente a los checks.
