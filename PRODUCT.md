# WebAppECloud — contexto de producto para agentes de diseño

## Qué es
WebAppECloud es un CMS/SaaS modular desarrollado por Elearning Cloud con Next.js,
TypeScript, Prisma y bases de datos MariaDB/MySQL o PostgreSQL. Permite crear y administrar
el sitio web de una organización y evolucionar hacia módulos por sector.

## Usuarios
- Administrador de cada empresa: configura sitio, módulos y colaboradores.
- Editor de contenido: administra páginas, portada y menús según permisos.
- Agente inmobiliario: gestiona los prospectos y actividades para las que tiene permiso.
- Visitante: consulta contenido del sitio sectorial, se comunica o envía solicitudes.

## Objetivo de esta etapa
Permitir seleccionar sector durante la instalación (Inmobiliaria, Educación, Servicios,
Comercio electrónico) y decidir qué módulos disponibles mantener activos. Cambiar
el sector no elimina datos. La administración es independiente por empresa.

## Estado funcional comprobable en repositorio
- Inmobiliaria: propiedades, galerías, fichas PDF, CRM, agenda, cierres y reportes.
- Educación y Servicios: web institucional, programas/servicios y consultas.
- Comercio electrónico: plantilla institucional introductoria, no tienda transaccional.
- Módulos de Moodle REST, facturación, cobros, inventario, pedidos y checkout:
  previstos, pero todavía NO implementados.

## Restricciones y principios
- Un tenant no ve recursos de otro; las rutas y APIs deben verificar tenant y permisos.
- Las preferencias de activación NO reemplazan permisos de rol ni licencia comercial.
- Conservar el comportamiento del primer cliente inmobiliario NEXUS REAL ESTATE.
- Diseño responsivo, accesible, ligero y funcional con navegación móvil.
- No inventar logotipos, estadísticas, opiniones, casos de éxito ni evidencias.
- No modificar bases de datos reales durante las revisiones visuales.
- No afirmar que una función o Skill está implementada/ejecutada sin validación.

## Límites de la revisión
La selección de sector y los interruptores constituyen funcionalidad de administración.
La conexión a Moodle y facturación requieren fases de desarrollo y pruebas separadas.
