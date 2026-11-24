/* Navegación interna para lecciones/ejercicios guardados: barra anterior/listado/siguiente,
   enlaces reescritos a archivos locales y enlaces muertos eliminados. Requiere ../../catalog.js */
(function () {
  var C = window.CATALOG; if (!C) return;
  var here = decodeURIComponent(location.pathname), root = '../../';
  var cur, sec, idx;
  C.forEach(function (s) { s.items.forEach(function (it, i) { if (here.slice(-it.href.length) === it.href) { cur = it; sec = s; idx = i; } }); });
  var slug = function (p) { return p.replace(/\.[a-z]+$/i, '').replace(/^lesson-/i, '').toLowerCase(); };
  var bySlug = {};
  C.forEach(function (s) { if (s.kind === 'Lección') s.items.forEach(function (it) { bySlug[slug(it.href.split('/').pop())] = it; }); });
  var local = function (it) { return root + encodeURI(it.href); };

  // enlaces del sitio original: a local si existe, si no se elimina
  document.querySelectorAll('a[href*="ixchelschool.com"], a[href*="mybluehost.me"]').forEach(function (a) {
    var u; try { u = new URL(a.href); } catch (e) { return; }
    var m = u.pathname.replace(/^\/|\/$/g, '').toLowerCase();
    var it = u.hostname.indexOf('ixchelschool') > -1 && bySlug[m];
    if (it) { a.href = local(it); return; }
    var p = a.parentElement; a.remove();
    if (p && p.tagName === 'LI' && !p.querySelector('a, ul') && !p.textContent.trim()) p.remove();
  });
  if (!cur) return;

  var bar = document.createElement('div');
  bar.style.cssText = 'position:fixed;left:0;right:0;bottom:0;z-index:2147483647;display:flex;justify-content:space-between;align-items:center;gap:12px;padding:10px 20px;background:#4a9d8f;font:700 13px/1 "Segoe UI",Arial,sans-serif;letter-spacing:.06em;text-transform:uppercase;box-shadow:0 -2px 8px rgba(0,0,0,.15)';
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
    relBtn.style.cssText = 'background:#fff;color:#2d7a6e;border:0;border-radius:4px;padding:8px 14px;font:inherit;cursor:pointer';
    var pop = document.createElement('div');
    pop.style.cssText = 'display:none;position:fixed;bottom:48px;left:50%;transform:translateX(-50%);width:min(520px,94vw);max-height:60vh;overflow:auto;background:#fff;color:#333;border-radius:6px 6px 0 0;box-shadow:0 -4px 16px rgba(0,0,0,.25);font:14px/1.3 "Segoe UI",Arial,sans-serif;letter-spacing:0;text-transform:none;z-index:2147483646';
    var h = document.createElement('div');
    h.textContent = isLesson ? 'Ejercicios de este tema' : 'Lección de este tema';
    h.style.cssText = 'padding:10px 14px;font-weight:700;color:#4a9d8f;border-bottom:1px solid #eee';
    pop.appendChild(h);
    rel.forEach(function (r) {
      var a = document.createElement('a'); a.href = local(r.it);
      if (r.it.type === 'pdf') { a.target = '_blank'; a.rel = 'noopener'; }
      a.style.cssText = 'display:flex;gap:8px;align-items:center;padding:9px 14px;color:#333;text-decoration:none;border-bottom:1px solid #f3f3f3';
      var b = document.createElement('span'); b.textContent = r.it.type.toUpperCase();
      b.style.cssText = 'font-size:11px;font-weight:700;padding:2px 6px;border-radius:3px;background:' + (r.it.type === 'pdf' ? '#fdecea;color:#c0392b' : '#e1f5f0;color:#2d7a6e');
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
