# Centro de notificaciones comerciales y agenda multivista

## Funciones

- `/admin/notificaciones`: tareas comerciales pendientes basadas en **registros reales** de AgendaEvent, LeadCrm y Lead; no se crean alertas ficticias ni se envían mensajes externos.
- Contadores visibles en el encabezado y en el menú lateral del panel, más un resumen del centro de actividades en `/admin`.
- Se muestran actividades vencidas, actividades próximas **en las siguientes 24 horas**, seguimientos CRM vencidos o próximos, prospectos recientes aún en etapa `nuevo` y prospectos de los últimos siete días sin responsable.
- Para evitar confusiones, «notificaciones» significa **gestiones que requieren atención**, no mensajes que estén marcados como «no leídos». Un prospecto sin agente también puede aparecer en «sin atender», por lo que los contadores no representan necesariamente personas únicas.
- Se pueden filtrar las categorías y abrir cada actividad/prospecto. Los contadores se recalculan cuando se abre o actualiza una página; no hay notificaciones push ni sondeos en segundo plano.

## Seguridad y multicliente

- El servidor deriva cada consulta del `tenantId` de la sesión. Un agente que no es administrador/editor solamente puede consultar actividades y prospectos cuyo `assignedAgentId` corresponde a su cuenta.
- El editor y el administrador pueden consultar alertas comerciales de su empresa, incluidos prospectos sin agente. Los agentes comerciales no pueden ver ni solicitar la cartera de otro agente.
- La agenda usa el mismo alcance en `/admin/agenda` y las APIs de creación, modificación, cancelación y reprogramación. Una reasignación de prospecto modifica quién tiene acceso a las actividades y a las notificaciones asociadas.
- Un rol de solo lectura no puede abrir estas secciones.

## Agenda

- `/admin/agenda?vista=dia|semana|mes&fecha=YYYY-MM-DD&mes=YYYY-MM` ofrece navegación por día, semana y mes. La visualización convierte las marcas UTC al horario local del navegador.
- Se incluyen días de margen alrededor del mes consultado para cubrir las semanas que cruzan meses y diferencias de zona horaria.
- El mes conserva el listado de gestiones y acciones para completar, cancelar y reprogramar. Las vistas diaria y semanal incluyen enlaces a las actividades para abrir sus acciones en la vista mensual.
- Los administradores/editores pueden aplicar el filtro opcional `agente` a sus actividades y a los contadores de vencidas y próximas. Para agentes sin permisos generales, los filtros enviados por URL no amplían el ámbito de acceso.

## Implementación

Los avisos se calculan con consultas de lectura y no necesitan migraciones adicionales. Las tablas `AgendaEvent` y `LeadCrm` deben estar activadas para sus respectivas alertas; cuando faltan, la página informa de la limitación.

Los cambios se prueban en `.github/workflows/verify.yml` con `scripts/check-notifications.mjs`, tanto para MariaDB como para PostgreSQL. Se validan filtros, alertas vencidas y futuras, vistas de agenda y aislamiento de agentes antes y después de una reasignación.

## Próximos incrementos independientes

La gestión de cierres reales con montos y comisiones, la exportación de reportes por agente y los avisos por correo o WhatsApp requieren desarrollos independientes. No forman parte de esta entrega.
