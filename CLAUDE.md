Fulgor Burger --- Instrucciones del proyecto para Claude Code
1. Misión
Construye y entrega un sistema web completo, funcional, seguro y listo
para desplegar para Fulgor Burger, un restaurante que vende
hamburguesas por cupos limitados y trabaja principalmente con pedidos
programados para días de entrega.

El cliente entra a una página pública, ve la hamburguesa disponible como
protagonista, elige un día/turno de entrega disponible y agenda su
pedido sin crear cuenta ni iniciar sesión. Por ahora existe una sola
hamburguesa, pero el sistema debe permitir que el administrador agregue
más productos y fechas desde un panel privado.

No te limites a diseñar una maqueta. Inspecciona el repositorio,
toma decisiones razonables, implementa el flujo completo, ejecuta
pruebas, corrige errores y deja instrucciones claras para ejecutar y
desplegar.
2. Uso obligatorio de skills y capacidades de diseño
Antes de implementar: 1. Inspecciona las skills disponibles en el
entorno y lee las instrucciones de las skills pertinentes. 2. Usa todas
las skills instaladas que sean realmente relevantes para este proyecto,
especialmente las relacionadas con: - UI/UX, diseño de interfaces y
sistemas de diseño. - Diseño visual distintivo, dirección de arte y
criterio de producto. - Animación, microinteracciones, transiciones y
motion design. - Accesibilidad, responsive design y calidad de
frontend. - Arquitectura, planificación, revisión de código, pruebas y
seguridad. - Emil Kowalski, Graphify, UI UX Pro Max,
Impeccable y Taste, si están instaladas en el entorno. 3. No
asumas que una skill existe si no aparece instalada. Busca su nombre y
lee su archivo de instrucciones antes de usarla. 4. Si hay skills
duplicadas o incompatibles, prioriza las instrucciones específicas del
proyecto, seguridad, accesibilidad y consistencia. 5. No conviertas el
resultado en una plantilla genérica de restaurante. Aplica criterio
visual, jerarquía clara y detalles deliberados.
3. Forma de trabajar
- Empieza inspeccionando los archivos existentes, package manager,
  framework, scripts, skills y configuración. Conserva lo que
  funcione.
- Si el repositorio está vacío, elige una arquitectura moderna,
  mantenible y apropiada para producción, compatible con el entorno
  disponible.
- No te detengas a pedirme confirmación por decisiones técnicas
  ordinarias. Documenta las decisiones asumidas.
- No digas que algo está terminado si no lo implementaste y
  verificaste.
- No dejes botones decorativos, enlaces rotos, datos falsos
  presentados como reales, funciones vacías, TODO críticos ni
  pantallas que no hagan nada.
- Si falta una credencial o servicio externo, implementa la
  integración de forma segura con variables de entorno, explica qué
  falta y deja un modo local de desarrollo funcional.
- Antes de terminar, ejecuta lint, pruebas, chequeo de tipos y build
  cuando el proyecto lo permita. Corrige todos los errores
  encontrados.
4. Experiencia pública de compra
La página pública debe funcionar sin registro, contraseña ni inicio de
sesión del cliente.
Página principal
- La hamburguesa actualmente disponible debe ser la protagonista
  visual inmediata al entrar.
- Usa fotografía realista y apetitosa si existe un recurso
  proporcionado. Si no hay fotografía ni logo, prepara recursos
  provisionales elegantes y claramente reemplazables; no inventes que
  son fotografías reales del producto. Facilita reemplazar la imagen y
  el logo desde la configuración administrativa.
- Muestra nombre, descripción, precio, imágenes, disponibilidad y un
  CTA claro para agendar.
- El diseño debe comunicar una marca memorable, apetecible,
  contemporánea y cuidada.
- La paleta debe derivarse del logo real de Fulgor Burger cuando esté
  disponible. No inventes colores de marca como definitivos si no has
  visto el logo. Centraliza colores y tipografía en tokens fáciles de
  cambiar.
- Diseña para escritorio, tablet y teléfono; prioriza la experiencia
  móvil.
- Incluye estados claros de carga, error, sin disponibilidad, éxito y
  cupos agotados.
Flujo de pedido
1. El cliente elige producto y cantidad, dentro de los límites de
   inventario disponibles.
2. Selecciona una fecha/turno de entrega entre las opciones publicadas
   y disponibles. No muestres fechas pasadas, cerradas ni agotadas como
   seleccionables.
3. El formulario solicita únicamente:
   - Nombre.
   - Número de teléfono con WhatsApp.
   - Día/turno de entrega.
   - Producto y cantidad.
   - Solo los datos operativos adicionales estrictamente necesarios,
     si el negocio los requiere. No añadas cuenta, contraseña, correo
     ni campos innecesarios.
4. Muestra resumen con productos, cantidades, precio total y
   fecha/turno elegidos antes de confirmar.
5. Al confirmar, el servidor valida nuevamente disponibilidad, precios,
   fechas, cantidades y datos. La confirmación debe ser clara y mostrar
   un identificador de pedido.
6. Evita doble envío accidental, pero no bloquees pedidos legítimos de
   personas distintas que compartan dispositivo.
7. Si la reserva no se puede confirmar porque otro cliente agotó el
   cupo justo antes, explica el problema y permite elegir otra
   fecha/turno.
No inventes un método de pago. Si el negocio aún no ha definido pagos,
deja el pedido como agendado/pendiente según una configuración explícita
y no solicites datos de tarjetas.
5. Inventario y cupos: requisito crítico
La capacidad inicial debe ser configurable y empezar en 20
hamburguesas por domingo, pero no debe quedar codificada de forma
rígida.
- Cada fecha o turno de entrega tiene su propio cupo máximo,
  configurable por el administrador.
- La disponibilidad se calcula desde el servidor y la base de datos:
  disponibles = capacidad - unidades reservadas válidamente.
- Al crear un pedido, actualiza inventario de forma
  atómica/transaccional. Dos personas intentando reservar el último
  cupo al mismo tiempo no pueden provocar sobreventa.
- Valida todo en el backend; nunca confíes en el contador, el precio o
  la cantidad que envía el navegador.
- La interfaz debe actualizar la disponibilidad en tiempo real o casi
  real entre clientes. Usa las capacidades del stack elegido (por
  ejemplo, suscripciones/realtime o polling corto y razonable) y
  vuelve a consultar al iniciar el checkout y antes de confirmar.
- Indica cupos restantes de manera honesta y actualizada. No uses
  contadores falsos ni urgencia inventada.
- Define estados de pedido claros, por ejemplo: confirmed,
  cancelled, fulfilled. Solo los estados que consumen cupo deben
  contarse en el inventario.
- Si se cancela un pedido, libera el cupo según las reglas del
  negocio.
- Registra fechas y horas en un formato coherente; usa la zona horaria
  America/Bogota para la operación del restaurante.
- Si hay varias unidades por pedido, descuenta la cantidad exacta, no
  solo un pedido.
- Evita que una actualización concurrente, reintento de red o doble
  clic descuente el inventario dos veces. Usa transacciones,
  restricciones e idempotencia cuando corresponda.
6. Calendario y reinicio semanal
El sistema debe administrar fechas reales de entrega, no depender de un
simple contador que se reinicia en el navegador.
- Inicialmente, publica el domingo próximo o el domingo que
  corresponda según la configuración, con capacidad de 20 unidades.
- Al pasar el domingo, las fechas anteriores dejan de aceptar pedidos
  automáticamente según su hora de cierre configurada.
- Desde el lunes, debe poder agendarse la siguiente fecha de entrega
  si está publicada y abierta.
- La siguiente semana debe tener un cupo nuevo independiente; los
  pedidos de semanas anteriores no deben reducir el inventario futuro.
- No borres el historial ni reinicies los pedidos. Conserva el
  registro para administración y estadísticas.
- Implementa una regla de recurrencia semanal configurable para crear
  o publicar las fechas futuras, o un mecanismo equivalente fiable. No
  dependas de que un administrador abra la web para que ocurra el
  cambio.
- El administrador debe poder cambiar días, horarios de cierre, fechas
  extraordinarias, pausas y capacidad por fecha.
- Si no hay fechas publicadas, muestra un estado amable y no permitas
  reservar.
- Deja claro si el cupo se cierra a una hora concreta. Configura un
  valor predeterminado sensato y documentado, modificable desde el
  panel.
7. Panel de administración y roles
Crea un panel privado separado de la página pública. Como mínimo debe
existir un rol administrador protegido con autenticación real. No
protejas el panel solo ocultando una ruta o usando una variable en el
frontend.

El administrador puede: - Iniciar y cerrar sesión de forma segura. - Ver
un dashboard con pedidos recientes, próximos días de entrega, unidades
reservadas, cupos restantes y totales. - Crear, editar, activar,
desactivar y ordenar productos. - Gestionar nombre, descripción, precio,
fotos, disponibilidad y demás campos necesarios. - Configurar la
capacidad por fecha/turno y los días de entrega. - Publicar fechas
especiales, cerrar una fecha, pausar pedidos o reabrirlos. - Ver pedidos
y buscar/filtrar por fecha, estado, teléfono o nombre. - Consultar el
detalle de cada pedido. - Cambiar estados con confirmación cuando
corresponda y liberar cupos de manera consistente al cancelar. -
Exportar pedidos a CSV si es viable. - Editar datos de marca básicos
(logo, imágenes, nombre, contacto y textos). - Configurar las reglas de
cierre y recurrencia semanal.

No crees roles adicionales si no aportan valor ahora; deja una
estructura ampliable por si luego se necesita un empleado con permisos
limitados. Nunca pongas credenciales de administrador en el código ni en
el repositorio. Incluye un procedimiento seguro para crear el primer
administrador mediante variables de entorno, comando de seed protegido o
flujo de configuración documentado.
8. Datos y arquitectura
Usa persistencia real para pedidos, productos, fechas de entrega,
inventario, usuarios administrativos y configuración. No uses
localStorage como base de datos principal ni simules que los pedidos
se guardan en el servidor.
- Define un esquema de base de datos con relaciones, validaciones e
  índices adecuados.
- Usa migraciones versionadas y un seed de desarrollo no destructivo.
- Guarda precios como enteros en la unidad monetaria menor o usa un
  tipo decimal exacto; evita errores de punto flotante.
- Para Colombia, muestra precios en COP con formato local (es-CO).
- Guarda el número de teléfono normalizado y valida de forma razonable
  números colombianos, sin impedir injustificadamente otros prefijos
  si el negocio los necesita.
- No almacenes datos sensibles innecesarios.
- Separa componentes de interfaz, reglas de negocio, acceso a datos y
  validaciones.
- Usa variables de entorno para secretos y credenciales. Incluye
  .env.example sin secretos.
- Si el proyecto ya tiene un stack, respétalo salvo que exista una
  razón técnica clara para cambiarlo.
- Si necesitas seleccionar un backend nuevo, elige una opción fiable y
  mantenible compatible con el entorno y documenta cómo crear las
  tablas, configurar variables y desplegar.
9. Seguridad y privacidad
- El cliente no necesita cuenta. No expongas información personal de
  pedidos a otros clientes.
- Solo administradores autenticados pueden consultar o modificar
  pedidos, productos privados y configuración.
- Aplica autorización en el servidor, validación de entradas,
  consultas parametrizadas/ORM seguro y manejo cuidadoso de errores.
- Implementa protección razonable contra spam y abuso: límites de
  frecuencia en creación de pedidos, validación de campos, límite
  máximo de unidades por pedido configurable y controles contra envíos
  automatizados cuando sea apropiado.
- No expongas secretos ni detalles internos en respuestas de error.
- No publiques teléfonos, nombres ni identificadores que permitan
  enumerar pedidos.
- Configura políticas de acceso a la base de datos/filas si la
  tecnología las ofrece.
- Añade aviso de privacidad claro, breve y visible: los datos se usan
  para gestionar el pedido y contactar al cliente por WhatsApp. No
  afirmes cumplimiento legal absoluto sin revisar la configuración y
  el contexto.
- Añade enlaces o texto de contacto del negocio configurables.
- Nunca envíes mensajes de WhatsApp automáticamente salvo que exista
  una integración autorizada y configurada. Como mínimo, puedes
  ofrecer un enlace wa.me generado a partir del número del negocio y
  un texto prellenado no sensible, si se conoce el número oficial.
10. Dirección visual y animación
El resultado debe tener identidad visual, alta calidad de ejecución y
una jerarquía evidente.
- Usa las skills de diseño instaladas para establecer dirección de
  arte, tokens, tipografía, escala, espaciado, color, bordes, sombras
  y estados.
- La hamburguesa es el foco visual; evita llenar la página con
  tarjetas genéricas, gradientes gratuitos, adornos sin propósito o
  múltiples CTAs competidores.
- Añade microinteracciones útiles: hover/focus, feedback de cantidad,
  cambios de estado, transición del formulario, confirmación y
  actualización de cupos.
- Usa animaciones con intención y buen rendimiento. Respeta
  prefers-reduced-motion, evita animaciones que retrasen una compra
  y no sacrifiques legibilidad.
- Usa imágenes optimizadas, carga diferida donde corresponda y evita
  saltos de diseño.
- Mantén contraste adecuado, foco visible, navegación por teclado,
  etiquetas reales de formularios, mensajes de error asociados y
  objetivos táctiles cómodos.
- No uses emojis como sustituto de iconografía profesional.
- El diseño debe ser coherente en móvil y escritorio, incluidos
  checkout, panel administrativo, tablas, modales y estados vacíos.
- No afirmes haber usado una skill si no la inspeccionaste ni
  aplicaste sus recomendaciones.
11. Accesibilidad, SEO y calidad
- HTML semántico, estructura de encabezados lógica y formularios
  accesibles.
- Accesibilidad razonable conforme a WCAG 2.2 AA donde sea viable.
- Metadatos SEO, título y descripción de Fulgor Burger, favicon y
  vista previa social.
- Optimiza imágenes, carga y renderizado; evita dependencias
  innecesarias.
- Muestra moneda, fechas, horarios, errores y confirmaciones de manera
  consistente.
- Evita contenido de muestra visible en producción.
- Incluye páginas/estados para política de privacidad y contacto, con
  contenido configurable.
12. Pruebas obligatorias
Escribe y ejecuta pruebas para los casos críticos, al menos: 1. Reserva
válida que descuenta la cantidad correcta. 2. Dos solicitudes
simultáneas compitiendo por el último cupo: solo una puede completarse.
3. No se permite exceder la capacidad. 4. Fecha pasada, cerrada o
agotada no acepta pedidos. 5. Cancelar un pedido libera el cupo una sola
vez. 6. Reintento idempotente no duplica el pedido ni el descuento. 7.
El precio se calcula en servidor. 8. Un cliente no puede leer pedidos
ajenos ni acceder al panel administrativo. 9. El administrador puede
crear productos y fechas, y ajustar capacidades. 10. Cambio semanal de
fecha sin pérdida del historial. 11. Validación de nombre y teléfono.
12. Responsive básico en anchuras móviles y escritorio.
13. Entregables al finalizar
- Aplicación funcional, no solo prototipo.
- Código limpio y organizado.
- Migraciones/esquema y seed.
- .env.example.
- README en español con instalación, ejecución local, base de datos,
  creación segura del administrador, pruebas, despliegue y resolución
  de problemas.
- Resumen de decisiones técnicas y skills utilizadas.
- Lista explícita de variables/servicios externos que aún requieran
  configuración.
- Resultados reales de lint, pruebas, chequeo de tipos y build; indica
  cualquier prueba que no se haya podido ejecutar y por qué.
14. Criterio de aceptación
El proyecto solo está listo cuando una persona puede abrir la página
pública desde un teléfono, ver la hamburguesa protagonista, escoger una
fecha abierta, ingresar nombre y WhatsApp, confirmar un pedido, recibir
una confirmación y ver cómo disminuye el cupo compartido; y cuando el
administrador puede entrar de forma segura, gestionar
productos/fechas/capacidades y consultar pedidos. Todo debe persistir en
una base de datos real y no debe haber sobreventa por concurrencia.

Primero inspecciona el entorno y las skills. Después planifica
brevemente y ejecuta la implementación completa de principio a fin,
verificando cada parte.