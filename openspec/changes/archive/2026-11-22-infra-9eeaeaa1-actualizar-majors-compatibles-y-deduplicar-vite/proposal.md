# Actualizar majors compatibles y deduplicar Vite

## Resumen

Tras liberar el límite de PRs de Dependabot quedan varias actualizaciones
abiertas. Unas son compatibles y se pueden adoptar ya; otras no:

- `vite` 6.4.6 falla el typecheck porque el lock acaba con dos copias (la del
  root, que usa `vitest`, y una anidada en `apps/web`). Dos identidades de tipos
  de Vite rompen `vite.config.ts`.
- `eslint` 10 y `@eslint/js` 10 deben subir juntos; el README de eslint 9 avisa
  de que ya no tiene soporte.
- `jose` 6 es compatible: la API usa `SignJWT`/`jwtVerify` con secreto y el
  proyecto ya es ESM sobre Node 24.
- `@vitejs/plugin-react` 6 exige Vite 8, que todavía no se adopta.

## Alcance

- Anclar `vite` también en el workspace raíz para que npm lo hoistee una sola
  vez y actualizar `apps/web` a 6.4.6.
- Adoptar `vitest` 5.1.1 y `typescript-eslint` 8.73.0 (minor del grupo).
- Adoptar `eslint` 10 + `@eslint/js` 10 en API y web.
- Adoptar `jose` 6 y `dotenv` 18.0.10.
- Ignorar la major de `@vitejs/plugin-react` hasta la actualización conjunta con
  Vite 8; quitar el ignore de `@eslint/js`, que ya se actualiza.
- Documentar el anclaje de Vite en `docs/desarrollo.md`.

## Diseño

`vite` se declara como devDependency del root (`^6.4.6`) además de en `apps/web`.
Así npm resuelve una única versión hoisteada que satisface también a `vitest`,
`@tailwindcss/vite` y `@vitejs/plugin-react`, y desaparece el choque de tipos.
