# Aplicación de Taste Skill, Impeccable y Emil Kowalski

## Sin usar terminal: Skill local desde GitHub
La Skill **webappecloud-design** vive en `.agents/skills/webappecloud-design/SKILL.md` con referencias propias. Los agentes que reconocen Skills del repositorio pueden cargarla al trabajar directamente en el código desde un chat conectado con GitHub. Esta ruta no requiere instalar paquetes en el servidor y funciona como guía ejecutable para el agente, no como extensión de tiempo de ejecución de Next.js.

Este conjunto personalizado reúne las reglas de Taste, Impeccable y Emil. **No equivale a instalar las tres herramientas CLI oficiales ni ejecuta automáticamente sus inspecciones/capturas.** Para sus herramientas completas se mantiene la opción de instalación en un entorno de desarrollo externo.

## Instalación reproducible (solo desarrollo, NO contenedores de producción)
Desde la raíz de WebAppECloud, con Node.js 22+, ejecutar:

```bash
bash scripts/setup-design-skills.sh
```

Ese script utiliza los instaladores oficiales:
- Taste Skill v2: `Leonxlnx/taste-skill`, módulo `design-taste-frontend`
- Emil: `emilkowalski/skills`, módulos `emil-design-eng`, `mobile-native`, `break-ui`
- Impeccable: `impeccable install --providers=codex --scope=project`

Reiniciar Codex después de instalar y autorizar sus hooks cuando corresponda.
**El script está preparado en GitHub; eso no equivale a haberlo ejecutado en
un entorno con Node, red y navegador.**

## Qué se aplicó al código (primera pasada)
- Instalador: tarjetas de sector, selección por radio, agrupación de datos
  empresariales y módulos disponibles, estados visibles.
- Administrador de módulos: separa disponibles y previstos, muestra cambios
  sin guardar, permite descartar, desactiva acciones vacías.
- Feedback ligero de 120–150 ms, foco visible, controles táctiles y
  prefers-reduced-motion. CSS aislado por pantalla, sin dependencias nuevas.
- Mejora del tipado sectorial para comercio electrónico (WhatsApp).

## Secuencia para un agente con las Skills instaladas
1. Leer PRODUCT.md, DESIGN.md y AGENTS.md. Preservar identidad NEXUS.
2. Taste: leer app-screens para /instalar y /admin/modulos y preparar dirección
   visual de pantalla operativa. No aplicar reglas de landing a dashboard.
3. Impeccable: context; critique; adapt; harden; polish; audit.
4. Emil: comprobar 16 px en campos de móvil, sticky hover, touch targets,
   safe-area y simulación de datos extremos con break-ui.
5. Verificar capturas reales para escritorio y móvil y corregir hallazgos.
6. Ejecutar npm run build, TypeScript, pruebas MariaDB/PostgreSQL y CI.
7. No fusionar PR hasta comprobar rutas/API con módulos deshabilitados.

## Límites actuales
No se han obtenido capturas verificadas de navegador móvil; revisar en
Android real y escritorio antes de producción. Moodle, facturación y e-commerce
transaccional permanecen en desarrollo.
