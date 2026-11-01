# Instalación de Nexus en Enhance con variables privadas

## Preparación
1. Configura Node.js 22 o superior y conecta el repositorio `main` (después de fusionar este cambio).
2. El directorio de trabajo de la aplicación debe contener `package.json`. El directorio persistente predeterminado es `~/nexus-runtime`, **fuera** de `deploys/current`.
3. Crea una base de datos MariaDB/MySQL vacía desde Enhance. Si la cuenta normal no dispone de Bases de datos, el administrador debe habilitar el servicio y la cuota en el paquete correspondiente.
4. Desde la terminal de la aplicación ejecuta:

```bash
npm install --include=dev
npm run setup:enhance
npm run build
npm run check:enhance
```

`setup:enhance` crea `~/nexus-runtime/enhance.env` (0600), con el instalador **desactivado**. Si ya existe, no lo sobrescribe. No almacena credenciales SQL ni de administrador.

## Comando de inicio en Enhance

Configura el comando de arranque como:

```bash
npm run start:enhance
```

Este comando carga las variables desde `~/nexus-runtime/enhance.env` con Node.js, fuera del repositorio. El puerto se toma de `PORT` si Enhance lo proporciona, o 3000 en caso contrario. Activa el proxy HTTP al puerto de la aplicación.

**Importante:** las variables ya definidas en el entorno del proceso tienen precedencia sobre el archivo privado. Elimina cualquier `INSTALLER_AUTO_SETUP` anterior del comando de arranque o de la configuración del proceso.

## Primera instalación protegida

1. **Restringe el acceso HTTP** al sitio (por ejemplo, acceso mediante VPN o lista de IP en el proxy). No publiques `/instalar` con el asistente habilitado.
2. Ejecuta en la terminal:

```bash
NEXUS_INSTALLER_ACCESS_RESTRICTED=yes npm run installer:enable
```

La variable de confirmación evita una activación accidental, pero **no verifica** por sí sola el firewall/proxy.
3. Reinicia la aplicación desde Enhance, accede a `https://tudominio/instalar` desde la red autorizada y proporciona la conexión a la base de datos vacía y el administrador.
4. El instalador guarda `installation.json` (0600) en el directorio persistente, bloquea nuevas instalaciones y no necesita `DATABASE_URL` en Git.
5. Ejecuta `npm run installer:disable`, reinicia la aplicación y restaura el acceso público.
6. Prueba login, logout, CRM, propiedades, agentes, PDFs, SMTP, reCAPTCHA y acceso móvil.

## Recuperación y seguridad

- Haz respaldo cifrado y con acceso restringido de `~/nexus-runtime/installation.json`; contiene la URL de conexión SQL con credenciales.
- Nunca publiques, registres ni adjuntes `installation.json`, `enhance.env` o contraseñas.
- No coloques `APP_CONFIG_DIR` dentro del directorio del proyecto o `public`.
- Los cambios en `enhance.env` requieren reiniciar Node.js.
- La creación de la base de datos y sus permisos se realiza en Enhance; el instalador crea las tablas, no el servidor SQL.
