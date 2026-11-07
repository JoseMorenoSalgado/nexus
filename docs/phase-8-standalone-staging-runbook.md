# Fase 8 — ensayo de migración PostgreSQL independiente

Estado: **pendiente de ejecución contra bases reales**. CI verde solo comprueba el código, no la transferencia de datos.

## Requisitos de seguridad
1. Confirmar que SOURCE_DATABASE_URL corresponde a una **copia de lectura** de la base heredada de Nexus, no a una base de otro cliente.
2. Crear una base PostgreSQL de ensayo separada, con esquema standalone ya inicializado y sin registros operativos.
3. Respaldar origen y destino con `pg_dump -Fc`; restaurar y verificar el respaldo en un entorno aislado.
4. Mantener URLs, contraseñas y respaldos fuera de GitHub y logs públicos.
5. No ejecutar `prisma db push --accept-data-loss`, `migrate reset`, `DROP` ni cambiar `NEXUS_STANDALONE_MODE` en producción durante el ensayo.

## Preflight de solo lectura
En el entorno privado de ensayo, instalar dependencias y generar clientes:

```bash
npm ci
node scripts/generate-prisma-clients.mjs
SOURCE_DATABASE_URL='postgresql://...' TARGET_DATABASE_URL='postgresql://...' node scripts/preflight-standalone-data.mjs
```

El script **no copia registros**. Un resultado `READY_FOR_STAGING_COPY` solo significa que los conteos y restricciones verificadas permiten **considerar** un ensayo; no garantiza integridad de relaciones ni cobertura completa.

## Ensayo de copia — pendiente de implementación
La copia deberá seleccionar exclusivamente el tenant de Nexus; nunca copiar datos de otros tenants. Mantener IDs, hashes, referencias, fechas, fotografías, CRM, asignaciones, agenda, cierres y pagos. Ordenar inserciones por claves externas. Resolver colisiones globales de slug, refCode y email antes de copiar. No copiar sesiones activas sin una política de invalidación explícita.

## Criterios para autorizar el cambio
- Comparación de conteos por tenant y tabla, además de muestreo de IDs, relaciones y fechas.
- Comprobación de secuencia de referencias posterior a la copia, para evitar códigos repetidos.
- Pruebas reales de creación de usuario, prospecto y propiedad; edición, fotografías y publicación.
- Navegación HTTP 200 de home, catálogo y ficha pública en el dominio de ensayo.
- Pruebas de permisos por rol y de rechazo de solicitudes sin sesión/origen válido.
- Plan de reversión probado, incluyendo restauración y conmutación del tráfico.

**Prohibido fusionar o migrar producción únicamente porque GitHub Actions esté en verde.**
