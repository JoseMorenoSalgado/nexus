# Refactorización UX y rendimiento — WebAppECloud

## Propósito
Una tarea principal por pantalla, información jerarquizada, navegación legible y herramientas secundarias bajo demanda. Mantener NEXUS (rojo corporativo y neutros), identidad editable por tenant y un diseño responsive.

## Aplicado en la primera fase
- Menú privado en dos niveles: **Trabajo diario** (Inicio, Propiedades, Prospectos, Agenda, Ventas) y **Más herramientas** (Personalización, Reportes, Notificaciones, usuarios y soporte técnico cuando corresponda al rol). Se retiró el enlace ficticio Categorías.
- Dashboard: 4 KPIs claros, actividades pendientes solo cuando existen, listas recientes compactas con enlaces accionables. Las gráficas se abren bajo demanda y se cargan dinámicamente, reduciendo JavaScript inicial.
- Agentes: conservan su dashboard y enlaces de rendimiento/perfil, sin ver datos de otros agentes.
- Home público: se retiran el panel decorativo lateral, contadores ornamentales y números de servicio. Se conservan el buscador, propiedades destacadas, servicios, información empresarial y contacto.
- Cálculo de series de actividad extraído a `src/lib/dashboard-metrics.ts` con agregación O(n) y UTC consistente. Las consultas siguen limitadas por tenant.
- Ajustes visuales aislados en `src/app/admin-tidy.css` y `src/app/home-tidy.css` para evitar continuar ampliando el CSS heredado.
- Pruebas automáticas del cálculo, navegación útil y home simplificado.

## Criterios de diseño para siguientes pantallas
1. Mostrar una acción principal inequívoca; las acciones complementarias en menús o secciones secundarias.
2. Evitar tarjetas grandes sin contenido; preferir tablas o listas compactas para tareas de administración.
3. No mostrar enlaces deshabilitados como si fueran funciones disponibles.
4. Limitar anchos y espacios vacíos; interfaces claras en 375, 768, 1024 y 1440 px.
5. Usar textos cotidianos: «Prospectos», «Nueva propiedad», «Más herramientas», y explicar métricas que podrían confundirse.
6. Mantener roles y permisos del servidor; ocultar navegación es solo una mejora visual, no una medida de autorización.
7. Al modificar imágenes, no estirar originales de baja resolución; separar galería ampliable y miniaturas.
8. Mantener CSS nuevo por módulo y componentes reutilizables, sin agregar selectores redundantes en `globals.css`.
9. Probar Next.js, Docker, CRM, CMS, usuarios y motores SQL antes de entregar.

## Pendientes de refactorización posterior
`src/app/globals.css` contiene estilos heredados extensos. Separarlos por módulos de forma gradual y con pruebas de regresión visual (no eliminar masivamente reglas existentes); optimizar consultas de notificaciones repetidas por request; medir tamaños de bundle y tiempos de respuesta con datos reales de producción.

No se han modificado datos, credenciales, tablas ni migraciones en esta fase.
