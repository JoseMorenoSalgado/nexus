# Fase 3 — adopción progresiva del cliente standalone

Se agregó `src/lib/prisma-standalone.ts` con cliente generado desde `prisma/schema.standalone.postgres.prisma`.

## Restricción de seguridad
No sustituir globalmente `src/lib/prisma.ts` todavía: los controladores existentes siguen enviando filtros `tenantId` y llaman `prisma.tenant`, lo cual rompería el CRUD si el cliente standalone se activase sin refactorizar las consultas.

## Trabajo pendiente para finalizar fase 3
1. Migrar instalador a `SiteConfig` y crear el administrador sin tenant.
2. Migrar sesión, permisos y CRUD de usuarios, propiedades y prospectos.
3. Migrar `src/lib/tenant.ts` a contexto de sitio, sin consultas `prisma.tenant` ni `prisma.domain`.
4. Migrar consultas de páginas, multimedia, agenda, CRM y reportes.
5. Validar PostgreSQL vacío, `npm run db:generate`, `npm run build` y pruebas de integración.
6. Habilitar el cliente standalone como predeterminado solo después de adaptar todos los consumidores.

No se ha ejecutado una migración de datos ni se ha certificado el despliegue.
