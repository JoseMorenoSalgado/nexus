# Agentes comerciales, propiedades y prospectos

Este módulo distingue **usuarios internos** (con cuenta y roles) de **clientes/prospectos** (registros de Lead). Crear un prospecto no le concede acceso administrativo.

## Funciones
- Cada usuario puede tener varios roles; `agente` habilita el perfil comercial.
- Un inmueble puede quedar sin agente o asociarse a un usuario activo de la **misma empresa** que tenga el rol `agente`.
- Los administradores/editores ven todos los inmuebles y prospectos de su propia empresa.
- Un agente sin roles administrativos solo consulta las propiedades asignadas a su cuenta y los prospectos asignados **directamente a su usuario**, incluidos estados y notas. La propiedad de interés puede pertenecer ya a otro agente.
- Las consultas generales (sin inmueble) comienzan sin responsable, pero el administrador/editor puede asignarlas a un agente. Los prospectos sin responsable permanecen fuera de la cartera de agentes.
- El responsable del prospecto es independiente del responsable del inmueble. En nuevos contactos con inmueble se asigna por defecto el agente de ese inmueble; en contactos manuales puede elegirse otro responsable o ninguno.
- Cambiar el agente de una propiedad **no traslada contactos existentes**. Solo una acción explícita de asignación del prospecto cambia su responsable y crea un registro de historial con los nombres anteriores y nuevos.
- El perfil comercial usa `AdminUser.name` y `AdminUser.email` y muestra inmuebles y prospectos; no crea duplicados de cuentas.
- Cambiar nombre/correo del agente desde el administrador invalida sus sesiones.

## Base de datos existente: acción previa al despliegue
**Realiza un respaldo verificable de MariaDB/MySQL antes de ejecutar cambios de esquema.**
La asignación de propiedades requiere una columna opcional `Property.assignedAgentId` con índice y FK a `AdminUser.id`. Las propiedades existentes conservan NULL hasta que se asignen. El cambio está versionado en:
`prisma/migrations/20261022170000_property_assigned_agent/migration.sql`

Para PostgreSQL se proporciona:
`prisma/migrations-postgres/20261022170000_property_assigned_agent/migration.sql`

La asignación individual de prospectos añade la columna `Lead.assignedAgentId` (FK opcional a `AdminUser`) y la tabla `LeadAssignmentHistory`. La migración copia una única vez el agente asignado al inmueble para los prospectos existentes, cuando ese inmueble tenía agente asignado. No crea entradas históricas ficticias. Archivos:
- `prisma/migrations/20261022190000_lead_agent_ownership/migration.sql`
- `prisma/migrations-postgres/20261022190000_lead_agent_ownership/migration.sql`

**Aplica primero la migración de propiedades y después la de prospectos, sobre una copia de seguridad verificada.** El código nuevo espera ambas migraciones.

**No vuelvas a ejecutar estas sentencias si la columna, índice o clave foránea ya existen.** Comprueba el esquema antes de aplicar el cambio. Estas migraciones son aditivas, pero el repositorio todavía no dispone de una línea base completa de migraciones para todas las instalaciones antiguas. No ejecutes `prisma migrate deploy` indiscriminadamente en una base existente sin reconciliar su historial de migraciones.

Para una **instalación nueva**, el instalador prepara el esquema utilizando los modelos Prisma adecuados al motor. Para una **base existente**, aplica y registra ambas migraciones en orden de forma controlada antes de desplegar el código que utiliza `assignedAgentId` en propiedades y prospectos.

## Verificación
El workflow `.github/workflows/verify.yml` incorpora `scripts/check-agent-access.mjs` para probar sobre bases aisladas:
- creación de usuario con rol agente y propiedad asignada;
- visualización del perfil y dashboard comercial;
- acceso del agente a sus prospectos, pero no a contactos generales;
- rechazo de acciones sobre prospectos ajenos y de accesos administrativos;
- funcionamiento con MariaDB y PostgreSQL;
- que la reasignación de inmuebles no cambie los contactos ya asignados;
- que solo el administrador/editor pueda transferir o desasignar contactos, con historial;
- que el agente anterior pierda acceso inmediatamente y el nuevo lo obtenga.

**Limitaciones actuales:** los prospectos antiguos que nunca estuvieron vinculados a una propiedad con agente asignado quedan sin responsable hasta asignación manual. No se migran asignaciones pasadas desconocidas. No existe todavía teléfono público/WhatsApp personal de cada agente ni un portal de acceso para clientes finales.
