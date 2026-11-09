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
| NEX-01 | Instalador independiente crea esquema y datos iniciales sin Tenant/Domain | 15% | Pendiente de validar | Instalación nueva reproducible y prueba de login |
| NEX-02 | API /api/health valida esquema independiente y SiteConfig | 10% | Probado en CI (PR #97) | HTTP 200 en instalación real y prueba de esquema incompleto |
| NEX-03 | Una sola configuración de modo independiente en rutas activas | 10% | Pendiente | Auditoría de rutas + pruebas de acceso |
| NEX-04 | Cliente Prisma independiente compartido sin conexiones duplicadas | 5% | Probado en CI (PR #97) | Prueba de integración de conexiones |
| NEX-05 | Usuarios/agentes: crear, editar, listar, roles, login | 10% | Pendiente | Pruebas CRUD y autorización |
| NEX-06 | Prospectos: crear, editar, listar y asignar | 10% | Pendiente | Pruebas CRUD y autorización |
| NEX-07 | Propiedades: crear, editar, imágenes, publicar y consultar | 15% | Pendiente | Pruebas CRUD y publicación |
| NEX-08 | Home, catálogo, ficha y formularios públicos conectados a la BD | 10% | Pendiente | Pruebas HTTP, navegación y formulario |
| NEX-09 | Rutas activas no requieren Tenant, Domain ni tenantId | 10% | Pendiente | Auditoría estática y pruebas de regresión |
| NEX-10 | Compilación, controles de seguridad y despliegue final | 5% | Pendiente | CI, pruebas de permisos y verificación Enhance |
| **Total** | | **100%** | | |

**Aceptación validada: 0/100 (0%) — línea base provisional por falta de evidencias de aceptación, no estimación del porcentaje de software desarrollado.**

**Implementación registrada: 2/10 criterios con cambios de código (NEX-02 y NEX-04); los tres workflows de CI aprobaron, pero falta validación en instalación real.**

## Registro de cambios y bloqueos

| Fecha | Referencia | Cambio | Estado |
| --- | --- | --- | --- |
| 2026-11-09 | PR #97, commit 64ec0be8 | Health standalone + cliente Prisma compartido | Tres workflows CI aprobados; validación en instalación real pendiente |

### Próximos pasos ordenados
1. Revisar CI y compilar PR #97; comprobar health en una instalación independiente y caso negativo.
2. Auditar banderas NEXUS_STANDALONE y NEXUS_STANDALONE_MODE sin cambiar rutas a ciegas.
3. Reproducir y corregir errores de usuarios, prospectos y propiedades en una BD de pruebas.
4. Validar páginas públicas, permisos y publicación.
5. Ejecutar instalación limpia y regresión integral antes de fusionar a main.

### Formato de actualización obligatoria

Al cerrar un criterio registrar: ID, estado, SHA/PR, comando o prueba ejecutada, resultado, fecha, entorno (CI/pruebas/producción) y enlace a evidencia. Nunca guardar credenciales, DATABASE_URL, tokens o datos personales en este archivo.
