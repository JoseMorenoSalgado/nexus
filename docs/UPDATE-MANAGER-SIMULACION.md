# Simulación de actualizaciones del CMS

Componente: `src/components/update-manager/UpdateManagerDemo.tsx`.

La demostración funciona exclusivamente en estado local de React. No consulta WHMCS, no escribe archivos, no modifica la base de datos y no reinicia el contenedor Docker. La preferencia de actualización automática es visual y no persistente.

## Integración pendiente

Montar el componente **solo** dentro de una ruta administrativa existente que ya valide sesión y permisos de administrador. No crear una ruta pública sin autenticación. Agregar la entrada `Sistema → Actualizaciones` en la navegación del dashboard una vez identificado su componente real. Mantener claramente el aviso de simulación hasta que se habilite un motor de actualización firmado, autenticado y probado.

## Prueba manual

1. Abrir la pantalla administrativa donde se monte el componente.
2. Confirmar aviso `MODO SIMULACIÓN`.
3. Pulsar `Simular actualización`; debe cambiar la versión mostrada y aparecer un registro en el historial.
4. Pulsar `Restablecer simulación`; debe volver a 1.0.0.
5. Confirmar que la base de datos, el código y el contenedor Docker no cambiaron.

**Estado:** componente implementado; integración con ruta/menú, compilación y pruebas de navegador aún pendientes.
