(function () {
  var C = window.CATALOG || [];
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var esc = function (s) { return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var byHref = {};
  C.forEach(function (s) { s.items.forEach(function (it) { byHref[it.href] = { it: it, sec: s }; }); });
  var split = function (t) { var m = t.match(/^(?:Lesson|Exercise) ([^:]+):\s*(.*)$/); if (m) return { n: m[1], t: m[2] || 'Ejercicio ' + m[1] };
    m = t.match(/^(?:Lesson|Exercise) (\S+)$/); return m ? { n: m[1], t: 'Ejercicio ' + m[1] } : { n: '', t: t }; };
  var plural = function (n, a, b) { return n + ' ' + (n === 1 ? a : b); };

  // Menú móvil y desplegables táctiles
  var burger = $('.burger'), menu = $('.menu');
  if (burger) burger.addEventListener('click', function () {
    var o = menu.classList.toggle('open'); burger.setAttribute('aria-expanded', o);
  });
  document.querySelectorAll('.dd > button').forEach(function (b) {
    b.addEventListener('click', function (e) { e.stopPropagation(); b.parentNode.classList.toggle('open'); });
  });
  document.addEventListener('click', function () { document.querySelectorAll('.dd.open').forEach(function (d) { d.classList.remove('open'); }); });

  // Cifras (inicio y niveles)
  document.querySelectorAll('[data-count]').forEach(function (e) {
    var ids = e.dataset.count.split(','), n = 0;
    C.forEach(function (s) { if (ids.indexOf(s.id) > -1 || ids.indexOf(s.kind) > -1) n += s.items.length; });
    e.textContent = n;
  });
  document.querySelectorAll('[data-pdf]').forEach(function (e) {
    var n = 0; C.forEach(function (s) { if (s.id === e.dataset.pdf) s.items.forEach(function (i) { if (i.type === 'pdf') n++; }); });
    e.textContent = n;
  });

  var item = function (it, sec, showLevel) {
    var p = split(it.text), isLesson = sec.kind === 'Lección';
    var rel = (it.rel || []).length, chip = '';
    if (isLesson && rel) chip = '<span class="chip">' + plural(rel, 'ejercicio', 'ejercicios') + '</span>';
    if (!isLesson && rel) {
      var l = byHref[it.rel[0]]; if (l) chip = '<span class="chip">Lección ' + esc(split(l.it.text).n) + '</span>';
    }
    return '<li><a class="item' + (isLesson ? '' : ' ej') + '" href="' + encodeURI(it.href) + '" target="_blank" rel="noopener">' +
      '<span class="num">' + esc(isLesson ? p.n : p.n.replace(/^[A-Z]-/, '')) + '</span>' +
      '<span class="txt"><span class="ttl">' + esc(p.t) + '</span><span class="sub"><span class="badge badge-' + it.type + '">' + it.type.toUpperCase() + '</span>' + chip +
      (showLevel ? '<span class="lvl">' + esc(sec.kind + 's · ' + sec.level).replace('Lecciones', 'Lecciones') + '</span>' : '') + '</span></span></a></li>';
  };

  // Grupos temáticos de cada nivel de lecciones (el título que abre cada grupo)
  var GROUPS = {
    'lecciones-beginner1': { 'Mini Diálogos': 'Primeros pasos', 'Ser y Estar - Ser': 'Ser, estar y haber', 'Gustar (To Like)': 'Gustar y posesivos', 'Presente de Indicativo': 'Presente y verbos frecuentes', 'Futuro Simple': 'Futuro, reflexivos y oraciones' },
    'lecciones-beginner2': { 'El Pretérito - Verbos Regulares': 'Pretérito', 'Expresiones Idiomáticas con A y DE': 'Expresiones idiomáticas', 'Adjetivos Demostrativos': 'Demostrativos y adverbios', 'Imperfecto': 'Imperfecto', 'Pronombres Preposicionales': 'Pronombres y SE' },
    'lecciones-intermediate1': { 'Futuro de Indicativo': 'Futuro y por/para', 'Sinónimos': 'Vocabulario y pronombres', 'El Condicional': 'Condicional y comparación', 'El Presente Participio': 'Tiempos progresivos', 'El Pasado Participio': 'Participio pasado y voz pasiva', 'Tiempos Perfectos Compuestos': 'Tiempos perfectos' },
    'lecciones-advanced': { 'El Imperativo': 'Imperativo', 'El Presente de Subjuntivo': 'Presente de subjuntivo', 'El Imperfecto de Subjuntivo': 'Imperfecto de subjuntivo', 'Presente Perfecto de Subjuntivo': 'Presente perfecto de subjuntivo', 'El Pasado Perfecto de Subjuntivo': 'Pasado perfecto de subjuntivo', 'Pronombres Relativos': 'Pronombres relativos' }
  };

  // ---------- Listado de un nivel ----------
  var list = $('#fileList');
  if (list) {
    var sec = C.filter(function (s) { return s.id === list.dataset.section; })[0];
    if (sec) {
      var type = 'all', q = '', groups = GROUPS[sec.id] || {};
      var count = $('#listCount'), empty = $('#empty'), input = $('#filterInput');
      var render = function () {
        var html = '', n = 0, open = false;
        sec.items.forEach(function (it) {
          var p = split(it.text);
          if (type !== 'all' && it.type !== type) return;
          if (q && norm(it.text).indexOf(q) < 0) return;
          if (!q && type === 'all' && groups[p.t]) { if (open) html += '</ul></section>'; html += '<section class="group"><h2>' + esc(groups[p.t]) + '</h2><ul class="items">'; open = true; }
          else if (!open) { html += '<section class="group"><ul class="items">'; open = true; }
          html += item(it, sec); n++;
        });
        if (open) html += '</ul></section>';
        list.innerHTML = html;
        count.textContent = (q || type !== 'all') ? plural(n, 'resultado', 'resultados') + ' de ' + sec.items.length : '';
        empty.style.display = n ? 'none' : 'block';
        $('#emptyTerm').textContent = q ? '«' + input.value.trim() + '»' : 'este filtro';
      };
      input.addEventListener('input', function () { q = norm(this.value.trim()); render(); });
      document.querySelectorAll('.seg button').forEach(function (b) {
        b.addEventListener('click', function () {
          type = b.dataset.type;
          document.querySelectorAll('.seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); });
          render();
        });
      });
      $('#clearFilter').addEventListener('click', function () { input.value = ''; q = ''; type = 'all'; document.querySelectorAll('.seg button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.type === 'all'); }); render(); input.focus(); });
      render();
    }
  }

  // ---------- Búsqueda de la portada ----------
  var hs = $('#searchInput');
  if (hs) {
    var all = [];
    C.forEach(function (s) { s.items.forEach(function (i) { all.push({ it: i, sec: s }); }); });
    var run = function () {
      var raw = hs.value.trim(), qq = norm(raw), res = $('#searchResults'), home = $('#homeContent');
      if (!qq) { res.style.display = 'none'; home.style.display = 'block'; $('#searchCount').textContent = ''; return; }
      home.style.display = 'none'; res.style.display = 'block';
      var m = all.filter(function (x) { return norm(x.it.text).indexOf(qq) > -1 || norm(x.sec.kind + ' ' + x.sec.level).indexOf(qq) > -1; });
      $('#resultList').innerHTML = m.map(function (x) { return item(x.it, x.sec, true); }).join('');
      $('#searchCount').textContent = plural(m.length, 'resultado', 'resultados');
      $('#noResults').style.display = m.length ? 'none' : 'block';
      $('#noTerm').textContent = '«' + raw + '»';
    };
    hs.addEventListener('input', run);
    document.querySelectorAll('.quick button').forEach(function (b) {
      b.addEventListener('click', function () { hs.value = b.textContent; run(); hs.focus(); });
    });
    $('#clearSearch').addEventListener('click', function () { hs.value = ''; run(); hs.focus(); });
  }
})();
