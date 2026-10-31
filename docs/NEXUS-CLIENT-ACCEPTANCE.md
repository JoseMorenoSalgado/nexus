# Nexus Real Estate — aceptación del cliente y plan de verificación

Estado: requisitos recopilados, **no equivale a funcionalidades verificadas**. Validar cada criterio con pruebas automatizadas y revisión visual antes de darlo por terminado.

## Despliegue exclusivo Enhance
- [ ] Sin referencias operativas a Plesk, Passenger, cPanel ni Dokploy en flujos activos, instrucciones y CI.
- [ ] Instalación desde GitHub con Node 22, `npm run build`, `npm start`, `npm run check:enhance`.
- [ ] Base SQL nueva y vacía; no conectar ni migrar la base antigua de pruebas de Plesk.
- [ ] Instalador protegido; al finalizar, bloqueo persistente después de redeploy.
- [ ] Fotografías, PDF y secretos persistentes fuera de `deploys/current`; prueba de segundo despliegue.

## Propiedades y fichas
- [ ] Referencia correlativa automática, única y estable por inmobiliaria; evitar colisiones concurrentes.
- [ ] Ficha técnica PDF: textos sin desbordamientos; galería en una o máximo dos páginas, con pruebas de propiedades de muchas fotos.
- [ ] Agente autorizado puede dar de alta propiedades y administrar las propias; no puede editar inventario ajeno sin permiso.
- [ ] Administrador puede revisar inventario y asignaciones; conservar trazabilidad y aislamiento por empresa.
- [ ] Imágenes editables y vista móvil de ficha, galería y catálogo.

## Usuarios, roles y CRM
- [ ] Mostrar/ocultar contraseña durante el alta para verificar la digitación; nunca mostrar contraseñas guardadas ni registrarlas en logs.
- [ ] Cierre de sesión invalida sesión en servidor y navegador.
- [ ] Orígenes de prospectos: Marketplace, Facebook, Instagram, TikTok, referido, cliente y otros.
- [ ] Crear prospectos sin seleccionar propiedad; permitir registrar interés externo o de otro inventario sin otorgar acceso a propiedades ajenas.
- [ ] Roles, agentes, permisos, seguimiento, agenda y rendimiento por agente con pruebas de autorización.

## Administración y contenido
- [ ] Configurar SMTP y reCAPTCHA desde el panel de administración; pruebas de permisos y envío.
- [ ] Asesoría empresarial: auditoría externa, cumplimiento PLD/FT/PA y capacitación para sujetos obligados conforme a leyes 977 y 976.
- [ ] Editar imágenes y contenidos del sitio, menú móvil, logo, colores y páginas desde el panel.
- [ ] Ficha PDF, WhatsApp dinámico, formularios y notificaciones verificadas en escritorio y móvil.
- [ ] Agenda con opción de enlace de videoconferencia.

## Criterios de cierre
- [ ] Pruebas CI verdes en el último commit; verificación específica de Enhance.
- [ ] Pruebas funcionales por rol: administrador, agente, visitante.
- [ ] Pruebas de seguridad: aislamiento por empresa, CSRF, credenciales, permisos de archivos.
- [ ] Revisión visual de PDF y páginas móviles.
- [ ] Validación real en Enhance; sin declarar terminado antes de completar esta lista.
