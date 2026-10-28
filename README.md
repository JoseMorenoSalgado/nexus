# NEXUS — CMS inmobiliario

Aplicación de **NEXUS Real Estate Nicaragua**, desarrollada en Next.js 15, TypeScript, Tailwind, Prisma y MariaDB/MySQL o PostgreSQL. Se despliega en **Plesk (Node.js 22 + Passenger)** o mediante **Docker en Dokploy**, manteniendo servidores y bases de datos independientes.

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

## Instalación

- Node.js 22 en desarrollo y producción. En Plesk, el archivo de inicio es `app.js` (Passenger) o el adaptador nativo de Next.js generado por Plesk; en Dokploy se usa Docker.
- Crear una **base de datos exclusiva** por despliegue y proporcionar la conexión mediante variables privadas del servidor o el asistente `/instalar`.
- Mantener `APP_CONFIG_DIR` persistente y **fuera del directorio público** (Plesk), o un volumen privado en `/app/.runtime` (Dokploy). Esto incluye credenciales, fotografías y PDF.
- Habilitar `INSTALLER_AUTO_SETUP=true` temporalmente para una instalación inicial restringida; desactivarlo después.
- Usar secretos y credenciales fuera de Git. No reutilizar bases de datos o volúmenes de otros clientes.

Para desarrollo local, con base de pruebas:

```bash
npm install --no-audit --no-fund
cp .env.example .env
npm run db:generate
npm run dev
```

Para preparar una base **vacía de desarrollo**, configurar primero `DATABASE_URL` y utilizar `npx prisma db push`, seguido de `npm run db:seed`, únicamente en instalaciones descartables. **No usar `prisma db push` como mecanismo automático de actualización de una base de producción.**

Antes de desplegar, validar backups recuperables de SQL y archivos, el proceso de migración y la rama utilizada por el servidor. Para el dominio real consulta **`docs/DEPLOY-PLESK.md`** y ejecuta `node scripts/check-plesk-ready.mjs` tras compilar. Para instalaciones Docker, ver `docs/DEPLOY-DOCKPLOY.md`.

## Calidad y seguridad

GitHub Actions valida TypeScript, compilación Next.js, Docker, rutas inmobiliarias, CRM, roles, agentes, asesoría empresarial y aislamiento de datos. Las capturas visuales de QA son opcionales; la cuota de almacenamiento de artefactos de GitHub puede impedir su subida.

Los nuevos desarrollos en este repositorio deben ser **exclusivamente inmobiliarios** o relativos al servicio de asesoría empresarial existente. Las funciones de otros sectores se desarrollarán solamente en repositorios independientes. Nada en este repositorio actualiza automáticamente `JoseMorenoSalgado/webappecloud`.
