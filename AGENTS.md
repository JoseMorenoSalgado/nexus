# Reglas para colaboradores y agentes — WebAppECloud

## Objetivo del proyecto
CMS especializado únicamente en NEXUS inmobiliaria, más el servicio de Asesoría Empresarial requerido por el cliente. No reintroducir los sectores Educación, Comercio electrónico ni Servicios genéricos. Interfaces en español, responsive.

## Diseño y UI UX Pro Max
- En trabajos que alteren la interfaz usar como referencia la skill: https://github.com/nextlevelbuilder/ui-ux-pro-max-skill.
- Instalarla con el CLI oficial (`npm install -g ui-ux-pro-max-cli`; `uipro init --ai codex`) **solo en el entorno de desarrollo**, nunca en servidores de producción.
- Antes de cada página nueva consultar el design system generado por la skill; preservar la identidad del cliente y los diseños ya aprobados por encima de recomendaciones genéricas.
- Cuando exista `design-system/webappecloud/MASTER.md`, leerlo antes de modificar UI. Las reglas de `pages/<pagina>.md` prevalecen como ajustes locales. No regenerar ni sobrescribir master sin aprobación.
- Usar Tailwind CSS, componentes accesibles, Lucide y tokens de diseño reutilizables; evitar emojis decorativos, animaciones excesivas, degradados arbitrarios y dashboards recargados.
- Validar tamaños 375, 768, 1024 y 1440px, contraste, navegación por teclado, estados focus, etiquetas visibles, interacción táctil, imágenes optimizadas y reducción de movimiento.
- El dashboard inmobiliario debe parecerse a la captura aprobada: sidebar azul/neutral, cabecera minimalista, KPIs, gráficas, tarjetas de propiedades y últimos prospectos.
- El home debe combinar referencias funcionales de las páginas inmobiliarias indicadas por el cliente con un diseño original, sin copiar código ni activos ajenos.

## Arquitectura no negociable
- Next.js + TypeScript + Tailwind CSS.
- MariaDB, MySQL y PostgreSQL mediante dos clientes Prisma (mysql/postgresql); mantener los modelos equivalentes y probar ambos motores.
- Despliegue exclusivamente con Docker en Dockploy; no mantener scripts, instrucciones ni tareas de despliegue cPanel/WHM/Passenger. Conservar MySQL/MariaDB y PostgreSQL porque funcionan en Docker.
- Autenticación, autorización y acceso a cada recurso restringidos por tenant en el servidor; nunca depender del filtrado visual.
- Los módulos y rutas deben limitarse a funciones inmobiliarias; conservar la asesoría empresarial, su formulario y su publicación opcional.
- No afirmar que existen funcionalidades, instalaciones, pruebas o despliegues hasta implementarlos y verificarlos.
- No exponer credenciales ni guardar secretos en Git.

## Funciones prioritarias inmobiliarias
Home editable, buscador, propiedades, imágenes, fichas PDF, formulario de contacto, WhatsApp por propiedad, seguimiento de leads y estadísticas diferenciadas (visita/clic/contacto).

## Diseño: Taste Skill, Impeccable y Emil Kowalski
- **Skill local integrada en el repositorio:** `.agents/skills/webappecloud-design/SKILL.md` y sus referencias. Leerla y aplicarla en cambios de UI. Está disponible al abrir el repositorio en un agente compatible con Skills, sin ejecutar un instalador externo.
- La Skill local agrupa criterios comprobados de las tres fuentes, pero no instala ni ejecuta los analizadores oficiales. La instalación opcional completa sigue disponible mediante `scripts/setup-design-skills.sh`.
- Los agentes Codex pueden instalarlas en la raíz del proyecto con `bash scripts/setup-design-skills.sh` (Node 22+ y red; únicamente en desarrollo). Se usan los instaladores oficiales; no se ejecutan en contenedores de producción.
- Leer `PRODUCT.md`, `DESIGN.md` y `docs/APLICACION-SKILLS-UI.md` antes de modificar pantallas. Tras la instalación, reiniciar el agente y aprobar los hooks según el proveedor.
- Revisar https://www.tasteskill.dev/ como referencia de dirección artística, jerarquía tipográfica y composiciones no genéricas.
- Consultar https://impeccable.style/ para crítica de interfaz, accesibilidad, densidad informativa y pulido de formularios, estados y navegación.
- Consultar https://emilkowal.ski/skill para criterios de movimiento, navegación móvil y rendimiento de animaciones.
- Estas referencias **no equivalen a Skills instaladas**. Cada agente debe verificar disponibilidad local e instalación antes de afirmar que ejecutó una Skill, y anotar los comandos realmente usados en la PR.
- Criterios de aceptación UI: mobile-first 375px, adaptaciones 768/1024/1440, contrastes, teclado, focus visible, controles accesibles, textos reales largos, estados vacíos/error/carga y prefers-reduced-motion.
- Dirección por pantalla: sitio público con personalidad de marca; dashboard compacto orientado a tareas; instalador con selección clara de sector y módulos; no incluir selectores de sector ni escaparates para negocios ajenos a la inmobiliaria.
- No sacrificar rendimiento web, compatibilidad de MariaDB/MySQL y PostgreSQL ni el diseño NEXUS aprobado por efectos visuales.
- Antes de integrar cambios, documentar revisión UI manual y pruebas automáticas; no declarar conformidad visual sin captura comparativa en móvil y escritorio.
