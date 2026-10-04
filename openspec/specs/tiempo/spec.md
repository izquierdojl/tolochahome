# tiempo Specification

## Purpose

Muestra el tiempo actual de ciudades configuradas por el usuario en la cabecera de la app, con detalle ampliable, usando Open-Meteo como fuente abierta y gratuita.

## Requirements

### Requirement: Gestión de ciudades

El sistema SHALL permitir a un usuario autenticado crear, listar, renombrar, reordenar y borrar sus propias ciudades meteorológicas (nombre, latitud, longitud), rechazando datos inválidos con `400` en español y las operaciones sobre ciudades ajenas con `404`.

#### Scenario: Alta desde el geocoding

- **WHEN** un usuario autenticado guarda una ciudad con nombre y coordenadas válidas (latitud -90..90, longitud -180..180)
- **THEN** el sistema la persiste, responde `201` y aparece en su lista

#### Scenario: Ciudad ajena

- **WHEN** se opera sobre una ciudad de otro usuario
- **THEN** el sistema responde `404`

#### Scenario: Datos inválidos

- **WHEN** el nombre está vacío o las coordenadas están fuera de rango
- **THEN** el sistema responde `400` con un mensaje en español

#### Scenario: Renombrar, reordenar y borrar

- **WHEN** el usuario renombra, cambia de posición o borra una de sus ciudades
- **THEN** el sistema persiste el cambio y devuelve la lista actualizada

### Requirement: Ciudad por defecto

Con al menos una ciudad, el sistema SHALL mantener exactamente una ciudad por defecto por usuario: al marcar otra deja de serlo la anterior, al borrar la que lo era pasa a serlo la primera por orden, y la ciudad por defecto SHALL ser la que muestra el chip.

#### Scenario: Cambiar la ciudad por defecto

- **WHEN** el usuario marca otra de sus ciudades como por defecto
- **THEN** esa pasa a ser la única por defecto y la anterior deja de serlo

#### Scenario: Borrar la ciudad por defecto

- **WHEN** el usuario borra su ciudad por defecto y le quedan más ciudades
- **THEN** la primera por orden pasa a ser la nueva por defecto

#### Scenario: Borrar la última ciudad

- **WHEN** el usuario borra su única ciudad
- **THEN** no queda ciudad por defecto y el chip meteorológico deja de mostrarse

### Requirement: Sección Tiempo en Configuración

La web SHALL ofrecer en `/config` una sección «Tiempo» donde un usuario autenticado busca ciudades contra el geocoding de Open-Meteo (con resultados que indican nombre, región y país) y gestiona su lista: añadir, renombrar, reordenar, marcar por defecto y borrar.

#### Scenario: Buscar y añadir una ciudad

- **WHEN** el usuario escribe un nombre de ciudad y elige un resultado
- **THEN** la ciudad se añade a su lista y queda disponible para el chip

#### Scenario: Búsqueda sin resultados o fallida

- **WHEN** la búsqueda no devuelve resultados o el servicio falla
- **THEN** la sección lo indica sin bloquear el resto de la configuración

#### Scenario: Gestionar la lista

- **WHEN** el usuario renombra, reordena, marca por defecto o borra una ciudad de la lista
- **THEN** el cambio se refleja en la lista y persiste entre sesiones

### Requirement: Chip meteorológico en la cabecera

La web SHALL mostrar, en la cabecera de todas las rutas y solo con sesión iniciada y al menos una ciudad, un chip con el icono de la condición actual y la temperatura de la ciudad por defecto; el chip SHALL tener etiqueta accesible y al pulsarlo SHALL abrir el detalle.

#### Scenario: Chip visible

- **WHEN** un usuario autenticado con ciudad por defecto navega por cualquier ruta
- **THEN** la cabecera muestra el icono y la temperatura de esa ciudad

#### Scenario: Sin sesión o sin ciudades

- **WHEN** no hay sesión iniciada o el usuario no tiene ciudades
- **THEN** la cabecera no muestra el chip

#### Scenario: Sin datos disponibles

- **WHEN** la consulta a Open-Meteo falla y no hay dato previo en memoria
- **THEN** el chip no se muestra

#### Scenario: Abrir el detalle

- **WHEN** el usuario pulsa el chip
- **THEN** se abre el panel de detalle de la ciudad por defecto

### Requirement: Detalle del tiempo

El panel de detalle SHALL mostrar condición textual, sensación térmica, máx/mín del día, probabilidad de lluvia, viento, humedad y las próximas horas de la ciudad por defecto, en grados Celsius, junto a la hora de actualización y la atribución a Open-Meteo, e incluir un selector con las ciudades configuradas.

#### Scenario: Detalle completo

- **WHEN** el usuario abre el detalle con datos disponibles
- **THEN** ve los valores actuales, la previsión de las próximas horas, la hora de actualización y la atribución a Open-Meteo

#### Scenario: Cambiar de ciudad en el selector

- **WHEN** el usuario elige otra ciudad en el selector del detalle
- **THEN** el panel muestra los datos de esa ciudad y esa pasa a ser la nueva ciudad por defecto, persistida

#### Scenario: Cerrar el panel

- **WHEN** el usuario pulsa `Escape` o fuera del panel
- **THEN** el panel se cierra y el foco vuelve al chip

### Requirement: Refresco automático

La web SHALL refrescar los datos meteorológicos automáticamente una vez por hora mientras la aplicación esté abierta y al volver a la pestaña cuando el último dato tenga más de una hora, sin recargar la página; si un refresco falla, SHALL mantener el último dato disponible.

#### Scenario: Refresco horario

- **WHEN** la aplicación permanece abierta una hora
- **THEN** los datos se actualizan sin recargar la página

#### Scenario: Vuelta a la pestaña

- **WHEN** el usuario vuelve a la pestaña con datos de hace más de una hora
- **THEN** la web los refresca

#### Scenario: Fallo de refresco

- **WHEN** la petición de refresco falla
- **THEN** se conserva el último dato válido y la interfaz sigue operativa

### Requirement: Previsión de los próximos días

El panel de detalle SHALL mostrar la previsión de los próximos días —hoy y los seis siguientes— para la ciudad seleccionada, con el nombre del día, el icono de su condición y las temperaturas máxima y mínima, en grados Celsius.

#### Scenario: Lista de próximos días

- **WHEN** el usuario abre el detalle con datos disponibles
- **THEN** ve la previsión de hoy y los seis días siguientes con el nombre del día, el icono de la condición y las temperaturas máxima y mínima

#### Scenario: Cambio de ciudad actualiza la previsión

- **WHEN** el usuario cambia de ciudad en el selector del detalle
- **THEN** la previsión de los próximos días corresponde a la nueva ciudad seleccionada

#### Scenario: Sin previsión diaria

- **WHEN** Open-Meteo no devuelve previsión diaria
- **THEN** la sección de próximos días no se muestra y el resto del detalle sigue operativo
