/* Generado por paginas.py: la barra superior del sitio, para las lecciones, los ejercicios y el visor. No editar a mano. */
window.SC_HEADER = "<header class=\"top\"><div class=\"wrap\"><a class=\"brand\" href=\"index.html\"><svg viewBox='0 0 96 96' aria-hidden='true'><rect width='96' height='96' fill='#2547d0'/><path d='M48 6c10 14 24 14 42 0-14 18-14 32 0 42-14 10-14 24 0 42-18-14-32-14-42 0-10-14-24-14-42 0 14-18 14-32 0-42 14-10 14-24 0-42 18 14 32 14 42 0z' fill='#fff' fill-opacity='.22'/><circle cx='48' cy='48' r='13' fill='#f6b92b'/></svg><span>Spanish Classes</span></a><nav class=\"menu\" aria-label=\"Principal\"><a href=\"index.html\">Inicio</a><div class=\"dd\"><button type=\"button\">Lecciones</button><div class=\"dd-panel\"><a href=\"lecciones-beginner1.html\">Beginner I</a><a href=\"lecciones-beginner2.html\">Beginner II</a><a href=\"lecciones-intermediate1.html\">Intermediate I</a><a href=\"lecciones-advanced.html\">Advanced</a></div></div><div class=\"dd\"><button type=\"button\">Ejercicios</button><div class=\"dd-panel\"><a href=\"ejercicios-beginner1.html\">Beginner I</a><a href=\"ejercicios-beginner2.html\">Beginner II</a><a href=\"ejercicios-intermediate1.html\">Intermediate I</a><a href=\"ejercicios-intermediate2.html\">Intermediate II</a><a href=\"ejercicios-advanced1.html\">Advanced I</a><a href=\"ejercicios-advanced2.html\">Advanced II</a></div></div><a href=\"agenda.html\">Agenda</a></nav><button class=\"findbtn\" type=\"button\" aria-label=\"Buscar material\"><svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' aria-hidden='true'><circle cx='11' cy='11' r='7'/><path d='M20 20l-4-4'/></svg><span>Buscar</span><kbd>/</kbd></button><button class=\"logoutbtn\" type=\"button\" data-logout><svg viewBox=\"0 0 24 24\" fill=\"none\" stroke=\"currentColor\" stroke-width=\"2.2\" stroke-linecap=\"round\" stroke-linejoin=\"round\" aria-hidden=\"true\"><path d=\"M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9\"/></svg>Cerrar sesión</button><button class=\"burger\" type=\"button\" aria-label=\"Menú\" aria-expanded=\"false\"><span></span></button></div></header>";
window.SC_mountHeader = function (root, section) {
  var t = document.createElement('div'); t.innerHTML = window.SC_HEADER;
  var h = t.firstChild, all = function (s) { return Array.prototype.slice.call(h.querySelectorAll(s)); };
  var menu = h.querySelector('.menu'), burger = h.querySelector('.burger');
  all('a[href]').forEach(function (a) {
    var href = a.getAttribute('href'), dd = a.closest('.dd');
    if (section && href === section + '.html') { a.className = 'on'; if (dd) dd.classList.add('on'); }
    a.setAttribute('href', root + href);
  });
  h.querySelector('.findbtn').addEventListener('click', function () { location.href = root + 'index.html#buscar'; });
  burger.addEventListener('click', function () { burger.setAttribute('aria-expanded', menu.classList.toggle('open')); });
  all('.dd > button').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); b.parentNode.classList.toggle('open'); }); });
  document.addEventListener('click', function () { all('.dd.open').forEach(function (d) { d.classList.remove('open'); }); });
  return h;
};
