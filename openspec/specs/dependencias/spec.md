# dependencias Specification

## Purpose

Gestión de las dependencias del proyecto: auditoría de vulnerabilidades, actualizaciones periódicas con Dependabot y verificación en CI.

## Requirements

### Requirement: Sin vulnerabilidades en dependencias de producción

El proyecto SHALL mantener las dependencias de producción sin vulnerabilidades conocidas de severidad alta o crítica según `npm audit --omit=dev`, y SHALL dejar el informe completo sin vulnerabilidades conocidas tras las actualizaciones.

#### Scenario: Auditoría de producción limpia

- **WHEN** se ejecuta `npm audit --omit=dev`
- **THEN** el informe no contiene vulnerabilidades de severidad alta ni crítica

#### Scenario: Auditoría completa limpia

- **WHEN** se ejecuta `npm audit` sobre el árbol completo
- **THEN** el informe no contiene vulnerabilidades conocidas

#### Scenario: Actualización de una dependencia vulnerable

- **WHEN** una dependencia directa o transitiva tiene una versión corregida disponible
- **THEN** se actualiza a una versión fuera del rango vulnerable y se actualiza `package-lock.json`

### Requirement: Compatibilidad tras actualizar

Las actualizaciones de dependencias SHALL mantener el tipado, el lint, los tests y el build sin cambios funcionales, y no SHALL generar migraciones de base de datos.

#### Scenario: Verificación completa

- **WHEN** se aplican las actualizaciones de dependencias
- **THEN** `npm ci`, `npm run typecheck`, `npm run lint`, `npm run test` y `npm run build` terminan sin errores

#### Scenario: Esquema sin cambios

- **WHEN** se ejecuta `npx drizzle-kit generate` después de actualizar `drizzle-orm` y `drizzle-kit`
- **THEN** no se genera ninguna migración nueva

### Requirement: Auditoría automática en CI

El pipeline de integración continua SHALL ejecutar `npm audit --omit=dev --audit-level=high` y SHALL fallar si hay una vulnerabilidad alta o crítica en dependencias de producción.

#### Scenario: Vulnerabilidad alta en producción

- **WHEN** una dependencia de producción tiene una vulnerabilidad alta o crítica
- **THEN** el job de calidad falla y el PR no se puede fusionar sin resolverla

#### Scenario: Sin vulnerabilidades

- **WHEN** las dependencias de producción están limpias
- **THEN** el paso de auditoría termina correctamente y el pipeline continúa

### Requirement: Actualizaciones automatizadas de dependencias

El repositorio SHALL tener Dependabot configurado para proponer actualizaciones semanales de las dependencias `npm` y de las GitHub Actions, con las alertas y actualizaciones de seguridad activadas.

#### Scenario: Revisión semanal

- **WHEN** pasa la revisión semanal configurada
- **THEN** Dependabot abre PRs agrupados para parches y cambios menores, y PRs individuales para cambios major

#### Scenario: Aviso de seguridad nuevo

- **WHEN** se publica una vulnerabilidad que afecta a una dependencia del proyecto
- **THEN** Dependabot abre un PR de seguridad sin esperar a la revisión semanal

#### Scenario: Actualización de GitHub Actions

- **WHEN** hay una versión nueva de una acción usada en los workflows
- **THEN** Dependabot propone la actualización en un PR agrupado
