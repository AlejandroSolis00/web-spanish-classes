# Diseño unificado Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Que lecciones, ejercicios y visor se vean como el resto del sitio.

**Architecture:** `paginas.py` sigue siendo la única fuente de la barra superior y la exporta además como `header.js`. Los estilos de las barras pasan a `chrome.css`, compartido por todas las pantallas; `leccion.css` viste el contenido antiguo. `lesson-nav.js` los inyecta, sin editar las 230 páginas.

**Tech Stack:** HTML/CSS/JS sin dependencias, Python 3, Chrome headless con Node 24 para comprobar.

**Spec:** `docs/superpowers/specs/2026-11-27-diseno-unificado-design.md`

## Global Constraints

- No editar `Lessons/**` ni `Exercises/**`; su CSP: solo estilos, scripts y fuentes propios (sin red, sin Google Fonts).
- No cambiar el texto de las lecciones, los PDF, ni el comportamiento (sesión, anterior/siguiente, impresión).
- Reglas para el contenido antiguo siempre bajo `body.sc-doc`; no cargar `site.css` en lecciones.
- Colores y letras: los tokens `:root` de `site.css` (Figtree texto, Bricolage Grotesque títulos).
- "Cerrar sesión": con texto, neutro en reposo, `--rose` solo en `:hover` y `:focus-visible`.
- Sin commit ni push hasta que se pidan.

## Review Focus

1. Pantalla de 320 px: la barra cabe y el menú se abre, también en lecciones.
2. Colores puestos a mano en el texto (126 páginas): se conservan.
3. Tablas anchas: se desplazan dentro de su caja, la página no.
4. Imprimir / Descargar PDF: sale solo título y contenido.
5. Lecciones con PDF incrustado (2 páginas `pdfemb`): se siguen viendo.

---

### Task 1: Barra superior única y fuentes locales

**Files:**
- Create: `chrome.css`, `assets/fonts/` (woff2 latin de Figtree y Bricolage Grotesque, licencia OFL incluida), `assets/fonts.css`, `tests/ui.mjs`
- Create (generado): `header.js`
- Modify: `paginas.py`, `site.css`, `lesson-nav.js`, `ver.html`

**Interfaces:**
- Produces: `window.SC_HEADER: string` (el `<header class="top">` de `nav(None)`); `chrome.css` con los tokens, `.top`, `.menu`, `.dd`, `.findbtn`, `.burger`, `.logoutbtn`. `site.css` lo importa con `@import url('chrome.css');`.

- [ ] **Step 1: Test que falla.** `tests/ui.mjs` sirve el repo, simula sesión (`sb-test-auth-token`) y, en listado, agenda, lección, ejercicio y visor, a 320, 768 y 1280 px, exige: existe `header.top .brand` y `header.top [data-logout]` visible con texto `Cerrar sesión`; `font-family` calculada del menú empieza por `Figtree` y `document.fonts.check('600 15px Figtree')` es `true`; la barra no sobresale de la ventana; a 320 y 768 el `.burger` o el menú es accesible; pulsar cerrar sesión borra el token.
- [ ] **Step 2:** `node tests/ui.mjs` → FAIL en lección y visor.
- [ ] **Step 3:** Implementar. `paginas.py` escribe `header.js`. En lecciones y visor se inserta `SC_HEADER` anteponiendo `../../` (visor: nada) a cada `href` relativo, marcando la sección activa; buscar navega a `index.html#buscar`; el burger alterna `.menu.open`. En lecciones el cierre de sesión conserva la marca `sessionStorage 'sc.logout'`. Se eliminan `.lm-top` y la `.top` propia del visor (título y "Abrir PDF" pasan a una fila bajo la barra).
- [ ] **Step 4:** `python3 paginas.py && node tests/ui.mjs` → PASS.

### Task 2: Contenido de lecciones y ejercicios

**Files:**
- Create: `leccion.css`
- Modify: `lesson-nav.js`, `ejercicio.css`, `tests/ui.mjs`

**Interfaces:**
- Consumes: tokens de `chrome.css`.
- Produces: `body.sc-doc`.

- [ ] **Step 1: Test que falla.** En lección y ejercicio: `#sidebar` y `.footer_wrap` no visibles; `h1.postitle` con fuente Bricolage Grotesque, `text-transform: none`, color `rgb(16, 26, 58)`; contenido centrado (márgenes izquierdo y derecho difieren ≤ 2 px) y ≤ 820 px; celdas con borde `rgb(224, 228, 240)`; `scrollWidth <= innerWidth` a 320 px; un `[style*=color]` conserva su color; con `Emulation.setEmulatedMedia print`, `.top` y barra inferior ocultas.
- [ ] **Step 2:** `node tests/ui.mjs` → FAIL.
- [ ] **Step 3:** Implementar `leccion.css`: fondo `--paper`, contenido en tarjeta blanca con `--line` y radio 16px, tablas como `.rows`, formularios alineados con las mismas variables. Tablas anchas envueltas en un contenedor con `overflow-x: auto`.
- [ ] **Step 4:** `node tests/ui.mjs` → PASS.

### Task 3: Barra inferior común y botón de cerrar sesión

**Files:**
- Modify: `chrome.css`, `lesson-nav.js`, `ver.js`, `ver.html`, `tests/ui.mjs`

**Interfaces:**
- Produces: clase `.pn` en `chrome.css` para la barra inferior (`.pn .l`, `.pn .c`, `.pn .r`, `.pn .les`).

- [ ] **Step 1: Test que falla.** Lección y visor tienen `.pn` con la misma altura, fondo y fuente; `[data-logout]` en reposo no es `rgb(180, 40, 63)` y al enfocarlo con teclado sí tiene ese color de fondo.
- [ ] **Step 2:** `node tests/ui.mjs` → FAIL.
- [ ] **Step 3:** Implementar; quitar los estilos en línea de la barra en `lesson-nav.js` y los de `.bar` en `ver.html`.
- [ ] **Step 4:** `node tests/ui.mjs` → PASS. Revisar capturas a 390 y 1280 px, incluidas una lección `pdfemb` y una con tabla ancha, y corregir lo que se vea.
