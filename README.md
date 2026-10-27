# WebAppECloud — Plataforma multiempresa

**Primera implementación:** NEXUS REAL ESTATE · «Pensando en tu futuro».

Base Next.js 15 + TypeScript + Tailwind CSS + Prisma + **MariaDB/MySQL/PostgreSQL**. **Despliegue previsto: Docker en Dockploy**, con base SQL y archivos persistentes respaldados. **Estado:** primera versión de pruebas; no se considera apta para clientes reales hasta verificar migraciones, respaldos recuperables y seguridad del entorno.

## Funcionalidades implementadas

- **Plantillas por empresa:** Inmobiliaria, Educación y Servicios; selector en Personalizar sitio → Plantilla, edición de contenido y menús por sector. [Guía](docs/PLANTILLAS-SECTORIALES.md).\n
- Web pública NEXUS: home, buscador, catálogo por operación/tipo/ubicación y ficha individual.
- Ficha técnica PDF generada por servidor.
- Formulario de contactos con consentimiento; registro separado por empresa (tenant).
- WhatsApp contextual por propiedad y contador separado de los leads confirmados.
- Panel administrativo **protegido por usuario y sesión segura**: KPIs, gráficas, inmuebles recientes, leads.
- Registro de inmuebles con publicación opcional (fotografía por URL HTTPS).
- Esquema multiempresa en MariaDB: tenants, domains, propiedades, leads, páginas, eventos, cuentas y sesiones.
- Diseño móvil del home y dashboard, basado en la referencia aprobada y la paleta roja/gris de Nexus.

### Instalador inicial

Abre `/instalar` para configurar por primera vez **MariaDB/MySQL/PostgreSQL**, la institución, el correo institucional y el administrador, sin editar manualmente el código. Necesita una base SQL vacía previamente creada, un volumen persistente y `INSTALLER_AUTO_SETUP=true` habilitado temporalmente en un entorno restringido; la sesión de configuración se genera automáticamente sin introducir claves en el navegador. Consulta [Instalación web](docs/INSTALACION-WEB.md).

### Aún pendiente

- Logo vectorial/fotografías definitivas de NEXUS en el repositorio.
- Ampliar el editor de plantillas con vista previa sin publicar, más bloques y nuevos sectores (las plantillas Educación y Servicios ya están disponibles).
- Gestión de categorías, agentes, CRM, edición/eliminación de propiedades, informes avanzados.
- Rate limiting del formulario público, anti-bots, auditoría de seguridad y protección de datos (login incluye control básico de intentos).
- Migraciones iniciales versionadas, backups restaurables, pruebas de seguridad y despliegue de producción validado en Dockploy.

## Desarrollo local

Necesitas Node.js 20+ y MariaDB/MySQL.

```bash
npm install
cp .env.example .env
# Configura DATABASE_URL, SEED_DOMAIN=localhost, ADMIN_EMAIL y ADMIN_PASSWORD fuerte
npx prisma generate
npx prisma db push        # Solo primera instalación de DESARROLLO
npm run db:seed
npm run dev
```

Abre http://localhost:3000 (página pública) o http://localhost:3000/admin/acceso (panel). Para ver la web pública **sin** base de datos en desarrollo, omite `DATABASE_URL`: se muestra un catálogo de ejemplo, pero el formulario y el panel permanecen deshabilitados. En producción **no** se mostrará la demo sin base de datos.

La semilla crea la inmobiliaria NEXUS, el dominio configurado, tres propiedades ficticias y —solo si están definidos `ADMIN_EMAIL` y `ADMIN_PASSWORD`— un administrador. La semilla **no cambia la contraseña de una cuenta existente**.

### Seguridad multicliente

Nunca aceptamos el identificador del tenant enviado por el visitante para seleccionar datos. Se obtiene de la asignación única del dominio. Todas las consultas del panel se limitan al tenant de la cuenta autenticada, con cookie HttpOnly de sesión y token aleatorio cuyo hash se almacena en MariaDB.

### Docker / Dockploy

El destino de despliegue es **Docker en Dockploy**. Configura la base de datos con una red privada, los secretos fuera del repositorio y un volumen persistente para `APP_CONFIG_DIR`, el contenido multimedia y la configuración del instalador. Ver [guía Dockploy](docs/DEPLOY-DOCKPLOY.md) y [instalador](docs/INSTALACION-WEB.md).

**Antes de publicar o fusionar cambios con despliegue automático:** realizar y verificar una copia restaurable de SQL y del volumen persistente, comprobar la estrategia de migración y confirmar qué rama tiene conectada Dockploy. Ejecutar `prisma db push` únicamente en instalaciones iniciales vacías de prueba, no como actualización automática de producción.

## Estado de validación

La compilación inicial de Next.js/MariaDB y Docker superó CI. La nueva función del instalador debe superar CI antes de su integración a `main`; Dockploy requiere pruebas de funcionamiento adicionales.

Referencias de diseño: [docs/UX-BRIEF.md](docs/UX-BRIEF.md).

## Identificar el despliegue real

`GET /api/live` expone el campo no sensible `release` para saber si Dockploy realmente ejecuta la última imagen. La versión esperada es `2026-10-21-auto-setup-r3`. Si muestra otro valor, comprobar rama, commit, Clean Cache, Rebuild y asignación del dominio. Más detalles en `docs/INSTALACION-WEB.md`.
