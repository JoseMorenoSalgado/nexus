# Principios para cada superficie WebAppECloud

## Instalador inicial
Pregunta principal: "¿Qué tipo de negocio voy a administrar?"
- La selección de sector aparece antes del catálogo de módulos.
- Mostrar sector como radio card con nombre e información útil, no cuatro
  ilustraciones intercambiables.
- Agrupar pasos: conexión de BD, sector/empresa, módulos, administrador.
- Acciones explícitas, recuperación en error, validación visible y móvil.
- Una instalación completada no debe reiniciarse sin protección.

## Administración de módulos
Pregunta principal: "¿Qué herramientas están disponibles para mi empresa?"
- Estado habilitado/inactivo distinguible sin depender solo del color.
- Módulos futuros en un grupo distinto, no activables.
- Distinguir módulo esencial de opcional; activar/desactivar no elimina registros.
- Mostrar cambios pendientes y permitir descartarlos sin guardar.
- No mostrar una función desactivada en navegación ni permitirla por API.
- El administrador maneja los módulos, roles y licencias se validan aparte.

## Inmobiliaria
Pregunta principal: "¿Qué propiedades y prospectos necesitan acción?"
- Controles frecuentes accesibles en pocos clics: propiedad, agente, lead, cita.
- Fotografías completas y de buena calidad; evitar ampliaciones artificiales.
- Compatibilidad con fichas PDF y mensajes WhatsApp contextuales.
- Preserve diseño NEXUS aprobado; cambios puntuales, no restyling global.

## Educación
Pregunta principal: "¿Qué programas, estudiantes y comunicaciones gestiono?"
- Moodle es integración externa con conexión explicitada, nunca un módulo
  funcional mientras no exista el adaptador de API y pruebas.
- No inventar notas, matrículas ni facturas.

## E-commerce
Pregunta principal: "¿Qué productos, pedidos y cobros atiendo?"
- No prometer carrito o pago mientras catálogo y órdenes no estén implementados.
- Diferenciar web de presentación y tienda transaccional.
- Mantener principios de accesibilidad para selector de productos e inventario
  cuando existan.

## Servicios
Pregunta principal: "¿Qué solicitudes y trabajos necesitan seguimiento?"
- Priorizar consultas, páginas de servicios, contactos y tareas reales.
- No arrastrar la navegación inmobiliaria a un sitio de servicios.

## Dispositivos
- 375 px: toda acción debe ser posible con un pulgar y sin scroll horizontal.
- 768 px: navegación y formularios reacomodados sin campos apretados.
- 1024/1440 px: aprovechar ancho para información, no espacios decorativos.
- Teclado: Tab, Enter, Space y Escape deben funcionar naturalmente.
