# Design

## Context

Ver `proposal.md` (motivación y alcance) y `specs/navegacion/spec.md` (requisitos de comportamiento).

Estado actual relevante del código:

- `apps/web/src/pages/Home.tsx` renderiza en la parte superior una fila centrada (`mx-auto w-full max-w-xl`) con los botones de plegado global (`botonPlegado`), visibilidad del buscador (`alternarBusqueda`) y, si está visible, `BarraBusqueda`.
- `apps/api/src/routes/bookmarks.ts` ya expone `POST /api/v1/bookmarks/previsualizar` (extrae `og:title`/`<title>` y descarga `og:image`) y `POST /api/v1/bookmarks` (acepta `{ groupId, titulo, url, imagen? }` en una sola petición).
- `apps/web/src/hooks/useBookmarks.ts` define `useCrearFavorito()` y `usePrevisualizar()`, pero actualmente `useCrearFavorito` no tipa `imagen?: string` en su entrada y `useInvalidar()` solo invalida `["favoritos"]`, sin refrescar `["grupos"]` (de donde sale el contador `grupo.favoritos` que muestra la portada).
- `apps/web/src/components/ImagenFavorito.tsx` ya exporta `dominioDe(url: string): string` para extraer el `hostname` de una URL.

## Goals / Non-Goals

**Goals:**
- Permitir añadir un favorito desde `/` introduciendo únicamente la URL (con o sin `https://`) y eligiendo el grupo destino en un desplegable.
- Resolver automáticamente título e imagen mediante la vista previa existente al guardar, con respaldo silencioso al dominio y al favicon si la vista previa falla.
- Refrescar al instante tanto la lista de favoritos del grupo como el contador de enlaces del grupo en la portada.

**Non-Goals:**
- Trasladar la edición, borrado, reordenación o subida manual de imágenes desde `/gestion` a la portada.
- Añadir nuevos endpoints en la API o modificar el esquema SQLite.
- Crear grupos desde la portada (si el usuario no tiene grupos, la portada ya enlaza a `/gestion`).

## Decisions

### 1. Control en la fila superior de `Home.tsx` y panel compacto bajo ella

El botón (`<IconoMas />`, `min-h-[44px] min-w-[44px]`, `aria-expanded`, `aria-label="Añadir enlace rápido"`) se sitúa junto a `botonPlegado` y al botón de mostrar/ocultar búsqueda en `Home.tsx`, tanto cuando la barra de búsqueda está visible como cuando está oculta, siempre que `listaGrupos.length > 0`. Al activarlo, despliega justo debajo (dentro del mismo ancho `max-w-xl`) un formulario compacto en una fila adaptable (`flex-wrap`).

Alternativas descartadas:
- Botón en la cabecera global (`AppShell.tsx`): ocuparía espacio en móvil y aparecería fuera de la portada (`/config`, `/perfil`, etc.).
- Botón flotante (FAB) en esquina: taparía mosaicos o filas del final de la pantalla en viewports móviles de 360 px.

### 2. Entrada de URL con `type="text"` + `inputMode="url"` y normalización automática

El `<input>` usa `type="text"` con `inputMode="url"` en lugar de `type="url"`, porque la validación nativa del navegador para `type="url"` rechaza valores sin esquema (como `ejemplo.com`) antes del `onSubmit`.

La función de normalización recorta espacios y:
- Si la cadena ya empieza por `http://` o `https://` (insensible a mayúsculas), la conserva.
- Si empieza por otro esquema explícito (por ejemplo `javascript:`, `data:`, `ftp://`) sin ser un `host:puerto`, no antepone `https://` para que la validación lo rechace como URL no válida.
- En cualquier otro caso, antepone `https://`.
- A continuación valida con `new URL(normalizada)` que el protocolo sea `http:` o `https:` y que el `hostname` sea válido (contenga un punto, sea `localhost` o una IP), mostrando un error en español si no lo es.

### 3. Obtención de título e imagen al guardar con respaldo al dominio

Al enviar el formulario rápido:
1. Se normaliza y valida la URL en cliente.
2. Se invoca `previsualizar.mutateAsync(urlNormalizada)`. Si responde con éxito, se toma `vista.titulo?.trim()` (recortado a 150 caracteres) y `vista.imagen ?? undefined`.
3. Si la previsualización lanza error o no devuelve título, se captura silenciosamente y se usa `dominioDe(urlNormalizada).slice(0, 150)` como `titulo` y `undefined` como `imagen` (quedando el favicon automático).
4. Se invoca `crear.mutateAsync({ groupId, titulo, url: urlNormalizada, ...(imagen ? { imagen } : {}) })` en una única petición `POST /api/v1/bookmarks`.

Alternativa descartada: disparar la previsualización en `onBlur` antes de pulsar guardar (en un formulario de un solo campo el usuario suele escribir o pegar la URL y pulsar `Enter` inmediatamente, por lo que `onBlur` competiría con `onSubmit`).

### 4. Desplegable de grupo con preselección contextual

El `<select>` de grupo se muestra siempre en el formulario rápido con todos los grupos de `listaGrupos` (nunca se incluye la sección sintética `__frecuentes`). Al abrir el formulario, el grupo seleccionado por defecto es:
- En disposición «Barra», si `grupoActivo` es un grupo real (`grupoActivo.id !== ID_FRECUENTES`), `grupoActivo.id`.
- En caso contrario (disposición «Secciones» o pestaña «Frecuentes» activa), `listaGrupos[0].id`.

### 5. Extensión de `useCrearFavorito` e invalidación de `["grupos"]`

En `apps/web/src/hooks/useBookmarks.ts`:
- `useCrearFavorito` acepta `{ groupId: string; titulo: string; url: string; imagen?: string }`, aprovechando que `POST /api/v1/bookmarks` ya soporta `imagen` opcional.
- `useInvalidar()` invalida tanto `["favoritos"]` como `["grupos"]` para que el contador `(N)` de la cabecera del grupo y del botón «Abrir todos» se actualice de inmediato tras crear o borrar un enlace.

## Risks / Trade-offs

- [Latencia de `previsualizar` en sitios lentos] → El endpoint de previsualización ya aplica un timeout acotado (`PREVIEW_TIMEOUT_MS = 8000` en la API) y durante el guardado el botón de envío permanece deshabilitado para evitar envíos duplicados; si falla, cae al instante al dominio como título.
- [Dominio sin punto escrito por error (p. ej. `texto suelto`)] → La validación previa en cliente comprueba `new URL` y que el `hostname` sea válido antes de llamar a la API, devolviendo un mensaje claro en español.
- [Sin suite de tests de componentes React en `apps/web`] → Se mantiene la convención del repositorio: verificar con `npm run verify` (`typecheck`, `lint`, `test` y `build`) y comprobación en contenedor Docker.

## Migration Plan

Sin migraciones de base de datos ni cambios de variables de entorno. Rollback directo revirtiendo los cambios en `apps/web`.
