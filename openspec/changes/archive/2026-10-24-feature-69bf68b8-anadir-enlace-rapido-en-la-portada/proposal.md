# Proposal

## Why

Actualmente, para guardar un enlace nuevo el usuario debe abandonar la portada `/`, entrar en `/gestion`, localizar el grupo correspondiente, abrir su formulario y rellenar manualmente título y URL con esquema `https://`. Cuando solo se quiere guardar rápidamente una dirección desde la pantalla principal, ese recorrido añade pasos innecesarios; un acceso rápido en la portada que pida únicamente la URL (sin obligar a escribir `https://`) y el grupo en un desplegable reduce el alta a un solo gesto.

## What Changes

- Nuevo botón de acceso rápido («Añadir enlace rápido», icono `+`) en la barra superior de controles de la portada `/`, junto a los botones de plegado global y de mostrar/ocultar la barra de búsqueda, visible cuando el usuario autenticado tiene al menos un grupo.
- Al pulsarlo, despliega bajo la barra superior un formulario compacto que solicita únicamente:
  - **URL**: campo de texto (`inputMode="url"`) donde no es necesario escribir `https://` ni `http://` (si se omite el esquema, se antepone `https://` automáticamente).
  - **Grupo**: desplegable (`<select>`) con los grupos propios del usuario (preseleccionando el grupo activo en disposición «Barra» si corresponde a un grupo real, o el primer grupo por orden en caso contrario).
- Al guardar, la web normaliza la URL, consulta automáticamente la previsualización existente (`POST /api/v1/bookmarks/previsualizar`) para obtener título (`og:title` o `<title>`) e imagen (`og:image`); si la previsualización falla o no devuelve título, usa el dominio de la URL como título de respaldo y el favicon automático.
- Crea el favorito mediante `POST /api/v1/bookmarks` (incluyendo la imagen previsualizada cuando exista), refresca los favoritos y el contador de grupos en la portada y cierra el formulario.
- Permite cancelar y cerrar el formulario con su botón de cierre o pulsando `Escape`.

## Capabilities

### New Capabilities

<!-- Ninguna capacidad nueva: se extiende `navegacion`. -->

### Modified Capabilities

- `navegacion`: se actualiza el requisito «Speed dial como portada limpia» para contemplar el acceso de alta rápida bajo demanda y se añade el requisito «Alta rápida de enlace en la portada» (botón en controles superiores de `/`, formulario compacto con URL sin esquema obligatorio y desplegable de grupo, obtención automática de título/imagen con respaldo al dominio y actualización inmediata de la portada).

## Impact

- `apps/web/src/hooks/useBookmarks.ts`: admitir `imagen?: string` opcional en `useCrearFavorito` e invalidar también `["grupos"]` (además de `["favoritos"]`) al mutar favoritos para que el contador del grupo se actualice al instante en la portada.
- `apps/web/src/pages/Home.tsx`: añadir el botón de acceso rápido en la barra de controles superiores y el formulario compacto de alta rápida con normalización de URL, preselección de grupo y llamada a previsualización + creación.
- Sin cambios en la base de datos ni nuevos endpoints en `apps/api`. Sin nuevas dependencias.
