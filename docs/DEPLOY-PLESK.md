# Iniciar NEXUS en Plesk con Next.js y MariaDB

Este procedimiento aplica al repositorio privado `JoseMorenoSalgado/nexus` (CMS independiente), dominio `nexusrealestatenicaragua.com`.

## Importante: Plesk versus Dokploy

NEXUS es una app de **Next.js SSR** con rutas API, autenticación y Prisma. **No es una web estática:** subir archivos a Git o a `httpdocs` no basta, y `next export` no sustituye al servidor. No son necesarios Docker, Docker Compose ni un puerto externo 3000 en Plesk.

Plesk Obsidian **18.0.81+** detecta Next.js y genera automáticamente el archivo de arranque Passenger al habilitar Node.js Toolkit sobre el dominio con archivos. Comprueba primero esta vía automática, antes de configurar `plesk-server.cjs` a mano.

## 1. Verificar archivos y sus rutas

En Plesk > Sitios web y dominios > NEXUS > Administrador de archivos, comprueba que la carpeta publicada de la aplicación contiene:

- `package.json`, `next.config.mjs`, `src/`, `public/`, `prisma/`, `scripts/`.
- `app.js` (arranque convencional de Plesk) y `plesk-server.cjs` (servidor Passenger de Next.js). Si Plesk 18.0.81+ genera un adaptador correcto, puedes usar el autogenerado.

Configura **Application Root** como la carpeta que contiene `package.json`, por ejemplo `httpdocs` solo si Git ha desplegado ahí el proyecto completo. En Plesk con Node.js Toolkit reciente y Next.js detectado como **server-side**, el panel puede autoconfigurar la aplicación sin pedir Document Root. **En el modo manual clásico**, Document Root debe estar dentro de Application Root (por ejemplo `httpdocs/public`); no debe exponer la raíz del código. El directorio que contiene `package.json`, `src`, `prisma` y `.runtime` **no** debe ser directamente accesible como archivos estáticos desde Internet. Si Plesk 18.0.81+ ofrece otra ruta segura autoconfigurada para Next.js, utiliza y verifica esa configuración. No ajustes el document root sin revisar la configuración del dominio.

La carpeta privada `.runtime` debe ser escribible por el usuario del sitio y **estar fuera del document root público**.

## 2. Configurar Node.js

Plesk > Sitios web y dominios > NEXUS > Node.js:

| Ajuste | Valor |
|---|---|
| Node.js | 22 |
| Package manager | npm |
| Application mode | Production |
| Application root | Carpeta real de `package.json` |
| Startup file | Adaptador autogenerado correcto (18.0.81+) o **`app.js`** del repositorio (alternativa: `plesk-server.cjs`) |
| PORT | No definir ni fijar manualmente. Passenger lo administra |
| Estado | Enable Node.js |

La app existente también conserva `npm run start` para Docker, sin interferir con la integración Plesk.

Si Plesk no muestra Node.js, instala/activa **Node.js Toolkit** (como administrador). En versiones antiguas puede ser necesario actualizar Plesk para soportar Next.js o utilizar el archivo compatible `plesk-server.cjs`.

## 3. Instalar dependencias y compilar

Desde el usuario SSH de la suscripción, en la **raíz de la aplicación**, usando Node 22:

```sh
node -v
npm -v
npm install --include=dev --no-audit --no-fund
npm run build
```

También puedes usar los botones **NPM Install** y **Run Script → build** de Plesk, siempre que la instalación haya incluido las dependencias de compilación. El script de compilación primero genera los clientes Prisma para MySQL y PostgreSQL y luego ejecuta `next build`.

`prisma` es **una dependencia de ejecución** porque el instalador inicial llama al CLI para crear las tablas; no debe quedar omitida del entorno.

Si ves `prisma: command not found`, `Cannot find module prisma`, falta de tipos TypeScript, o faltan los clientes Prisma, ejecuta el install y build con Node 22 y revisa los logs. No ejecutes `npm run dev` para publicar.

## 4. Base de datos MariaDB en Plesk

Plesk > Bases de datos > Agregar base de datos, crear una **base nueva y vacía** exclusiva para Nexus con usuario/contraseña propios, con permisos CREATE/ALTER durante la primera instalación. Guarda las credenciales en un lugar privado.

En Plesk el host SQL local suele ser `127.0.0.1` / `localhost` y el puerto `3306`, **no** `db` salvo que exista un servicio Docker con ese hostname. Confirma en Plesk el servidor SQL real.

Si **ya existe** una base de Nexus con empresas, dominio, usuarios o inmuebles, **no ejecutar instalación nueva sobre ella**. Proteger SQL y fotos y recuperar la configuración original.

## 5. Variables de entorno Plesk (primer arranque únicamente)

Plesk > Node.js > Custom environment variables:

```dotenv
NODE_ENV=production
SITE_PREVIEW_MODE=false
APP_CONFIG_DIR=/var/www/vhosts/nexusrealestatenicaragua.com/nexus-runtime
INSTALLER_AUTO_SETUP=true
```

Crea antes `nexus-runtime` con permisos de escritura para el usuario de la suscripción, **fuera de `httpdocs`**. La ruta absoluta indicada es una propuesta: verifica la ruta real y el usuario del dominio en tu servidor. No la confundas con el directorio público `public`. Esta carpeta contiene credenciales SQL y todos los medios/documentos gestionados por el CMS; protégela, respáldala y no la sobrescribas en despliegues.

Durante una primera instalación **NO definir `DATABASE_URL`**, ya que el asistente almacenará la conexión SQL en `.runtime/installation.json`. Si ya existe una `DATABASE_URL` válida o `installation.json`, el asistente se bloquea a propósito; **no borres estas configuraciones** sin confirmar qué datos hay.

**Seguridad imprescindible**: `INSTALLER_AUTO_SETUP=true` entrega una sesión temporal exclusiva al primer navegador. Restringe el acceso a `/instalar` y `/api/install/session` mediante lista de IP o control de acceso del proxy; sin ese bloqueo, otra persona podría reclamar la sesión y crear la cuenta administradora.

## 6. Ejecutar la instalación

Reinicia la aplicación Node.js después de compilar. Visita desde el navegador autorizado:

```
https://nexusrealestatenicaragua.com/instalar
```

Paso 1: motor MariaDB, host SQL correcto (generalmente `127.0.0.1`), puerto `3306`, nombre real de la BD Plesk, usuario y contraseña.

Paso 2: inmobiliaria **Nexus Real Estate Nicaragua**, correo institucional y administrador (contraseña de al menos 14 caracteres). El dominio detectado debe ser exactamente `nexusrealestatenicaragua.com`.

Al finalizar, el asistente crea tablas y registra institución/dominio/admin. El instalador solo acepta una **base completamente vacía**. Si detecta tablas o sesión ocupada, no borres contenido ni fuerces reintentos.

Cambia inmediatamente `INSTALLER_AUTO_SETUP=false` y reinicia desde Plesk. La conexión privada se conserva en `APP_CONFIG_DIR/installation.json`; respalda este directorio junto con la BD.

## 6.1 Comprobación de arranque y privacidad sin cambiar SQL

Una vez compilada la aplicación, en SSH, en la raíz del proyecto:

```sh
node scripts/check-plesk-ready.mjs
```

Desde la interfaz **Plesk → Node.js → Run Script**, que ya añade el prefijo `npm`, puedes escribir solamente `run check:plesk`.

Esta comprobación de solo lectura detecta si faltan `.next/BUILD_ID`, Node.js, el archivo `app.js`, los clientes Prisma, el CLI de instalación y si `APP_CONFIG_DIR` apunta accidentalmente a `public`. No imprime contraseñas, no conecta ni crea tablas.

También existen pruebas automatizadas en GitHub que ejecutan `app.js` como servidor Next.js real, comprueban SSR, `/_next/static/*.js`, CSS y la ruta `/api/health`. Superarlas **no reemplaza** verificar la configuración real de Plesk ni una base de datos independiente.

## Seguridad de dependencias

El despliegue original reportó vulnerabilidades en npm y no dispone todavía de un `package-lock.json` controlado. El CI revisa dependencias de ejecución y muestra vulnerabilidades sin modificarlas automáticamente. No aplicar `npm audit fix --force` en producción sin probar el impacto; antes de producción final deben revisarse y corregirse las alertas y conservar un lockfile reproducible.

## 7. Comprobar funcionamiento

- `https://nexusrealestatenicaragua.com/api/live`: la aplicación Next.js responde.
- `https://nexusrealestatenicaragua.com/api/health`: conecta con SQL; en la versión original comprueba solo `SELECT 1`. Con el PR #3 pendiente, valida además tablas.
- `https://nexusrealestatenicaragua.com/`: portada pública.
- `https://nexusrealestatenicaragua.com/admin/acceso`: inicio de sesión del administrador.
- Probar publicación de una propiedad, imágenes, búsqueda, WhatsApp, PDF y asesoría empresarial.

## Problemas comunes

- **Startup file does not exist**: selecciona `app.js` del repositorio en Application Root, o el archivo autogenerado y válido de Plesk 18.0.81+. No apuntes a un archivo inexistente.
- **502 / Passenger startup failed**: comprueba que la compilación `.next` existe, la versión Node coincide, `app.js` está en Application Root, el proceso Passenger usa `process.env.PORT` y `APP_CONFIG_DIR` es escribible. No fijes `PORT=3000`.
- **404 con el dibujo de Plesk, no de Next.js**: normalmente la solicitud no está llegando al proceso Node/Passenger o la ruta pública está mal configurada; revisa `Enable Node.js`, Document Root, startup file y logs antes de volver a instalar SQL.
- **P2021 Domain**: base de datos sin tablas; comprobar si es una instalación nueva o si se seleccionó por error una base distinta. No borrar la base anterior.
- **/instalar?estado=ocupado**: sesión ya reclamada, posiblemente en otro navegador. Usa el navegador que abrió el instalador y evita manipular archivos de bloqueo durante una instalación.
- **Client-side exception tras abrir la web**: revisar las URLs `/_next/static/` para detectar archivos JS cacheados/no encontrados; compilar y reiniciar una sola versión, comprobar consola Safari y los logs.
- **Prisma error de motor**: generar clientes y compilar en el mismo entorno Node/OS que ejecutará la app.
- **Variables anteriores de Dokploy**: eliminar referencias obsoletas a host SQL `db`, `APP_CONFIG_DIR=/app/.runtime` y `PORT=3000` **solo en una nueva instalación**, nunca borrando la configuración de producción sin revisión.

Los logs de Passenger en Plesk Linux (Node.js Toolkit moderno) se encuentran normalmente en `/var/log/passenger/passenger.log`. Consultar también los registros del dominio en Plesk.

## Después de cada actualización por Git

1. Validar rama y commit del sitio correcto; desde Plesk Git → **Pull Updates** → **Deploy from Repository** si el modo es manual.
2. En Plesk Node.js → Run Script (sin repetir el prefijo `npm`): `install --include=dev` y después `run build`. En SSH sí escribe `npm install --include=dev` y `npm run build` completos.
3. Reiniciar la aplicación desde la sección Node.js de Plesk.
4. Verificar web pública, /api/live, /api/health y administrador.
5. Nunca sobrescribir/borrar `APP_CONFIG_DIR` ni la BD en despliegues Git; respaldar siempre medios, documentos y SQL.
6. Verificar que `/api/live` devuelve `service: nexus` y `release: 2026-10-27-plesk-r1` tras desplegar esta versión. Si no coincide, se está sirviendo un proceso antiguo.
7. Si el panel solicita **Document Root** en modo clásico Linux, debe ser un subdirectorio de Application Root (por ejemplo `httpdocs/public`). En Plesk 18.0.81+ y modo Next.js server-side autoconfigurado puede no solicitar Document Root. Nunca publiques `node_modules`, `src`, `prisma` ni credenciales como recursos estáticos.

### Documentación oficial

- Plesk: https://support.plesk.com/hc/en-us/articles/12376965359511-Does-Plesk-support-Next-js-React-Angular-Vue-js-Vite-applications
- Plesk Node.js: https://docs.plesk.com/en-US/obsidian/administrator-guide/website-management/nodejs-support.76652/
- Next.js 15: https://nextjs.org/docs/15/app/getting-started/deploying
