# NEXUS · Asesoría Empresarial y capacitación en cumplimiento

## Solicitud del cliente (26 de octubre de 2026)
Incluir una página pública sencilla para ofrecer auditoría externa,
orientación sobre prevención de lavado de activos, financiamiento al
terrorismo y a la proliferación de armas de destrucción masiva, y
capacitaciones orientadas a sujetos obligados en Nicaragua.

## Diseño implementado
La nueva página `/asesoria-empresarial` funciona dentro del sitio
inmobiliario y de la misma marca corporativa, sin sustituir Inicio,
Propiedades, Servicios ni el resto del contenido original.

Contiene:
1. Hero informativo y diagrama visual (auditoría, cumplimiento, formación).
2. Tres servicios descritos sin prometer resultados o certificaciones.
3. Referencias informativas a Leyes 976 y 977 y normas aplicables,
   remitiendo a la fuente oficial de la Unidad de Análisis Financiero.
4. Proceso de trabajo ilustrado: identificar, revisar, fortalecer.
5. Bloques administrables para infografías, fotografías y material textual.
6. Solicitud de reunión por formulario de consultas y WhatsApp, cuando
   estos módulos estén habilitados.

**No se ha creado un calendario público con horarios ni reservas
automáticas.** Las solicitudes llegan al CRM como lead, con mensaje
identificado `Asesoría empresarial / solicitud de reunión`. El personal
puede ponerse en contacto para acordar la fecha y usar posteriormente su
agenda comercial interna. El cliente todavía debe definir si desea
agenda de reservas con selección de días y horas.

## Activación desde el panel
La asesoría NO se publica por defecto en todas las empresas que utilizan
WebAppECloud. El propósito es evitar que otros inmobiliarios anuncien
un servicio que no ofrecen.

Para habilitarla exclusivamente en la instalación de NEXUS:
1. `Administración → Personalizar → Páginas`.
2. Abrir **Asesoría Empresarial** y consultar sus bloques.
3. Desde **Páginas** cambiar el estado de *Borrador* a *Publicada*.
4. Entrar a `Personalizar → Menú principal`, añadir
   **Asesoría Empresarial** y pulsar **Guardar menú principal**.
5. Abrir `/asesoria-empresarial` y comprobar el formulario, iconos y
   enlaces. Al publicar también aparece automáticamente una franja de
   **Asesoría Empresarial** en el Home clásico y un acceso desde
   **Servicios**, sin cambiar el banner inmobiliario.

## Cargar infografías e imágenes
Desde `Personalizar → Páginas → Asesoría Empresarial` abrir el editor
**Secciones adicionales**:
- Añadir bloques de título, texto o imagen.
- Subir JPG/PNG/WebP autorizadas (hasta 8 MB); el sistema convierte a
  WebP, limita dimensiones y exige un texto alternativo descriptivo.
- Guardar las secciones. La imagen se sirve desde el tenant actual
  en `/api/site-page-images/asesoria-empresarial/{id}`.
- Máximo de 12 bloques de contenido y 50 imágenes almacenadas por
  página, según los límites actuales del CMS.
- Se necesita almacenamiento persistente de Dockploy para que sobrevivan
  despliegues: conservar el volumen configurado para datos de aplicación.

No se han añadido fotos de terceros como si representaran actividades
reales de NEXUS. La página trae un diagrama vectorial genérico y
está preparada para las imágenes y documentos gráficos del cliente.

## Legislación y revisión editorial
- Ley N.º 976: Unidad de Análisis Financiero (UAF).
- Ley N.º 977: Prevención y combate del LA/FT/FP.
- En junio de 2026 se publicaron reformas legales: revisar la versión
  consolidada y las reglas de cada supervisor antes de publicar material
  que afirme requisitos específicos, acreditaciones o plazos.

Referencia institucional: https://www.uaf.gob.ni/la-uaf/base-legal
Reformas 2026 (resumen oficial): https://www.midef.gob.ni/nicaragua-fortalece-marco-legal-contra-el-lavado-de-activos-y-el-crimen-organizado/

## Seguridad y calidad
- Acceso a la página sujeto a `template.key==="real-estate"` y
  publicación afirmativa del SitePage perteneciente al tenant.
- Menú y franja del Home solo visibles cuando se publica.
- Material de imágenes comprobado por tenant, publicación y pertenencia
  de cada bloque; no se abre a otros sitios.
- Formularios existentes respetan módulo inquiries, validación,
  consentimiento, origen de petición y anti-spam.
- No se han agregado migraciones SQL ni nuevas dependencias.
- Nuevo test `scripts/check-business-advisory.mjs`: publicación,
  404 en borrador, subida real WebP, visibilidad por tenant, CSRF,
  y registro de consultas.
- CI de Chromium: 28 capturas responsive de siete páginas, más pruebas
  de movimiento reducido y normal.
- Validar textos legales e imágenes facilitadas por el cliente antes de
  publicar en el dominio de producción.
