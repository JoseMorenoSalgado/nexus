# Sistema de diseño — WebAppECloud

## Estado
Documento inicial de decisiones extraídas del código y requisitos actuales.
No sustituye auditoría visual en navegador ni capturas comparativas.

## Modos por superficie
- Instalador /admin e /instalar: **Operate**. Prioriza claridad, orientación,
  formularios comprensibles, elecciones reversibles y guardado explícito.
- Dashboard: **Operate**. Datos reales, acciones frecuentes al alcance,
  navegación compacta y estados vacíos honestos.
- Sitio público de inmobiliaria: **Persuade** respetando estilo y marca NEXUS.
- Educación, Servicios y Comercio: sitio institucional propio de cada plantilla.

## Colores
- Rojo heredado NEXUS: #cf202b, no imponerlo como identidad de otras empresas.
- Panel interno: fondo blanco, tinta azul-gris #1d293b, bordes #dfe6ed.
- Verde discreto #26694a para estados habilitados, no como decorado.
- El color corporativo dinámico procede de la empresa (tenant), no de NEXUS.

## Jerarquía y composición
- Títulos operativos concisos, subtítulos con propósito y controles próximos al dato.
- Formularios agrupados por tarea con tamaños táctiles de al menos 44 px.
- Preferir filas planas, límites sutiles y tipografía antes que tarjetas anidadas.
- Mostrar «Próximamente» como deshabilitado; nunca simular que un módulo funciona.
- Guardado explícito y claro cuando existan cambios pendientes.

## Movimiento y móvil
- Animar solo color, opacidad o transform en 100–160 ms y sin efectos pesados.
- Respetar prefers-reduced-motion y mantener teclado/foco visibles.
- Controles táctiles touch-action: manipulation; evitar hover persistente en móvil.
- Evitar zoom involuntario: entradas de 16 px en móvil.
- Respetar safe-area para formularios y cajones.
- Revisar 375, 768, 1024 y 1440 px y hardware Android/iOS antes de publicar.

## Precedencia
Si una regla de estas Skills entra en conflicto con el diseño aprobado de NEXUS,
la marca y las funcionalidades existentes prevalecen. Los cambios nuevos deben
ser compatibles con MySQL/MariaDB y PostgreSQL y no añadir librerías de animación
por defecto.
