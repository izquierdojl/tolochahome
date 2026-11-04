# Spec Delta

## Purpose

Permite seguir canales RSS/Atom y consultar sus últimas noticias en una página de lectura rápida, sin estado de leídos ni gestor complejo.

## ADDED Requirements

### Requirement: Alta de suscripciones con autodescubrimiento

Al añadir una suscripción, el sistema SHALL aceptar una URL de feed RSS/Atom o una URL de sitio; si la respuesta es HTML, SHALL buscar un `<link rel="alternate">` con tipo RSS/Atom y usar su `href` resuelto contra la URL de la página. Si no encuentra un feed válido, SHALL rechazar el alta con `400` y un mensaje en español.

#### Scenario: URL directa de feed

- **WHEN** el usuario añade una URL que responde con un feed RSS o Atom válido
- **THEN** el sistema crea la suscripción con el título detectado y guarda sus últimas entradas

#### Scenario: URL de sitio con autodescubrimiento

- **WHEN** el usuario añade la URL de una página HTML que incluye un `<link rel="alternate">` RSS/Atom
- **THEN** el sistema resuelve el `href` contra la página, descarga ese feed y crea la suscripción

#### Scenario: HTML sin feed

- **WHEN** el usuario añade una URL HTML sin ningún `<link rel="alternate">` RSS/Atom
- **THEN** el sistema responde `400` con un mensaje que pide la URL del feed y no crea la suscripción

#### Scenario: URL no disponible o XML inválido

- **WHEN** la URL no responde, supera el timeout o el XML no se puede parsear
- **THEN** el sistema responde `400` con un mensaje en español y no crea la suscripción

### Requirement: Validación, duplicados y límite de suscripciones

El sistema SHALL rechazar con `400` las URLs que no usen `http`/`https` o no sean válidas, con `409` las suscripciones duplicadas del mismo usuario y con `400` o `409` la que supere el límite de 50 feeds por usuario.

#### Scenario: Esquema no permitido

- **WHEN** el usuario envía una URL con un esquema distinto de `http` o `https`
- **THEN** el sistema responde `400` y no crea la suscripción

#### Scenario: Suscripción duplicada

- **WHEN** el usuario añade una URL que ya tiene suscrita
- **THEN** el sistema responde `409` sin crear una segunda suscripción

#### Scenario: Límite de feeds

- **WHEN** el usuario intenta añadir una suscripción teniendo ya 50
- **THEN** el sistema rechaza el alta con un mensaje en español y no crea la suscripción

### Requirement: Baja y aislamiento por usuario

El sistema SHALL permitir al usuario autenticado borrar sus propias suscripciones y SHALL impedir que vea o modifique las de otro usuario, respondiendo `404`; todas las rutas de feeds SHALL exigir sesión y responder `401` sin credenciales.

#### Scenario: Borrar una suscripción propia

- **WHEN** el usuario borra una de sus suscripciones
- **THEN** el sistema elimina la suscripción y sus entradas cacheadas

#### Scenario: Suscripción ajena

- **WHEN** un usuario intenta borrar o consultar una suscripción de otra cuenta
- **THEN** el sistema responde `404`

#### Scenario: Sin sesión

- **WHEN** se llama a cualquier ruta de feeds sin credenciales válidas
- **THEN** la API responde `401` con el formato de error habitual

#### Scenario: Listado propio

- **WHEN** un usuario consulta sus feeds
- **THEN** solo aparecen sus suscripciones, nunca las de otras cuentas

### Requirement: Refresco perezoso y periodo configurable

El sistema SHALL refrescar los feeds de forma perezosa: al abrir `/feeds` actualizará los que hayan superado el intervalo configurado y, mientras la página siga abierta, volverá a consultarlos cada intervalo. No SHALL refrescar feeds con la aplicación cerrada. El intervalo SHALL ser configurable por usuario entre 15 minutos y 12 horas, con 30 minutos por defecto.

#### Scenario: Feed viejo al abrir la página

- **WHEN** el usuario abre `/feeds` y una suscripción supera su intervalo de actualización
- **THEN** el sistema descarga ese feed antes de mostrar sus entradas actualizadas

#### Scenario: Feed reciente

- **WHEN** el usuario abre `/feeds` y una suscripción aún no supera su intervalo
- **THEN** el sistema muestra la copia cacheada sin descargar el feed

#### Scenario: Página abierta

- **WHEN** la página `/feeds` permanece abierta y se cumple el intervalo configurado
- **THEN** el sistema vuelve a consultar los feeds mostrados sin recargar la página

#### Scenario: Aplicación cerrada

- **WHEN** no hay ninguna página de feeds abierta
- **THEN** el sistema no descarga feeds automáticamente

#### Scenario: Intervalo por defecto y límites

- **WHEN** el usuario nunca ha configurado el intervalo
- **THEN** el sistema usa 30 minutos, y rechaza valores fuera del rango de 15 minutos a 12 horas

### Requirement: Caché de 30 entradas y tolerancia a fallos

El sistema SHALL conservar hasta 30 entradas por feed, ordenadas de más reciente a más antigua. Si una actualización falla, SHALL mantener las entradas anteriores y marcar el error; una respuesta `304` SHALL actualizar la fecha sin reemplazar la caché.

#### Scenario: Actualización correcta

- **WHEN** un feed devuelve más de 30 publicaciones
- **THEN** el sistema guarda las 30 más recientes y descarta el resto

#### Scenario: Fallo de actualización

- **WHEN** una actualización falla después de haber obtenido entradas con anterioridad
- **THEN** el sistema conserva las entradas anteriores, marca el error en esa suscripción y reintenta en el siguiente intervalo

#### Scenario: Respuesta 304

- **WHEN** el servidor del feed responde `304 Not Modified`
- **THEN** el sistema mantiene las entradas y actualiza la fecha de la última comprobación

#### Scenario: Feed sin entradas

- **WHEN** un feed válido no contiene publicaciones
- **THEN** el sistema guarda la suscripción con una lista vacía y la muestra como tal

### Requirement: Formatos y codificación

El sistema SHALL parsear RSS 2.0, Atom y RSS 1.0/RDF, detectar la codificación declarada en la cabecera HTTP o en el XML y normalizar título, enlace, resumen y fecha a un formato común.

#### Scenario: RSS 2.0

- **WHEN** el feed usa RSS 2.0
- **THEN** el sistema extrae las entradas de `channel/item`

#### Scenario: Atom

- **WHEN** el feed usa Atom
- **THEN** el sistema extrae las entradas de `feed/entry` y resuelve sus enlaces

#### Scenario: RSS 1.0/RDF

- **WHEN** el feed usa RSS 1.0/RDF
- **THEN** el sistema extrae las entradas de `rdf:RDF/item`

#### Scenario: Codificación no UTF-8

- **WHEN** el feed declara `ISO-8859-1` o `windows-1252`
- **THEN** el sistema decodifica el contenido con esa codificación y muestra los textos correctamente

### Requirement: Contenido y enlaces de las entradas

Cada entrada SHALL exponer título, resumen en texto plano y fecha de publicación; el enlace SHALL ser `http`/`https`. El resumen SHALL truncarse y no SHALL renderizarse HTML. El sistema no SHALL mostrar imágenes, vídeos, podcasts ni el contenido completo del artículo.

#### Scenario: Resumen con HTML

- **WHEN** el feed incluye HTML en el resumen
- **THEN** el sistema lo convierte a texto plano antes de mostrarlo

#### Scenario: Enlace no permitido

- **WHEN** una entrada incluye un enlace con esquema distinto de `http`/`https`
- **THEN** el sistema no muestra ese enlace como clicable

#### Scenario: Entrada sin resumen

- **WHEN** una entrada solo trae título y enlace
- **THEN** el sistema muestra la entrada sin bloque de resumen

#### Scenario: Resumen largo

- **WHEN** el resumen supera el límite de caracteres
- **THEN** el sistema lo trunca y la interfaz lo muestra en pocas líneas

### Requirement: Página `/feeds` con persianas

La web SHALL ofrecer `/feeds` tras `RequireAuth`, con una persiana por suscripción; al desplegarla SHALL mostrar las 10 publicaciones más recientes y un control «Ver las 30» para revelar el resto. Sin feeds SHALL mostrar un estado vacío con enlace a `/config`; un feed con error SHALL mostrar la última copia y un aviso.

#### Scenario: Página protegida

- **WHEN** se visita `/feeds` sin sesión válida
- **THEN** la web redirige a `/login` conservando la intención de destino

#### Scenario: Persianas plegadas

- **WHEN** el usuario entra en `/feeds` con suscripciones
- **THEN** ve una persiana por feed, plegada por defecto, con su título y estado de actualización

#### Scenario: Desplegar una persiana

- **WHEN** el usuario despliega una suscripción
- **THEN** ve las 10 publicaciones más recientes y el control «Ver las 30»

#### Scenario: Ver las 30

- **WHEN** el usuario pulsa «Ver las 30»
- **THEN** la persiana muestra el resto de publicaciones cacheadas sin salir de la página

#### Scenario: Sin suscripciones

- **WHEN** el usuario no tiene ningún feed
- **THEN** `/feeds` muestra un estado vacío con un enlace a `/config`

#### Scenario: Feed con error

- **WHEN** una suscripción no se pudo actualizar pero tiene entradas anteriores
- **THEN** la persiana muestra la última copia y un aviso de error

### Requirement: Plegado persistente y apertura de enlaces

La web SHALL recordar por usuario qué persianas de feeds están desplegadas y SHALL abrir los enlaces de las entradas según la preferencia «Apertura de enlaces», en la misma o en una nueva pestaña.

#### Scenario: Plegado persistente

- **WHEN** el usuario pliega o despliega persianas y recarga `/feeds`
- **THEN** se mantiene el estado por usuario

#### Scenario: Abrir en la misma pestaña

- **WHEN** la preferencia es «Misma pestaña» y el usuario pulsa una noticia
- **THEN** el enlace se abre en la pestaña actual

#### Scenario: Abrir en nueva pestaña

- **WHEN** la preferencia es «Nueva pestaña» y el usuario pulsa una noticia
- **THEN** el enlace se abre en una pestaña nueva

### Requirement: Gestión de feeds en Configuración

La web SHALL ofrecer en `/config` una sección «Feeds» donde el usuario autenticado añade canales por URL, los borra y elige el periodo de actualización; el alta SHALL mostrar el título detectado y los errores en español.

#### Scenario: Añadir un canal

- **WHEN** el usuario pega una URL válida en la sección «Feeds» y confirma
- **THEN** el sistema crea la suscripción, muestra su título y la añade a `/feeds`

#### Scenario: Borrar un canal

- **WHEN** el usuario borra una suscripción desde `/config`
- **THEN** desaparece de la lista y de `/feeds`

#### Scenario: Cambiar el periodo

- **WHEN** el usuario elige otro periodo de actualización
- **THEN** el sistema lo guarda para su cuenta y lo aplica a los siguientes refrescos

#### Scenario: Alta fallida

- **WHEN** la URL no es un feed válido o no se puede autodescubrir
- **THEN** la sección muestra el error en español y no crea la suscripción

### Requirement: Seguridad de las descargas

El sistema SHALL descargar feeds solo por `http`/`https`, rechazar hosts privados o de red local salvo que `FEEDS_ALLOW_PRIVATE=true`, y aplicar timeout, límite de tamaño y concurrencia acotada para evitar abusos.

#### Scenario: Host privado

- **WHEN** una URL de feed apunta a `localhost`, una IP privada o un nombre que resuelve a red local
- **THEN** el sistema rechaza la descarga salvo que `FEEDS_ALLOW_PRIVATE=true`

#### Scenario: Redirección a red privada

- **WHEN** un feed público redirige a un host privado
- **THEN** el sistema rechaza la redirección y no descarga el destino

#### Scenario: Timeout

- **WHEN** el servidor del feed tarda más que el timeout configurado
- **THEN** el sistema aborta la descarga y marca el error sin bloquear el resto de feeds

#### Scenario: Respuesta demasiado grande

- **WHEN** el feed supera el límite de tamaño
- **THEN** el sistema aborta la descarga y mantiene la caché anterior

#### Scenario: Concurrencia

- **WHEN** hay muchas suscripciones viejas al abrir `/feeds`
- **THEN** el sistema limita cuántas descargas simultáneas realiza
