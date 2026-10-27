---
name: webappecloud-design
description: Aplicar un sistema de diseño consistente a WebAppECloud: mejoras del instalador, dashboard, CMS, menús, formularios, inmobiliaria y sitios por sector. Inspirada en Taste Skill, Impeccable y Emil Kowalski, preservando el código y la marca existente.
---

# WebAppECloud · Design Engineering

Skill local y autónoma. Forma parte de este repositorio y no requiere ejecutar
instaladores de terceros para consultar y seguir estas instrucciones.

**Fuentes de criterio:** https://www.tasteskill.dev/ ,
https://impeccable.style/ y https://emilkowal.ski/skill .
Esta Skill está adaptada al producto; **no es una copia ni reemplaza** las
herramientas ejecutables oficiales (por ejemplo, sus inspectores o hooks).

## Al empezar
1. Leer AGENTS.md, PRODUCT.md, DESIGN.md y esta Skill.
2. Identificar tenant, sector, flujo de usuario, función existente y restricciones
   de NEXUS antes de editar.
3. Leer references/multitenant-ui.md para pantallas del instalador/admin.
4. Leer references/quality-gates.md antes de escribir CSS/TSX.
5. Seleccionar el modo **Operate** para panel, instalador, CMS y ajustes; para
   portada comercial usar **Persuade**, preservando el sistema visual de cada cliente.

## Taste · dirección artística
- Formular la pregunta principal de cada pantalla y la acción frecuente.
- Diseñar para los objetos reales del negocio: propiedades, agentes, consultas,
  programas, productos o módulos. No llenar espacio con métricas simuladas.
- Usar jerarquía tipográfica y agrupación semántica; eliminar tarjetas innecesarias.
- Las plantillas deben reflejar el sector y la identidad concreta del tenant.
- En pantallas operativas, priorizar estructuras compactas, escaneables y estables.

## Impeccable · calidad UX
- Auditar etiquetas, permisos, estados de error y acciones reversibles antes del pulido.
- No presentar módulos futuros como disponibles. Separar "Próximamente" y "Activo".
- Guardado explícito de cambios, con feedback de pendiente/guardado y recuperación.
- Mantener 4.5:1 en texto normal, 3:1 en texto grande; foco teclado visible.
- Verificar carga, vacío, error, disabled, cambios de idioma y textos muy extensos.

## Emil · interacción móvil y movimiento
- No añadir animación cuando la pantalla requiere uso constante o alta frecuencia.
- Cuando sea necesaria, usar transform/opacity o color y 100–160 ms para feedback.
- Nada de transition:all; limitar propiedades y usar curves responsivas.
- Usar touch-action:manipulation; entradas de 16 px en touch; no bloquear zoom.
- Probar hover solo en dispositivos que lo admiten, safe-area, 100dvh y
  prefers-reduced-motion. No instalar librerías de animación sin necesidad.

## Reglas de implementación
- Next.js + TypeScript + Prisma: preservar estructura de la aplicación existente.
- Las preferencias de módulos son distintas a licencias y permisos de usuario.
- Las rutas y API deben comprobar permisos y pertenencia al tenant del lado servidor.
- Mantener la plantilla NEXUS y las funciones inmobiliarias previas.
- No añadir contenido de clientes, estadísticas, testimonios ni integraciones falsas.
- Proteger peso de bundles, accesibilidad y consultas a base de datos.

## Validación de entrega
- Ejecutar los checks existentes y compilar Next.js con TypeScript.
- Revisar responsive a 375, 768, 1024 y 1440 px; usar navegador real/capturas
  cuando estén disponibles. Sin esas pruebas, indicarlo expresamente.
- Antes de fusionar, comprobar que la PR conserva los tests de módulos/tenants.
- Documentar cambios UI en la PR y distinguir ejecución de criterio/manual de
  instalación del CLI oficial.
