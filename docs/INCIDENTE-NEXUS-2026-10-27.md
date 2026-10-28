# Incidente NEXUS: Next.js 500 y Prisma P2021 — 27 de octubre de 2026

## Alcance

**Solo NEXUS:** `JoseMorenoSalgado/nexus`. No ejecutar acciones en `webappecloud`, Edvorya, ni bases/volúmenes de otros clientes.

Error visible en producción: `Application error: a server-side exception has occurred`, digest `2569002582`.
El registro anterior identifica Prisma `P2021` para la tabla `Domain` ausente. También se observó una redirección del instalador a `0.0.0.0:3000/instalar?estado=ocupado`.

Dos incidentes pueden coexistir:
1. El contenedor abre conexiones SQL pero la base seleccionada no contiene las tablas del CMS.
2. Dokploy/Traefik entrega al servidor una URL interna y el instalador emite una redirección absoluta hacia esa IP interna. El nuevo código usa redirecciones relativas.

## Diagnóstico sin cambios en datos

1. Abrir **Dokploy → aplicación de NEXUS → Runtime Logs**, y localizar el fallo `P2021`. Los logs de build no equivalen a logs de ejecución.
2. Verificar que la aplicación de NEXUS está vinculada a **`JoseMorenoSalgado/nexus`**, rama `main`. Identificar commit/image realmente desplegado.
3. Comprobar el volumen de `APP_CONFIG_DIR`, normalmente `/app/.runtime`. **NO borrar ni renombrar `installation.json`**: contiene la cadena privada de SQL y tiene prioridad frente a `DATABASE_URL`.
4. En la **terminal del contenedor de la aplicación NEXUS**, ejecutar (no requiere revelar credenciales):

   ```sh
   RECOVERY_HOST=nexusrealestatenicaragua.com node scripts/diagnose-production-db.mjs
   ```

   El script es solo lectura. Imprime el origen de configuración (archivo/env), el motor de BD, conectividad, tablas esenciales existentes y si el dominio tiene una empresa activa. Nunca imprime contraseñas ni cadenas de conexión.
5. Comprobar `https://nexusrealestatenicaragua.com/api/live` y `/api/health`. `/api/live` solo verifica el servidor HTTP; la comprobación `/api/health` mejorada devuelve 503 con `schema_incomplete` si detecta `P2021` o `P2022`.

## Según el resultado

### A. Configuración SQL ausente o el volumen no está montado

Comprobar la ubicación real del volumen persistente; verificar el secreto SQL *sin copiarlo a mensajes o registros*. Conservar el volumen actual y compararlo con la ruta configurada. No ejecutar el instalador para sustituir una instalación existente.

### B. Conexión correcta, pero faltan todas las tablas

Comprobar que la base SQL realmente es **exclusiva de NEXUS** y está deliberadamente vacía, no una base equivocada. Solo entonces realizar **una instalación inicial controlada**, con un respaldo del estado actual del servidor y la base. El asistente exige una base vacía y acceso restringido; si `DATABASE_URL` ya está definido, el instalador se considera configurado y no se habilita. No eliminar configuraciones persistentes para intentar forzarlo.

### C. Conexión correcta con tablas existentes y falta `Domain`

Detener cambios. Identificar la procedencia de esa base y confirmar el backup SQL **restaurable**. No ejecutar `prisma db push` ni `prisma migrate deploy` indiscriminadamente sobre una base con datos. Se necesita reconciliar el esquema y los registros del dominio preservando usuarios, propiedades, prospectos y archivos.

### D. Tablas esenciales presentes, dominio no asociado

El dominio normalizado debe estar asociado a la empresa correcta en la tabla `Domain`, con `Tenant.active=true`. Usar el proceso administrativo adecuado para agregar el dominio tras verificar la empresa; no reutilizar el `tenantId` de otro cliente.

### E. Aparece `?estado=ocupado`

Una sesión temporal de instalador puede estar reservada para otro navegador o una sesión previa. Evitar borrar `installer-session.json` o archivos de bloqueo durante una instalación en curso. La ruta de redirección ahora es relativa para no exponer la IP interna del proxy. Resolver primero si existe una instalación SQL anterior.

## Antes de cualquier corrección de datos

- Confirmar respaldo SQL, fotos y volumen `/app/.runtime`, y realizar una restauración aislada de prueba.
- No eliminar proyecto, red, volumen Docker, empresa, ni base.
- No copiar `installation.json` o la URL SQL a un ticket público o conversación.
- Separar el estado de **GitHub Actions verde** del estado de producción; verificar el commit en el contenedor real.
- Al finalizar: `/api/live` 200, `/api/health` 200, inicio, login, propiedades, asesoría empresarial, CRM, documentos PDF y medios.

Esta guía y el script no realizan migraciones, despliegues ni reparaciones automáticas.
