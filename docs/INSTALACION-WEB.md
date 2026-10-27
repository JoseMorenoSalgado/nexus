# Instalador web de WebAppECloud

Primer cliente: NEXUS REAL ESTATE. El asistente permite elegir **MariaDB, MySQL o PostgreSQL**. El sitio `inmo.elearningcloud.org` puede instalarse desde el navegador, como WordPress/Moodle, sin escribir manualmente una cadena `DATABASE_URL`.

## 1. Preparar Dockploy

Mantén este servicio **separado de Edvorya**. En la aplicación WebAppECloud (Dockerfile) configura:

- **Instalación sin escribir clave:** define `INSTALLER_AUTO_SETUP=true` sólo cuando vayas a instalar. El servidor crea una sesión temporal de 60 minutos y envía al primer navegador una cookie `HttpOnly` protegida; la clave interna no se muestra ni se copia desde la terminal.
- **Seguridad importante:** si el sitio es público mientras está habilitada esta variable, un tercero podría reclamar primero la sesión. Restringe temporalmente `/instalar` y `/api/install/session` por proxy/firewall o permite acceso sólo desde tu red, inicia la instalación inmediatamente y cambia `INSTALLER_AUTO_SETUP=false` al finalizar. No es autenticación de un administrador existente.
- `APP_CONFIG_DIR=/app/.runtime`.
- **Volumen persistente** montado en `/app/.runtime` con permisos de escritura para el usuario `node` del contenedor. Este volumen es OBLIGATORIO: sin él, se perderán las credenciales al reconstruir la imagen.
- Elimina cualquier `DATABASE_URL` previo si deseas configurar la conexión desde el asistente. Si está definido, el asistente no permitirá reinstalar.
- Conserva `PORT=3000`, dominio HTTPS y la red/puertos de Edvorya intactos.
- Para ver el instalador directamente en la portada, establece `SITE_PREVIEW_MODE=false`. Si está activada la vista previa, abre explícitamente `/instalar`.

En el modo Compose del repositorio se incluye el volumen `webapp-config:/app/.runtime`. En una **aplicación Dockerfile**, debes añadirlo desde la interfaz de volúmenes de Dockploy; Compose y Dockerfile no son intercambiables.

## 2. Crear base de datos vacía

**MariaDB, MySQL o PostgreSQL**. Como en WordPress, la base y el usuario SQL deben existir previamente. En Dockploy crea una instancia MariaDB independiente (no utilices la de Edvorya) y asigna una base vacía con permisos para crear tablas. El nombre del host será el nombre de servicio DNS **alcanzable desde el contenedor de WebAppECloud**; si están en redes Docker distintas, primero configura una red compartida restringida a estos dos contenedores.

La base, el usuario SQL y los permisos deben crearse previamente en el servicio de base de datos aislado de Dockploy, sin exponer su puerto a Internet.

## 3. Abrir el asistente

Visita `https://inmo.elearningcloud.org/instalar`.

**Paso 1:** tipo de motor, host SQL, puerto (3306 o 5432), nombre de la base, usuario SQL y contraseña. No se solicita clave de instalación: la sesión se inicializa automáticamente al abrir `/instalar`.

**Paso 2:** nombre de la institución, correo institucional, nombre del administrador, correo del administrador y contraseña de al menos 14 caracteres.

El dominio se toma del host HTTP solicitado y se vincula con la institución; no se permite escoger otra empresa mediante el formulario. Una vez completado, se crean las tablas del CMS, la institución, el dominio y el administrador (contraseña almacenada como hash `scrypt`).

La instalación se bloquea tras guardarse la configuración. **No se debe eliminar el volumen de configuración ni el de MariaDB.** Se recomienda hacer copias de seguridad de ambos, con acceso restringido.

### Limitaciones actuales

- El instalador inicial utiliza `prisma db push` para **una base vacía**, exclusivamente para esta primera versión/staging. Antes de utilizar la plataforma con clientes reales se incorporarán migraciones SQL versionadas, validaciones adicionales, backups y auditoría de seguridad.
- Un fallo después de crear el esquema pero antes de terminar puede requerir intervención técnica; **no borres tablas ni reinicies con otro tenant automáticamente**.
- Los permisos de la base deben ser los mínimos necesarios para crear tablas durante la instalación y reducirse después.
- La configuración guardada contiene la contraseña SQL en un archivo privado con permisos `0600` dentro del volumen. No se almacena en Git, HTML ni un directorio público; protege el volumen y sus copias.
- La sesión de instalación es diferente de la contraseña del administrador. Cambia `INSTALLER_AUTO_SETUP=false` después de instalar y comprobar el acceso.
- La instalación inicial crea la primera institución. La alta de siguientes empresas se hará posteriormente desde el panel global SaaS, sin ejecutar nuevamente este instalador.

## Diagnóstico de versión de Dockploy (evitar cachés y contenedores obsoletos)

Abrir `https://inmo.elearningcloud.org/api/live` y comparar el campo `release` con `2026-10-21-auto-setup-r3`.
Si no aparece esta versión, Dockploy **no está ejecutando la imagen actual de main**.
El dominio debe apuntar al contenedor correcto (puerto interno 3000); en Dockploy usar Deploy/Rebuild y comprobar el commit de main en los logs. No basta con seleccionar la rama ni con Reload.

Abrir `/instalar`, comprobar que aparezca selector MariaDB/MySQL/PostgreSQL. Si la interfaz señala almacenamiento no escribible, revisar el volumen `/app/.runtime` y sus permisos con `id && ls -ld /app/.runtime` dentro del contenedor (sin publicar secretos). La sesión de primer acceso se almacena en el volumen y se entrega al navegador mediante una cookie segura.

### PostgreSQL en Dockploy

Crea una base PostgreSQL **vacía e independiente** en un contenedor propio, por ejemplo servicio DNS `postgres`, puerto `5432`. Conecta el contenedor Next.js a una red privada que alcance el servicio PostgreSQL. Introduce host, puerto, base, usuario y contraseña en la pantalla de instalación.

La imagen `docker-compose.yml` incluida crea **MariaDB como ejemplo por defecto**. Si deseas PostgreSQL, crea ese servicio desde Dockploy y no utilices el contenedor MariaDB de muestra. La configuración de ambas tecnologías no se mezcla; se elige el motor al instalar.

Prisma utiliza `prisma/schema.prisma` para MySQL/MariaDB y `prisma/schema.postgres.prisma` para PostgreSQL. No se puede cambiar simplemente el protocolo de DATABASE_URL después de instalar sin migrar físicamente los datos.

## Recuperar un sitio que vuelve a `/instalar`

Si `/` redirige a `/instalar`, la aplicación no encuentra la conexión SQL. Esto no significa que se hayan borrado los datos. Si `/api/live` tampoco muestra `release`, el despliegue es anterior al diagnóstico de versiones: actualizar desde `main` y comprobar que el dominio llegue al contenedor correcto.

1. Verifica el volumen persistente `/app/.runtime` en la aplicación **Dockerfile** de Dokploy. El volumen declarado en Compose no se aplica a una aplicación Dockerfile. Si existe un volumen anterior, vuelve a montarlo sin eliminarlo.
2. Si falta `installation.json` pero la base ya contiene la instalación, configura `DATABASE_URL` con la conexión original y `RECOVERY_HOST` con el dominio original en el entorno privado del contenedor. No publiques esos valores ni los pases como argumentos del comando.
3. Ejecuta dentro del contenedor actualizado `npm run installation:restore`. Verifica dominio, institución activa, administrador y tablas antes de guardar la conexión. No crea tablas, no cambia usuarios, no reinicia contraseñas y rechaza sobrescribir la configuración existente.
4. Comprueba `/api/health`, la portada y `/admin/acceso` con el administrador original. Si falla la verificación, revisa la conexión y el dominio original; no reinstales sobre la base existente.

Si es una instalación nueva sin datos, completa `/instalar` con una base vacía. El formulario de acceso redirige al asistente mientras no existe configuración SQL.
