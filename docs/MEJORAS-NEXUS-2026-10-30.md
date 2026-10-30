# NEXUS — mejoras funcionales del cliente (30 de octubre de 2026)

**Alcance:** exclusivamente inmobiliario y CRM, sin cambios destructivos en datos ni despliegue automático de Plesk. La rama de trabajo es `feat/mejoras-nexus-20261030`; integrar a `main` únicamente tras revisión, CI y prueba en staging con copia sanitizada de datos.

## Cambios preparados

1. **Fichas PDF:** tamaño A4 con texto envuelto por ancho medido de fuente; hoja resumida de una página y ampliada de hasta dos páginas; fotografías con proporciones originales; selección de hasta cinco imágenes; vista previa `?vista=1`; QR a ficha pública cuando haya detalles/fotografías adicionales. Ninguna foto se descarga de orígenes externos: solo archivos privados pertenecientes al tenant.
2. **Referencias:** `PropertySequence` por tenant, `NRE-000001` por defecto, generador en transacción serializable y unicidad ya existente `Property(tenantId,refCode)`; referencias de propiedades previas se conservan. El prefijo puede configurarlo un administrador en **Propiedades**. Reasignar número de referencia en edición no está permitido.
3. **Usuarios:** contraseñas ocultas por defecto, control mostrar/ocultar, confirmación idéntica y validación de servidor (mínimo 12 caracteres, letra y número). La contraseña se almacena solo como hash `scrypt`.
4. **Agentes:** listado, creación, edición, fotos, documento PDF y publicación con control `assignedAgentId` + `tenantId` en servidor. Administradores y editores conservan acceso a todo el inventario del mismo tenant. La asignación la establece el servidor para nuevas propiedades creadas por agentes.
5. **Canales CRM:** catálogo configurable `LeadSource` por empresa, conserva `source` de prospectos históricos; fuentes adicionales Marketplace, Facebook, Instagram, TikTok, Referido, Cliente; filtros y conteo de prospectos por canal. Administradores pueden agregar, renombrar, activar y desactivar.
6. **Prospectos:** se confirma el diseño existente `Lead.propertyId String?`; ahora formularios y endpoints dejan guardar sin propiedad y admiten `externalPropertyInterest` opcional. Cambios posteriores quedan registrados en `LeadPropertyHistory`, y respetan permisos y asignación del prospecto.

## Despliegue seguro en Plesk

**No ejecutar en producción hasta que las pruebas y la revisión del PR hayan terminado.**

1. Verificar que el proyecto Plesk usa una versión de Node compatible (`>=22 <27`), el archivo de arranque actual y `APP_CONFIG_DIR` persistente fuera de `httpdocs`. Realizar respaldo verificado de **base de datos**, **APP_CONFIG_DIR** y archivos multimedia. Anotar la rama/commit actualmente desplegados. No introducir secretos en Git.
2. En un entorno de staging con datos de ensayo, consultar `prisma/schema.prisma` si usa MySQL/MariaDB, o `prisma/schema.postgres.prisma` si usa PostgreSQL. La migración nueva es **aditiva**: crea `PropertySequence`, `LeadSource`, `LeadPropertyHistory` y añade solo `Lead.externalPropertyInterest NULL`. **No** convierte `Lead.propertyId`, porque ya es nullable. **No** renumera ninguna referencia anterior.
3. Elegir **un solo** mecanismo de migración según el historial real de la instalación. Para una base ya gestionada por Prisma Migrate, inspeccionar `_prisma_migrations` y ejecutar `npx prisma migrate status --schema prisma/schema.prisma` seguido de `npx prisma migrate deploy --schema prisma/schema.prisma` (MySQL) únicamente si la historia es coherente. Para PostgreSQL, la carpeta `migrations-postgres` requiere configurar correctamente la estrategia preexistente del proyecto y confirmar el estado de su historial antes de aplicar `prisma/migrations-postgres/20261030050000_nexus_functional_enhancements/migration.sql`. En bases existentes instaladas mediante el asistente/SQL directo o Prisma db push, **no** hacer `migrate deploy` a ciegas: ejecutar la migración aditiva pertinente, previamente revisada, una sola vez por DBA usando `npx prisma db execute --file prisma/migrations/20261030050000_nexus_functional_enhancements/migration.sql --schema prisma/schema.prisma` (MySQL), o el archivo equivalente con `--schema prisma/schema.postgres.prisma` (PostgreSQL), y documentar externamente el registro de la migración. Nunca combinar aplicación manual y migrate deploy sin reconciliar el historial. Comprobar tablas y columna luego de ejecutar.
4. En staging: `npm install --include=dev`, `npm run db:generate`, `npx tsc --noEmit`, `npm run build`, `npm run check:plesk`. Si se usa Passenger, verificar `app.js` y el inicio real definido en Plesk. No habilitar variables temporales del instalador para una aplicación existente.
5. Ejecutar pruebas CI sobre MariaDB y PostgreSQL según las matrices existentes. En staging confirmar acceso/terminación de sesión, creación de usuario, roles, prospectos sin propiedades, referencias simultáneas, fotos/PDF, CRM, datos existentes. Validar páginas en 375, 768, 1024 y 1440 px, navegadores móviles y lectores PDF. Solo entonces considerar merge y despliegue controlado de la versión compatible.

## Rutas clave y pruebas

- **Esquema:** `prisma/schema.prisma`, `prisma/schema.postgres.prisma` y migraciones por motor.
- **PDF:** `src/lib/property-pdf.ts`, `src/app/api/propiedades/[slug]/pdf/route.ts` y editor de inmuebles.
- **Referencias:** `src/lib/property-reference.ts`, API de propiedades y `src/app/api/admin/properties/reference-settings/route.ts`.
- **Usuarios/agentes:** `src/components/user-password-fields.tsx`, `src/app/api/admin/users/route.ts`, `src/lib/agent-scope.ts` (preservado), APIs y vistas de propiedades, permisos de fotos/documentos.
- **CRM:** `src/lib/lead-sources.ts`, `src/app/api/admin/crm/sources/route.ts`, vistas de prospectos y `src/app/api/admin/crm/leads/[id]/route.ts`.
- **Pruebas:** `scripts/check-nexus-functional.mjs` cubre creación concurrente, referencia inmutable, contraseñas, agente propietario, prospecto sin inmueble, reasignación auditada, fuentes y límites PDF; además deben seguir pasando las suites anteriores en `.github/workflows/verify.yml`.

## Riesgos y verificaciones pendientes

- El esquema nuevo exige migración **antes** de servir rutas del CRM, propiedades o PDF en la nueva versión; el despliegue de código sin migración provocaría errores de tabla/columna inexistente. Respaldar y planificar despliegue con ventana controlada.
- Las referencias anteriores pueden coincidir con el patrón NRE: el generador comprueba colisiones y las salta; no es una renumeración histórica. Cambiar el prefijo puede producir numeraciones visualmente no consecutivas por diseño.
- La ficha de una página resume descripciones largas: los datos no mostrados en las dos páginas siguen accesibles en la ficha web mediante QR cuando existe contenido adicional. Validar con textos extensos, acentos e imágenes panorámicas/retrato.
- Los prospectos históricos mantienen su canal original aunque la fuente se desactive. Las fichas personalizadas PDF antiguas se mantienen y no se sustituyen.
- No hay confirmación de compilación o ejecución de pruebas hasta comprobar los jobs reales de CI; `main`, Plesk y producción se mantienen sin cambios.
