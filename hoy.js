/* Bloque "Hoy" de la portada: lee la agenda guardada en este navegador (solo lectura) y muestra las clases del día
   con lo último que se dio a cada alumno y el material que sigue. */
(function () {
  var box = document.getElementById('hoy'), C = window.CATALOG || []; if (!box) return;
  var db; try { db = JSON.parse(localStorage.getItem('sc.agenda.v1')); } catch (e) {}
  if (!db || !db.students || !db.classes || !db.series || !db.students.length) return;
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };
  var d = new Date(), today = d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()), wd = (d.getDay() + 6) % 7, nowM = d.getHours() * 60 + d.getMinutes();
  var tm = function (t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; };
  var ft = function (m) { m %= 1440; return p2(Math.floor(m / 60)) + ':' + p2(m % 60); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var DAYS = ['lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado', 'domingo'], MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var byHref = {}; C.forEach(function (s) { s.items.forEach(function (it, i) { byHref[it.href] = { it: it, sec: s, i: i }; }); });
  var url = function (it) { return it.type === 'pdf' ? 'ver.html?f=' + encodeURIComponent(it.href) : encodeURI(it.href); };
  var student = function (id) { return db.students.filter(function (s) { return s.id === id; })[0]; };

  // Clases de hoy: las ya guardadas + las que una serie genera hoy y la agenda aún no ha materializado
  var list = db.classes.filter(function (c) { return c.date === today; });
  db.series.forEach(function (s) {
    var st = student(s.student);
    if (!st || st.archived || s.wd !== wd || s.start > today || (s.until && s.until < today) || s.skips.indexOf(today) > -1) return;
    if (db.classes.some(function (c) { return c.series === s.id && c.slot === today; })) return;
    list.push({ student: s.student, date: today, time: s.time, dur: s.dur, status: 'programada' });
  });
  list = list.filter(function (c) { return student(c.student) && c.status !== 'descartada' && c.status.indexOf('cancel') !== 0; }).sort(function (a, b) { return tm(a.time) - tm(b.time); });
  if (!list.length) { box.innerHTML = '<h2>Hoy <small>' + DAYS[wd] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + '</small></h2><p class="hoy-none">No tienes clases programadas hoy. <a href="agenda.html">Abrir la agenda</a></p>'; box.hidden = false; return; }

  // Lo último que se dio a un alumno: el material de su clase "dada" más reciente (se prefiere una lección)
  function last(id) {
    var cs = db.classes.filter(function (c) { return c.student === id && c.status === 'dada' && c.material && c.material.length; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
    if (!cs.length) return null;
    var ms = cs[0].material.map(function (h) { return byHref[h]; }).filter(Boolean); if (!ms.length) return null;
    return ms.filter(function (m) { return m.sec.kind === 'Lección'; }).pop() || ms[ms.length - 1];
  }
  var next = true;
  box.innerHTML = '<h2>Hoy <small>' + DAYS[wd] + ' ' + d.getDate() + ' ' + MONTHS[d.getMonth()] + '</small></h2><ul class="hoylist">' + list.map(function (c) {
    var st = student(c.student), a = tm(c.time), b = a + c.dur, tag = '';
    if (c.status === 'dada') tag = '<em class="done">Dada</em>';
    else if (nowM >= a && nowM < b) tag = '<em class="now">Ahora</em>';
    else if (nowM < a && next) { tag = '<em class="soon">Sigue</em>'; next = false; }
    var l = last(st.id), nx = l && l.sec.items[l.i + 1], mat = (c.material || []).map(function (h) { return byHref[h]; }).filter(Boolean);
    var links = '';
    if (l) links += '<span>Va en: <a href="' + url(l.it) + '" target="_blank" rel="noopener">' + esc(l.it.text) + '</a></span>';
    if (nx) links += '<span>Sigue: <a href="' + url(nx) + '" target="_blank" rel="noopener">' + esc(nx.text) + '</a></span>';
    if (mat.length) links += '<span>Material de hoy: ' + mat.map(function (m) { return '<a href="' + url(m.it) + '" target="_blank" rel="noopener">' + esc(m.it.text.split(':')[0]) + '</a>'; }).join(', ') + '</span>';
    if (!links) links = '<span class="muted">Aún no se registra material para este alumno.</span>';
    return '<li><div class="when">' + c.time + '<small>' + ft(b) + '</small></div><div class="who"><b>' + esc(st.name) + '</b>' + (st.level ? '<small>' + esc(st.level) + '</small>' : '') + tag + '<div class="mat">' + links + '</div></div></li>';
  }).join('') + '</ul><p class="hoy-more"><a href="agenda.html">Abrir la agenda</a></p>';
  box.hidden = false;
})();
