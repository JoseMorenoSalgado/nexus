# Diagnóstico del error P2021 de NEXUS en Dokploy

Si la aplicación muestra `PrismaClientKnownRequestError P2021` y `The table Domain does not exist`, **Next.js arrancó, pero la tabla de dominio no existe en la base SQL activa**. El digest no explica por sí solo la causa.

## 1. Comprobación segura de lectura

En Dokploy, abre la terminal **del contenedor de aplicación NEXUS** (no el contenedor de MariaDB). Ejecuta:

```bash
node scripts/diagnose-installation.mjs
```

El comando solo consulta la configuración y el catálogo de tablas (y, si están presentes, la vinculación del dominio). No muestra contraseñas, no ejecuta migraciones y no altera la información.

**Importante:** NEXUS lee primero `/app/.runtime/installation.json`; si existe y es válido, **prevalece sobre** la variable de entorno `DATABASE_URL`. Cambiar la variable en Dokploy no cambia automáticamente la base utilizada.

## 2. Interpretar el resultado

- **BASE VACÍA:** probablemente se conectó una instancia SQL sin instalar o una base equivocada. Identifica primero la base y los volúmenes originales. No ejecutes un instalador sobre datos existentes.
- **ESQUEMA INCOMPLETO / FALTA Domain:** comprueba si hay tablas de usuarios, inmuebles, contactos u otros datos. Si existen, haz un backup verificable, confirma el esquema histórico y prepara una migración no destructiva específica. **No ejecutes `prisma db push` sobre una base de producción con datos sin analizar sus diferencias.**
- **DOMINIO NO REGISTRADO:** verifica en una instancia ya inicializada el valor de `Domain.hostname` y su relación con un `Tenant.active`. No uses automáticamente el primer tenant.
- **CONEXIÓN DIFERENTE:** si `installation.json` y `DATABASE_URL` apuntan a sitios distintos, conserva `installation.json` y confirma cuál es la base correcta mediante sus backups. No edites ese archivo sin una restauración controlada.
- **DOMINIO REGISTRADO:** comprueba que las tablas `SitePage` y `Property` tengan el esquema esperado, así como los logs de Next.js. El error P2021 podría corresponder a un contenedor/despliegue anterior.

## 3. Recuperación según los datos

**Si la instalación del cliente ya existía**, identifica el volumen correcto montado en `/app/.runtime` y la base original; restaura el *montaje* o la conexión mediante un procedimiento validado. `npm run installation:restore` solo aplica cuando falta `installation.json` y la base original ya contiene todas las tablas y un administrador activo.

**Si es una instalación nueva, sin absolutamente ningún dato**, el asistente `/instalar` puede crear el esquema de una base previamente vacía, siempre que no exista configuración SQL activa y que se restrinja el acceso de instalación. No borres `installation.json` para reactivar el instalador sin verificar la instalación anterior.

Antes de cualquier operación de escritura o redepliegue, hacer backup de SQL, de `/app/.runtime` y de los archivos de propiedades. **No usar** `prisma migrate reset`, `db push --force-reset`, `DROP TABLE` ni eliminar volúmenes.

## 4. Tras recuperar

Comprobar `/api/live`, `/api/health`, portada, propiedades, panel administrativo, consultas, asesoría empresarial y carga de archivos. Si después de solucionar P2021 sigue apareciendo un error *client-side*, revisar la consola del navegador por separado.
