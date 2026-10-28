# Instalación inicial de NEXUS en Dokploy (repositorio independiente)

Esta guía aplica **solo** a `JoseMorenoSalgado/nexus`, publicado en `nexusrealestatenicaragua.com`. No conecta ni altera `webappecloud` ni otros proyectos.

## 0. Seguridad y estado previo

1. Identifica en Dokploy el servicio que recibe el dominio y confirma su repositorio, rama, estrategia de construcción (**Dockerfile** o **Compose**) y puertos. Confirma que el dominio apunta a la aplicación NEXUS, no a la copia de origen.
2. Antes de instalar, verifica si el volumen de la aplicación contiene `/app/.runtime/installation.json` o si el SQL seleccionado tiene registros. Si existen, no es una instalación nueva: respalda y diagnostica primero. **Nunca borres bases, volúmenes ni `installation.json` para activar el asistente.**
3. Prepara una base SQL **nueva, vacía, exclusiva** de NEXUS, en MariaDB/MySQL o PostgreSQL, con su usuario y contraseña. El usuario debe tener los permisos necesarios para la creación inicial de tablas. No reutilices credenciales o bases de otras aplicaciones.
4. Asegura que existan copias de seguridad y un volumen persistente para imágenes, configuración y base de datos.

## 1. Si el servicio de la aplicación se creó como Dockerfile

En **Dokploy → NEXUS → Environment** configurar:

```env
NODE_ENV=production
PORT=3000
APP_CONFIG_DIR=/app/.runtime
SITE_PREVIEW_MODE=false
INSTALLER_AUTO_SETUP=true
```

**Sólo durante la instalación**: `INSTALLER_AUTO_SETUP=true`. Restringe temporalmente el acceso público a `/instalar` y `/api/install/session` por la configuración del proxy o lista de IP permitidas. El primer navegador que acceda obtiene una sesión de instalación exclusiva por 60 minutos; habilitarla en un sitio público sin restricciones permitiría que otro visitante se adelantara.

En una instalación inicial asistida **no definas `DATABASE_URL` en el contenedor de la aplicación** (el asistente guarda la conexión al finalizar). Esto **no significa borrar contraseñas o variables de MariaDB**. Si existe una conexión SQL previa o `installation.json`, averigua primero si son de una instalación existente.

En **Volumes** monta un volumen privado y persistente en `/app/.runtime`. La carpeta debe ser escribible por el usuario `node` (UID 1000 en la imagen). Crea asimismo volúmenes persistentes independientes para la base SQL.

En **Domains**, vincula `nexusrealestatenicaragua.com` al servicio de Next.js, puerto del contenedor **3000**, HTTPS activado. La base de datos debe ser accesible desde la aplicación por una red Docker privada, sin publicar 3306/5432 en Internet.

Compila y despliega el repositorio `JoseMorenoSalgado/nexus`, rama validada por CI, usando la imagen que incluye la corrección de redirecciones relativas. No dependas de la última ejecución de GitHub Actions para asumir que el contenedor ya está actualizado.

## 2. Si se utiliza Docker Compose

El archivo `docker-compose.yml` del repositorio incluye dos servicios `app` y `db`, MariaDB de ejemplo, red privada y volúmenes persistentes. La variable `INSTALLER_AUTO_SETUP` ahora se transmite al servicio `app` al definirla en las variables privadas de Dokploy. Es obligatorio configurar `MARIADB_PASSWORD` y `MARIADB_ROOT_PASSWORD` para la BD nueva.

- `INSTALLER_AUTO_SETUP=true` durante una instalación restringida; `false` después.
- `DATABASE_URL` **vacío** durante el asistente; no cambiar las claves SQL del servicio `db` a mitad de una instalación existente.
- En el asistente, el host SQL de Compose normalmente es `db`, el puerto `3306` y el nombre de base/usuario son los configurados realmente para `db`. El Compose actual trae por defecto `webappecloud` como nombre **interno histórico** del ejemplo: aunque el proyecto esté aislado, verifica cuidadosamente que no conecte a una BD de otro despliegue antes de usarlo.
- Configurar el host público en Domains para el servicio `app:3000` y HTTPS.

No añadas `ports: 3306:3306` y no intercambies los volúmenes SQL entre proyectos.

## 3. Instalar desde el navegador

Abre **`https://nexusrealestatenicaragua.com/instalar`** desde el navegador autorizado, sin usar la URL `0.0.0.0:3000`.

Introduce:

- Motor de base de datos: MariaDB/MySQL o PostgreSQL (según servicio desplegado).
- Host privado SQL y puerto, nombre de la base, usuario y contraseña de la base **vacía**.
- Institución: **Nexus Real Estate Nicaragua** (o su razón comercial definitiva).
- Correo institucional, nombre, correo y contraseña del administrador (al menos 14 caracteres).

Revisa que el dominio detectado en el formulario sea **`nexusrealestatenicaragua.com`**. El asistente valida que la base esté vacía, crea el esquema, registra `Tenant`, `Domain`, el administrador y las opciones inmobiliarias. Si el asistente advierte que hay tablas, **no las borres**; investiga cuál es la BD activa.

Si aparece `?estado=ocupado`, la sesión inicial ha sido reclamada. Usa el mismo navegador o comprueba si está en curso; no borres manualmente los archivos de sesión/bloqueo ni reinicies una instalación a medias.

## 4. Verificación y cierre

1. Comprobar `/api/live` (respuesta del servidor), `/api/health` (base y tablas), la portada `/`, y `/admin/acceso`.
2. Confirmar acceso del administrador, creación y publicación de una propiedad, medios WebP, PDF, WhatsApp, formulario y asesoría empresarial.
3. Definir **`INSTALLER_AUTO_SETUP=false`**, aplicar la configuración/recrear el contenedor cuando proceda y verificar que `/instalar` ya no admite una segunda instalación.
4. Respaldar **SQL + volumen `/app/.runtime`** y realizar una prueba de restauración en un entorno aislado.

## Incidentes frecuentes

- **`P2021: Domain`**: la conexión apunta a una base sin la tabla requerida; si es verdaderamente nueva/vacía, realizar la instalación inicial. Si contiene datos, no instalar ni sincronizar a ciegas.
- **`/instalar` redirige al panel**: existe `installation.json` o `DATABASE_URL` en la app. Verificar cuál y por qué; no forzar.
- **`0.0.0.0:3000` aparece en el navegador**: el proxy expuso un redirect absoluto. Usar la versión con redirecciones relativas y probar el encabezado `Location`.
- **Error de conexión**: verificar nombre del servicio SQL, red interna, usuario y permisos.
- **`?estado=almacenamiento`**: verificar el volumen y permisos de `/app/.runtime`.

**Este documento no inicia por sí mismo servicios ni realiza cambios en la base de producción.**
