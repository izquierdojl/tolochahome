# auth Specification

## Purpose

Da a cada persona su propia cuenta y sesión en TolochaHome, de modo que sus marcadores sean privados y el dueño de la instancia pueda cerrar el registro.

## Requirements

### Requirement: Registro de usuarios

El sistema SHALL permitir crear una cuenta con email y contraseña cuando el registro esté abierto, validando el formato del email y una longitud mínima de contraseña, y SHALL almacenar solo el hash de la contraseña.

#### Scenario: Registro válido

- **WHEN** una persona envía un email válido y una contraseña aceptada con el registro abierto
- **THEN** el sistema crea la cuenta, inicia sesión y la redirige a su startpage

#### Scenario: Email duplicado

- **WHEN** una persona intenta registrar un email que ya existe
- **THEN** el sistema rechaza el alta con error `409` sin indicar qué cuentas existen más allá de lo necesario

#### Scenario: Datos inválidos

- **WHEN** una persona envía un email mal formado o una contraseña demasiado corta
- **THEN** el sistema rechaza el alta con error `400` y mensajes en español

### Requirement: Cierre de nuevos registros

El sistema SHALL rechazar la creación de cuentas cuando `REGISTRATION_ENABLED=false`, manteniendo operativo el login para cuentas existentes, y la web SHALL ocultar o deshabilitar la vía de registro.

#### Scenario: Registro cerrado en API

- **WHEN** alguien intenta registrarse con el registro cerrado
- **THEN** el sistema responde `403` y no crea ninguna cuenta

#### Scenario: Login con registro cerrado

- **WHEN** una cuenta existente inicia sesión con el registro cerrado
- **THEN** el sistema la autentica con normalidad

### Requirement: Login con credenciales

El sistema SHALL autenticar a cuentas existentes con email y contraseña, con tiempos de respuesta que no revelen si el email existe, y SHALL establecer la sesión de renovación en cookie httpOnly.

#### Scenario: Login válido

- **WHEN** una cuenta existente envía sus credenciales correctas
- **THEN** el sistema establece la sesión y devuelve el perfil básico (sin datos sensibles)

#### Scenario: Credenciales incorrectas

- **WHEN** alguien envía credenciales incorrectas
- **THEN** el sistema responde `401` con mensaje genérico en español, sin distinguir email de contraseña

### Requirement: Sesión y renovación rotatoria

El sistema SHALL emitir credenciales de acceso de corta duración y renovarlas mediante un token de renovación rotatorio: cada renovación válida emite un par nuevo e invalida el anterior tras un breve periodo de gracia.

#### Scenario: Renovación válida

- **WHEN** el cliente presenta un token de renovación vigente
- **THEN** el sistema emite un nuevo par de credenciales y mantiene la sesión sin pedir la contraseña

#### Scenario: Reutilización de token rotado

- **WHEN** el cliente reintenta una renovación con un token ya rotado fuera del periodo de gracia
- **THEN** el sistema rechaza la operación con `401` y revoca la cadena de renovación afectada

### Requirement: Logout con revocación

El sistema SHALL cerrar la sesión invalidando el token de renovación presentado y limpiando la cookie, de modo que no pueda reutilizarse.

#### Scenario: Logout válido

- **WHEN** una persona autenticada cierra sesión
- **THEN** el sistema revoca su token de renovación, limpia la cookie y la redirige al login

#### Scenario: Logout con token ya revocado

- **WHEN** se intenta cerrar sesión con un token que ya no es válido
- **THEN** el sistema responde de forma idempotente (éxito) sin filtrar información

### Requirement: Restablecimiento de contraseña

El sistema SHALL permitir solicitar un restablecimiento y fijar una nueva contraseña mediante un token de un solo uso con caducidad, sin revelar si el email existe.

#### Scenario: Solicitud de restablecimiento

- **WHEN** alguien solicita restablecer la contraseña de un email
- **THEN** el sistema responde siempre éxito (aunque el email no exista) y, si existe, genera un token de un solo uso con caducidad

#### Scenario: Uso válido del token

- **WHEN** se presenta un token vigente con una nueva contraseña aceptada
- **THEN** el sistema cambia la contraseña, revoca las sesiones de renovación anteriores e invalida el token

#### Scenario: Token caducado o reutilizado

- **WHEN** se presenta un token caducado, inexistente o ya usado
- **THEN** el sistema responde `400` o `410` sin cambiar nada

### Requirement: Protección de endpoints y páginas

El sistema SHALL exigir sesión válida en todas las rutas de datos y de gestión de cuenta (excepto salud, registro, login y solicitud/confirmación de restablecimiento), y la web SHALL redirigir al login cuando la sesión falte o caduque.

#### Scenario: API sin sesión

- **WHEN** se llama a una ruta protegida sin credenciales válidas
- **THEN** la API responde `401` con formato de error `{ error: { codigo, mensaje } }`

#### Scenario: Web sin sesión

- **WHEN** se visita una página protegida sin sesión válida
- **THEN** la web redirige a `/login` conservando la intención de destino cuando sea posible

### Requirement: Persistencia de la cookie de renovación

La cookie `tolocha-refresh` SHALL conservar su vigencia en el navegador durante toda la vida del token de renovación (`JWT_REFRESH_TTL`), de modo que la sesión se mantenga al volver a la startpage tras periodos de inactividad, mientras el token siga vigente y no se haya cerrado sesión.

#### Scenario: Vuelta tras inactividad

- **WHEN** una persona con sesión iniciada vuelve a la startpage tras un periodo de inactividad inferior a `JWT_REFRESH_TTL`
- **THEN** la web renueva el acceso con la cookie y muestra la sesión sin pedir credenciales

#### Scenario: Caducidad de la cookie acorde al TTL

- **WHEN** la API emite o rota la cookie de renovación
- **THEN** la cabecera `Set-Cookie` incluye una caducidad (`Max-Age`/`Expires`) equivalente a `JWT_REFRESH_TTL`, no una fracción de ella
