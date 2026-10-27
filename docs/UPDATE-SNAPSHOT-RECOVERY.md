# Diseño de snapshots de actualización y recuperación

## Estado
La interfaz de `UpdateManagerDemo` contiene **solo snapshots simulados en memoria del navegador**. No crea backups reales ni restaura datos del servidor.

## Snapshot real requerido antes de cualquier actualización
1. Autorizar la operación con sesión administrativa y protección CSRF.
2. Obtener bloqueo exclusivo de actualización por instalación; no ejecutar dos tareas a la vez.
3. Registrar identificador de operación, versión anterior y rutas permitidas.
4. Crear backup consistente de la base de datos MariaDB/MySQL, con credenciales de mínimo privilegio. Para tablas InnoDB usar un volcado transaccional; documentar excepciones para tablas no transaccionales.
5. Archivar el código y los archivos persistentes necesarios, excluyendo secretos de la exportación descargable. Los secretos necesarios para recuperación se protegen por separado.
6. Guardar el snapshot **fuera del directorio público**, preferentemente en almacenamiento externo privado. Cifrar, registrar SHA-256, tamaño y estado de verificación.
7. Verificar integridad y capacidad de restauración antes de marcar el snapshot como utilizable. Si falla, cancelar la actualización.
8. Descargar y verificar paquete de actualización firmado; instalar en release independiente; ejecutar migraciones compatibles y health check antes de promover la versión.
9. En caso de fallo, restaurar archivos y base de datos **solo** mediante procedimiento confirmado y probado, con mantenimiento y protección contra escrituras concurrentes. Migraciones destructivas pueden impedir rollback seguro: exigir respaldo y prueba de restauración.
10. Mantener auditoría y política de retención. Limitar permisos de restauración a administradores autorizados; requerir confirmación y un snapshot de seguridad adicional antes de restaurar cuando sea viable.

## Docker / Dockploy
El worker de respaldos y restauración debe ejecutarse del lado del servidor, con permisos mínimos de lectura de volúmenes y acceso restringido a la base de datos, nunca desde el navegador. La recuperación no debe depender del contenedor que va a reemplazar: utilizar un runner independiente o un mecanismo de recuperación externo. Comprobar acceso a los volúmenes persistentes y ejecutar una restauración real de prueba antes de habilitar la función.

## Integración pendiente
- Ruta administrativa protegida y navegación del dashboard.
- Cola de trabajos persistente y estado de progreso.
- Pruebas de snapshot real, recuperación, restauración fallida y migraciones.
- Confirmación de almacenamiento disponible y ubicación de backups.

No habilitar botones de backup/restauración real mientras no estén implementados y probados estos controles.
