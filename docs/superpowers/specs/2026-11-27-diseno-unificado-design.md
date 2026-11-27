# Diseño unificado

**Intención:** que todo parezca una sola web, no el tema antiguo con barras nuevas encima.

**Objetivos**
- La misma barra superior en todas las pantallas: logo, menú, buscar, cerrar sesión.
- Lecciones y ejercicios con los colores, letras, tarjetas y tablas de los listados.
- Sin la columna "Niveles"; contenido centrado.
- La misma barra inferior (Anterior / Siguiente) en lecciones y visor.
- "Cerrar sesión" visible y con texto, discreto; rojo solo al pasar el cursor o enfocar.
- Fuentes guardadas en el proyecto para que carguen en todas las páginas.

**No objetivos:** cambiar el texto de las lecciones, el interior de los PDF o el comportamiento (sesión, navegación, impresión).

**Restricciones:** no editar las 230 páginas una a una; su CSP solo permite estilos, scripts y fuentes propios.

**Enfoques**
1. Hoja de estilo común aplicada desde `lesson-nav.js` (elegido): un solo sitio que mantener.
2. Retocar solo la barra: el contenido seguiría pareciendo antiguo.
3. Reescribir el HTML de cada página: arriesga el material.

**Queda a criterio de quien lo construye:** nombres de archivos y detalles de espaciado dentro del sistema de `site.css`.
