# Auditoría de reconstrucción standalone — 2026-11-07

## Alcance
Usuarios, prospectos (CRM), propiedades, publicación pública y persistencia PostgreSQL. No fusionar a main sin pruebas de integración.

## Evidencia comprobada en main
- `prisma/schema.prisma` utiliza MySQL y conserva `Tenant` y `tenantId`.
- `prisma/schema.postgres.prisma` conserva `Tenant` y `tenantId`.
- `prisma/schema.standalone.postgres.prisma` define modelos independientes de `Tenant` y `tenantId`, con `SiteConfig` y `PropertySequence`.
- `scripts/generate-prisma-clients.mjs` genera tres clientes Prisma; no se debe asumir que una consulta utiliza el cliente standalone sin revisar sus importaciones.
- PR #78 documenta excepción del navegador posterior al guardado sin causa raíz confirmada; PR #80 mejora la respuesta de creación de propiedades, pero requiere validación de despliegue.

## Hipótesis a comprobar, no causas confirmadas
1. Importación del cliente Prisma equivocado o consulta con filtro `tenantId` en rutas standalone.
2. Navegación/refresh de Next.js tras mutaciones y fallo de renderizado de componentes cliente.
3. Diferencias entre esquema desplegado y cliente Prisma generado.
4. Validación de origen, cookies, sesión y permisos de agentes.
5. Generación de slug/refCode y estado `published` incoherentes con las rutas públicas.

## Criterios de aceptación
- Usuario: alta, validación, hash de contraseña, rol, lectura y acceso posterior.
- Prospecto: alta, persistencia, asignación, notas y listado.
- Propiedad: alta, referencia correlativa atómica, imágenes, publicación, URL pública 200, edición y borrador.
- Cada mutación debe devolver resultado verificable y errores con ID de correlación, sin recarga automática que oculte fallos.
- Probar permisos de agente y administrador, entradas inválidas y concurrencia.
- Prisma validate/generate, TypeScript, build y pruebas de integración en PostgreSQL vacío y con datos migrados.
- Backup y plan reversible antes de cualquier migración; nunca eliminar registros existentes.
- Mantener estilos y componentes actuales. Abrir PR y esperar CI verde antes de fusionar.
