/* Navegación propia para lecciones/ejercicios guardados: menú superior y lateral de esta web,
   anterior/siguiente según el catálogo, enlaces del sitio original reemplazados o eliminados,
   y barra inferior (estilos: chrome.css y leccion.css). Requiere ../../catalog.js (y que la CSP de la página permita scripts 'self'). */
(function () {
  // Sin sesión iniciada, se vuelve a la portada (que es el inicio de sesión) y luego se regresa aquí
  var logged = false; try { for (var li = 0; li < localStorage.length; li++) if (/^sb-.+-auth-token$/.test(localStorage.key(li))) logged = true; } catch (e) {}
  if (!logged) { location.replace('../../index.html?next=' + encodeURIComponent(decodeURIComponent(location.pathname).split('/').slice(-3).join('/'))); return; }
  var C = window.CATALOG; if (!C) return;
  var here = decodeURIComponent(location.pathname), root = '../../';
  // Ejercicios con formulario: formato propio en lugar de las etiquetas grandes y naranjas del original
  if (document.querySelector('.wpforms-container')) { var ejc = document.createElement('link'); ejc.rel = 'stylesheet'; ejc.href = root + 'ejercicio.css'; document.head.appendChild(ejc); }
  var cur, sec, idx;
  // Anterior/Siguiente solo cuentan las páginas HTML; los PDF se saltan
  var stepHtml = function (d) { if (!sec) return; for (var i = idx + d; i >= 0 && i < sec.items.length; i += d) if (sec.items[i].type === 'html') return sec.items[i]; };
  C.forEach(function (s) { s.items.forEach(function (it, i) { if (here.slice(-it.href.length) === it.href) { cur = it; sec = s; idx = i; } }); });

  // --- Barra superior, lateral y bloques de la página: enlaces propios en lugar de los del sitio original ---
  var norm = function (p) { return decodeURIComponent(p).replace(/^\/|\/$/g, '').toLowerCase(); };
  var bySlug = {};
  C.forEach(function (s) { s.items.forEach(function (it) {
    var k = it.href.split('/').pop().replace(/\.[a-z]+$/i, '').toLowerCase();
    if (s.kind === 'Lección') k = k.replace(/^lesson-/, '');
    if (!bySlug[k]) bySlug[k] = it;
  }); });
  var local = function (it) { return it.type === 'pdf' ? root + 'ver.html?f=' + encodeURIComponent(it.href) : root + encodeURI(it.href); };
  var listUrl = function (s) { return root + s.id + '.html'; };
  var kindName = function (s) { return s.kind === 'Lección' ? 'Lecciones' : 'Ejercicios'; };
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var el = function (tag, attrs, html) { var e = document.createElement(tag); for (var k in (attrs || {})) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; };

  // 1) Mismo aspecto que el resto del sitio: hojas comunes, estilo de las lecciones y la barra superior de header.js
  var sheet = function (f) { var l = document.createElement('link'); l.rel = 'stylesheet'; l.href = root + f; document.head.appendChild(l); };
  sheet('chrome.css'); sheet('leccion.css');
  document.body.classList.add('sc-doc');
  var hs = document.createElement('script'); hs.src = root + 'header.js';
  hs.onload = function () {
    var h = window.SC_mountHeader(root, sec && sec.id), old = $('.header_wrap');
    // Aquí no hay conexión con Supabase: se deja la marca y la portada cierra la sesión
    h.querySelector('[data-logout]').addEventListener('click', function () {
      try { sessionStorage.setItem('sc.logout', '1'); } catch (e) {}
      location.href = root + 'index.html';
    });
    if (old) old.replaceWith(h); else document.body.prepend(h);
  };
  document.head.appendChild(hs);
  // El original empieza con párrafos o títulos vacíos que dejan un hueco bajo el título
  $$('.single_post_content > .thn_post_wrap:not(.wp_link_pages)').forEach(function (w) {
    var content = 'img,table,input,textarea,select,iframe,canvas,svg,video,audio,object,embed,hr,[class*="pdfemb"]';
    var blank = function (e) { return e && !e.textContent.trim() && !e.matches(content) && !e.querySelector(content); };
    while (blank(w.firstElementChild)) w.firstElementChild.remove();
  });
  var relTitle = $('#ast_related_wrap h3'); if (relTitle) relTitle.textContent = 'Contenido relacionado';
  // Las tablas anchas se desplazan dentro de su caja, no la página entera
  $$('.single_post_content table').forEach(function (t) {
    if (t.parentElement.closest('table')) return;
    var box = el('div', { class: 'sc-scroll' }); t.parentNode.insertBefore(box, t); box.appendChild(t);
  });
  $$('#sidebar a[href*="ixchelschool.com"], #sidebar a[href*="mybluehost.me"]').forEach(function (a) { a.remove(); });

  if (cur) {
    // 3) Categoría de la entrada y anterior/siguiente según el orden de esta web
    $$('.catag_list a, .prev_cat_name a, .next_cat_name a').forEach(function (a) { a.href = listUrl(sec); });
    var setNav = function (box, it) {
      if (!box) return;
      if (!it) { box.remove(); return; }
      var a = $('a[rel=prev], a[rel=next]', box); a.href = local(it);
      var sp = $('span', a); if (sp) sp.textContent = it.text;
      var im = $('img', a); if (im) im.remove();
      a.classList.remove('hasimg');
      for (var i = 0; i < a.childNodes.length; i++) if (a.childNodes[i].nodeType === 3 && /Post/.test(a.childNodes[i].textContent)) a.childNodes[i].textContent = /Previous/.test(a.childNodes[i].textContent) ? 'Anterior' : 'Siguiente';
    };
    var nb = $('#ast_nextprev');
    if (nb) { setNav($('.ast-prev', nb), stepHtml(-1)); setNav($('.ast-next', nb), stepHtml(1)); if (!$('.nav-box', nb)) nb.remove(); }
  }

  // 4) Cualquier otro enlace al sitio original: a su equivalente local si existe; si no, se elimina
  $$('a[href*="ixchelschool.com"], a[href*="mybluehost.me"]').forEach(function (a) {
    var u; try { u = new URL(a.href); } catch (e) { return; }
    var it = u.hostname.indexOf('ixchelschool') > -1 && bySlug[norm(u.pathname)];
    if (it) { a.href = local(it); a.removeAttribute('target'); return; }
    var box = a.closest('.rel_tab') || (a.closest('li') && !a.closest('li').querySelector('ul') ? a.closest('li') : null);
    if (box) box.remove(); else a.replaceWith.apply(a, [].slice.call(a.childNodes));
  });
  var rel = $('#ast_related'); if (rel && !$('.rel_tab', rel)) { var wrap = $('#ast_related_wrap') || rel; wrap.remove(); }
  if (!cur) return;

  var bar = el('div', { class: 'pn' });
  var link = function (it, word, cls) {
    var a = el(it ? 'a' : 'span', { class: cls + (it ? '' : ' off'), 'aria-label': word });
    var label = el('span', { class: 'lm-long' }, word);
    if (cls === 'l') { a.append('← ', label); } else { a.append(label, ' →'); }
    if (it) a.href = local(it); return a;
  };
  var list = el('a', { class: 'c', href: root + sec.id + '.html' });
  list.textContent = (sec.kind === 'Lección' ? 'Lecciones' : 'Ejercicios') + ' · ' + sec.level;
  // ejercicios relacionados (si es lección) o lección relacionada (si es ejercicio)
  var byHref = {};
  C.forEach(function (s) { s.items.forEach(function (it) { byHref[it.href] = { it: it, sec: s }; }); });
  var rel = (cur.rel || []).map(function (h) { return byHref[h]; }).filter(Boolean);
  var relBtn;
  if (rel.length) {
    var isLesson = sec.kind === 'Lección';
    relBtn = document.createElement('button');
    relBtn.textContent = isLesson ? 'Practicar (' + rel.length + ')' : (rel.length > 1 ? 'Lecciones (' + rel.length + ')' : 'Ver la lección');
    relBtn.type = 'button'; relBtn.className = 'les';
    var pop = document.createElement('div'); pop.className = 'lm-pop';
    pop.style.cssText = 'display:none;position:fixed;bottom:56px;left:50%;transform:translateX(-50%);width:min(520px,94vw);max-height:60vh;overflow:auto;background:#fff;color:#333;border-radius:14px 14px 0 0;box-shadow:0 -4px 16px rgba(0,0,0,.25);font:14px/1.3 Figtree,"Segoe UI",sans-serif;letter-spacing:0;text-transform:none;z-index:2147483646';
    var h = document.createElement('div');
    h.textContent = isLesson ? 'Ejercicios de este tema' : 'Lección de este tema';
    h.style.cssText = 'padding:10px 14px;font-weight:700;color:#2547d0;border-bottom:1px solid #eee';
    pop.appendChild(h);
    rel.forEach(function (r) {
      var a = document.createElement('a'); a.href = local(r.it);
      a.style.cssText = 'display:flex;gap:8px;align-items:center;padding:9px 14px;color:#333;text-decoration:none;border-bottom:1px solid #f3f3f3';
      var b = document.createElement('span'); b.textContent = r.it.type.toUpperCase();
      b.style.cssText = 'font-size:11px;font-weight:700;padding:2px 6px;border-radius:3px;background:' + (r.it.type === 'pdf' ? '#fde8ec;color:#b4283f' : '#e7ecfc;color:#1a33a3');
      a.appendChild(b); a.appendChild(document.createTextNode(r.it.text)); pop.appendChild(a);
    });
    relBtn.onclick = function (e) { e.stopPropagation(); pop.style.display = pop.style.display === 'none' ? 'block' : 'none'; };
    document.addEventListener('click', function () { pop.style.display = 'none'; });
    document.body.appendChild(pop);
  }

  // Exportar a PDF: se imprime solo el contenido de la página (título + lección/ejercicio); el resto se oculta con @media print
  var ps = document.createElement('style');
  ps.textContent = '.lm-printmeta{display:none}' +
    '@page{margin:16mm 14mm}' +
    '@media print{' +
      '.top,.pn,.header_wrap,#sidebar,#ast_nextprev,#ast_related_wrap,.single_metainfo,.post_foot,.wp_link_pages,.footer_wrap,.lm-pop,.share_foot,.sharedby{display:none!important}' +
      'html,body{background:#fff!important;padding:0!important;margin:0!important;color:#000;width:auto!important;min-width:0!important;overflow:visible!important}.thn_post_wrap{width:auto!important;max-width:none!important;margin:0!important;padding:0!important;float:none!important}' +
      '.post_wrap,.layer_wrapper,#content,.center,.single_wrap,.single_post,.single_post_content{width:auto!important;max-width:none!important;margin:0!important;padding:0!important;float:none!important;border:0!important;box-shadow:none!important;background:none!important}' +
      'h1.postitle{font-size:22pt!important;margin:0 0 4pt!important}' +
      '.lm-printmeta{display:block;font:600 10pt "Figtree","Segoe UI",system-ui,sans-serif;color:#555;margin:0 0 12pt;padding-bottom:8pt;border-bottom:1.5px solid #999}' +
      '.wpforms-field-label{font:500 12pt/1.9 "Figtree","Segoe UI",system-ui,sans-serif!important;color:#000!important;margin-right:6pt}.wpforms-field{margin:0 0 3pt!important}input[type=text]{width:55%!important}' +
      'table{width:calc(100% - 3px)!important;max-width:100%!important;margin:0 0 10pt 1px!important;box-sizing:border-box}.wpforms-field ul{list-style:none!important;margin:0 0 4pt!important;padding:0 0 0 12pt!important}.wpforms-field li{list-style:none!important}' +
      'table,tr,li,.wpforms-field{break-inside:avoid}h2,h3,h4{break-after:avoid}' +
      'img{max-width:100%!important;height:auto!important}' +
      'a{color:inherit!important;text-decoration:none!important}' +
      '*{-webkit-print-color-adjust:exact;print-color-adjust:exact}' +
      'input[type=text],input:not([type]),textarea,select{border:0!important;border-bottom:1px solid #000!important;border-radius:0!important;background:none!important;box-shadow:none!important;appearance:none;-webkit-appearance:none}' +
    '}';
  document.head.appendChild(ps);
  var title0 = document.title, h1 = $('h1.postitle');
  if (h1 && !$('.lm-printmeta')) h1.insertAdjacentElement('afterend', el('div', { class: 'lm-printmeta' }, (sec.kind === 'Lección' ? 'Lección' : 'Ejercicio') + ' · ' + sec.level));
  // el nombre sugerido del PDF sale del título de la página
  window.addEventListener('beforeprint', function () { document.title = cur.text; });
  window.addEventListener('afterprint', function () { document.title = title0; });
  var pdfBtn = el('button', { type: 'button', class: 'lm-pdf', title: 'Guardar esta ' + (sec.kind === 'Lección' ? 'lección' : 'página de ejercicios') + ' como PDF (elige «Guardar como PDF» en el diálogo)' },
    '<span aria-hidden="true">⤓</span><span><span class="lm-long">Descargar </span>PDF</span>');
  pdfBtn.addEventListener('click', function (e) { e.stopPropagation(); window.print(); });
  bar.appendChild(link(stepHtml(-1), 'Anterior', 'l'));
  bar.appendChild(list);
  if (relBtn) bar.appendChild(relBtn);
  bar.appendChild(pdfBtn);
  bar.appendChild(link(stepHtml(1), 'Siguiente', 'r'));
  document.body.appendChild(bar);
})();
