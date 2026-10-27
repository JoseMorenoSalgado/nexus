# Agenda comercial — WebAppECloud

## Qué incluye
- Calendario mensual y listado de actividades con tipos **visita a inmueble**, **llamada** y **reunión**.
- Creación desde `/admin/agenda` o desde la ficha de un prospecto con `/admin/agenda?lead=<id>`.
- Horario capturado en la zona local del navegador y convertido explícitamente a UTC antes de enviarlo al servidor. Se muestra en la zona del dispositivo al consultar.
- Duración en minutos, lugar o enlace, observaciones, estado **pendiente**, **realizada** o **cancelada**, y reprogramación.
- Indicadores de pendientes vencidos y próximos siete días (basados en la hora exacta de inicio).
- La propiedad **no** determina el acceso a la agenda: se determina por el propietario actual de cada prospecto. Al reasignarlo, su nueva persona responsable hereda la agenda asociada.
- Administrador/editor: agenda de todos los prospectos de su empresa. Agente comercial sin rol administrativo: agenda de los prospectos que le fueron asignados personalmente, incluso cuando no tienen propiedad.

## Seguridad
- Los endpoints `/api/admin/agenda` y `/api/admin/agenda/[id]` exigen una sesión válida, el dominio de la empresa, roles autorizados, mismo origen y un prospecto accesible al usuario.
- El registro se crea con `tenantId`; la autorización de las operaciones de actualización vuelve a verificarse dentro del filtro `updateMany`.
- Los cambios a otros clientes/empresas o prospectos fuera de la cartera no están permitidos.
- No se envían correos ni WhatsApp automáticamente, ni se afirma que una actividad marcada como realizada prueba que la visita ocurrió.
- No existe todavía un motor externo de recordatorios automáticos; el contador de vencidos se calcula al abrir el panel.

## Activación en instalaciones existentes
La tabla `AgendaEvent` es aditiva e independiente de las estructuras de propiedades y prospectos. Se ofrecen dos mecanismos; utiliza **solo uno** de ellos:
1. Desde `Dashboard → Agenda comercial`, si falta la tabla, un **Administrador** de la empresa puede elegir «Activar agenda». La operación POST valida origen y cuenta y crea la tabla en MariaDB/MySQL o PostgreSQL, usando DDL idempotente. La cuenta SQL debe tener permisos de creación de tablas.
2. Para instalaciones gestionadas con migraciones controladas, tras un respaldo completo y verificado, aplica la migración del motor correspondiente **una sola vez**, reconciliando previamente el historial: `prisma/migrations/20261022200000_commercial_agenda/migration.sql` o `prisma/migrations-postgres/20261022200000_commercial_agenda/migration.sql`.

> Es imprescindible que las migraciones previas de agentes y propietarios de prospectos estén aplicadas. Evita ejecutar `prisma migrate deploy` sobre una base heredada sin una línea base reconciliada. No ejecutar manualmente la migración si la tabla ya se creó desde el panel.

## Verificación
`.github/workflows/verify.yml` ejecuta `scripts/check-agenda.mjs` contra instalaciones de prueba aisladas de MariaDB y PostgreSQL. Cubre activación, programación, estado, reprogramación, rechazo de solicitudes ajenas, y pérdida inmediata de permisos cuando un agente deja de ser responsable del prospecto.
