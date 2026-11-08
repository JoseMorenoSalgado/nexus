# Fase 2 — contrato del esquema independiente (Issue #82)

## Diagnóstico
El repositorio **ya contiene** `prisma/schema.standalone.postgres.prisma`, con `SiteConfig`, sin modelos `Tenant`/`Domain` ni campos `tenantId`. Sin embargo, `prisma/schema.prisma` (MySQL), `prisma/schema.postgres.prisma` y `src/lib/single-installation.ts` siguen usando el modelo multitenant. Además, `src/lib/tenant.ts` consulta `prisma.tenant` y filtra propiedades por `tenantId`. Por eso la existencia del esquema independiente **no significa** que el runtime lo esté utilizando.

## Entrega de esta fase
- Contrato estático ejecutable: `node scripts/test-standalone-schema.mjs`.
- Se mantiene intacto el runtime para evitar despliegues rotos y cambios destructivos.
- Próximo cambio obligatorio: inspeccionar `src/lib/prisma.ts`, el instalador y todos los accesos a `prisma.tenant` antes de conmutar el cliente activo a `src/generated/standalone-postgres`.
- Tras la conmutación, adaptar páginas públicas, CRUD, autenticación y pruebas; ejecutar build y una instalación en PostgreSQL vacío.

**Bloqueo de fusión:** no fusionar hasta verificar que las rutas y el CRUD operan contra el esquema standalone y pasan las pruebas.
