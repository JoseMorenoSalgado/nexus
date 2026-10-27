# Animaciones discretas de las páginas interiores de NEXUS

Continuación de PR #43 (Home). Criterios de la Skill local
`.agents/skills/webappecloud-design/SKILL.md`: Taste, Impeccable y Emil,
con diseño clásico restaurado de PR #42 como referencia **no negociable**.

## Alcance
- **Propiedades:** portada y caja de filtros con entrada breve CSS,
  resultados y tarjetas aparecen al llegar a la zona.
- **Detalle de inmueble:** breadcrumb y cabecera con entrada mínima;
  descripción, características y documentos con aparición al hacer scroll.
  **La galería, zoom, ficha PDF, WhatsApp y formulario NO reciben efectos.**
- **Nosotros:** cabecera, fotografía, texto, misión/visión y valores.
- **Servicios:** cabecera, bloques de servicios y pasos; sin modificar
  los enlaces de venta, alquiler y contacto.
- **Contacto:** cabecera y métodos de contacto con movimiento moderado.
  **No se anima el formulario ni sus controles, ni se retrasa el envío.**

## Técnica
Se añade el componente cliente `NexusInnerMotion` solo en las
cinco ramas `real-estate`, más `nexus-inner-motion.css` aislado
a `[data-nexus-inner-motion]` y `.public-site:not(.public-site-organization)`.
IntersectionObserver + Web Animations API reproducen un efecto una vez,
solo opacity/transform, sin listeners scroll, librerías nuevas ni
cambios de consulta/BD. La página HTML sigue visible sin JavaScript.

Prefiere movimiento reducido: CSS no reproduce animaciones, y el
componente no registra observers si el usuario lo solicita; se cancela
si la preferencia cambia.

## Pruebas
- `scripts/check-nexus-inner-motion.mjs` confirma rutas y límites.
- `scripts/check-nexus-browser-qa.mjs` valida 24 vistas responsive
  (375/768/1024/1440) sin movimiento y una prueba adicional de
  comportamiento con movimiento activado en cinco rutas.
- CI Next.js, TypeScript, MariaDB, PostgreSQL y Docker/Dockploy.
- Pendiente validación en teléfonos físicos y fotografías reales de producción.

No se modifica el diseño de Inicio, el panel administrativo, las plantillas
Educación/Servicios/Comercio ni los datos, roles, publicaciones o volúmenes.
