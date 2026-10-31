# NEXUS — CMS inmobiliario

Aplicación de **NEXUS Real Estate Nicaragua**, desarrollada en Next.js 15, TypeScript, Tailwind, Prisma y MariaDB/MySQL o PostgreSQL. El despliegue principal es **Enhance Control Panel** con Node.js 22, GitHub y proxy HTTP. Los archivos persistentes permanecen fuera de los directorios de cada despliegue.

> Este repositorio es una copia **independiente** del proyecto base WebAppECloud. No es un fork sincronizado: los cambios de NEXUS no se propagan a otras categorías o clientes.

## Alcance exclusivo

Este CMS es **solo inmobiliario**. No permite seleccionar Educación, Comercio electrónico o Servicios genéricos ni instalar sus módulos.

- Sitio público inmobiliario, home editable y catálogo de propiedades para venta o alquiler.
- Fichas de inmuebles con imágenes, galería, documentos PDF y contacto contextual por WhatsApp.
- Panel de administración, usuarios y roles, clientes, agentes y asignaciones.
- CRM de prospectos, agenda de seguimiento y notificaciones.
- Cierres comerciales, abonos, comisiones y reportes con indicadores de rendimiento.
- Gestión de marca, imágenes, páginas y menús.
- **Asesoría Empresarial**, servicio solicitado por el cliente: auditoría externa de cumplimiento, prevención de LA/FT/FP, capacitación para sujetos obligados definidos en la legislación aplicable y formulario de contacto. Su publicación es opcional desde `Administración → Mi sitio web → Páginas`; el contenido se edita en `/admin/personalizar/paginas/asesoria-empresarial`. La página pública es `/asesoria-empresarial`.

El motor mantiene el aislamiento de empresas en base de datos por seguridad, pero **no incluye otras categorías de negocio**. La asesoría empresarial es un servicio adicional de NEXUS, no una plantilla ni una categoría CMS independiente.

## Despliegue en Enhance

1. Configurar la aplicación Node.js 22 y el repositorio GitHub. Usar el directorio de trabajo `deploys/current` y el proxy HTTP al puerto de la aplicación.
2. Ejecutar `npm install --include=dev`, luego `npm run build` y `npm run check:enhance`. Comando de inicio: `npm start`.
3. Guardar archivos privados y multimedia en `~/nexus-runtime` (predeterminado) o en `APP_CONFIG_DIR` absoluto y persistente. No colocarlos en `deploys/current` ni en `public`.
4. Para **una instalación nueva con base vacía**, habilitar `INSTALLER_AUTO_SETUP=true` solo durante una ventana de acceso restringido y completar `/instalar`. Desactivar después.
5. Para **reconectar una base de datos existente**, no ejecutar el instalador ni `prisma db push`. Configurar `DATABASE_URL` en el entorno privado; si se necesita restaurar `installation.json`, definir también `RECOVERY_HOST` y ejecutar `npm run installation:restore` después de verificar backups. Este comando comprueba la existencia del dominio y administrador sin borrar tablas.
6. Verificar inicio de sesión, propiedades, fotografías y persistencia después de un segundo despliegue. Mantener copia de seguridad de SQL y `~/nexus-runtime`.

No introducir contraseñas en el repositorio, ni ejecutar migraciones automáticas sin revisión y respaldo.

Para desarrollo local:

```bash
npm install --no-audit --no-fund
cp .env.example .env
npm run dev
```

## Calidad y seguridad

GitHub Actions valida TypeScript, compilación Next.js, Docker, rutas inmobiliarias, CRM, roles, agentes, asesoría empresarial y aislamiento de datos. Las capturas visuales de QA son opcionales; la cuota de almacenamiento de artefactos de GitHub puede impedir su subida.

Los nuevos desarrollos en este repositorio deben ser **exclusivamente inmobiliarios** o relativos al servicio de asesoría empresarial existente. Las funciones de otros sectores se desarrollarán solamente en repositorios independientes. Nada en este repositorio actualiza automáticamente `JoseMorenoSalgado/webappecloud`.
