# Proposal

## Why

`npm audit --omit=dev` detecta tres vulnerabilidades altas que bloquean el CI y la publicación a producción: `body-parser` 2.0.0–2.3.0, `multer` 2.0.0–2.4.0 y `zod` < 4.6.6. Las tres tienen corrección disponible, pero `zod` requiere un salto de versión mayor.

## What Changes

- Actualizar `express` a la versión que resuelve `body-parser` 2.4.0.
- Actualizar `multer` a `^2.5.0`.
- Actualizar `zod` a `^4.6.7` y adaptar el código solo si el salto mayor lo requiere.
- Regenerar `package-lock.json` y eliminar las tres vulnerabilidades altas de producción.
- No cambiar el comportamiento funcional previsto ni actualizar las demás actualizaciones mayores de Dependabot, que no bloquean la publicación.

## Capabilities

### New Capabilities

<!-- Ninguna: mantenimiento de dependencias sin cambio de comportamiento. El change declara skip_specs. -->

### Modified Capabilities

<!-- Ninguna: la capability dependencias no cambia sus requisitos. -->

## Impact

- `apps/api/package.json`: versiones de `express`, `multer` y `zod`.
- `apps/api/src` y `apps/api/test`: posibles ajustes de compatibilidad con Zod 4.
- `package-lock.json`: resolución actualizada de dependencias.
- Verificación: `npm audit --omit=dev --audit-level=high`, `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build`.
