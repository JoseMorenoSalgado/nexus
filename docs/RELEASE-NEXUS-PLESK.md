# Protocolo de liberación controlada — NEXUS Real Estate Nicaragua

**Estado:** preparado para ejecución por operador con acceso a Plesk; **no equivale a un despliegue realizado**.
**PR:** #19 — `feat/mejoras-nexus-20261030`.
**Restricción:** no ejecutar en producción hasta tener respaldo recuperable y staging validado.

## 1. Verificaciones en Plesk (solo lectura)

Registrar en una bitácora privada:
- Servidor/suscripción y dominio correctos, Application Root, Plesk Node.js Toolkit, Node >= 22, archivo Passenger.
- Commit desplegado y rama configurada en **Plesk → Git**. Comprobar si el despliegue es automático o manual **antes de fusionar a main**.
- Motor SQL real (MariaDB/MySQL o PostgreSQL), versión, nombre de base y si existe `_prisma_migrations`. No copiar contraseñas al ticket.
- `APP_CONFIG_DIR` absoluto, permanente, escribible y fuera del document root, con `installation.json` protegido. `INSTALLER_AUTO_SETUP=false`.
- Estado actual de `/api/live` y `/api/health`, login y logout sin modificar datos.

Comandos seguros en la **raíz real** del proyecto, usando la sesión privada del operador:

```bash
git rev-parse --abbrev-ref HEAD
git rev-parse HEAD
node --version
node scripts/check-plesk-ready.mjs
```

Este preflight no crea tablas ni cambia registros.

## 2. Condición obligatoria de respaldo

Usar **Plesk Backup Manager** o el procedimiento administrado existente para crear un punto de recuperación verificable que incluya:
- Base SQL **completa** de la instalación real (esquema y registros).
- `APP_CONFIG_DIR`, archivos `installation.json`, medios privados, imágenes y PDF.
- Versión desplegada del código, configuración Node/Passenger y variables privadas (sin subir secretos a Git).

**No basta** con que Plesk indique "backup completado": validar fecha, tamaño, legibilidad, consistencia y restauración de prueba en un destino aislado. Registrar el identificador del backup y resultado de la restauración. Mantener al menos una copia fuera del servidor cuando sea posible.

## 3. Staging obligatorio

Preparar una suscripción/dominio de staging **separados** con:
- Base de datos distinta de producción, y `APP_CONFIG_DIR` también distinto.
- Copia sanitizada de los datos necesarios (evitar mensajes comerciales, correos y notificaciones a clientes reales).
- Bloqueo de indexación y autenticación de acceso, sin reutilizar el dominio público de producción.
- Rama `feat/mejoras-nexus-20261030`, Node.js >=22, Passenger y directorio persistente.

Comprobar qué motor Prisma corresponde. **Advertencia importante:** el CLI de Prisma exige una `DATABASE_URL` definida en su entorno. Si la instalación de Plesk guarda la conexión únicamente en `APP_CONFIG_DIR/installation.json`, el CLI **no la lee automáticamente**. En ese caso el operador debe preparar una variable temporal segura para la base exclusiva de staging, verificar sin revelar credenciales el host y nombre de base, y solo entonces ejecutar el SQL. Nunca copiar la contraseña al repositorio, documentación ni logs. Si no puede verificarse la conexión real del CLI, detener la operación.

En staging, **después de backup, revisión del historial real y verificar `DATABASE_URL` temporal de staging**:

MySQL/MariaDB (instalación no administrada por Prisma Migrate):
```bash
npx prisma db execute --schema prisma/schema.prisma --file prisma/migrations/20261030050000_nexus_functional_enhancements/migration.sql
```

PostgreSQL (solo si staging usa este motor):
```bash
npx prisma db execute --schema prisma/schema.postgres.prisma --file prisma/migrations-postgres/20261030050000_nexus_functional_enhancements/migration.sql
```

**Una sola ejecución del archivo correspondiente**, nunca ambos. Los comandos dependen exclusivamente de la conexión que recibe el **CLI de Prisma** por su entorno. `installation.json` de la aplicación no sustituye esa variable. Confirmar el destino de staging antes de pulsar Enter. Si hay historial Prisma Migrate, reconciliarlo en lugar de aplicar manualmente y repetir. No ejecutar `prisma db push`, `migrate reset`, `migrate dev` ni volver a instalar sobre bases existentes.

Después:
```bash
npm install --include=dev --no-audit --no-fund
npm run db:generate
npx tsc --noEmit
npm run build
npm run check:plesk
```

Reiniciar **solo staging**. Verificar referencias antiguas sin cambio, conteo de inmuebles y prospectos, registros sin propiedad, permisos de agentes, PDF en 1 y 2 páginas, QR y fotos, canales CRM, login y logout, recuperación de contraseña, SMTP/reCAPTCHA y visuales de 375/768/1024/1440 px.

## 4. Puertas de liberación a producción

Solo promover si **todas** las casillas están completadas:

- [ ] Backup de producción generado y **restauración comprobada**.
- [ ] Staging aislado y su configuración privada verificada.
- [ ] Migración aplicada a staging sin registros perdidos.
- [ ] CI del último commit en verde para MySQL/MariaDB y PostgreSQL.
- [ ] Pruebas manuales con información y fotografías representativas, sin mensajes a clientes.
- [ ] Revisión humana del diff, permisos por rol y diseño NEXUS.
- [ ] Ventana de mantenimiento y procedimiento de rollback aprobados.
- [ ] Confirmado si `main` desencadena despliegue automático en Plesk.

Al integrar el PR, crear etiqueta del commit estable y mantener una copia del release anterior. Respaldar de nuevo inmediatamente antes de la migración de producción. Aplicar esquema primero en ventana controlada, después desplegar código compatible, compilar/reiniciar Passenger y ejecutar smoke tests desde cliente; comprobar registros y métricas.

**Rollback:** tener preparadas restauración SQL/medios/config y versión anterior del código. El rollback de **solo Git** no revierte el esquema; revisar compatibilidad antes de cambiar versión. Evitar revertir mediante DDL destructivo.

## 5. Evidencia de auditoría

Registrar: hashes de commits previo/nuevo, identificadores de backups, resultados de restauración, motor SQL, método de migración, conteos antes/después, comprobación de PDF y referencias antiguas, errores pendientes, pruebas reales, responsable del cambio y timestamp. No declarar un despliegue confirmado hasta ver la versión operativa en Plesk.

**Aviso de seguridad:** la prueba `scripts/check-nexus-additive-migration.mjs` recrea artificialmente una estructura anterior y usa DDL con borrado de objetos en una base efímera. **Se niega a ejecutarse fuera de GitHub Actions y de una base local `*_ci`**. Nunca debe invocarse en staging real ni en producción.
