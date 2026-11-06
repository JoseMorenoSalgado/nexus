# Reconstrucción controlada del sitio público — Nexus

## Estado de la auditoría inicial (2026-11-06)

Rama de trabajo: `refactor/rebuild-public-site-20261106`. Base: `main`.

### Evidencia en código

- `src/app/page.tsx` sí define la ruta raíz y renderiza `RealEstateHome`. El 404 no demuestra que falte el archivo de la página.
- `RealEstateHome` conserva el diseño, clases CSS, componentes y contenido del Home original. Debe reutilizarse como referencia visual y funcional, no sustituirse por una plantilla genérica.
- `getPublicContext` en `src/lib/tenant.ts` llama a `tenantFromHost`, que devuelve `null` si falla la validación de hostname, la configuración HTTPS, la organización única/activa o el dominio registrado; luego invoca `notFound()`. Esta es una causa posible y comprobable del 404.
- `src/lib/single-installation.ts` exige exactamente una organización en la base de datos; la separación del antiguo multi-tenant puede haber dejado más de una. No eliminar organizaciones ni datos automáticamente.
- `src/lib/public-request-origin.ts` interpreta cabeceras Host/X-Forwarded-Host del proxy Enhance. Verificar comportamiento real con cabeceras de producción antes de alterar validaciones de seguridad.
- El dashboard y el sitio público deben compartir datos a través de interfaces de lectura controladas, sin duplicar tablas ni modificar Prisma.

### Estrategia

1. Conservar intactos el dashboard, Prisma, migraciones, datos y autenticación.
2. Crear una capa pública independiente para resolución de instalación, consultas de solo lectura y renderizado de páginas.
3. Mantener componentes de presentación y hojas CSS existentes para preservar el diseño.
4. Cubrir con pruebas: host canónico, alias www, proxy Enhance, dominio no autorizado, cero/varias organizaciones, organización inactiva, página Home y enlaces públicos.
5. Añadir una comprobación de humo HTTP para `/`, `/propiedades`, `/nosotros`, `/servicios` y `/contacto` en un entorno de pruebas con datos de prueba; no probar contra producción modificando datos.
6. Ejecutar `npm ci`, `npm run build` y las pruebas antes de abrir PR. No fusionar a `main` ni desplegar sin validación.

### Pendiente de verificar en Enhance

- SHA desplegado frente al HEAD de `main`.
- `SITE_URL` HTTPS exacta, sin espacios ni rutas; variables alternativas contradictorias.
- Host y X-Forwarded-Host recibidos por Next.js (sin registrar credenciales).
- Conteo de organizaciones y estado activo; dominios registrados, únicamente mediante consultas de solo lectura.
- Logs `[public-site]` para distinguir resolución fallida de una ruta inexistente.

**Restricción:** este documento inicia la reconstrucción por auditoría; no constituye una corrección implementada ni una prueba superada.
