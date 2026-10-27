# NEXUS · Recuperación del diseño clásico + pulido

## Motivo
El rediseño editorial incorporado por PR #41 cambió demasiado el lenguaje
visual elegido por el cliente. Restauramos **la apariencia exacta previa a
PR #41** en el Home, catálogo, ficha y páginas institucionales inmobiliarias,
y después aplicamos retoques conservadores y reversibles.

## Diseño original recuperado
- Banner principal **a ancho completo con fotografía oscurecida**, titular
  blanco y destacados rojos. Mantiene imagen personalizada por tenant.
- Buscador superpuesto al pie del banner, con el mismo orden y función.
- Tarjetas de propiedades y servicios originales, sin transformarlas en
  listas editoriales.
- Secciones originales Nosotros, Servicios, Contacto y ficha, con
  formularios, menú y footer anteriores.

## Retoques añadidos sin rediseñar
Solo la hoja `src/app/styles/templates/nexus-classic-polish.css`:
- Mejor contraste en textos, enfoque visible en filtros, sombras discretas.
- Campos legibles en móvil (mínimo 16 px) y controles táctiles 44 px.
- Menú móvil que no desaparece al abrirse y admite desplazamiento.
- Fotografías del detalle a tamaño natural (`object-fit:contain`); las
  portadas de las tarjetas siguen usando `cover` y proporción 16:10.
- Espacios adaptables sin cambiar la portada ni eliminar las tarjetas.
- Sin nuevas bibliotecas o peticiones de red; respeta movimiento reducido.

## Límites
No se modifican la BD, usuarios, inventario de inmuebles, leads, roles,
CMS, plantillas multicliente, backups ni Docker/Dockploy. La hoja está
restringida a `.public-site:not(.public-site-organization)` para no afectar
portadas del sector Educación, Servicios o Comercio.

## Verificación
CI debe superar `check-nexus-classic-restored.mjs`, tests de otras rutas,
MariaDB/PostgreSQL, build Next.js, Docker y las 24 capturas del navegador.
El test visual usa propiedades ficticias de CI. Después del despliegue,
verificar fotografías, botones y formularios del sitio real; no declarar
publicación completada solo por fusionar la rama.
