# Plantillas sectoriales — WebAppECloud

Las plantillas **Inmobiliaria**, **Educación** y **Servicios** ya tienen portadas y páginas institucionales separadas. El cliente inmobiliario existente conserva su presentación anterior por defecto.

## Acceso
En el dashboard de la empresa, entrar a **Personalizar sitio → Plantilla**. Seleccionar un sector y pulsar **Aplicar plantilla seleccionada**. Educación y Servicios permiten editar el título de portada, texto, tres bloques de oferta, presentación institucional y llamada al contacto desde la misma pantalla. El logotipo, banner, color, correo y WhatsApp se gestionan en **Identidad visual**.

## Persistencia e independencia
Se usa el registro `SitePage` con `slug=site-template`, `tenantId` y `blocks={key, contentByTemplate}`, sin modificar las tablas SQL existentes. Cuando un cliente ya instalado no tiene ese registro, la aplicación aplica **Inmobiliaria** por compatibilidad. Se retienen las versiones editadas de Educación y Servicios al cambiar de sector. El registro del menú admite `byTemplate` para separar los enlaces de navegación de cada sector. Todos los cambios y lecturas se filtran por el tenant autenticado.

## Páginas
- Inmobiliaria: conservar NEXUS, catálogo, fichas PDF, WhatsApp contextual y CRM.
- Educación: inicio, programas (`/servicios`), institución (`/nosotros`) y contacto.
- Servicios: inicio, oferta (`/servicios`), presentación (`/nosotros`) y contacto.
- Páginas personalizadas (`/pagina/[slug]`) siguen disponibles en todos los sectores.
- La plantilla genérica no publica `/propiedades`; los datos inmobiliarios existentes NO se eliminan al cambiar.

El formulario de contacto en las tres opciones almacena solicitudes como registros del modelo `Lead`, con `tenantId`; en educación y servicios se muestran como **Consultas**.

## Compatibilidad y límites
- Las plantillas Educación y Servicios son webs institucionales, **no un LMS**; no crean cursos reales, matrícula, aula Moodle, pagos ni facturación automáticamente.
- No hay interfaz de vista previa sin cambiar la selección activa. Se recomienda revisar el diseño antes de seleccionar otra plantilla en un dominio de producción.
- El sitio conserva la estructura comercial en base de datos; un cambio de sector no borra operaciones ni propiedades.
- La selección no altera el esquema SQL. En nuevas instalaciones se elige la plantilla al registrar la organización.
- Confirmar con el VPS que la versión de `main` esté ejecutándose tras el rebuild de Dockploy.

Pruebas: `scripts/check-template-selection.mjs` se ejecuta sobre MariaDB y PostgreSQL con bases efímeras.

## Versión y despliegue
El identificador público de esta fase es `2026-10-23-sector-templates-r1`. Comprueba `/api/live` tras reconstruir **la rama main** en Dockploy. Esta versión no cambia el contenedor de Edvorya ni realiza migraciones de esquema; verifica que el volumen persistente `/app/.runtime` continúe montado.
