# Puertas de calidad UI/UX — WebAppECloud

## Antes de editar
- [ ] Confirmar rama, estado CI y archivos afectados.
- [ ] Identificar flujo real, usuarios y roles.
- [ ] Preservar marca y funcionalidad aprobadas.
- [ ] Determinar si pantalla es Operate (app) o Persuade (página pública).

## Código
- [ ] No crear dependencia para una transición CSS simple.
- [ ] No animar propiedades de layout repetidamente.
- [ ] No usar `transition: all` ni bloqueo de zoom.
- [ ] Etiquetas visibles y accesibles (incluidas validaciones).
- [ ] Foco, hover, active, disabled, loading, error y empty.
- [ ] Inputs táctiles de al menos 16px y botones de al menos 44px.
- [ ] Ramas de reduced-motion sin animaciones esenciales.
- [ ] Datos de organización y configuraciones verificadas del lado servidor.
- [ ] Ningún módulo futuro queda activado por el cliente ni por un endpoint.
- [ ] Al desactivar funciones, conservar datos y enlaces consistentes.

## Revisión visual
- [ ] 375 y 768 px (móvil/tablet).
- [ ] 1024 y 1440 px (escritorio).
- [ ] Contraste normal >=4.5:1, texto grande >=3:1.
- [ ] Texto largo, nombres extensos, cero resultados, errores.
- [ ] Dispositivos touch y teclado, incluido foco dentro de menús.
- [ ] Verificar en navegador real; emulación no garantiza UX de Android/iOS.
- [ ] Sin capturas, nunca afirmar aprobación visual.

## Pruebas / despliegue
- [ ] TypeScript y compilación Next.js.
- [ ] Pruebas de rutas por tenant/roles/módulos.
- [ ] MariaDB/MySQL y PostgreSQL.
- [ ] Docker/Dockploy si cambia la distribución.
- [ ] PR revisada antes de fusionar; no desplegar ramas de prueba.
