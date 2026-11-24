/* Navegación propia para lecciones/ejercicios guardados: menú superior y lateral de esta web,
   anterior/siguiente según el catálogo, enlaces del sitio original reemplazados o eliminados,
   y barra inferior. Requiere ../../catalog.js (y que la CSP de la página permita scripts 'self'). */
(function () {
  var C = window.CATALOG; if (!C) return;
  var here = decodeURIComponent(location.pathname), root = '../../';
  var cur, sec, idx;
  C.forEach(function (s) { s.items.forEach(function (it, i) { if (here.slice(-it.href.length) === it.href) { cur = it; sec = s; idx = i; } }); });

  // --- Barra superior, lateral y bloques de la página: enlaces propios en lugar de los del sitio original ---
  var norm = function (p) { return decodeURIComponent(p).replace(/^\/|\/$/g, '').toLowerCase(); };
  var bySlug = {};
  C.forEach(function (s) { s.items.forEach(function (it) {
    var k = it.href.split('/').pop().replace(/\.[a-z]+$/i, '').toLowerCase();
    if (s.kind === 'Lección') k = k.replace(/^lesson-/, '');
    if (!bySlug[k]) bySlug[k] = it;
  }); });
  var local = function (it) { return root + encodeURI(it.href); };
  var listUrl = function (s) { return root + s.id + '.html'; };
  var kindName = function (s) { return s.kind === 'Lección' ? 'Lecciones' : 'Ejercicios'; };
  var $ = function (sel, ctx) { return (ctx || document).querySelector(sel); };
  var $$ = function (sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); };
  var el = function (tag, attrs, html) { var e = document.createElement(tag); for (var k in (attrs || {})) e.setAttribute(k, attrs[k]); if (html != null) e.innerHTML = html; return e; };

  // 1) Barra superior propia (mismo estilo que el menú de la web): Inicio / Lecciones / Ejercicios con sus niveles
  var st = document.createElement('style');
  st.textContent = '.lm-top{background:rgba(255,255,255,.94);backdrop-filter:blur(10px);border-bottom:1px solid #e0e4f0;height:60px;display:flex;align-items:center;justify-content:center;gap:8px;position:sticky;top:0;z-index:1000;font-family:"Figtree","Segoe UI",system-ui,sans-serif}' +
    '.lm-top a,.lm-top span.lm-t{color:#3b4568;text-decoration:none;font-size:15px;font-weight:600;padding:8px 14px;border-radius:10px;cursor:pointer;letter-spacing:0;text-transform:none;border:0}' +
    '.lm-top a:hover,.lm-top .lm-dd:hover span.lm-t,.lm-dd.open span.lm-t{background:#e7ecfc;color:#1a33a3}' +
    '.lm-dd{position:relative;display:flex;align-items:center;height:60px}.lm-dd span.lm-t:after{content:" ▾";font-size:11px}' +
    '.lm-menu{display:none;position:absolute;top:56px;left:50%;transform:translateX(-50%);background:#fff;min-width:210px;padding:6px;border:1px solid #e0e4f0;border-radius:12px;box-shadow:0 8px 24px -12px rgba(16,26,58,.3)}' +
    '.lm-dd:hover .lm-menu,.lm-dd.open .lm-menu{display:block}' +
    '.pdfemb-viewer,.pdfemb-pagescontainer,.pdfemb-inner-div{width:100%!important;max-width:100%!important;height:auto!important}.pdfemb-the-canvas{width:100%!important;height:auto!important;aspect-ratio:746/966;display:block}' +
    '.lm-menu a{display:block;padding:9px 12px;font-size:15px;font-weight:500;border-radius:8px}' +
    '@media(max-width:560px){.lm-top{gap:0}.lm-top a,.lm-top span.lm-t{font-size:14px;padding:8px 9px}}';
  document.head.appendChild(st);
  var hw = $('.header_wrap');
  if (hw) {
    var nav = el('nav', { class: 'lm-top' });
    nav.appendChild(el('a', { href: root + 'index.html' }, 'Inicio'));
    ['Lección', 'Ejercicio'].forEach(function (kind) {
      var dd = el('div', { class: 'lm-dd' }), menu = el('div', { class: 'lm-menu' });
      dd.appendChild(el('span', { class: 'lm-t' }, kind === 'Lección' ? 'Lecciones' : 'Ejercicios'));
      C.filter(function (s) { return s.kind === kind; }).forEach(function (s) { menu.appendChild(el('a', { href: listUrl(s) }, s.level)); });
      dd.appendChild(menu); nav.appendChild(dd);
      dd.firstChild.addEventListener('click', function (e) { e.stopPropagation(); dd.classList.toggle('open'); });
    });
    document.addEventListener('click', function () { $$('.lm-dd.open').forEach(function (d) { d.classList.remove('open'); }); });
    hw.replaceWith(nav);
  }

  // 2) Lateral: "Categories" pasa a ser la lista de niveles de esta web
  var cats = $('#sidebar .widget_categories');
  if (cats) {
    var t = $('.widgettitle', cats); if (t) t.textContent = 'Niveles';
    var ul = $('ul', cats); ul.innerHTML = '';
    C.slice().sort(function (x, y) { return (x.kind === y.kind ? 0 : x.kind === 'Lección' ? -1 : 1); }).forEach(function (s) {
      var li = el('li', { class: 'cat-item' });
      li.innerHTML = '<a href="' + listUrl(s) + '"><i class="fa-angle-double-right"></i> ' + kindName(s) + ' – ' + s.level + '</a>';
      if (sec && s.id === sec.id) li.firstChild.style.fontWeight = '700';
      ul.appendChild(li);
    });
  }
  $$('#sidebar .widget:not(.widget_categories)').forEach(function (w) { if ($('a[href*="ixchelschool.com"], a[href*="mybluehost.me"]', w)) w.remove(); });

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
    if (nb) { setNav($('.ast-prev', nb), sec.items[idx - 1]); setNav($('.ast-next', nb), sec.items[idx + 1]); if (!$('.nav-box', nb)) nb.remove(); }
  }

  // 4) Cualquier otro enlace al sitio original: a su equivalente local si existe; si no, se elimina
  $$('a[href*="ixchelschool.com"], a[href*="mybluehost.me"]').forEach(function (a) {
    var u; try { u = new URL(a.href); } catch (e) { return; }
    var it = u.hostname.indexOf('ixchelschool') > -1 && bySlug[norm(u.pathname)];
    if (it) { a.href = local(it); return; }
    var box = a.closest('.rel_tab') || (a.closest('li') && !a.closest('li').querySelector('ul') ? a.closest('li') : null);
    if (box) box.remove(); else a.replaceWith.apply(a, [].slice.call(a.childNodes));
  });
  var rel = $('#ast_related'); if (rel && !$('.rel_tab', rel)) { var wrap = $('#ast_related_wrap') || rel; wrap.remove(); }
  if (!cur) return;

  var bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 20px;background:#101a3a;font:600 14px/1 "Figtree","Segoe UI",system-ui,sans-serif;box-shadow:0 -4px 16px rgba(16,26,58,.25)';
  var link = function (it, label, side) {
    var a = document.createElement(it ? 'a' : 'span');
    a.textContent = label; a.style.cssText = 'color:#fff;text-decoration:none;flex:1;text-align:' + side + (it ? '' : ';opacity:.35');
    if (it) a.href = local(it); return a;
  };
  var list = document.createElement('a');
  list.href = root + sec.id + '.html'; list.textContent = (sec.kind === 'Lección' ? 'Lecciones' : 'Ejercicios') + ' · ' + sec.level;
  list.style.cssText = 'color:#fff;text-decoration:none;flex:2;text-align:center';
  // ejercicios relacionados (si es lección) o lección relacionada (si es ejercicio)
  var byHref = {};
  C.forEach(function (s) { s.items.forEach(function (it) { byHref[it.href] = { it: it, sec: s }; }); });
  var rel = (cur.rel || []).map(function (h) { return byHref[h]; }).filter(Boolean);
  var relBtn;
  if (rel.length) {
    var isLesson = sec.kind === 'Lección';
    relBtn = document.createElement('button');
    relBtn.textContent = isLesson ? 'Practicar (' + rel.length + ')' : (rel.length > 1 ? 'Lecciones (' + rel.length + ')' : 'Ver la lección');
    relBtn.style.cssText = 'background:#f6b92b;color:#101a3a;border:0;border-radius:8px;padding:8px 14px;font-weight:700;font:inherit;cursor:pointer';
    var pop = document.createElement('div');
    pop.style.cssText = 'display:none;position:fixed;bottom:48px;left:50%;transform:translateX(-50%);width:min(520px,94vw);max-height:60vh;overflow:auto;background:#fff;color:#333;border-radius:6px 6px 0 0;box-shadow:0 -4px 16px rgba(0,0,0,.25);font:14px/1.3 "Segoe UI",Arial,sans-serif;letter-spacing:0;text-transform:none;z-index:2147483646';
    var h = document.createElement('div');
    h.textContent = isLesson ? 'Ejercicios de este tema' : 'Lección de este tema';
    h.style.cssText = 'padding:10px 14px;font-weight:700;color:#2547d0;border-bottom:1px solid #eee';
    pop.appendChild(h);
    rel.forEach(function (r) {
      var a = document.createElement('a'); a.href = local(r.it);
      if (r.it.type === 'pdf') { a.target = '_blank'; a.rel = 'noopener'; }
      a.style.cssText = 'display:flex;gap:8px;align-items:center;padding:9px 14px;color:#333;text-decoration:none;border-bottom:1px solid #f3f3f3';
      var b = document.createElement('span'); b.textContent = r.it.type.toUpperCase();
      b.style.cssText = 'font-size:11px;font-weight:700;padding:2px 6px;border-radius:3px;background:' + (r.it.type === 'pdf' ? '#fde8ec;color:#b4283f' : '#e7ecfc;color:#1a33a3');
      a.appendChild(b); a.appendChild(document.createTextNode(r.it.text)); pop.appendChild(a);
    });
    relBtn.onclick = function (e) { e.stopPropagation(); pop.style.display = pop.style.display === 'none' ? 'block' : 'none'; };
    document.addEventListener('click', function () { pop.style.display = 'none'; });
    document.body.appendChild(pop);
  }
  bar.appendChild(link(sec.items[idx - 1], '← Anterior', 'left'));
  bar.appendChild(list);
  if (relBtn) bar.appendChild(relBtn);
  bar.appendChild(link(sec.items[idx + 1], 'Siguiente →', 'right'));
  document.body.appendChild(bar);
  document.body.style.paddingBottom = '48px';
})();
