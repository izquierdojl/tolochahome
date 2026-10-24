# Design

## Context

El árbol actual instala `body-parser@2.3.0` mediante `express@5.2.1`, `multer@2.4.0` y `zod@3.25.76`. Las tres versiones están dentro de rangos con advisories altas y bloquean el paso `npm audit --omit=dev --audit-level=high` de CI.

Las correcciones disponibles son `body-parser@2.4.0`, `multer@2.5.0` y `zod@4.6.7`. Las dos primeras son actualizaciones menores; Zod requiere un salto mayor. El resto de PRs de Dependabot incluye cambios mayores no relacionados que no son necesarios para desbloquear la publicación.

## Goals / Non-Goals

**Goals:**

- Eliminar las tres vulnerabilidades altas de producción.
- Mantener el comportamiento y los contratos actuales de la API.
- Dejar CI y el PR #24 en condiciones de fusionarse y publicar la imagen.

**Non-Goals:**

- Actualizar `vite` 8, TypeScript 7, ESLint 10, `better-sqlite3` 13, `dotenv` 18 u otras actualizaciones mayores pendientes.
- Cambiar la API, la base de datos o la interfaz web por motivos funcionales.
- Añadir requisitos a la capability `dependencias`: es mantenimiento sin cambio de comportamiento observable.

## Decisions

### 1. Actualizar Express y resolver `body-parser` 2.4.0

Se actualiza `express` a `^5.3.0` y se regenera el lockfile para que su dependencia `body-parser` quede en 2.4.0. Si la resolución mantuviera una versión vulnerable, se fijará la versión segura con un `override` en la raíz.

- **Por qué:** evita parchear una dependencia transitiva fuera del grafo declarado y mantiene Express en una versión compatible.
- **Alternativa descartada:** fijar solo `body-parser` sin actualizar Express; menos coherente con el manifiesto y con las pruebas de Dependabot.

### 2. Actualizar Multer a 2.5.0

Se cambia la dependencia directa de `apps/api` a `^2.5.0` y se verifica que las rutas de importación de imágenes mantienen sus contratos.

- **Por qué:** es la versión corregida disponible y no requiere cambios de API.
- **Alternativa descartada:** mantener 2.4.0 con un parche manual; dejaría una vulnerabilidad alta en producción.

### 3. Migrar Zod de 3 a 4.6.7

Se actualiza la dependencia directa y se ejecutan typecheck y tests para detectar incompatibilidades. Solo se adaptará el código afectado por cambios de API de Zod 4; no se reescribirán esquemas que sigan siendo válidos.

- **Por qué:** no existe una versión 3 corregida; 4.6.7 es la primera versión fuera del rango vulnerable.
- **Alternativa descartada:** ignorar el aviso o silenciar la auditoría; incumpliría la política del proyecto y dejaría una vulnerabilidad alta.

### 4. Validar el árbol completo antes de publicar

Además de los tests del proyecto, se comprobará que `npm audit --omit=dev --audit-level=high` termina sin hallazgos y que `npm ci` puede reconstruir el árbol desde el lockfile.

## Risks / Trade-offs

- **Cambios incompatibles en Zod 4** → Typecheck y la suite de 102 tests detectan los usos afectados; cualquier adaptación se limita a esos puntos.
- **Resolución transitiva distinta de `body-parser`** → Se verifica la versión instalada con `npm ls` y se usa un override si no queda en 2.4.0.
- **Actualización más amplia de la necesaria** → El cambio se limita a los tres paquetes vulnerables; las demás actualizaciones mayores quedan para PRs independientes.

## Migration Plan

No hay migración de datos ni configuración. Se despliega con el build normal; para revertir basta con revertir el commit y regenerar el lockfile anterior.
