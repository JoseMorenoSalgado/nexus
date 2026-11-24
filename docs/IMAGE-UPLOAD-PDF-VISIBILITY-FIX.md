# Seguimiento de Nexus: carga de banners e identidad PDF

## Error comunicado
El editor de la portada mostraba `Unexpected token '<' ... is not valid JSON` al subir una fotografía. El cliente también solicitó ocultar el logotipo del PDF, manteniendo la opción de reactivarlo después.

## Correcciones
- Cargador de portada y resto de páginas: uso de lector de JSON con control de respuestas HTML, errores de sesión y códigos HTTP.
- Para archivos de más de 700 KiB, conversión local a WebP con reducción gradual de calidad y resolución, antes de la petición POST. Reduce el riesgo de rechazo por límites del proxy, sin alterar los archivos locales.
- Los endpoints de Next.js siguen verificando la sesión, los permisos y el tipo y contenido de imagen.
- En Mi sitio web > Presentación de propiedades, ajustes independientes para el logo del PDF, nombre corporativo y código QR, desactivados inicialmente.
- Sin cambios en logo de navegación ni base de datos.

## Pendiente de validar en producción
- Confirmar si el proxy de Enhance responde 413, 403, 500 o 502 cuando se usa una imagen de prueba; si reaparece una respuesta HTML habrá ahora mensaje con código HTTP.
- Verificar que `APP_CONFIG_DIR` apunte a almacenamiento persistente de escritura para las imágenes.
- Probar desde un móvil y un escritorio con imagen JPG/PNG de varios megabytes.
- Descarga y revisión visual de PDF sin logo y tras reactivarlo.
- Capacitación del cliente: coordinar fecha y acceso al Webmail de Elearning Cloud.
