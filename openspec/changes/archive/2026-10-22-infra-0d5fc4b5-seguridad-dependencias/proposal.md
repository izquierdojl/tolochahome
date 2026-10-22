# Proposal

## Why

`npm audit` detectó 12 vulnerabilidades en el árbol de dependencias: 4 críticas, 2 altas y 6 moderadas. La única de producción era `drizzle-orm@0.39.3` (alta, GHSA-gpj5-g38j-94v9: inyección SQL al escapar identificadores). El resto estaban en herramientas de desarrollo: `vitest@2.1.9` arrastraba `tinypool` y un `vite@5.4.21` anidado con varias advisories críticas y altas, `concurrently@9.2.4` usaba un `shell-quote` vulnerable, y `drizzle-kit` fijaba `esbuild@0.18.20` a través de `@esbuild-kit/core-utils`.

Aunque las de desarrollo no llegan a la imagen de producción, se ejecutan en CI y en las máquinas de desarrollo, y el aviso de `drizzle-orm` sí afecta al código desplegado. Además no había ninguna automatización que avisara o propusiera actualizaciones entre releases.

## What Changes

- Actualizar `drizzle-orm` de `0.39.3` a `0.45.4` (corrige la inyección SQL de identificadores).
- Actualizar `vitest` de `2.1.9` a `5.0.5`, lo que elimina el `vite@5`, `vite-node`, `@vitest/mocker` y `tinypool` vulnerables.
- Actualizar `vite` de `6.4.3` a `6.4.5` (advisories altas de `server.fs.deny` y `launch-editor`).
- Actualizar `concurrently` de `9.2.4` a `9.2.5` (arrastra `shell-quote@1.12.0`, fuera del rango vulnerable).
- Añadir un `overrides` en el `package.json` raíz para forzar `esbuild@0.25.12` dentro de `@esbuild-kit/core-utils` (dependencia transitiva de `drizzle-kit`), y comprobar que `drizzle-kit generate` sigue funcionando.
- Añadir `.github/dependabot.yml` con actualizaciones semanales de `npm` (producción y desarrollo agrupadas por parches/menores) y de GitHub Actions.
- Añadir a CI la comprobación `npm audit --omit=dev --audit-level=high`, para que una vulnerabilidad alta o crítica de producción rompa el pipeline.
- Activar en el repositorio las alertas de Dependabot, las actualizaciones de seguridad automáticas y el auto-merge (este último queda disponible para uso manual; no se automatiza la fusión sin comprobaciones requeridas).
- Documentar el flujo en `docs/desarrollo.md` y `AGENTS.md` §2.

## Capabilities

### New Capabilities

- `dependencias`: dependencias de producción y desarrollo sin vulnerabilidades conocidas, auditoría automática en CI y actualizaciones periódicas con Dependabot.

### Modified Capabilities

<!-- Ninguna: no cambia el comportamiento funcional de la aplicación. -->

## Impact

- `apps/api/package.json` y `apps/web/package.json`: nuevas versiones de `drizzle-orm`, `vitest` y `vite`.
- `package.json` raíz: `concurrently` y `overrides` de `esbuild`.
- `package-lock.json`: resolución actualizada; `npm ci` reproducible con 0 vulnerabilidades.
- `.github/dependabot.yml` (nuevo) y `.github/workflows/ci.yml` (paso de auditoría).
- `docs/desarrollo.md` y `AGENTS.md`: flujo de dependencias y seguridad.
- Sin cambios de esquema ni migraciones: `drizzle-kit generate` no detecta diferencias.
- Verificación: `npm audit` (0), `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test`, `npm run build` y `npx drizzle-kit generate`.
