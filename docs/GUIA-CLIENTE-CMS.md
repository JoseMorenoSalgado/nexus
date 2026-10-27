# Guía breve para administrar su sitio web

Esta guía corresponde a las funciones actualmente implementadas en WebAppECloud.

## Primeros pasos

Ingrese a su panel con la cuenta que le entregaron y abra **Mi sitio web**.
Allí encontrará los accesos para preparar su sitio.

1. **Identidad visual:** cargue el logo, imagen principal y sus datos de contacto.
2. **Páginas:** edite Inicio, Nosotros, Servicios, Contacto o cree páginas adicionales.
3. **Menú principal:** decida cuáles de las páginas publicadas aparecerán arriba en el sitio.
4. **Plantilla:** revise el diseño correspondiente a su empresa antes de cambiarlo.

> Cambiar la plantilla no borra el contenido de otras plantillas. Los datos del
> sitio siempre pertenecen a su empresa.

## Crear una página

Abra **Mi sitio web → Páginas → Nueva página**. Escriba un título breve,
una descripción y el contenido. La dirección de la página se crea a partir
del título y puede corregirse antes de guardar.

- **Borrador:** solamente su equipo puede editarla; los visitantes no pueden abrirla.
- **Publicada:** los visitantes pueden abrirla por su enlace.
- **En el menú:** aparecerá en la navegación superior del sitio.

Publicar y colocar en el menú son operaciones distintas. Para mostrarla en
la navegación use **Mi sitio web → Menú principal** después de publicarla.

## Modificar una página

Abra **Páginas**, localice el título y seleccione **Editar**. Los cambios de
una página no deben sustituir el contenido de otras. El botón **Guardar**
aplica los ajustes.

Si está editando textos y sale sin guardar, el editor le advierte. No olvide
revisar la vista previa orientativa; la vista previa por sí sola no publica.

## Cambiar una página a borrador

En la lista **Páginas**, elija **Pasar a borrador** y confirme. Esta operación
oculta la página para visitantes, aunque ellos conozcan su enlace. No elimina
el contenido; se puede publicar de nuevo.

## Configuración por tipo de negocio

WebAppECloud permite escoger Inmobiliaria, Educación, Servicios y Comercio
electrónico. En los sectores institucionales el contenido incluido en la
plantilla se administra desde **Plantilla**; las páginas adicionales disponen
de su editor independiente.

En **Aplicaciones y módulos**, los administradores pueden activar las
herramientas disponibles. Las funciones etiquetadas **Próximamente** no
se pueden activar todavía.

Las integraciones Moodle, facturación y tienda transaccional están previstas,
pero no son funcionalidades operativas de esta etapa.

## Si algo no aparece

- Verifique que tiene permisos de administrador o editor.
- Confirme que la página está publicada si pretende mostrarla en el sitio.
- Compruebe el **Menú principal** si la página existe, pero no aparece arriba.
- Si una herramienta está desactivada, consulte al administrador de su empresa
  en **Aplicaciones y módulos**.
- Si no se guardan los cambios, revise las validaciones de campos y vuelva a intentarlo.


## Editor visual de páginas personalizadas

Las páginas nuevas y adicionales cuentan con un editor de bloques:
- **Encabezado:** título de una sección.
- **Texto:** explicación, instrucciones o contenido institucional.
- **Imagen:** fotografía convertida automáticamente a WebP, con descripción accesible y pie opcional.

Use las flechas para cambiar el orden de las secciones. El botón de quitar
retira la sección de la página, sin eliminar toda la página. La vista previa
se actualiza antes de guardar, pero sigue siendo orientativa: revise el
sitio real después de publicar.

Si es una página recién creada, **guárdela primero como borrador**. Después
ábrala en Editar y podrá subir imágenes JPG, PNG o WebP de hasta 8 MB.
Cada fotografía debe llevar una descripción breve para lectores de pantalla.

Al quitar una imagen de una página no se borra inmediatamente su archivo,
para evitar que desaparezca accidentalmente de la versión aún publicada.
Las imágenes almacenadas tienen un límite preventivo de 50 por página;
la depuración de archivos sobrantes se realiza desde **Mi sitio web → Imágenes** con la protección de la papelera.

Los textos que existían antes de esta actualización se mantienen en el campo
Contenido principal. No es necesario copiarlos ni recrear la página.
Las nuevas secciones se agregan debajo de ese texto.


## Portada y páginas predeterminadas: secciones visuales

En **Mi sitio web → Páginas**, abra Inicio, Nosotros, Servicios, Contacto o
Propiedades. La sección **Contenido de la página** conserva los textos y el
diseño original. Más abajo encontrará **Secciones adicionales**, con el mismo
editor de encabezados, textos y fotografías de las páginas personalizadas.

Los contenidos adicionales se guardan por separado. Por ejemplo, cambiar
un título del banner y editar una nueva fotografía requiere guardar ambos
formularios. Ninguna de estas acciones altera las fichas inmobiliarias.

En Educación, Servicios y Comercio electrónico, la opción **Editar textos
de plantilla** administra los títulos y bloques originales. **Secciones
adicionales** permite agregar contenido nuevo sin alterar esas plantillas.

## Biblioteca de imágenes

Abra **Mi sitio web → Imágenes** para consultar la biblioteca de su organización.
Desde un bloque de imagen elija **Usar imagen existente**. La biblioteca
muestra imágenes almacenadas en páginas de la misma organización, incluso
si esas páginas están en borrador. Puede elegir cualquiera de ellas; el CMS
crea una copia para la página actual para que el contenido no dependa de otro
archivo o enlace.

Si una imagen ya no se utiliza, quitarla de una sección no elimina
automáticamente el fichero. La biblioteca muestra cuatro estados:

- **En uso:** referenciada por una página guardada o un borrador. No se puede archivar.
- **Reciente:** subida hace menos de 24 horas. Se protege para no perder ediciones sin guardar.
- **Sin usar:** no tiene referencias guardadas y superó la protección de 24 horas. Puede archivarse.
- **Papelera:** archivo apartado temporalmente, recuperable por el administrador.

Solamente los **administradores** pueden mover imágenes sin usar a la papelera,
restaurarlas o eliminarlas definitivamente. Los editores pueden consultar la
biblioteca, pero no borrar archivos.

Para una limpieza segura seleccione **Sin usar → Mover a papelera** y confirme
la operación. La imagen permanece en la papelera al menos siete días y puede
**Restaurarse** durante ese período. A partir del séptimo día, un administrador
puede decidir **Eliminar definitivamente**; debe escribir la palabra
`ELIMINAR` para autorizar la acción. El CMS vuelve a comprobar las
referencias antes de realizarla.

El sistema **no elimina ni vacía la papelera automáticamente**. Esta protección
conserva imágenes publicadas y datos de otros clientes. Se muestran hasta
120 imágenes activas y 60 archivadas por consulta.

## Alcance del editor

Este editor añade contenido en una zona adicional de cada página. No
convierte los diseños especiales existentes en una cuadrícula totalmente
arrastrable ni sustituye la estructura de la plantilla; ese constructor
visual profundo será una evolución independiente.
