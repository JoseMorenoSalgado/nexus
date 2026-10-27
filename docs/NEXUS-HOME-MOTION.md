# Home clásico NEXUS: animaciones discretas y pulido

## Objetivo visual
Mantener íntegramente el diseño que el cliente aprobó tras la PR #42:
fotografía de fondo completa, capa oscura, título blanco, buscador solapado
y tarjetas con identidad corporativa. **Esto no es un nuevo rediseño.**

## Aplicación de la Skill local
Consultados `.agents/skills/webappecloud-design/SKILL.md`,
`references/quality-gates.md`, `DESIGN.md` y `AGENTS.md`. Superficie:
**Persuade** (Home público de inmueble); prioridad: jerarquía y búsqueda
sin afectar el CTA, propiedades reales ni la edición desde CMS.

- **Taste:** animación corta que guía la atención del visitante hacia el
  título, descripción, búsqueda y propiedades reales, sin bloques decorativos.
- **Impeccable:** enlaces siempre activos, foco visible, sin contenido oculto
  ni barreras de teclado; no se anima la apertura del formulario.
- **Emil:** solo `opacity` y `transform`, 150 ms en hover; entrada
  moderada, progresiva, respetando movimiento reducido.

## Implementación
- `src/app/styles/templates/nexus-home-motion.css`: entrada secuencial
  del texto del hero oscuro y la caja de búsqueda. Hover/focus precisos
  en CTA, búsqueda y tarjetas; nada de zoom de fondo ni parallax.
- `src/components/nexus-home-motion.tsx`: pequeña isla cliente sin
  dependencias externas para revelar encabezados, inmuebles, servicios,
  historia y contacto al entrar en el viewport. `IntersectionObserver`
  activa `element.animate()` una sola vez, con menos de 400 ms de
  duración y pequeños desfases.
- Solo se monta en `RealEstateHome` bajo `[data-nexus-home-motion]`.
  Los sectores de educación, servicios y comercio, el panel y las
  páginas de catálogo y detalle no heredan animaciones.
- El HTML de servidor **siempre permanece visible e interactivo**:
  sin JavaScript el sitio es plenamente utilizable; no se usan reglas
  generales `opacity:0` para esconder secciones.
- Cuando el dispositivo solicita `prefers-reduced-motion:reduce`,
  CSS elimina la animación de portada y el cliente no registra los
  efectos de scroll (o los cancela si cambia la preferencia).

## Pruebas
- `scripts/check-nexus-home-motion.mjs`: preservación de portada,
  contenidos configurables, imágenes, foco, sin librerías externas ni
  transición global.
- `scripts/check-nexus-browser-qa.mjs`: conserva las 24 capturas a
  375/768/1024/1440 px en modo reducido; verifica además que no hay
  animaciones en ese modo. Una ejecución adicional con movimiento
  habilitado comprueba que las animaciones del hero y las secciones
  se ejecutan realmente en Chromium.
- CI completa Next.js, TypeScript, MariaDB, PostgreSQL y Docker.

## Aceptación
Comparar las capturas de la rama con las aprobadas de PR #42. Exigir
que **la composición sea idéntica** (no cambiar ubicación, tamaño,
color ni fotos) y que no exista desbordamiento horizontal. La
interacción en hardware real Android/iOS y en el dominio de producción
requiere verificación posterior; las capturas son de datos CI.

No hace falta migración, regeneración de datos o cambio de Dockploy.
