# Nexus: migración definitiva a instalación independiente

## Alcance confirmado

Se requiere eliminar el modelo Prisma `Tenant`, el modelo `Domain` como selector de organizaciones, y las columnas y relaciones `tenantId` de las tablas operativas. Esta rama prepara el contrato de migración; **no modifica el esquema activo hasta que los consumidores de Prisma estén adaptados y probados**.

## Arquitectura de destino

- Una instalación de Next.js por empresa, con una base PostgreSQL exclusiva.
- Configuración del sitio en un registro `SiteConfig` único, sin identificador de cliente.
- `AdminUser`, `Property`, `Lead`, `SitePage`, `VisitEvent`, `CommercialClosing`, `PropertySequence`, `LeadSource`, `LeadPropertyHistory`, `LeadCrm`, `LeadNote`, `LeadAssignmentHistory`, `AgendaEvent` y `CommissionPayment` sin `tenantId`.
- `AdminSession` asociada directamente al usuario; autorización por roles, no por tenant.
- `Property.slug`, `Property.refCode`, `AdminUser.email`, `SitePage.slug` y `LeadSource.code` con unicidad global por instalación.
- `PropertySequence` como secuencia singleton para referencias, sin alterar la lógica transaccional.
- Dominios autorizados mediante `SITE_URL` y validación explícita de origen para PDF/API; no seleccionar empresas por `Host`.
- Instalador que crea exclusivamente la configuración local y el primer administrador.

## Puertas de seguridad antes de aplicar el esquema

1. Refactorizar todos los consumidores de `tenantId`, `prisma.tenant`, `prisma.domain` y `tenantFromHost`; no dejar referencias TypeScript sin compilar.
2. Actualizar scripts de seed, instalación, diagnóstico, migración, Prisma MySQL heredado y PostgreSQL.
3. Ejecutar `npm run db:generate`, TypeScript, build Next.js y pruebas HTTP, login, CRM, agentes, PDF y dominio ajeno.
4. Probar instalación limpia con PostgreSQL desechable, desde cero, y confirmar la ausencia de tablas multitenant.
5. Mantener la versión anterior desplegada hasta validar el nuevo instalador.
6. **No ejecutar DROP TABLE ni borrar datos en producción**. Cualquier migración destructiva futura exige copia verificada y autorización.

## Estado

Contrato y secuencia de migración definidos. **La eliminación física del modelo Tenant y las columnas tenantId todavía no está implementada**.
