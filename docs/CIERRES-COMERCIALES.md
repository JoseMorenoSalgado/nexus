# Cierres comerciales reales: ventas, alquileres y comisiones

## Separación del CRM
- Una etapa de prospecto `cerrado` describe el resultado comercial de una consulta; **no demuestra una venta** ni genera ingresos.
- `Dashboard → Ventas y alquileres` mantiene un registro separado `CommercialClosing` con tipo de operación, cliente, referencia de inmueble, agente, fecha, USD de operación y USD de comisión.
- Solo usuarios con rol **Administrador o Editor** pueden registrar una operación; un **Agente** consulta exclusivamente las operaciones donde quedó registrado como responsable. Los registros mantienen una foto del nombre de agente, cliente y referencia del inmueble. Reasignar la propiedad o el prospecto no cambia el agente histórico.
- La interfaz registra **USD** como moneda única; no suma monedas diferentes ni convierte divisas. Las comisiones son importes introducidos manualmente, no se calculan automáticamente del precio de lista.
- Solo se permite **un cierre por prospecto**, para impedir doble contabilización; si hay otra venta o alquiler, debe registrarse una consulta separada. El cierre requiere una propiedad vinculada y del mismo `tenantId`.
- La creación valida importe positivo y precisión de dos decimales, comisión entre cero e importe total, fecha de operación y existencia del agente activo, cuando se asigna uno.
- Los administradores pueden **anular** un registro con motivo obligatorio. No se borra el histórico; los anulados quedan visibles con su fecha, responsable y motivo, pero fuera de las estadísticas de operaciones confirmadas. No se permite editar o borrar silenciosamente importes financieros.
- La anotación financiera **no** cambia automáticamente el estado del CRM. Confirmar recepción de dinero o cumplimiento contractual sigue requiriendo una verificación externa.

## Informes
`Dashboard → Reportes comerciales` muestra las cantidades reales de ventas y alquileres, el total USD registrado y las comisiones USD, separadamente de los cierres de etapa CRM.

`Dashboard → Ventas y alquileres` permite filtrar por período, tipo, estado y responsable, y exportar los resultados financieros mediante CSV. El CSV incluye los anulados con sus motivos, dentro del período y alcance de permisos solicitados; es información privada, no compartas el archivo públicamente.

## Activación en bases existentes
1. **Comprueba y verifica un respaldo recuperable de MariaDB o PostgreSQL**; no reinstales ni elimines el esquema.
2. Despliega el código y abre `/admin/cierres` con rol Administrador. Si no existe la tabla de cierres, verás una página de activación en vez de un error de Prisma.
3. Confirma el respaldo y activa el módulo con el botón protegido. Se crea exclusivamente la tabla comercial y sus índices/referencias, sin alterar las columnas existentes.
4. Alternativamente, un administrador técnico puede aplicar **una vez** la migración del motor correspondiente, después de conciliar el historial previo:
   - `prisma/migrations/20261022220000_commercial_closings/migration.sql` (MariaDB / MySQL)
   - `prisma/migrations-postgres/20261022220000_commercial_closings/migration.sql` (PostgreSQL)
5. No ejecutes la migración manual si la tabla ya se creó desde el dashboard. No invoques `prisma migrate deploy` sobre una instalación heredada sin revisar previamente su historial.

La tabla utiliza restricciones de integridad para impedir eliminar silenciosamente propiedades, prospectos o la empresa que posean operaciones históricas. Si necesitas anonimización por solicitud de privacidad, debes definir una política de retención legal antes de modificar estos registros.

## Pruebas
`.github/workflows/verify.yml` ejecuta `scripts/check-closings.mjs` para MariaDB y PostgreSQL. Valida instalación protegida, importes con decimales, intentos duplicados, autorizaciones de agentes, exportación CSV y anulaciones con registro histórico.

## Próximas mejoras
- Informe PDF imprimible de operaciones, sin exponer datos de otras empresas.
- Reporte de comisiones por agente con estado de cobro y pagos parciales.
- Documentos contractuales asociados a la operación, con almacenamiento privado y controles de acceso.
