# Despliegue Nexus en Enhance (Node.js nativo + PostgreSQL)

Este despliegue **no utiliza** Docker, Docker Compose, Passenger ni Plesk. Los archivos `Dockerfile`, `docker-compose.yml` y `.dockerignore` son históricos para pruebas en Dokploy; no deben seleccionarse como método de despliegue en Enhance. No se eliminan en este cambio para no romper posibles pruebas externas.

## Configuración

- Runtime: Node.js 22 o superior.
- Directorio de aplicación: `deploys/current` (verificar ruta real en la cuenta).
- Instalar dependencias: `npm ci --include=dev`.
- Compilar: `npm run build`.
- Verificación: `npm run check:enhance`.
- Arranque: `npm start`.
- Configuración persistente: `~/nexus-runtime` por defecto; no guardar `installation.json` en el despliegue Git.
- No definir `DATABASE_URL` antes de usar el asistente `/instalar`.

## PostgreSQL

La base debe existir, estar vacía y ser accesible desde el proceso Node.js.

### Conexión por socket en Enhance

Cuando `pg_isready -h /var/run/postgresql -p 5432` responde y `pg_isready -h 127.0.0.1 -p 5432` no responde, introduce `/var/run/postgresql` en el campo **Servidor de base de datos** del instalador, con el puerto `5432` y las credenciales de la base creada. No actives TCP ni expongas 5432 solo para instalar. Prisma v6 usa `?host=/var/run/postgresql` en su URL interna para sockets Unix; la aplicación guarda la configuración en la ruta privada habitual.

`pg_isready` demuestra disponibilidad del servidor, **no** autenticación ni permisos. Antes de repetir la instalación, valida que el usuario pueda autenticarse por socket y tenga acceso a una base vacía. El instalador sigue soportando TCP para bases remotas y MySQL/MariaDB sin cambios.

La instalación en Enhance real sigue pendiente de comprobar. CI verifica la construcción de URL y la conexión Prisma real por socket con PostgreSQL 16 efímero, además de preservar las pruebas TCP existentes. Esto no demuestra permisos ni autenticación en el servidor de un cliente.
 El usuario de instalación necesita permisos `CONNECT` en la base y `USAGE, CREATE` sobre el esquema `public` de **esa base**. En PostgreSQL 15+, el permiso `CREATE` sobre `public` no debe darse por supuesto.

Si el usuario no dispone de permisos, un administrador autorizado puede conectarse a la base correspondiente y ejecutar:

```sql
GRANT CONNECT ON DATABASE nombre_base TO usuario_nexus;
GRANT USAGE, CREATE ON SCHEMA public TO usuario_nexus;
```

No conceder SUPERUSER ni ejecutar SQL contra una base diferente. Si el instalador indica que ya existen tablas, no eliminarlas sin copia y confirmación.

## Diagnóstico sin revelar secretos

En los logs de Node.js, buscar `[installer] Database preflight failed`, `[installer] PostgreSQL schema permissions insufficient` o `[installer] Prisma db push failed`. Compartir solo código Prisma/SQLSTATE, nunca `DATABASE_URL` ni contraseñas.

La comprobación automática de GitHub no demuestra conectividad con la base de datos real de Enhance. Se requiere una prueba de instalación en el servidor.

## Inicio de sesión administrativo detrás del proxy HTTPS de Enhance

Si el formulario de acceso redirige con `error=origen`, la petición HTTPS pudo llegar a Node.js con un encabezado `Host` privado del proxy. El código valida que el `Origin` sea el dominio público autorizado y resuelve ese dominio antes de consultar la institución y sus permisos.

Se recomienda fijar el dominio oficial en las variables de entorno **privadas** del proceso Node.js de cada sitio:

```env
SITE_URL=https://tu-dominio-oficial.example
```

Sustituye el ejemplo por el HTTPS real y reinicia el proceso Node.js. Este valor **no** es la URL de PostgreSQL. Nunca se debe desactivar la validación CSRF ni permitir cualquier `Origin`. El servidor admite también `X-Forwarded-Host` cuando el proxy presenta un `Host` privado y anuncia `X-Forwarded-Proto: https`, pero no confía en esos encabezados si `Host` ya es público.

Antes de corregir un dominio asociado a la institución, **solo consultar** la tabla `Domain` de la instalación actual y verificar cuál es el host registrado. No modificar filas de empresas o dominios sin respaldo, comprobación de identidad y autorización.

Esta corrección requiere repetir el login y la sesión en el Enhance real, además de superar las pruebas automáticas de CI.
