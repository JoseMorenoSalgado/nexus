# Nexus — Control de avance y criterios de aceptación

> Registro de verificación para la migración a una instalación PostgreSQL independiente. No representa el porcentaje de código construido; mide exclusivamente criterios **demostrados**. Actualizar en cada PR con enlaces a pruebas, logs saneados o evidencias reproducibles.

## Regla de medición

- **Pendiente**: sin implementación verificada; **En código**: cambio escrito pero sin pruebas suficientes; **Probado**: pruebas automáticas/integración superadas; **Validado**: probado en instalación limpia y producción según corresponda.
- El porcentaje de **aceptación validada** suma únicamente los pesos de criterios con estado **Validado**. No se asignan puntos por commits, PR abiertos o despliegues verdes.
- Ningún cambio de esquema o datos se ejecuta automáticamente desde este documento.
- Si una prueba falla, se registra la evidencia y se reabre el criterio. La fecha y SHA de la prueba deben quedar anotados.
- Los criterios que requieren operaciones de escritura se prueban primero en una instalación nueva/de pruebas, nunca sobre datos de clientes sin autorización y respaldo.

## Matriz de aceptación

| ID | Criterio | Peso | Estado | Evidencia pendiente |
| --- | --- | ---: | --- | --- |
| NEX-01 | Instalador independiente crea esquema y datos iniciales sin Tenant/Domain | 15% | Probado con PostgreSQL 16 aislado | Repetir en Enhance con base desechable y el transporte real. |
| NEX-02 | API /api/health valida esquema independiente y SiteConfig | 10% | Probado con PostgreSQL 16 aislado | HTTP 200 tras instalar y 503 al faltar una tabla. Producción sigue en 503. |
| NEX-03 | Una sola configuración de modo independiente en rutas activas | 10% | Probado automáticamente y en ejecución local | Verificar la variable efectiva del proceso Node en Enhance. |
| NEX-04 | Cliente Prisma independiente compartido sin conexiones duplicadas | 5% | Implementado, compilado y ejercitado con PostgreSQL | Verificar conexiones del proceso de producción. El instalador usa clientes temporales para la URL candidata. |
| NEX-05 | Usuarios/agentes: crear, editar, listar, roles, login | 10% | Probado con PostgreSQL 16 aislado | Alta y acceso de agente, edición, revocación y permisos comprobados. Aceptación en Enhance pendiente. |
| NEX-06 | Prospectos: crear, editar, listar y asignar | 10% | Probado con PostgreSQL 16 aislado | Alta, edición de contacto, seguimiento, nota, asignación, historial y aislamiento por agente comprobados. |
| NEX-07 | Propiedades: crear, editar, imágenes, publicar y consultar | 15% | Probado con PostgreSQL 16 aislado | Referencias concurrentes, edición, subida, PDF, publicación, baja y retención del prospecto comprobadas. |
| NEX-08 | Home, catálogo, ficha y formularios públicos conectados a la BD | 10% | Probado por HTTP con PostgreSQL 16 aislado | Home, catálogo, ficha, contacto, logo y WhatsApp comprobados. Falta revisión visual y validación en Enhance. |
| NEX-09 | Rutas activas no requieren Tenant, Domain ni tenantId | 10% | Parcial, probado en flujos críticos | Verificación estática de 43 archivos y BD limpia sin Tenant/Domain. Quedan rutas legacy fuera del flujo validado. |
| NEX-10 | Compilación, controles de seguridad y despliegue final | 5% | Compilado y probado localmente | CI de la rama, comprobación visual en navegador y aceptación en Enhance pendientes. |
| **Total** | | **100%** | | |

**Aceptación validada en producción: 0/100 (0%).** Se mantiene la regla de sumar únicamente criterios validados. Los resultados locales se registran por separado en la matriz.

## Registro de cambios y bloqueos

| Fecha | Referencia | Cambio | Estado |
| --- | --- | --- | --- |
| 2026-11-08 (Managua) | PR #97, commit `64ec0be8` | Health standalone y cliente Prisma compartido | Tres workflows previos aprobados según el registro de #97. |
| 2026-11-08 (Managua) | PR #96–#99, rama `fix/standalone-production-integration` | Se reutilizó #96 para el CRM y se conservó la cadena #97 → #98 → #99. | Rama basada en el head de #99, con destino `main`. |
| 2026-11-08 (Managua) | Árbol probado en el commit local `e8f0b79` | Instalador y health, sesión única, permisos, catálogo, CRM y formularios | TypeScript, build, 31 pruebas y auditoría de dependencias de producción aprobados. |
| 2026-11-08 (Managua) | `scripts/check-standalone-acceptance.mjs` | Instalación HTTP real y recorrido con base vacía PostgreSQL 16.15 | Pasó. También pasaron el ciclo financiero, la comprobación del esquema y `npm run check:enhance`. |
| 2026-11-08 (Managua) | HTTPS de producción, solo lectura | Home, catálogo y acceso: HTTP 200 tras redirección. Contacto: HTTP 500. Health: HTTP 503 con `schema_incomplete`. | Incidente reproducido en el candidato por una consulta a `SitePage.tenantId` en secciones adicionales. El esquema de producción sigue pendiente de cotejo. |
| 2026-11-08 (Managua) | PR #100, primer head `49966d8` | [PostgreSQL](https://github.com/JoseMorenoSalgado/nexus/actions/runs/42560081020), [Enhance y socket real](https://github.com/JoseMorenoSalgado/nexus/actions/runs/42560081043), [regresión MariaDB](https://github.com/JoseMorenoSalgado/nexus/actions/runs/42560080970) | Tres workflows aprobados. La regresión local de autenticación y seguridad también pasó con PostgreSQL legacy. |
| 2026-11-08 (Managua) | PR #100, edición de contacto CRM | Se reutiliza validación de contacto en alta y edición. Un agente puede editar los datos de los prospectos asignados. | La suite aislada verifica la edición y persistencia. |
| 2026-11-08 (Managua) | Chromium local | Verificación visual en cuatro anchos | Bloqueada al iniciar el navegador por la restricción de sockets del ejecutor. |

## Causas y dependencias restantes

- La bandera anterior `NEXUS_STANDALONE_MODE` habilitaba rutas distintas a las del instalador. El acceso alternativo usaba otra cookie y el cierre principal consultaba el cliente legacy. Los enlaces alternativos usan ahora el mismo acceso y la misma sesión.
- El panel alternativo permitía acceso global a agentes y generaba referencias con otro formato. Los agentes usan el panel principal con asignaciones. Las referencias se reclaman por una transacción común y el borrado exige administrador y confirmación.
- `/contacto` cargaba secciones con la clave antigua de Prisma. El formulario público comparaba el origen con el Host interno. Los PDF tenían consultas legacy durante la lectura y carga. Se corrigieron los caminos reproducidos.
- Quedan esquemas/clientes legacy y consumidores como las rutas antiguas de CRM y páginas de edición CMS, la exportación de comisiones y reparaciones históricas de dominio. El valor interno `tenantId: "main"` todavía adapta llamadas compartidas. Las pruebas no avalan retirar esas superficies ni migrar datos históricos.

## Puerta de despliegue en Enhance

1. Confirmar el SHA activo, `NEXUS_STANDALONE=true`, `SITE_URL=https://nexusrealestatenicaragua.com` y el `APP_CONFIG_DIR` persistente. Si existe `installation.json`, su conexión prevalece sobre `DATABASE_URL`.
2. Usar la identidad PostgreSQL efectiva para identificar la base y comparar el esquema actual con `prisma/schema.standalone.postgres.prisma`. Con Prisma 6, `prisma migrate diff --from-schema-datasource prisma/schema.standalone.postgres.prisma --to-schema-datamodel prisma/schema.standalone.postgres.prisma --script` genera SQL para revisión si `DATABASE_URL` se carga de forma privada con la conexión efectiva. Revisar la salida antes de aplicar cualquier cambio. No ejecutar el instalador ni `db push` contra la base real con datos.
3. Validar CI y la rama en Enhance con una base aislada. Restringir el acceso externo al instalador durante el aprovisionamiento. Si la aplicación usa socket en producción, probar la autenticación y los permisos del usuario de Node mediante ese mismo socket.
4. Aplicar un plan de esquema revisado y respaldado si corresponde. Verificar `/api/health`, login, catálogo, ficha y contacto tras desplegar. Las escrituras de prueba se reservan a una base aislada.

### Formato de actualización obligatoria

Al cerrar un criterio registrar: ID, estado, SHA/PR, comando o prueba ejecutada, resultado, fecha, entorno (CI/pruebas/producción) y enlace a evidencia. Nunca guardar credenciales, DATABASE_URL, tokens o datos personales en este archivo.
