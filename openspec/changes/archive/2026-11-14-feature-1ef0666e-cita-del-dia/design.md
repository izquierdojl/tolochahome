# Design

## Context

La motivación está en proposal.md y el comportamiento en `specs/cita/spec.md`. Este documento explica cómo implementarlo.

Estado actual relevante:

- La cabecera (`apps/web/src/components/AppShell.tsx`) tiene a la izquierda el chip del tiempo con su popover (`PanelTiempo`) y el `NavLink` de Feeds. El logotipo está centrado con `absolute left-1/2`. El chip del tiempo ya resuelve Escape, clic fuera, `aria-expanded` y la devolución del foco con refs y `useEffect`.
- El tiempo se pide **desde el navegador** a Open-Meteo. Los feeds y las previsualizaciones se piden **desde la API** (`lib/feeds.ts` con `USER_AGENT = "TolochaHome/feeds"` y timeout; `lib/preview.ts`).
- Todas las rutas usan el formato de error `{ error: { codigo, mensaje } }` mediante `HttpError`. Los tests de la API usan vitest + supertest con `createTestApp()`.
- es.wikiquote publica la cita del día en `Plantilla:MMDD`. Su contenido es `{{#switch: {{{año|{{CURRENTYEAR}} }}} | 2011={{CitaDía|…}} | … | #default={{CitaDía|…}} }}`. `CitaDía` recibe `1=texto`, `2=autor visible`, `3=página del autor` (opcional; si falta se usa el 2), `4=descripción` (opcional) e `Imagen=` (no se usa). Algunas entradas no son una cita sino texto plano («El año 2009 no fue bisiesto…»).

## Goals / Non-Goals

**Goals:**

- Obtener la cita con robustez frente a variaciones del wikitext, sin añadir dependencias.
- Que Wikimedia no reciba más de una petición al día por instancia y que el navegador del usuario nunca hable con Wikimedia.
- Reutilizar el patrón de popover del tiempo para que el comportamiento sea coherente.

**Non-Goals:**

- Elegir citas por usuario, por tema o al azar, guardar un histórico o marcar favoritas.
- Mostrar la imagen del autor: es un archivo de Commons con su propia licencia y su propia atribución.
- Interpretar plantillas anidadas dentro del texto, más allá de quitarlas.
- Persistir la caché en SQLite.

## Decisions

### 1. La API hace de intermediaria (frente a pedirla desde el navegador)

`GET /api/v1/cita` lo sirve la API, que es la que habla con Wikimedia. Alternativa descartada: pedirla desde el navegador, como el tiempo. Se descarta por tres motivos. Primero, el navegador del usuario no debe revelar su IP a terceros sin necesidad. Segundo, con una caché compartida se manda una petición al día por instancia, no una por visitante. Tercero, el análisis del wikitext queda en un solo sitio, con tests de Node.

### 2. Wikitext crudo con un analizador propio (frente a `expandtemplates` o `parse` en HTML)

Se pide `action=query&prop=revisions&rvprop=content&rvslots=main&titles=Plantilla:MMDD&format=json&formatversion=2` y se analiza el wikitext. Alternativas descartadas:

- `action=parse` en HTML devuelve la tabla maquetada de `CitaDía`. Habría que extraer celdas de un HTML presentacional que puede cambiar, y además necesitaría un parser HTML.
- `action=expandtemplates` resuelve el `#switch` con el año del servidor de Wikimedia (UTC), no con la zona del nuestro, y vuelve a dar la maqueta.

El wikitext es estable y estructurado. El analizador se hace en tres pasos, todos con funciones puras y testeables:

1. **Separar las entradas del `#switch`.** Se recorre el cuerpo contando la profundidad de `{{ }}` y `[[ ]]`, y se corta por `|` solo en el nivel superior. Cada trozo `clave=valor` (por ejemplo `2011`, `#default`) se guarda en un mapa.
2. **Extraer `CitaDía`.** Si el valor de una entrada contiene `{{CitaDía|…}}`, se separan sus parámetros con el mismo recorrido por profundidad. Los posicionales son 1 a 4; los nombrados (`Imagen=`) se ignoran. Si una entrada no tiene `CitaDía` o le falta texto o autor, no cuenta como cita.
3. **Limpiar el marcado.** `[[a|b]]` pasa a `b` y `[[a]]` a `a`. Se quitan `'''` y `''`, las plantillas anidadas `{{…}}` y las etiquetas HTML (`<br>`, `<ref>…</ref>`), se decodifican las entidades HTML básicas y se normalizan los espacios.

La selección sigue la spec: año en curso, después `#default` y por último el año anterior más reciente con cita.

Dos particularidades de los datos reales, comprobadas contra `action=expandtemplates` de es.wikiquote y fijadas en los fixtures de `apps/api/test/fixtures/`:

- **Claves repetidas.** `Plantilla:1114` tiene dos `#default`. MediaWiki aplica la **última** (hoy se muestra «la casualidad», no «la naturaleza no realiza saltos»); en las claves de año gana la primera. El analizador replica ambas reglas.
- **Claves ajenas.** Existe una clave `#default_old` con una cita de reserva dentro de `{{#ifexpr:…}}`. Solo se consideran claves de cuatro dígitos y `#default`; las demás se ignoran.

### 3. Caché en memoria con una única petición en vuelo (frente a SQLite)

En el módulo hay un estado `{ cita, dia, falloHasta }` y una `Promise` en vuelo:

- Si `cita.dia === hoy`, se devuelve sin tocar la red.
- Si no, se lanza una sola descarga, compartida por todas las peticiones simultáneas. Si sale bien, sustituye la caché.
- Si falla, se mantiene la cita anterior (de otro día) y se fija `falloHasta = ahora + 10 min`. Hasta ese momento no se vuelve a intentar, para no castigar a Wikimedia si está caído ni bloquear cada petición con un timeout de 8 s.
- `hoy` se calcula con la zona horaria del proceso (`TZ` del contenedor), en formato `AAAA-MM-DD`, construido a partir de `getFullYear/getMonth/getDate` y no con `toISOString()`, que usa UTC.

Alternativa descartada: una tabla en SQLite. Obliga a una migración solo para sobrevivir a un reinicio con Wikimedia caído, que es un caso raro. Si ocurre, el emblema se oculta hasta el siguiente intento.

Para los tests, el módulo expone una fábrica `crearServicioCita({ fetch, ahora })` que permite inyectar `fetch` y el reloj. El router recibe el servicio por dependencias, como los demás.

### 4. Petición HTTP

`fetch` nativo a `https://es.wikiquote.org/w/api.php` con timeout de 8 s (`AbortController`, igual que en `lib/feeds.ts`) y las cabeceras `User-Agent: TolochaHome/cita` y `Accept: application/json`. Se sigue la convención de `TolochaHome/feeds` y la política de Wikimedia, que pide un User-Agent propio y no genérico de librería. No lleva datos del usuario ni del despliegue. Se ignoran las respuestas de más de 256 KB. La URL es fija, sin entrada del usuario, así que no hay riesgo de SSRF.

### 5. Respuesta de la API

```json
{
  "cita": {
    "texto": "Es una de mis más importantes…",
    "autor": "Gottfried Leibniz",
    "descripcion": "Filósofo y matemático alemán (1646-1716).",
    "fecha": "2026-11-14",
    "enlace": "https://es.wikiquote.org/wiki/Gottfried_Wilhelm_von_Leibniz",
    "atribucion": {
      "fuente": "Wikiquote",
      "licencia": "CC BY-SA 4.0",
      "licenciaUrl": "https://creativecommons.org/licenses/by-sa/4.0/deed.es"
    }
  }
}
```

Se envía con `Cache-Control: public, max-age=600` para que el proxy y el navegador no repitan la consulta en cada navegación. Si no hay cita, la respuesta es `503 { error: { codigo: "CITA_NO_DISPONIBLE", mensaje: "La cita del día no está disponible en este momento" } }`.

### 6. Web

- `hooks/useCita.ts` usa TanStack Query con la clave `["cita"]`, `retry: false`, `staleTime` de 10 min y `refetchOnWindowFocus`. Se marca para volver a pedirla cuando `data.fecha` es distinta de la fecha local. No depende de la sesión. Como `api.ts` añade el token si existe y el endpoint lo ignora, se puede llamar igual con y sin sesión.
- `IconoCita` en `Iconos.tsx` son unas comillas en SVG con `currentColor`, del mismo tamaño y trazo que los demás iconos.
- `PanelCita.tsx` sigue la estructura de `PanelTiempo`, con `id="panel-cita"` y `role="dialog"`. El texto va en un `<blockquote>` y el autor en `<cite>`. Debajo van la descripción, la fecha y una línea de atribución con dos enlaces.
- En `AppShell.tsx`, el botón va justo después del chip del tiempo y antes de Feeds. Tiene su propio estado abierto/cerrado, sus refs y su `useEffect` de Escape y clic fuera, copiados del tiempo. Abrir un panel cierra el otro. La lógica de popover no se extrae a un hook común porque queda fuera del alcance; si aparece un tercer popover, valdrá la pena hacerlo.

## Risks / Trade-offs

- **[La comunidad cambia el formato de las plantillas]** → El analizador es tolerante: si una entrada no se reconoce, se pasa a la siguiente. Si no se reconoce ninguna, se trata como un fallo de la fuente y se sirve la última cita guardada. Los tests usan fragmentos reales de `Plantilla:1114`, `0229` y `0315`.
- **[Una cita con contenido político o polémico]** → Es la selección editorial de Wikiquote y se acepta. La atribución deja claro de dónde sale.
- **[Desfase de día entre servidor y navegador]** → La fecha la pone el servidor. Si el navegador está en otra zona horaria, puede pedirla de nuevo sin que cambie. Como es una consulta barata y en caché, no tiene impacto.
- **[Espacio en la cabecera en móvil]** → En menos de 400 px el logotipo se queda solo con el icono. A la izquierda quedan tiempo (unos 60 px) + cita (44) + feeds (44), y a la derecha tema + menú. Se comprueba a 320 px en la verificación.
- **[Reinicio con Wikimedia caído]** → No hay cita hasta el siguiente intento, como mucho 10 minutos después. El emblema se oculta y no se rompe nada.
- **[Licencia CC BY-SA]** → Se cumple al citar la fuente, la licencia y el enlace. El texto se muestra sin modificar, salvo el marcado. No se publica ninguna obra derivada que deba compartirse.

## Migration Plan

No hace falta migración. Es un despliegue normal de la imagen y, para volver atrás, basta con desplegar la versión anterior.
