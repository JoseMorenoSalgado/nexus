# Biblioteca visual de plantillas

## Uso

Accede a **Panel → Personalizar sitio → Plantilla**. Selecciona una tarjeta para comparar las opciones Inmobiliaria, Educación y Servicios empresariales. Alterna entre Escritorio y Celular para revisar una **representación orientativa de la portada**, no una edición ni una captura exacta del sitio publicado.

La galería usa el nombre de la institución, el contenido previamente guardado de cada plantilla y, en la modalidad inmobiliaria, fotografías y títulos de hasta tres propiedades publicadas. Si faltan imágenes o inmuebles, muestra bloques ilustrativos.

La selección **no publica nada** y no hace ninguna petición de escritura al servidor. Cuando se elige una plantilla distinta de la actualmente publicada, aparece una confirmación con la opción «Confirmar y aplicar plantilla». Solo ese formulario envía POST a la ruta autenticada `/api/admin/site-template`, que conserva la comprobación de rol, origen y clave de plantilla.

El contenido de cada plantilla se conserva por empresa y por variante. El cambio afecta a las páginas públicas de la institución una vez confirmado; los datos no se eliminan. Las consultas a BD para construir la galería usan siempre el `tenantId` de la sesión autenticada.

## Implementación
- Componente cliente `src/components/template-gallery.tsx` para la selección local, representación responsive y confirmación
- Método de solo lectura `getTemplateLibrary` para obtener los contenidos de las tres variantes con **una consulta a SitePage**
- Página privada `/admin/personalizar/plantilla`, que proporciona la identidad y los registros publicados de la empresa
- Estilos de vista previa importados únicamente en esa ruta desde `preview.css`, sin ampliar el CSS global
- Tests de estructura y pruebas de integración para comprobar que abrir la galería no publica por accidente

## Limitaciones
La previsualización es una maqueta interactiva de la portada. No muestra todas las transiciones y páginas públicas; para eso será necesaria una futura ruta de previsualización autenticada y aislada de la publicación. La publicación no ejecuta migraciones de base de datos.

La funcionalidad requiere reconstruir la aplicación desde `main` en Dockploy; actualizar el repositorio no despliega automáticamente la imagen activa del VPS.
