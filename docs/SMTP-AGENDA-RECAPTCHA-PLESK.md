# NEXUS — correo SMTP, enlace de reunión y reCAPTCHA en Plesk

## Despliegue seguro (no hay datos SMTP secretos en GitHub)

1. Haz y verifica un respaldo de MariaDB y del directorio privado `APP_CONFIG_DIR`.
2. Actualiza `main` desde Plesk Git, instala dependencias y ejecuta `run build`.
3. La agenda antigua detectará que falta `AgendaEvent.meetingUrl` y mostrará **Activar agenda comercial**. Solo un administrador puede pulsar ese botón: añade la columna nullable sin borrar reuniones ni alterar los demás campos. No ejecutes `prisma db push` ni `prisma migrate deploy` a ciegas sobre una base existente no conciliada.
4. Reinicia Node.js desde Plesk. Comprueba `run check:plesk` y prueba la agenda.

Alternativa para DBAs con historial Prisma conciliado: aplicar únicamente la migración SQL para el motor correspondiente, previa copia y verificación. **No apliques ambas vías sobre la misma base**.

## Reunión con enlace de videoconferencia

`Agenda → Programar nueva actividad → Reunión comercial` muestra **Enlace de videoconferencia (opcional)**.

- Admite Meet, Zoom, Teams y cualquier URL HTTPS bien formada de hasta 500 caracteres.
- La URL se guarda separadamente de Lugar, y aparece como enlace accesible en el listado.
- Se permite editar el enlace al reprogramar; borrarlo en el formulario lo quita.
- No se crea automáticamente una sala en ningún proveedor; pega una URL previamente generada.
- Los agentes solo ven actividades de su propia cartera; se mantiene el aislamiento por empresa y rol.

## SMTP transaccional: variables privadas de Node.js en Plesk

| Variable | Descripción |
|---|---|
| `SMTP_ENABLED` | `true` únicamente cuando todas las credenciales estén comprobadas |
| `SMTP_HOST` | Host SMTP facilitado por tu proveedor |
| `SMTP_PORT` | `465` (TLS directo) o `587` (STARTTLS obligatorio) |
| `SMTP_USER` | Usuario SMTP |
| `SMTP_PASSWORD` | Contraseña SMTP, nunca copiar en GitHub ni en capturas |
| `SMTP_FROM` | Dirección verificada de remitente, por ejemplo `avisos@tudominio.com` |
| `SMTP_NOTIFY_TO` | **Un único** correo interno autorizado para recibir avisos |

El botón **Enviar aviso por correo** aparece únicamente cuando SMTP está totalmente configurado. Está activado por defecto en el formulario, pero puede desmarcarse. Se envía un aviso al crear o reprogramar la cita. El SMTP puede aceptar el mensaje sin garantizar la entrega a la bandeja final. Los errores de transporte no deshacen una cita ya guardada.

No se envía correo al prospecto automáticamente. Esto evita difundir datos personales a direcciones sin confirmar y permite preparar un sistema posterior de invitaciones con consentimiento y confirmación explícita.

Si necesitas notificaciones programadas (recordatorios 24 horas antes o resúmenes diarios), hace falta un cron/cola con idempotencia y control de reintentos. Este primer incremento implementa avisos transaccionales al guardar/reprogramar.

## reCAPTCHA v2 (casilla de verificación) para el login

Crea **claves reCAPTCHA v2 Checkbox** en la consola de Google y registra el dominio exacto público. En **Plesk → Node.js → Environment** agrega:

| Variable | Uso |
|---|---|
| `RECAPTCHA_SITE_KEY` | Clave pública para la casilla en `/admin/acceso` |
| `RECAPTCHA_SECRET_KEY` | Clave privada utilizada exclusivamente en el servidor |
| `RECAPTCHA_REQUIRED` | `true` solamente después de instalar y comprobar ambas claves |

Antes de configurar las claves deja `RECAPTCHA_REQUIRED=false` (estado predeterminado). Una vez activado, si faltan las claves o Google SiteVerify no responde, el servidor **rechaza el inicio de sesión**. Para restaurar acceso si Google está indisponible, un operador autorizado puede cambiar la variable desde el servidor Plesk y reiniciar Node.js, sin editar la base de datos. No publiques `RECAPTCHA_SECRET_KEY`.

La respuesta se verifica en servidor, se compara el hostname firmado con el dominio de la solicitud y el token nunca se acepta solo por verse la casilla en pantalla.

## Comprobaciones

- Crear reunión sin enlace y con enlace HTTPS, y comprobar que ambos casos funcionan.
- Rechazar URLs `http:` y esquemas peligrosos.
- Verificar que los avisos se envían solo al destinatario interno autorizado y que un error SMTP no elimina el evento.
- Abrir `/admin/acceso`, comprobar la casilla con clave real, y verificar que sin resolverla no se puede entrar.
- Comprobar los registros de Node.js sin publicar credenciales.
