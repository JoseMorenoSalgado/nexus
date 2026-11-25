# Nexus — Ventas confirmadas y filtro de precios

## Flujo comercial
1. Conservar la propiedad y vincular un prospecto en **Prospectos**.
2. Desde **Cierres comerciales**, registrar una venta confirmada (cliente, fecha, importe, comisión).
3. En una transacción PostgreSQL, el cierre y el cambio `published=false` se aplican juntos; el inmueble se retira del inicio, catálogo, mapa, búsquedas, API y fichas públicas.
4. En **Propiedades > Vendidas** se conserva el registro completo y es posible abrir la ficha de edición interna. Los cierres y sus importes se consultan en **Cierres comerciales**.
5. Si se anula el cierre, el inmueble se mantiene oculto de forma segura. Un administrador puede publicarlo nuevamente de forma explícita.
6. La venta confirmada no se puede duplicar para un mismo inmueble ni publicar por error desde los formularios.

No se elimina ni duplica la propiedad ni se requiere migración de esquema. El estado `Vendida` se deriva de los registros de cierres confirmados ya existentes.

## Filtro
El inicio y el catálogo independiente incluyen precio mínimo y máximo en USD, con filtrado por tipo de operación, tipo de propiedad y ubicación. El servidor valida importes y rangos; no amplía búsquedas inválidas en silencio.

## Validación
Pruebas de aceptación PostgreSQL verifican cierre, privacidad, prevención de duplicados, anulación sin republicar, conservación de historial y filtros. Falta revisar el diseño responsive y ejecutar CI en PR.
