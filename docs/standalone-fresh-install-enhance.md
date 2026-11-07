# Nexus — instalación nueva PostgreSQL independiente en Enhance

Este procedimiento es **para una instalación limpia**, no una migración de datos. No se copian tablas, usuarios ni propiedades del sistema multitenant.

## Antes del despliegue

- Crear una base de datos **PostgreSQL nueva y vacía** y un usuario con permisos `CONNECT`, `USAGE` y `CREATE` en el esquema `public`. El usuario de la aplicación debe poder crear las tablas durante la instalación.
- Configurar el dominio HTTPS de producción y el proxy de Enhance hacia el proceso Node.
- Configurar en el entorno privado del servidor:
  `NODE_ENV=production`
  `NEXUS_STANDALONE_MODE=true`
  `SITE_URL=https://nexusrealestatenicaragua.com`
- No colocar contraseñas, `DATABASE_URL` ni otros secretos en el repositorio. El instalador recoge las credenciales de PostgreSQL y las guarda mediante la configuración privada existente.
- Verificar que el paquete `prisma` esté disponible en el despliegue: el instalador invoca `node_modules/prisma/build/index.js` para crear el esquema.
- Comprobar que el directorio de configuración privado sea persistente y escribible por Node, y que el proceso tenga acceso al esquema Prisma generado.

## Compilación

```bash
npm ci --include=dev
npm run build
```

Arranque de Enhance: `npm start`. No iniciar una segunda instancia manual en el mismo puerto.

## Instalación desde el navegador

1. Abrir `https://nexusrealestatenicaragua.com/instalar`; con el modo independiente activo redirige a `/standalone/instalar`.
2. Introducir los datos de la inmobiliaria, usuario administrador y conexión PostgreSQL **vacía**.
3. El instalador comprueba el origen HTTPS, la conexión, los permisos y la ausencia de tablas; crea el esquema independiente y la cuenta administradora.
4. Si el instalador indica que se crearon las tablas pero falló el arranque, **no volver a enviar el formulario ni borrar tablas**: revisar logs y estado de configuración.
5. Iniciar sesión en `/standalone/acceso`, abrir `/standalone/admin` y gestionar operaciones en `/standalone/admin/operaciones`.

## Pruebas obligatorias

- Página de inicio `/`, catálogo `/propiedades` y dashboard autenticado sin error 404/500.
- Crear un usuario y un prospecto; confirmar que aparecen en PostgreSQL.
- Crear una propiedad como borrador, agregar fotografía HTTPS, publicarla y abrir `/propiedades/<slug>`.
- Comprobar permisos de administrador, editor y agente, y cierre de sesión.
- Verificar que ninguna operación del modo independiente use `tenantId` ni requiera tablas `Tenant` o `Domain`.

## Publicación

No fusionar ni desplegar únicamente por CI verde. Completar la prueba de instalación en un entorno de ensayo y verificar que los archivos privados sobrevivan un redeploy de Enhance. Hacer respaldo antes de introducir datos reales.
