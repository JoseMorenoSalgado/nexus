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

La base debe existir, estar vacía y ser accesible desde el proceso Node.js. El usuario de instalación necesita permisos `CONNECT` en la base y `USAGE, CREATE` sobre el esquema `public` de **esa base**. En PostgreSQL 15+, el permiso `CREATE` sobre `public` no debe darse por supuesto.

Si el usuario no dispone de permisos, un administrador autorizado puede conectarse a la base correspondiente y ejecutar:

```sql
GRANT CONNECT ON DATABASE nombre_base TO usuario_nexus;
GRANT USAGE, CREATE ON SCHEMA public TO usuario_nexus;
```

No conceder SUPERUSER ni ejecutar SQL contra una base diferente. Si el instalador indica que ya existen tablas, no eliminarlas sin copia y confirmación.

## Diagnóstico sin revelar secretos

En los logs de Node.js, buscar `[installer] Database preflight failed`, `[installer] PostgreSQL schema permissions insufficient` o `[installer] Prisma db push failed`. Compartir solo código Prisma/SQLSTATE, nunca `DATABASE_URL` ni contraseñas.

La comprobación automática de GitHub no demuestra conectividad con la base de datos real de Enhance. Se requiere una prueba de instalación en el servidor.
