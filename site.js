(function () {
  var C = window.CATALOG || [];
  var $ = function (s, c) { return (c || document).querySelector(s); };
  var $$ = function (s, c) { return Array.prototype.slice.call((c || document).querySelectorAll(s)); };
  var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;'); };
  var plural = function (n, a, b) { return n + ' ' + (n === 1 ? a : b); };
  var byHref = {}, all = [];
  C.forEach(function (s) { s.items.forEach(function (it) { byHref[it.href] = { it: it, sec: s }; all.push({ it: it, sec: s }); }); });
  var split = function (t) {
    var m = t.match(/^(?:Lesson|Exercise) ([^:]+):\s*(.*)$/);
    if (m) return { n: m[1], t: m[2] || 'Ejercicio ' + m[1] };
    m = t.match(/^(?:Lesson|Exercise) (\S+)$/);
    return m ? { n: m[1], t: 'Ejercicio ' + m[1] } : { n: '', t: t };
  };
  // Los PDF se abren en el visor (ver.html), que añade Anterior/Siguiente; el resto, directo.
  var url = function (h) { var x = byHref[h]; return x && x.it.type === 'pdf' ? 'ver.html?f=' + encodeURIComponent(h) : encodeURI(h); };
  var levelKey = function (s) { return /^Intermediate/.test(s.level) ? 'Intermediate' : /^Advanced/.test(s.level) ? 'Advanced' : s.level; };

  // ---------- Favoritos y recientes (solo en este navegador) ----------
  var store = {
    get: function (k) { try { return JSON.parse(localStorage.getItem(k)) || []; } catch (e) { return []; } },
    set: function (k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) {} if (window.SC && (k === 'sc.fav' || k === 'sc.rec')) SC.prefs.changed(); }
  };
  var isFav = function (h) { return store.get('sc.fav').indexOf(h) > -1; };
  var track = function (h) {
    var r = store.get('sc.rec').filter(function (x) { return x !== h; }); r.unshift(h); store.set('sc.rec', r.slice(0, 8));
  };
  var STAR = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round" aria-hidden="true"><path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/></svg>';
  var SEARCH = '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="M20 20l-4-4"/></svg>';

  // ---------- Fila de material ----------
  var row = function (it, sec, o) {
    o = o || {};
    var p = split(it.text), isLesson = sec.kind === 'Lección', rel = (it.rel || []).length, acts = '';
    acts += '<span class="badge badge-' + it.type + '">' + it.type.toUpperCase() + '</span>';
    if (!o.compact) {
      if (isLesson && rel) acts += '<button type="button" class="rel" aria-expanded="false" data-rel="' + esc(it.href) + '">' + plural(rel, 'ejercicio', 'ejercicios') + '</button>';
      if (!isLesson && rel) { var l = byHref[it.rel[0]]; if (l) acts += '<a class="lesslink" href="' + url(l.it.href) + '" data-track="' + esc(l.it.href) + '">Lección ' + esc(split(l.it.text).n) + '</a>'; }
      acts += '<button type="button" class="star" data-fav="' + esc(it.href) + '" aria-pressed="' + isFav(it.href) + '" aria-label="Favorito: ' + esc(p.t) + '" title="Favorito">' + STAR + '</button>';
    }
    return '<li class="row' + (isLesson ? '' : ' ej') + '"><a class="main" href="' + url(it.href) + '" data-track="' + esc(it.href) + '">' +
      '<span class="num">' + esc(isLesson ? p.n : p.n.replace(/^[A-Z]-/, '')) + '</span><span><span class="ttl">' + esc(p.t) + '</span>' +
      (o.level ? '<span class="lvl">' + esc((isLesson ? 'Lecciones' : 'Ejercicios') + ' · ' + sec.level) + '</span>' : '') + '</span></a>' +
      '<span class="acts">' + acts + '</span></li>';
  };

  // Acciones comunes: abrir (recientes), favorito, ejercicios de una lección
  document.addEventListener('click', function (e) {
    var t = e.target.closest('[data-track]'); if (t) track(t.getAttribute('data-track'));
    var f = e.target.closest('[data-fav]');
    if (f) {
      var h = f.getAttribute('data-fav'), fav = store.get('sc.fav'), i = fav.indexOf(h);
      if (i > -1) fav.splice(i, 1); else fav.unshift(h);
      store.set('sc.fav', fav);
      $$('[data-fav]').forEach(function (b) { if (b.getAttribute('data-fav') === h) b.setAttribute('aria-pressed', i < 0); });
      renderShelves();
    }
    var r = e.target.closest('[data-rel]');
    if (r) {
      var li = r.closest('.row'), panel = $('.panel', li), open = r.getAttribute('aria-expanded') === 'true';
      if (!panel) {
        panel = document.createElement('div'); panel.className = 'panel'; panel.hidden = true;
        panel.innerHTML = byHref[r.getAttribute('data-rel')].it.rel.map(function (h) {
          var x = byHref[h]; if (!x) return '';
          return '<a href="' + url(h) + '" data-track="' + esc(h) + '"><span class="code">' + esc(split(x.it.text).n) + '</span><span>' + esc(split(x.it.text).t) +
            '</span><span class="badge badge-' + x.it.type + '">' + x.it.type.toUpperCase() + '</span></a>';
        }).join('');
        li.appendChild(panel);
      }
      panel.hidden = open; r.setAttribute('aria-expanded', !open);
    }
  });

  // ---------- Menú ----------
  var burger = $('.burger'), menu = $('.menu');
  if (burger) burger.addEventListener('click', function () { burger.setAttribute('aria-expanded', menu.classList.toggle('open')); });
  $$('.dd > button').forEach(function (b) { b.addEventListener('click', function (e) { e.stopPropagation(); b.parentNode.classList.toggle('open'); }); });
  document.addEventListener('click', function () { $$('.dd.open').forEach(function (d) { d.classList.remove('open'); }); });
  var onTab = $('.tabs a.on'); if (onTab) onTab.parentNode.scrollLeft = onTab.offsetLeft - 20;
  $$('[data-count]').forEach(function (e) {
    var ids = e.dataset.count.split(','), n = 0;
    C.forEach(function (s) { if (ids.indexOf(s.id) > -1 || ids.indexOf(s.kind) > -1) n += s.items.length; });
    e.textContent = n;
  });
  $$('[data-pdf]').forEach(function (e) {
    var n = 0; C.forEach(function (s) { if (s.id === e.dataset.pdf) s.items.forEach(function (i) { if (i.type === 'pdf') n++; }); });
    e.textContent = n;
  });

  // ---------- Búsqueda: ranking compartido ----------
  var search = function (raw, kind, level) {
    var toks = norm(raw.trim()).split(/\s+/).filter(Boolean);
    if (!toks.length && !kind && !level) return [];
    var out = [];
    all.forEach(function (x, idx) {
      if (kind && x.sec.kind !== kind) return;
      if (level && levelKey(x.sec) !== level) return;
      var p = split(x.it.text), title = norm(p.t), code = norm(p.n);
      var hay = title + ' ' + code + ' ' + norm(x.sec.kind + ' ' + x.sec.level + (x.sec.kind === 'Lección' ? ' lecciones' : ' ejercicios'));
      var score = 0;
      for (var i = 0; i < toks.length; i++) {
        var t = toks[i];
        if (hay.indexOf(t) < 0) return;
        if (title.indexOf(t) === 0) score += 3; else if (title.indexOf(' ' + t) > -1) score += 2; else score += 1;
        if (/^\d+$/.test(t) && code.replace(/^.*-/, '').replace(/^0+/, '') === t.replace(/^0+/, '')) score += 4;
      }
      if (x.sec.kind === 'Lección') score += 1.5;
      out.push({ it: x.it, sec: x.sec, s: score, i: idx });
    });
    out.sort(function (a, b) { return b.s - a.s || a.i - b.i; });
    return out;
  };
  var LEVELS = ['Beginner I', 'Beginner II', 'Intermediate', 'Advanced'];
  var levelSelect = '<select class="select" aria-label="Nivel"><option value="">Todos los niveles</option>' + LEVELS.map(function (l) { return '<option>' + l + '</option>'; }).join('') + '</select>';
  var scopeSeg = '<div class="seg" role="group" aria-label="Tipo"><button type="button" data-kind="" aria-pressed="true">Todo</button><button type="button" data-kind="Lección" aria-pressed="false">Lecciones</button><button type="button" data-kind="Ejercicio" aria-pressed="false">Ejercicios</button></div>';

  // Enlaza un campo de búsqueda con su zona de resultados
  var wire = function (ctx, o) {
    var input = $('input', ctx), kind = '', level = '';
    var run = function () {
      var raw = input.value, res = null;
      if (raw.trim() || kind || level) { var full = search(raw, kind, level); res = full.slice(0, o.limit || 120); res.total = full.length; }
      o.render(res, raw);
    };
    input.addEventListener('input', run);
    $$('[data-kind]', ctx).forEach(function (b) {
      b.addEventListener('click', function () { kind = b.dataset.kind; $$('[data-kind]', ctx).forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); run(); input.focus(); });
    });
    var sel = $('select', ctx); if (sel) sel.addEventListener('change', function () { level = sel.value; run(); });
    return { run: run, input: input, set: function (v) { input.value = v; run(); input.focus(); },
      reset: function () { input.value = ''; kind = ''; level = ''; $$('[data-kind]', ctx).forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.kind === ''); }); if (sel) sel.value = ''; run(); input.focus(); } };
  };

  // ---------- Portada ----------
  var home = $('#homeFinder');
  var renderShelves = function () {
    var favs = $('#favs'), rec = $('#recent'); if (!favs) return;
    var mk = function (hs) { return hs.map(function (h) { var x = byHref[h]; return x ? row(x.it, x.sec, { level: true }) : ''; }).join(''); };
    var f = store.get('sc.fav'), r = store.get('sc.rec');
    favs.hidden = !f.length; $('.rows', favs).innerHTML = mk(f);
    rec.hidden = !r.length; $('.rows', rec).innerHTML = mk(r);
  };
  // Si otra sesión cambió los favoritos o recientes, se refresca lo que ya está en pantalla
  document.addEventListener('sc:prefs', function () {
    $$('[data-fav]').forEach(function (b) { b.setAttribute('aria-pressed', isFav(b.getAttribute('data-fav'))); });
    renderShelves();
  });
  var w;
  if (home) {
    renderShelves();
    w = wire(home, {
      render: function (res, raw) {
        $('#searchResults').style.display = res ? 'block' : 'none'; $('#homeContent').style.display = res ? 'none' : 'block';
        if (!res) { $('#searchCount').textContent = ''; $('#noResults').style.display = 'none'; return; }
        $('#resultList').innerHTML = res.map(function (x) { return row(x.it, x.sec, { level: true }); }).join('');
        $('#searchCount').textContent = res.total > res.length ? 'Mostrando ' + res.length + ' de ' + res.total + ' · escribe un tema o número para afinar' : plural(res.length, 'resultado', 'resultados');
        $('#noResults').style.display = res.length ? 'none' : 'block'; $('#noTerm').textContent = raw.trim() ? '«' + raw.trim() + '»' : 'este filtro';
      }
    });
    $$('.quick button').forEach(function (b) { b.addEventListener('click', function () { w.set(b.textContent); }); });
    $('#clearSearch').addEventListener('click', function () { w.reset(); });
    if (matchMedia('(min-width: 761px)').matches) w.input.focus();
  }

  // ---------- Selector rápido en todas las páginas ("/" o Ctrl/⌘ + K) ----------
  var pal = document.createElement('div'); pal.className = 'pal'; pal.setAttribute('role', 'dialog'); pal.setAttribute('aria-modal', 'true'); pal.setAttribute('aria-label', 'Buscar material');
  var hint = '<p class="pal-hint">Escribe para buscar entre ' + all.length + ' lecciones y ejercicios.</p>';
  pal.innerHTML = '<div class="pal-box"><div class="pal-head"><div class="searchbox">' + SEARCH + '<input type="search" placeholder="Busca por tema o número: imperativo, 012, gustar…" aria-label="Buscar" autocomplete="off"></div>' +
    '<div class="filters" style="margin-top:10px">' + scopeSeg + levelSelect + '</div></div><div class="pal-body">' + hint + '</div></div>';
  document.body.appendChild(pal);
  var pb = $('.pal-body', pal);
  var pw = wire(pal, {
    limit: 40,
    render: function (res, raw) {
      if (!res) { pb.innerHTML = hint; return; }
      pb.innerHTML = res.length ? '<ul class="rows" style="border:0">' + res.map(function (x) { return row(x.it, x.sec, { level: true, compact: true }); }).join('') + '</ul>' : '<p class="pal-hint">Sin resultados' + (raw.trim() ? ' para «' + esc(raw.trim()) + '»' : '') + '.</p>';
    }
  });
  var lastFocus = null;
  var openPal = function () {
    if (home) { home.scrollIntoView({ block: 'center' }); w.input.focus(); w.input.select(); return; }
    lastFocus = document.activeElement; pal.classList.add('open'); pw.input.focus(); pw.input.select();
  };
  var closePal = function () { pal.classList.remove('open'); if (lastFocus && lastFocus.focus) lastFocus.focus(); };
  $$('.findbtn, .findbtn-open').forEach(function (b) { b.addEventListener('click', openPal); });
  pal.addEventListener('click', function (e) { if (e.target === pal || e.target.closest('.main')) closePal(); });
  document.addEventListener('keydown', function (e) {
    if (document.documentElement.classList.contains('nolog')) return;
    var tag = (e.target.tagName || '').toLowerCase(), typing = tag === 'input' || tag === 'textarea' || tag === 'select';
    if (e.key === 'Escape' && pal.classList.contains('open')) { closePal(); return; }
    if (e.key === 'Tab' && pal.classList.contains('open')) {
      var f = $$('input, select, button, a[href]', pal).filter(function (x) { return x.offsetParent !== null; });
      if (f.length) { var first = f[0], last = f[f.length - 1];
        if (e.shiftKey && document.activeElement === first) { e.preventDefault(); last.focus(); }
        else if (!e.shiftKey && document.activeElement === last) { e.preventDefault(); first.focus(); } }
    }
    if (((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') || (e.key === '/' && !typing)) { e.preventDefault(); openPal(); return; }
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      var scope = pal.classList.contains('open') ? pal : (home ? $('#searchResults') : null); if (!scope) return;
      var links = $$('.main', scope); if (!links.length) return;
      var i = links.indexOf(document.activeElement), inInput = tag === 'input';
      if (!inInput && i < 0) return;
      e.preventDefault();
      if (e.key === 'ArrowDown') (links[i + 1] || links[i < 0 ? 0 : i]).focus();
      else if (i > 0) links[i - 1].focus(); else (pal.classList.contains('open') ? pw.input : w.input).focus();
    }
  });

  // ---------- Listado de un nivel ----------
  var GROUPS = {
    'lecciones-beginner1': { 'Mini Diálogos': 'Primeros pasos', 'Ser y Estar - Ser': 'Ser, estar y haber', 'Gustar (To Like)': 'Gustar y posesivos', 'Presente de Indicativo': 'Presente y verbos frecuentes', 'Futuro Simple': 'Futuro, reflexivos y oraciones' },
    'lecciones-beginner2': { 'El Pretérito - Verbos Regulares': 'Pretérito', 'Expresiones Idiomáticas con A y DE': 'Expresiones idiomáticas', 'Adjetivos Demostrativos': 'Demostrativos y adverbios', 'Imperfecto': 'Imperfecto', 'Pronombres Preposicionales': 'Pronombres y SE' },
    'lecciones-intermediate1': { 'Futuro de Indicativo': 'Futuro y por/para', 'Sinónimos': 'Vocabulario y pronombres', 'El Condicional': 'Condicional y comparación', 'El Presente Participio': 'Tiempos progresivos', 'El Pasado Participio': 'Participio pasado y voz pasiva', 'Tiempos Perfectos Compuestos': 'Tiempos perfectos' },
    'lecciones-advanced': { 'El Imperativo': 'Imperativo', 'El Presente de Subjuntivo': 'Presente de subjuntivo', 'El Imperfecto de Subjuntivo': 'Imperfecto de subjuntivo', 'Presente Perfecto de Subjuntivo': 'Presente perfecto de subjuntivo', 'El Pasado Perfecto de Subjuntivo': 'Pasado perfecto de subjuntivo', 'Pronombres Relativos': 'Pronombres relativos' }
  };
  var list = $('#fileList');
  if (list) {
    var sec = C.filter(function (s) { return s.id === list.dataset.section; })[0];
    if (sec) {
      var type = 'all', q = '', groups = GROUPS[sec.id] || {};
      var count = $('#listCount'), empty = $('#empty'), input = $('#filterInput'), jump = $('#jump');
      var render = function () {
        var html = '', n = 0, open = false, gi = 0, names = [], terms = q.split(/\s+/).filter(Boolean);
        sec.items.forEach(function (it) {
          var p = split(it.text), hay = norm(it.text);
          if (type !== 'all' && it.type !== type) return;
          if (terms.some(function (t) { return hay.indexOf(t) < 0; })) return;
          if (!q && type === 'all' && groups[p.t]) { if (open) html += '</ul></section>'; gi++; names.push(groups[p.t]); html += '<section class="group" id="g' + gi + '"><h2>' + esc(groups[p.t]) + '</h2><ul class="rows">'; open = true; }
          else if (!open) { html += '<section class="group"><ul class="rows">'; open = true; }
          html += row(it, sec); n++;
        });
        if (open) html += '</ul></section>';
        list.innerHTML = html;
        count.textContent = (q || type !== 'all') ? plural(n, 'resultado', 'resultados') + ' de ' + sec.items.length : '';
        empty.style.display = n ? 'none' : 'block';
        $('#emptyTerm').textContent = q ? '«' + input.value.trim() + '»' : 'este filtro';
        if (jump) jump.innerHTML = names.length > 1 ? '<span>Ir a:</span>' + names.map(function (g, i) { return '<a href="#g' + (i + 1) + '">' + esc(g) + '</a>'; }).join('') : '';
      };
      input.addEventListener('input', function () { q = norm(this.value.trim()); render(); });
      $$('.toolbar .seg button').forEach(function (b) {
        b.addEventListener('click', function () { type = b.dataset.type; $$('.toolbar .seg button').forEach(function (x) { x.setAttribute('aria-pressed', x === b); }); render(); });
      });
      $('#clearFilter').addEventListener('click', function () { input.value = ''; q = ''; type = 'all'; $$('.toolbar .seg button').forEach(function (x) { x.setAttribute('aria-pressed', x.dataset.type === 'all'); }); render(); input.focus(); });
      var q0 = new URLSearchParams(location.search).get('q'); if (q0) { input.value = q0; q = norm(q0); }
      render();
    }
  }
})();
