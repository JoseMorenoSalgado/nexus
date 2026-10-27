# Recuperación del error 500 de Next.js en instalaciones heredadas

## Contexto
Una instalación de WebAppECloud que conserva su base MariaDB inicial puede fallar después de añadir roles y CRM: Prisma genera código para `Property.assignedAgentId`, `Lead.assignedAgentId`, `LeadAssignmentHistory` y `AgendaEvent`, aunque estas estructuras **no aparecen automáticamente** por ejecutar `npm run build` o desplegar `main`.

La página pública ahora consulta únicamente los campos inmobiliarios heredados; las consultas web tienen una ruta de compatibilidad mientras se regulariza el esquema. El dashboard presenta un aviso en lugar de lanzar una excepción genérica cuando detecta estas estructuras pendientes.

## Procedimiento de recuperación en Dockploy
1. Verificar un respaldo independiente y recuperable de MariaDB/MySQL, incluidos usuarios, inmuebles, fotografías y prospectos. No recrear ni eliminar bases de datos.
2. Verificar que Dockploy use un despliegue exitoso del commit actual de la rama `main`. Los commits guardados en GitHub por sí solos no garantizan que el contenedor esté actualizado.
3. Acceder con la cuenta **Administrador** desde el dominio asignado y abrir **`/admin/sistema`** directamente si el inicio anterior fallaba. Para Nexus: `https://inmo.elearningcloud.org/admin/sistema`.
4. Leer el estado de las cuatro estructuras. Si alguna está pendiente, confirmar el respaldo y pulsar **Completar estructura**. La operación tiene origen protegido y solo añade columnas/tablas/índices/claves que falten; es reintentable tras fallos parciales y no elimina datos. Puede necesitar privilegios SQL de ALTER y CREATE.
5. Verificar la página pública, `/admin`, `/admin/clientes-agentes`, `/admin/leads` y `/admin/agenda`.

El botón no debe utilizarse sin respaldo. No ejecutar otra vez scripts SQL manuales cuando el diagnóstico indique que el esquema ya está completo. No usar `prisma migrate deploy` indiscriminadamente en una base antigua sin reconciliar su historial.

## Si el error continúa
Identificar la excepción **original** en **Dockploy → Aplicación → Logs**, usando como referencia la hora del fallo y el digest de Next.js. Buscar: `PrismaClientKnownRequestError`, `P2022` (columna inexistente), `P2021` (tabla inexistente), `P1001` (BD inaccesible), errores de credenciales o permisos del contenedor. El *digest* de Next.js por sí solo no indica qué consulta falló.

También verificar que la instancia use el almacenamiento persistente `APP_CONFIG_DIR` correcto: `installation.json` puede prevalecer sobre la variable `DATABASE_URL`. Cambiar solamente `DATABASE_URL` no necesariamente cambia la conexión si existe un archivo de instalación anterior.

La pantalla `/admin/sistema` diagnostica estructuras comerciales; no reemplaza los logs ni repara credenciales incorrectas, una base inaccesible o un dominio que no corresponda a la cuenta.

## Pruebas
El workflow `.github/workflows/verify.yml` incluye `scripts/check-legacy-db.mjs`. Exclusivamente en una base temporal cuyo host es `127.0.0.1` y nombre contiene `_ci`, elimina las columnas comerciales, comprueba que el inicio público y el formulario respondan, realiza el flujo de diagnóstico/actualización de la base y verifica la recuperación posterior.
