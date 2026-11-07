# Refactorización a sitio único — Issue #82

Este documento inicia el trabajo en una rama separada de `main`. **No ejecutar eliminaciones de tablas ni migraciones destructivas en producción.**

## Hallazgos confirmados

- `prisma/schema.prisma` todavía declara `Tenant` y `Domain`.
- `Property`, `Lead`, `SitePage`, `AdminUser`, `VisitEvent` y entidades de CRM mantienen `tenantId`.
- El datasource principal visible utiliza `provider = "mysql"`; antes de elegir PostgreSQL o MariaDB se debe confirmar cuál es la configuración efectiva de instalación y qué esquemas genera `scripts/generate-prisma-clients.mjs`.

## Secuencia de implementación

1. Ejecutar `node scripts/audit-single-site.mjs` para generar un inventario de referencias en el código.
2. Clasificar referencias por rutas públicas, dashboard, APIs, autenticación, instalador, migraciones y pruebas.
3. Diseñar un esquema de sitio único y adaptar las consultas **en el mismo PR**, conservando integridad referencial, índices y permisos por rol.
4. Preparar migraciones versionadas sobre una base vacía de prueba. No usar `prisma db push --accept-data-loss` contra producción.
5. Probar instalación limpia, inicio de sesión, creación de usuarios, prospectos y propiedades, publicación, ficha pública, búsqueda y CRM.
6. Ejecutar `npm run db:generate`, `npm run build` y pruebas de integración; verificar que el inventario no conserve dependencias funcionales.
7. Fusionar a `main` únicamente tras revisar resultados y disponer de un respaldo verificable.

## Criterios de salida

No se considera terminada la separación mientras el sistema requiera un registro `Tenant`, una resolución `Domain` o un `tenantId` para operar. La instalación limpia debe funcionar en un dominio único.
