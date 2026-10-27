# Comisiones inmobiliarias: abonos parciales y reportes PDF

## Alcance
- `Dashboard → Ventas y alquileres → Comisiones y pagos` permite revisar comisiones calculadas a partir de cierres **registrados por el personal**.
- Para cada operación se conserva su comisión inicial en USD, abonos registrados, saldo pendiente y estado: `Pendiente`, `Pago parcial`, `Pagada`, `Sin comisión` o `Anulada`.
- Cada abono tiene importe, fecha, método, referencia opcional, observaciones, autor y fecha de registro.
- Un administrador puede registrar abonos y corregirlos mediante **anulación auditada**; no se elimina el registro. La aplicación rechaza importes superiores al saldo restante y usa aritmética exacta en centavos, no decimales binarios flotantes.
- Un cierre con abonos vigentes no puede anularse sin anular primero los abonos asociados. Esto evita perder trazabilidad.
- Las comisiones de operaciones anuladas quedan fuera de los totales vigentes; los pagos anulados no se contabilizan en el saldo pagado.
- Los administradores y editores pueden revisar toda la inmobiliaria. Los agentes ven solo las operaciones donde quedaron registrados como responsables, incluso si el prospecto cambia de agente más adelante.
- Registrar un abono **no prueba** que el dinero se transfirió ni genera un comprobante fiscal. Debe verificarse con un documento bancario o contable externo.

## PDF
- `/api/admin/cierres/pdf?periodo=30`: informe paginado de ventas y alquileres registrados, con importes, comisiones, estado y resumen.
- `/api/admin/cierres/comisiones/pdf?periodo=30`: estado de comisiones, pagos parciales y saldos pendientes por agente, con filtros de período, agente (administradores/editores) y estado.
- Descargas privadas con comprobación de sesión, roles y empresa. Los agentes no pueden ampliar sus permisos añadiendo parámetros manualmente a la URL.
- Se usa `pdf-lib` para generar documentos A4 multipágina, con encabezado empresarial, métricas, tabla y paginación. No se envían datos a un tercero ni se consultan recursos remotos.
- Si una cartera tiene más de 1.500 operaciones en el período, el PDF muestra un máximo de 1.500 registros; acota el período para crear el resto. El resumen del panel muestra un máximo de 500 registros y señala cuando se llega a ese límite.

## Activación en bases ya utilizadas
1. **Antes de cualquier acción SQL, verifica un respaldo recuperable de MariaDB o PostgreSQL.**
2. Asegura que el módulo original de `CommercialClosing` está activado y el código de GitHub se encuentra desplegado.
3. Visita `/admin/cierres/comisiones` como **Administrador**. Si falta la tabla, aparecerá la pantalla «Activar control de abonos».
4. Marca la confirmación de respaldo y activa. Se añade únicamente la tabla de abonos `CommissionPayment` con su FK a cierres. Las operaciones y usuarios anteriores no se alteran.
5. Alternativamente, tras conciliar el historial de migraciones, aplica **una sola vez** el script específico de tu motor:
   - `prisma/migrations/20261022230000_commission_payments/migration.sql`
   - `prisma/migrations-postgres/20261022230000_commission_payments/migration.sql`
6. No combines ambos métodos para la misma tabla ni ejecutes `prisma migrate deploy` indiscriminadamente en esquemas heredados.

## Pruebas
`scripts/check-commissions.mjs` comprueba abonos parciales, pago total, rechazo de pagos excesivos, historial de anulaciones, PDF válido, acceso por agente y permisos administrativos. Se ejecuta en `.github/workflows/verify.yml` para MariaDB y PostgreSQL junto con el resto del CRM.

## Siguientes incrementos independientes
Comprobantes contables adjuntos con almacenamiento privado, pagos de comisiones con múltiples monedas y conciliación bancaria requieren un diseño adicional. Por ahora todo se registra en USD.
