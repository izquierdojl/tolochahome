# Rediseño del pipeline CI/CD

## Resumen

El pipeline actual duplica trabajo y publica antes de validar: cada CI construye
una imagen Docker que nadie publica, cada release se construye dos veces (PR y
merge), el versionado corre en cada push a `dev` y `release`/`version` no
esperan al CI. Un fix de una línea llegó a generar 11 ejecuciones y 8 builds de
imagen en 19 minutos.

## Alcance

Entra:

- Red de seguridad local: timeout explícito de Vitest, coste bcrypt reducido
  solo en test y scripts `verify`/`verify:fast`.
- CI rápido: `concurrency` con cancelación, Docker solo cuando cambian archivos
  relacionados, sin artefacto de build sin consumidor.
- Carriles por tipo de cambio: docs/openspec solo valida changes; código ejecuta
  calidad; cambios de Docker ejecutan además el smoke.
- Release gateado por CI y con **un solo build** en `main`: bump de versión,
  build, smoke, escaneo y push de imagen y tag.
- Eliminación de imágenes `:pr-*`; `:latest` y semver solo desde `main`.
- Escaneo de imagen Trivy en release y a diario (`security.yml`).
- Retirada de `npm`/`corepack` del runtime: la aplicación no los usa y sus
  dependencias empaquetadas en la imagen base hacían fallar el escaneo.
- Retención conservadora de tags `pr-*` (no toca `latest`, semver ni `node*`).
- Actualización de `AGENTS.md` §8 y `docs/desarrollo.md`.

No entra:

- Cambios en el flujo OpenSpec (`scripts/check_changes.sh`, `new_change.sh`,
  `spec_id.py`, `openspec/**` o `.opencode/**`).
- Cambios de lógica de aplicación, cobertura o esquema de base de datos. Solo
  se ajusta el coste de bcrypt en test y el timeout de Vitest.
- Despliegue automático en producción: sigue siendo manual con `docker compose`.
- Borrado manual de tags/imágenes existentes; la retención queda programada.

## Diseño

- `ci.yml` detecta si el cambio toca código y si toca Docker, y ejecuta solo lo
  necesario. `changes` se ejecuta siempre para no perder la validación OpenSpec.
- Un job agregador `ci-ok` es el check estable para un futuro ruleset.
- En `main`, el job `release` depende de `quality`: hace el bump local, construye
  una imagen, la prueba, la escanea y solo entonces publica imagen y tag.
- `version.yml` desaparece; el versionado ocurre al liberar en `main`.
- `release.yml` queda para el rebuild programado de Node y el escaneo diario.
- `:pr-*` deja de publicarse; el PR de release solo aporta historial.
