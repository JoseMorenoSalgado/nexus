# WebAppECloud · arquitectura modular por cliente

## Objetivo

Un único núcleo Next.js/Prisma, con selección inicial del sector del negocio y módulos activables
por empresa. La plantilla cambia la presentación pública; el módulo determina si hay funcionalidad.
Nunca utilizar solo un elemento oculto del menú como autorización: cualquier endpoint de un módulo
debe comprobar **rol, tenantId y disponibilidad del módulo** también en el servidor.

## Fase 1: sector, módulos y compatibilidad

- Sectores: Inmobiliaria, Educación, Servicios y Comercio electrónico.
- Instalador: selecciona sector y capacidades opcionales implementadas, guarda en SitePage.
- Configuración posterior: Administración → Aplicaciones y módulos.
- JSON SitePage: slug site-modules, blocks = {version:1,byTemplate:{ "education": [...], ... }}.
- Web y editor son obligatorios. Si no hay configuración, se usan los defaults compatibles con
  las instalaciones previas. No se requiere migración SQL en esta fase.
- Funcionalidades no implementadas quedan desactivadas y no pueden ser activadas por formulario o API.
- El cambio de sector no borra propiedades, leads ni configuraciones de otro sector.
- El menú puede filtrar módulos, pero se necesita defensa de acceso en las rutas y API de
  cada módulo antes de considerar el sistema de permisos terminado.
- Comercio electrónico ofrece inicialmente web institucional/de presentación: no hay
  carrito, cobros, inventario ni checkout hasta las siguientes fases.

## Fase 2: seguridad y enforcement

- Añadir guardas en cada ruta de lectura/escritura y en las acciones servidor de
  propiedades, consultas, agenda, ventas y reportes, además de las guardas existentes por rol.
- Verificar que los estados desactivados den 403 (API) o una pantalla de módulo desactivado.
- Registrar auditoría de cambios de activación, usuario, fecha y tenant.
- E2E en MariaDB/MySQL y PostgreSQL: tenant A no lee ni habilita módulos de tenant B;
  módulos apagados no admiten acciones por URL directa; roles agent/editor no administran módulos.
- Separar licencias/entitlements administrados por el proveedor de las preferencias que el cliente puede activar.

## Fase 3: Educación + Moodle (conexión real)

- Adaptador aislado por tenant con URL HTTPS validada y token de Web Services REST de Moodle,
  de permisos mínimos, emitido por el propio administrador de Moodle.
- El token debe almacenarse cifrado con una clave de aplicación que no esté en la base de datos;
  no escribirlo en SitePage, logs, URLs públicos ni repositorio.
- Impedir SSRF: bloqueo de IP privadas/link-local/loopback, DNS rebinding y redirecciones.
  Solo endpoints y dominios autorizados; timeouts y límites de respuestas.
- Botón **Probar conexión** utilizando core_webservice_get_site_info; lista de funciones
  autorizadas antes de permitir operaciones de lectura/escritura.
- Sincronización opcional de cursos, matrículas y usuarios con confirmaciones, idempotencia,
  mínimos permisos, reintentos y auditoría; Moodle conserva datos académicos como fuente maestra.
- Deshabilitar el módulo no revoca tokens Moodle: ofrecer desconectar y revocar.

## Fase 4: Facturación y ecommerce

- Facturación propia por tenant: clientes, series/folios correlativos, moneda, impuestos según
  jurisdicción, líneas y totales calculados en servidor, PDF, anulaciones y registro de pagos.
- Emisión de documentos fiscales requiere integración legal específica del país; no confundir
  factura comercial PDF con comprobante fiscal autorizado.
- E-commerce: catálogo, variantes, stock, impuestos, carrito, órdenes, gateway opcional,
  webhooks firmados, confirmación de pago, reembolsos y reserva de existencias.
- Moodle puede leer estados de factura/matrícula mediante un contrato definido, nunca depender
  de señales visuales ni vincular altas académicas automáticamente sin consentimiento.

## Criterios UX

Aplicar Taste Skill para identidad y composición, Impeccable para jerarquía/accesibilidad y
Emil Kowalski para microinteracciones, pero siempre preservar estilos aprobados de NEXUS,
rendimiento y soporte móvil de 375 a 1440 px.
