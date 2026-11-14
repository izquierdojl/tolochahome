# Spec Delta

## Purpose

Muestra en la cabecera de TolochaHome una cita diaria de un pensador, político, escritor o filósofo, obtenida de la «Cita del día» de es.wikiquote con su atribución CC BY-SA 4.0.

## ADDED Requirements

### Requirement: Endpoint público de la cita del día

La API SHALL exponer `GET /api/v1/cita` sin necesidad de sesión. Si hay cita, SHALL responder `200` con `texto`, `autor`, `descripcion` (opcional), `fecha` (`AAAA-MM-DD`), `enlace` a la página del autor en es.wikiquote y `atribucion` con fuente «Wikiquote», licencia «CC BY-SA 4.0» y la URL de la licencia. Todos los campos de texto SHALL ir en texto plano, sin marcado wiki ni HTML.

#### Scenario: Consulta sin sesión

- **WHEN** un cliente sin token llama a `GET /api/v1/cita` y hay cita disponible
- **THEN** recibe `200` con `texto`, `autor`, `fecha`, `enlace` y `atribucion`, sin pedir autenticación

#### Scenario: Texto plano

- **WHEN** la entrada original contiene enlaces `[[destino|texto]]`, `[[texto]]` o negritas y cursivas `'''…'''` y `''…''`
- **THEN** la respuesta contiene solo el texto visible, sin corchetes ni comillas simples de marcado

#### Scenario: Enlace al autor

- **WHEN** la entrada indica la página de Wikiquote del autor
- **THEN** `enlace` apunta a `https://es.wikiquote.org/wiki/<página>` con la página codificada como URL

### Requirement: Fuente de la cita del día

La API SHALL obtener la cita de la plantilla diaria de es.wikiquote correspondiente al día en curso (`Plantilla:MMDD`) a través de la API de MediaWiki, identificándose con un User-Agent propio y genérico. SHALL usar la entrada del año en curso; si no existe o no es una cita, la entrada por defecto; y si tampoco lo es, la entrada del año más reciente que sí sea una cita.

#### Scenario: Entrada del año en curso

- **WHEN** la plantilla del día tiene una entrada con cita para el año en curso
- **THEN** se devuelve esa cita

#### Scenario: Sin entrada para el año en curso

- **WHEN** la plantilla del día no tiene entrada para el año en curso pero sí una entrada por defecto con cita
- **THEN** se devuelve la cita de la entrada por defecto

#### Scenario: Entrada que no es una cita

- **WHEN** la entrada del año en curso es texto sin cita (por ejemplo, «El año 2009 no fue bisiesto…») y no hay entrada por defecto con cita
- **THEN** se devuelve la cita del año más reciente que tenga una

#### Scenario: Plantilla sin ninguna cita

- **WHEN** la plantilla del día no existe o no contiene ninguna cita reconocible
- **THEN** se trata como un fallo de la fuente

### Requirement: Caché diaria y tolerancia a fallos

La API SHALL guardar la cita hasta que cambie el día en la zona horaria del servidor, sin volver a pedirla a Wikimedia en cada petición. Si la fuente falla, SHALL servir la última cita obtenida aunque sea de un día anterior. Si no hay ninguna, SHALL responder `503` con el código `CITA_NO_DISPONIBLE` y un mensaje en español, sin repetir el intento en cada petición.

#### Scenario: Varias consultas el mismo día

- **WHEN** se consulta la cita varias veces el mismo día y la primera tuvo éxito
- **THEN** solo se hace una petición a Wikimedia y todas las respuestas contienen la misma cita

#### Scenario: Cambio de día

- **WHEN** se consulta la cita después de medianoche y la guardada es del día anterior
- **THEN** se pide la cita del nuevo día y se devuelve con la nueva `fecha`

#### Scenario: Fuente caída con cita guardada

- **WHEN** falla la petición a Wikimedia y hay una cita de un día anterior guardada
- **THEN** se responde `200` con la cita anterior y su `fecha` original

#### Scenario: Fuente caída sin cita guardada

- **WHEN** falla la petición a Wikimedia y no hay ninguna cita guardada
- **THEN** se responde `503` con `{ error: { codigo: "CITA_NO_DISPONIBLE", mensaje } }`, y las peticiones que llegan durante los minutos siguientes no vuelven a llamar a Wikimedia

#### Scenario: Peticiones simultáneas

- **WHEN** llegan varias peticiones a la vez y la cita no está guardada
- **THEN** se hace una única petición a Wikimedia y todas reciben su resultado

### Requirement: Emblema de la cita en la cabecera

La web SHALL mostrar en la cabecera de todas las rutas, con y sin sesión, un emblema de comillas en la zona izquierda junto al chip del tiempo, con etiqueta accesible. SHALL seguir visible en móvil, fuera del panel de menú. Si no hay cita disponible, el emblema SHALL ocultarse sin mostrar ningún error.

#### Scenario: Visible sin sesión

- **WHEN** un visitante sin sesión abre `/login` y hay cita disponible
- **THEN** la cabecera muestra el emblema de la cita

#### Scenario: Junto al tiempo

- **WHEN** un usuario autenticado con ciudades abre la portada
- **THEN** el emblema aparece en la zona izquierda junto al chip del tiempo, y ni el emblema ni el chip se solapan con el logotipo central

#### Scenario: Móvil

- **WHEN** se ve la cabecera en un viewport estrecho de móvil
- **THEN** el emblema sigue visible fuera del panel de menú y tiene un área táctil de al menos 44 px

#### Scenario: Sin cita

- **WHEN** la API responde `503` a la consulta de la cita
- **THEN** la cabecera no muestra el emblema ni ningún mensaje de error

### Requirement: Panel de la cita

Al pulsar el emblema, la web SHALL abrir un panel con el texto de la cita, el autor, la descripción si existe, la fecha y la atribución «Wikiquote · CC BY-SA 4.0», con enlaces a la página del autor y a la licencia. El panel SHALL cerrarse con `Escape`, al pulsar fuera o al pulsar de nuevo el emblema, devolviendo el foco al emblema al cerrarse con teclado, y SHALL indicar su estado con `aria-expanded`.

#### Scenario: Abrir el panel

- **WHEN** se pulsa el emblema de la cita
- **THEN** se abre el panel con texto, autor, fecha y atribución con enlaces, y el emblema pasa a `aria-expanded="true"`

#### Scenario: Cerrar con Escape

- **WHEN** el panel está abierto y se pulsa `Escape`
- **THEN** el panel se cierra y el foco vuelve al emblema

#### Scenario: Cerrar al pulsar fuera

- **WHEN** el panel está abierto y se pulsa fuera de él
- **THEN** el panel se cierra

#### Scenario: Enlaces externos

- **WHEN** se pulsa el enlace al autor o a la licencia
- **THEN** se abre en una pestaña nueva con `rel="noopener noreferrer"`

### Requirement: Refresco de la cita en la web

La web SHALL pedir la cita al cargar y SHALL volver a pedirla al volver a la pestaña cuando la fecha local sea distinta de la `fecha` de la cita mostrada, sin recargar la página.

#### Scenario: Pestaña abierta tras medianoche

- **WHEN** la startpage lleva abierta desde el día anterior y el usuario vuelve a la pestaña
- **THEN** la web pide de nuevo la cita y muestra la del día nuevo si la API ya la tiene
