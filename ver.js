/* Visor de ejercicios en PDF: muestra el PDF con la misma barra de Anterior / Siguiente que las páginas HTML. */
(function () {
  var C = window.CATALOG || [], f = new URLSearchParams(location.search).get('f');
  var cur, sec, idx;
  C.forEach(function (s) { s.items.forEach(function (it, i) { if (it.href === f && it.type === 'pdf') { cur = it; sec = s; idx = i; } }); });
  var $ = function (id) { return document.getElementById(id); };
  if (!cur) { location.replace('404.html'); return; }
  var url = function (it) { return it.type === 'pdf' ? 'ver.html?f=' + encodeURIComponent(it.href) : encodeURI(it.href); };
  var byHref = {}; C.forEach(function (s) { s.items.forEach(function (it) { byHref[it.href] = it; }); });
  document.title = cur.text + ' · Spanish Classes';
  $('t').textContent = cur.text;
  $('f').src = encodeURI(cur.href);
  $('open').href = encodeURI(cur.href);
  var bar = $('bar');
  document.body.prepend(window.SC_mountHeader('', sec.id));
  var add = function (it, label, cls) {
    var a = document.createElement(it ? 'a' : 'span'); a.textContent = label; a.className = cls + (it ? '' : ' off');
    if (it) a.href = url(it); bar.appendChild(a); return a;
  };
  var nav = function (it, word, cls) {
    var a = add(it, '', cls), w = document.createElement('span'); w.className = 'lm-long'; w.textContent = word;
    a.setAttribute('aria-label', word);
    if (cls === 'l') a.append('← ', w); else a.append(w, ' →');
  };
  // Anterior/Siguiente solo cuentan las páginas HTML; los PDF se saltan
  var step = function (d) { for (var i = idx + d; i >= 0 && i < sec.items.length; i += d) if (sec.items[i].type === 'html') return sec.items[i]; };
  var prev = step(-1), next = step(1);
  nav(prev, 'Anterior', 'l');
  var list = document.createElement('a'); list.className = 'c'; list.href = sec.id + '.html'; list.textContent = 'Ejercicios · ' + sec.level; bar.appendChild(list);
  var les = (cur.rel || []).map(function (h) { return byHref[h]; }).filter(Boolean)[0];
  if (les) { var a = add(les, 'Ver la lección', 'les'); }
  nav(next, 'Siguiente', 'r');
  document.addEventListener('keydown', function (e) {
    if (e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft' && prev) location.href = url(prev);
    if (e.key === 'ArrowRight' && next) location.href = url(next);
  });
})();
