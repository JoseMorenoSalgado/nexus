# Migración completa del PR #76 — control de seguridad

## Situación observada
- El esquema independiente PostgreSQL existe y carece de `Tenant` y `tenantId`.
- `scripts/generate-prisma-clients.mjs` genera tres clientes.
- `src/lib/prisma.ts` selecciona solo MySQL o PostgreSQL heredado; el cliente independiente no aparece en el selector.
- `scripts/audit-standalone-migration.mjs` utiliza el cliente MySQL por defecto, por lo que no valida la base PostgreSQL independiente.

## Puertas de ejecución
1. Ejecutar `node scripts/check-standalone-migration.mjs`. El fallo es esperado hasta corregir la selección del cliente.
2. Inventariar todas las importaciones de `getPrisma`, `prismaFor`, `prisma`, las consultas `tenantId` y los accesos a `Tenant` y `Domain` en API, componentes server, instalador, autenticación, CRM, propiedades, PDFs, agenda y finanzas.
3. Actualizar todos los consumidores a tipos y consultas standalone; **no** hacer cast del cliente independiente al tipo MySQL heredado.
4. Respaldar PostgreSQL con `pg_dump -Fc` en un entorno protegido y verificar restauración en una base de pruebas.
5. Validar recuentos, claves externas, referencias, usuarios, prospectos, propiedades, fotos, cierres, pagos y sesiones antes/después de migrar.
6. Probar migración en copia de datos, nunca en producción como primer intento; preservar identificadores, hashes, fechas y referencias. Resolver colisiones de slug, email y refCode antes de crear índices únicos globales.
7. Ejecutar `prisma validate --schema prisma/schema.standalone.postgres.prisma`, generación de clientes, `tsc --noEmit`, build y pruebas end-to-end de usuario, prospecto, propiedad, publicación y roles.
8. Solo entonces preparar despliegue reversible en Enhance y validar páginas públicas. No fusionar hasta que CI y pruebas sean satisfactorias.

## Riesgos
No aplicar `prisma db push --accept-data-loss`, `migrate reset`, `DROP TABLE` ni borrados de columnas en la base actual. El esquema independiente podría necesitar migración de datos, no solo cambios de estructura.

## Alcance de esta entrega
Este cambio agrega un control estático ejecutable y documentación de bloqueos; **no realiza todavía la migración de datos ni reescribe todos los consumidores**.
