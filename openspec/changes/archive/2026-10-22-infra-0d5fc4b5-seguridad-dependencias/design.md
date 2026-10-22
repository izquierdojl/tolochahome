# Design

## Contexto

El proyecto tiene dos workspaces y un único `package-lock.json` en la raíz. La imagen de producción se construye con `npm ci` y luego `npm prune --omit=dev`, así que las vulnerabilidades de `devDependencies` no llegan al contenedor final, pero sí se ejecutan en CI y en local. `drizzle-orm` es dependencia de producción y su advisory es el único que afecta al despliegue.

## Decisiones

### 1. Actualizar dentro de la línea actual cuando baste

`vite` 6.4.5, `concurrently` 9.2.5 y `drizzle-orm` 0.45.4 corrigen las advisories sin saltar a Vite 8, ESLint 10 o TypeScript 7. Se evitan esos majors porque no son necesarios para el objetivo y multiplican el riesgo de romper el build.

### 2. Vitest 5 sí es un salto mayor, pero necesario

La vulnerabilidad crítica de `tinypool` y el `vite@5.4.21` anidado solo desaparecen subiendo a Vitest 5. El cambio se validó con los 102 tests existentes y la configuración actual (`environment: node`, `include: test/**/*.test.ts`) sin modificaciones. Vitest 5 usa el `vite@6.4.5` del workspace.

### 3. Override de esbuild para el CLI de Drizzle

`drizzle-kit@0.31.11` (la última estable) sigue dependiendo de `@esbuild-kit/esm-loader` → `@esbuild-kit/core-utils` → `esbuild@~0.18.20`. El aviso de esbuild afecta a su servidor de desarrollo, que aquí no se usa, pero para dejar el audit a cero se fuerza `esbuild@0.25.12` con un `overrides` en la raíz:

```json
"overrides": {
  "@esbuild-kit/core-utils": {
    "esbuild": "0.25.12"
  }
}
```

Se comprobó que `drizzle-kit generate` carga el `drizzle.config.ts` y analiza las 7 tablas sin errores ni migraciones nuevas. El override se revisará al actualizar `drizzle-kit`.

### 4. Dependabot semanal y agrupado

Se configura Dependabot en la raíz (monorepo, un solo lockfile) para `npm` y `github-actions`. Los parches y menores se agrupan por tipo de dependencia; los majors quedan como PRs individuales para revisarlos. Las alertas y actualizaciones de seguridad se activan en el repositorio, de modo que un aviso nuevo no espera al lunes.

### 5. Auditoría en CI, no auto-merge

CI ejecuta `npm audit --omit=dev --audit-level=high`. Se limita a producción para no bloquear el pipeline por advisories de herramientas de desarrollo, que Dependabot ya propone. No se automatiza la fusión: el repositorio no tiene checks requeridos ni branch protection, y un auto-merge sin esa red podría fusionar antes de que termine CI. El auto-merge queda habilitado a nivel de repositorio para quien quiera usarlo manualmente.

## Alternativas descartadas

- **Bajar `drizzle-kit` a 0.18.1** (lo que sugiere `npm audit fix`): es una regresión de herramienta y no arregla nada real.
- **Actualizar a `drizzle-kit@1.0.0-rc`**: elimina la dependencia antigua, pero introducir un RC en el flujo de migraciones no compensa un aviso moderado de una herramienta que no se despliega.
- **Aceptar los 4 moderados de esbuild**: era la opción conservadora, pero el override está probado y deja el audit limpio.
- **Auto-merge de Dependabot sin checks requeridos**: riesgo de fusionar una actualización rota antes de que CI termine.

## Riesgos

- El override de esbuild podría romper una ruta de `drizzle-kit` no cubierta por `generate` (por ejemplo, `push` o `studio`). Se verificó `generate`; si falla otra orden, basta con quitar el override y asumir el aviso moderado.
- Vitest 5 podría cambiar el comportamiento de algún test futuro; los 102 actuales pasan.
- `npm audit` en CI depende de la disponibilidad del registro de npm; un fallo de red haría fallar el job, que es preferible a publicar con una vulnerabilidad conocida.
