# Referencia de producto y diseño — WebAppECloud

## Alcance
**Producto:** plataforma multi-tenant de sitios web administrables. **Primer cliente:** inmobiliaria NEXUS REAL ESTATE. **Arquitectura:** Next.js + TypeScript + MySQL/MariaDB/PostgreSQL + Docker/Dockploy.

## Referencias aportadas por el cliente
- https://kwnicaragua.kw.com/es-419/
- https://jaquimontenegro.kw.com/es-419/
- https://www.aniq-ui.com/en/blog/build-real-estate-agency-website-nextjs
- Capturas previas aprobadas: «Panel de Administración Inmobiliaria DEPRO.png» y «Panel inmobiliario DEPRO.png». No se adjuntan copias nuevas de esas capturas a este repositorio.

## Dashboard inmobiliario — distribución visual solicitada
- Sidebar lateral con logo y menú: Inicio, Propiedades, Categorías, Leads, Clientes, Agentes, Calendario, Reportes, Usuarios, Configuración.
- Header con título, búsqueda/notificaciones/perfil, selección de fechas y CTA «Nueva propiedad».
- Cuatro tarjetas KPI: Propiedades, Nuevos leads, Visitas al sitio, Clics en WhatsApp.
- Área central: serie temporal de visitas/leads/WhatsApp y gráfico donut de tipos de propiedades.
- Zona inferior: Propiedades recientes con fotografía, estado, precio, superficie, habitaciones y ubicación; prospectos recientes.
- Lenguaje visual: limpio, profesional, alto contraste, tarjetas suaves, iconos consistentes, tipografía legible y jerarquía clara.
- Adaptación móvil: sidebar colapsable; tarjetas fluidas; gráficas legibles; tablas con diseños compactos.

## Sitio público — requisitos contractuales
1. Home personalizado con logo, hero, búsqueda por localización/precio/tipo y propiedades destacadas.
2. Catálogo con filtros, paginación y estado (venta/alquiler).
3. Detalle por propiedad con fotos, referencia, precio, ubicación, características, descripción y PDF descargable.
4. WhatsApp contextual con mensaje construido desde la propiedad seleccionada, p. ej.: «Hola, estoy interesado en la propiedad Ref: NX-102 en Zona Ejecutiva».
5. Formulario de contacto con consentimiento de privacidad y asignación al inmueble correspondiente.
6. Analítica de vistas, clics y formularios sin confundir eventos con contactos confirmados.
7. Contenido, medios, navegación y secciones editables desde el panel.

## Tokens preliminares (por validar con captura y marca)
- Principal: rojo corporativo NEXUS (#cf202b)
- Superficies: blanco, gris muy claro y gris grafito
- Acentos: verde para leads y WhatsApp, naranja en eventos secundarios
- Tipografía sugerida: Inter
- Animación: discreta y opcional según preferencia del usuario

**No fijar todavía un design system definitivo**: ejecutar y revisar la recomendación de UI UX Pro Max, contrastarla con las capturas originales y después persistir el MASTER en el repositorio.

## Calidad visual previa a entrega
Contraste WCAG, foco visible, navegación por teclado, blancos táctiles >=44px, alt en fotografías, carga diferida, ausencia de scroll horizontal, diseño responsive y estados vacíos/error/carga claramente diseñados.
