# Recuperación del sitio público después de retirar el multicliente

## Problema y corrección

El dashboard ya obtiene su organización con `singleInstallationTenantId()`, pero
el sitio público conservaba una barrera adicional en `tenantFromHost()`: exigía
SITE_URL o un registro Domain que coincidiera con el Host. Una instalación con
los datos correctos, sin SITE_URL y con Domain vacío o apuntando al upstream de
Enhance podía abrir el dashboard y devolver 404 en todas las páginas públicas.
Además, imágenes y PDF usaban directamente Host, mientras la portada intentaba
interpretar X-Forwarded-Host. Los formularios también comparaban Origin con el
Host interno y podían devolver 403.

`publicInstallationTenant()` utiliza ahora la misma organización local que el
dashboard. La portada, páginas, metadatos, imágenes, fichas PDF, consultas y
estadísticas comparten ese resolvedor. No selecciona organizaciones por HTTP
Host, SITE_URL ni Domain. No cambia el esquema ni escribe datos de instalación.

## Límites y seguridad

- Debe existir exactamente una organización y estar activa. Cero o varias
  organizaciones siguen impidiendo acceso público; no se elige la primera.
- Cada recurso conserva su filtro tenantId, estado publicado, módulos habilitados
  y, donde corresponde, autorización de administrador para borradores.
- El contenido publicado de la única organización puede servirse por los hosts
  que el proxy dirija a esa aplicación. La asociación de dominios corresponde a
  Enhance; ya no funciona como selección de cliente dentro de Nexus.
- SITE_URL sigue sirviendo para validar formularios y generar enlaces absolutos.
  Los POST rechazan orígenes ajenos, HTTP público, puertos distintos y solicitudes
  cross-site. Con URL configurada se permite el alias www/apex del mismo sitio.
- Sin SITE_URL, la validación usa Host directo o forwarding HTTPS desde un
  upstream privado. Un proxy con un hostname interno no reconocible debe usar
  SITE_URL para los formularios. Esto no bloquea la lectura de las páginas.
- El PDF usa el origen público para sus enlaces. Si no puede obtener uno válido,
  omite el QR; no falla toda la descarga ni fabrica una URL.

## Verificación

Se comprobó un 404 real del inicio en producción durante la investigación.
No se dispone de variables ni logs de Enhance para confirmar cuál de sus valores
activó la barrera, ni se accedió a la base de datos del cliente.

Validación local de esta corrección:

- Build de producción Next.js y TypeScript.
- 21 pruebas unitarias de origen/CSRF y conexión del instalador.
- 7 pruebas de recuperación de instalación.
- Límites de plantillas y preflight Enhance.
- PostgreSQL aislado: 115 comprobaciones HTTP con aplicación compilada, incluyendo
  ausencia de Domain/SITE_URL, Domain interno antiguo, páginas, imágenes, PDF,
  dashboard autenticado, diagnóstico, borradores, organizaciones inactivas o
  múltiples, y formularios legítimos/adversos detrás del proxy.

El workflow `Standalone public site regression` ejecuta la misma regresión con
PostgreSQL 16 y MariaDB 11.4. Usa una base local vacía cuyo nombre comienza por
`nexus_standalone_test`, opt-in explícito y archivos temporales. No debe ejecutarse
contra una base real. Los otros workflows conservan sus pruebas existentes.

Esta entrega no rediseña pantallas. Solo actualiza los mensajes y la comprobación
real del diagnóstico. No supone una auditoría visual responsive ni un despliegue.

## Tras desplegar en Enhance

Abrir `/admin/sistema/diagnostico`: «Conexión con el dashboard» debe confirmar que
el contexto público carga la misma organización. Revisar inicio, páginas,
catálogo, logo y fichas PDF. SITE_URL recomendado:
`https://nexusrealestatenicaragua.com`. No reinstalar ni ejecutar seeds para
recuperar páginas existentes.
