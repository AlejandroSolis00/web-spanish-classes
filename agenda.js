/* Agenda del maestro: clases semanales por alumno, con repetición, duración variable y detección de choques.
   Los datos viven solo en este navegador (localStorage) y se pueden exportar/importar como respaldo. */
(function () {
  var root = document.getElementById('agView'); if (!root) return;
  var KEY = 'sc.agenda.v1', HPX = 48;
  var CAT = window.CATALOG || [], byHref = {}, allMat = [];
  CAT.forEach(function (sc) { sc.items.forEach(function (it, i) { var o = { it: it, sec: sc, i: i, key: (it.text + ' ' + sc.level + ' ' + sc.kind).toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '') }; byHref[it.href] = o; allMat.push(o); }); });
  var matUrl = function (it) { return it.type === 'pdf' ? 'ver.html?f=' + encodeURIComponent(it.href) : encodeURI(it.href); };
  var DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var DAYS_L = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var STATUS = { programada: 'Programada', dada: 'Dada', 'cancel-alumno': 'Canceló el alumno', 'cancel-maestro': 'Canceló el maestro', descartada: 'Descartada' };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };

  // ---------- Datos ----------
  var storageOk = true;
  function norm(d) { d.payments = d.payments || []; d.settings = d.settings || {}; if (!d.settings.currency) d.settings.currency = '$'; if (d.settings.threshold == null) d.settings.threshold = 4; d.seq = d.seq || 1; return d; }
  var db = norm({ v: 1, seq: 1, students: [], classes: [], series: [] });  // se reemplaza al abrir la sesión
  function save() { storageOk = SC.save(db); $('agWarn').hidden = storageOk; }
  function uid(p) { return p + (db.seq++).toString(36) + Math.random().toString(36).slice(2, 5); }
  var student = function (id) { return db.students.filter(function (s) { return s.id === id; })[0]; };
  var cls = function (id) { return db.classes.filter(function (c) { return c.id === id; })[0]; };
  var serie = function (id) { return db.series.filter(function (s) { return s.id === id; })[0]; };

  // ---------- Fechas (cadenas AAAA-MM-DD en hora local) ----------
  function pd(s) { var a = s.split('-'); return new Date(+a[0], a[1] - 1, +a[2], 12); }
  function fd(d) { return d.getFullYear() + '-' + p2(d.getMonth() + 1) + '-' + p2(d.getDate()); }
  function addDays(s, n) { var d = pd(s); d.setDate(d.getDate() + n); return fd(d); }
  function wd(s) { return (pd(s).getDay() + 6) % 7; }
  function monday(s) { return addDays(s, -wd(s)); }
  function tm(t) { var a = t.split(':'); return +a[0] * 60 + +a[1]; }
  function ft(m) { return p2(Math.floor(m / 60)) + ':' + p2(m % 60); }
  function today() { return fd(new Date()); }
  function nowMin() { var d = new Date(); return d.getHours() * 60 + d.getMinutes(); }
  function short(s) { var d = pd(s); return d.getDate() + ' ' + MONTHS[d.getMonth()]; }
  var endOf = function (c) { return tm(c.time) + c.dur; };
  var active = function (c) { return c.status === 'programada' || c.status === 'dada'; };
  var isPast = function (c) { var t = today(); return c.date < t || (c.date === t && endOf(c) <= nowMin()); };

  // ---------- Series: se materializan semana a semana ----------
  function ensureWeek(mon) {
    var changed = false;
    db.series.forEach(function (s) {
      var st = student(s.student); if (!st || st.archived) return;
      var date = addDays(mon, s.wd);
      if (date < s.start || (s.until && date > s.until) || s.skips.indexOf(date) > -1) return;
      if (db.classes.some(function (c) { return c.series === s.id && c.slot === date; })) return;
      db.classes.push({ id: uid('c'), student: s.student, date: date, time: s.time, dur: s.dur, status: 'programada', series: s.id, slot: date });
      changed = true;
    });
    return changed;
  }
  function ensureRange(from, to) {
    var changed = false, m = monday(from), end = monday(to);
    for (var i = 0; m <= end && i < 600; i++, m = addDays(m, 7)) changed = ensureWeek(m) || changed;
    if (changed) save();
  }
  function ensureAll() {
    var first = null;
    db.series.forEach(function (s) { if (!first || s.start < first) first = s.start; });
    if (first) ensureRange(first, addDays(today(), 28));
  }

  // ---------- Cuentas: lo pendiente sale de clases cobrables menos pagos (se cubren primero las más antiguas) ----------
  var money = function (n) { n = Math.round(n * 100) / 100; return db.settings.currency + ' ' + n.toLocaleString('es', { minimumFractionDigits: 0, maximumFractionDigits: 2 }); };
  function rateAt(st, date) {
    var r = (st.rates || []).filter(function (x) { return x.from <= date; }).sort(function (a, b) { return a.from < b.from ? 1 : -1; })[0];
    return r ? r.amount : 0;
  }
  var chargeable = function (c) { return c.status === 'dada' || (c.status === 'cancel-alumno' && c.cobrar); };
  function account(id, extra) {
    var st = student(id) || {}, cl = db.classes.filter(function (c) { return c.student === id && chargeable(c); }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? -1 : 1; });
    var paid = db.payments.filter(function (p) { return p.student === id; }).reduce(function (t, p) { return t + p.amount; }, 0) + (extra || 0);
    var pool = paid, owed = 0, pending = 0, rows = [];
    cl.forEach(function (c) {
      var price = rateAt(st, c.date), cover = Math.min(pool, price); owed += price; pool -= cover;
      var state = !price ? 'sin-tarifa' : cover >= price - 0.005 ? 'pagada' : cover > 0 ? 'parcial' : 'pendiente';
      if (state === 'pendiente' || state === 'parcial') pending++;
      rows.push({ c: c, price: price, state: state });
    });
    return { rows: rows, owed: owed, paid: paid, balance: Math.round((owed - paid) * 100) / 100, pending: pending, count: cl.length, st: st };
  }

  // ---------- Choques ----------
  function clashes(c) {
    if (!active(c)) return [];
    var a = tm(c.time), b = endOf(c);
    return db.classes.filter(function (o) { return o.id !== c.id && o.date === c.date && active(o) && tm(o.time) < b && endOf(o) > a; });
  }

  // ---------- Vista ----------
  var weekStart = monday(today());
  var dialogOpen = false;

  function render() {
    ensureWeek(weekStart); save();
    var days = [], i;
    for (i = 0; i < 7; i++) days.push(addDays(weekStart, i));
    var a = pd(days[0]), b = pd(days[6]);
    $('agLabel').textContent = a.getDate() + (a.getMonth() === b.getMonth() ? '' : ' ' + MONTHS[a.getMonth()]) + ' – ' + b.getDate() + ' ' + MONTHS[b.getMonth()] + ' ' + b.getFullYear();
    var week = db.classes.filter(function (c) { return c.date >= days[0] && c.date <= days[6]; });
    var lo = 7 * 60, hi = 21 * 60;
    week.forEach(function (c) { lo = Math.min(lo, Math.floor(tm(c.time) / 60) * 60); hi = Math.max(hi, Math.ceil(endOf(c) / 60) * 60); });
    var t = today(), html = '';
    // Rejilla (pantallas anchas)
    html += '<div class="ag-grid" style="--hpx:' + HPX + 'px"><div class="ag-corner"></div>';
    days.forEach(function (d, k) { html += '<div class="ag-dayh' + (d === t ? ' today' : '') + '"><span>' + DAYS[k] + '</span><b>' + pd(d).getDate() + '</b></div>'; });
    html += '<div class="ag-hours" style="height:' + ((hi - lo) / 60 * HPX) + 'px">';
    for (var h = lo; h < hi; h += 60) html += '<span style="top:' + ((h - lo) / 60 * HPX) + 'px">' + ft(h) + '</span>';
    html += '</div>';
    days.forEach(function (d, k) {
      html += '<div class="ag-col' + (d === t ? ' today' : '') + '" data-date="' + d + '" data-lo="' + lo + '" style="height:' + ((hi - lo) / 60 * HPX) + 'px">';
      var dayCl = week.filter(function (c) { return c.date === d; }).sort(function (x, y) { return tm(x.time) - tm(y.time); }), lane = {}, n = {}, grp = [], gEnd = 0;
      dayCl.forEach(function (c) {  // clases que se solapan se reparten en columnas lado a lado
        if (grp.length && tm(c.time) >= gEnd) { grp.forEach(function (g) { n[g.id] = grp.reduce(function (m, o) { return Math.max(m, lane[o.id] + 1); }, 1); }); grp = []; gEnd = 0; }
        var used = grp.filter(function (o) { return endOf(o) > tm(c.time); }).map(function (o) { return lane[o.id]; }), k2 = 0;
        while (used.indexOf(k2) > -1) k2++;
        lane[c.id] = k2; grp.push(c); gEnd = Math.max(gEnd, endOf(c));
      });
      grp.forEach(function (g) { n[g.id] = grp.reduce(function (m, o) { return Math.max(m, lane[o.id] + 1); }, 1); });
      dayCl.forEach(function (c) {
        var st = student(c.student) || { name: '(alumno eliminado)', hue: 0 };
        var top = (tm(c.time) - lo) / 60 * HPX, ht = Math.max(c.dur / 60 * HPX, 26);
        html += '<button type="button" class="cls st-' + c.status + (clashes(c).length ? ' clash' : '') + (c.status === 'programada' && isPast(c) ? ' pend' : '') + '" data-id="' + c.id + '" style="top:' + top + 'px;height:' + ht + 'px;left:calc(' + lane[c.id] + ' * 100% / ' + n[c.id] + ' + 3px);width:calc(100% / ' + n[c.id] + ' - 6px);--h:' + st.hue + '">' +
          '<b>' + esc(st.name) + '</b><span>' + (c.moved ? '↪ ' : '') + c.time + '–' + ft(endOf(c)) + (c.status === 'dada' ? ' ✓' : '') + (c.notes || (c.material && c.material.length) ? ' ✎' : '') + '</span></button>';
      });
      if (d === t) { var nm = nowMin(); if (nm >= lo && nm <= hi) html += '<i class="ag-now" style="top:' + ((nm - lo) / 60 * HPX) + 'px"></i>'; }
      html += '</div>';
    });
    html += '</div>';
    // Lista por día (móvil)
    html += '<div class="ag-list">';
    days.forEach(function (d, k) {
      var items = week.filter(function (c) { return c.date === d; }).sort(function (x, y) { return tm(x.time) - tm(y.time); });
      html += '<section class="ag-day' + (d === t ? ' today' : '') + '"><h3>' + DAYS_L[k] + ' <small>' + short(d) + '</small><button type="button" class="ag-add" data-new="' + d + '" aria-label="Nueva clase el ' + DAYS_L[k] + '">+</button></h3>';
      if (!items.length) html += '<p class="ag-none">Sin clases</p>';
      items.forEach(function (c) {
        var st = student(c.student) || { name: '(alumno eliminado)', hue: 0 };
        html += '<button type="button" class="li st-' + c.status + (clashes(c).length ? ' clash' : '') + (c.status === 'programada' && isPast(c) ? ' pend' : '') + '" data-id="' + c.id + '" style="--h:' + st.hue + '"><b>' + c.time + '–' + ft(endOf(c)) + '</b><span>' + esc(st.name) + '</span><em>' + STATUS[c.status] + (c.moved ? ' · reagendada' : '') + '</em></button>';
      });
      html += '</section>';
    });
    html += '</div>';
    root.innerHTML = html;
    if (!db.students.length) root.insertAdjacentHTML('afterbegin', '<p class="ag-empty">Empieza agregando a tus alumnos con el botón <b>Alumnos</b>; después podrás programar sus clases.</p>');
    renderPending(); renderDue();
  }

  function renderPending() {
    var p = db.classes.filter(function (c) { return c.status === 'programada' && isPast(c); }).sort(function (x, y) { return (x.date + x.time) < (y.date + y.time) ? -1 : 1; });
    var box = $('agPending'); box.hidden = !p.length; if (!p.length) { box.innerHTML = ''; return; }
    box.innerHTML = '<h2>Por confirmar <small>' + p.length + (p.length === 1 ? ' clase ya pasó' : ' clases ya pasaron') + '</small></h2><ul>' + p.map(function (c) {
      var st = student(c.student) || { name: '(alumno eliminado)' };
      return '<li><span><b>' + esc(st.name) + '</b> · ' + DAYS[wd(c.date)] + ' ' + short(c.date) + ', ' + c.time + '</span><span class="acts">' +
        '<button type="button" class="btn btn-primary" data-set="' + c.id + '" data-st="dada">Se dio</button>' +
        '<button type="button" class="btn btn-ghost" data-set="' + c.id + '" data-st="cancel-alumno">Canceló el alumno</button>' +
        '<button type="button" class="btn btn-ghost" data-set="' + c.id + '" data-st="cancel-maestro">Cancelé yo</button></span></li>';
    }).join('') + '</ul>';
  }

  function renderDue() {
    var rows = db.students.map(function (st) { return account(st.id); }).filter(function (a) { return a.pending > 0 && a.balance > 0; }).sort(function (a, b) { return b.pending - a.pending; });
    var box = $('agDue'); box.hidden = !rows.length; if (!rows.length) { box.innerHTML = ''; return; }
    var thr = +db.settings.threshold || 0;
    box.innerHTML = '<h2>Por cobrar <small>' + money(rows.reduce(function (t, a) { return t + a.balance; }, 0)) + ' en total</small></h2><ul>' + rows.map(function (a) {
      return '<li' + (thr && a.pending >= thr ? ' class="hot"' : '') + '><span><b>' + esc(a.st.name) + '</b> · ' + a.pending + (a.pending === 1 ? ' clase sin pagar' : ' clases sin pagar') + ' · <b>' + money(a.balance) + '</b>' + (thr && a.pending >= thr ? ' <em>toca cobrar</em>' : '') + '</span><span class="acts">' +
        '<button type="button" class="btn btn-primary" data-pay="' + a.st.id + '">Registrar pago</button><button type="button" class="btn btn-ghost" data-acct="' + a.st.id + '">Ver cuenta</button></span></li>';
    }).join('') + '</ul>';
  }

  // ---------- Diálogo de clase ----------
  var dc = $('dlgClass'), editing = null, forceSave = false, delArm = null, mode = 'edit';
  var weekClasses = function (c) { var m = monday(c.date), e = addDays(m, 6); return db.classes.filter(function (o) { return o.student === c.student && o.status === 'programada' && o.date >= m && o.date <= e; }); };
  function fillStudents(sel) {
    var opts = db.students.filter(function (s) { return !s.archived || s.id === sel; });
    $('cStudent').innerHTML = opts.map(function (s) { return '<option value="' + s.id + '"' + (s.id === sel ? ' selected' : '') + '>' + esc(s.name) + (s.archived ? ' (archivado)' : '') + '</option>'; }).join('');
  }
  function toggleRep() { $('cUntilW').hidden = !$('cRep').checked; }
  function openClass(c, date, time) {
    if (!db.students.some(function (s) { return !s.archived; }) && !c) { openStudents(); return; }
    editing = c || null; forceSave = false; mode = 'edit'; resetDel();
    $('clsTitle').textContent = c ? 'Editar clase' : 'Nueva clase';
    fillStudents(c ? c.student : (db.students.filter(function (s) { return !s.archived; })[0] || {}).id);
    $('cDate').value = c ? c.date : date || today();
    $('cTime').value = c ? c.time : time || '16:00';
    $('cDur').value = c ? c.dur : 60;
    $('cStatus').value = c ? c.status : 'programada';
    $('cStatusW').hidden = !c;
    $('cRepW').hidden = !!(c && c.series) || !!c; $('cRep').checked = false; $('cUntil').value = ''; toggleRep();
    var isSer = !!(c && c.series && serie(c.series));
    $('cScopeW').hidden = !isSer; document.querySelector('input[name=cScope][value=one]').checked = true;
    $('cDel').hidden = !c; $('cDelF').hidden = !isSer;
    $('cStudentW').hidden = false; $('cInfo').hidden = true;
    $('cNotesW').hidden = !c; $('cNotes').value = c && c.notes || ''; matSel = (c && c.material || []).filter(function (h) { return byHref[h]; }); $('cMatQ').value = ''; $('cMatRes').hidden = true; renderMat();
    $('cChargeW').hidden = !(c && c.status === 'cancel-alumno'); $('cCharge').checked = !!(c && c.cobrar);
    var wk = c ? weekClasses(c) : [];
    $('cResched').hidden = !c || c.status === 'dada';
    $('cDisc').hidden = !c || c.status !== 'programada';
    $('cDiscW').hidden = !(c && c.status === 'programada' && wk.length > 1); $('cDiscW').textContent = 'Descartar las ' + wk.length + ' de esta semana';
    $('cMore').hidden = !c || ($('cResched').hidden && $('cDisc').hidden);
    $('cDel').textContent = isSer ? 'Eliminar solo esta' : 'Eliminar';
    $('cWarn').hidden = true; $('cSave').textContent = 'Guardar';
    dialogOpen = true; dc.showModal();
  }
  var matSel = [];
  function renderMat() {
    $('cMat').innerHTML = matSel.map(function (h, i) {
      var m = byHref[h]; if (!m) return '';
      return '<li><a href="' + matUrl(m.it) + '" target="_blank" rel="noopener">' + esc(m.it.text) + '</a><button type="button" data-rm="' + i + '" aria-label="Quitar ' + esc(m.it.text) + '">×</button></li>';
    }).join('');
  }
  function searchMat() {
    var q = $('cMatQ').value.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '').trim().split(/\s+/).filter(Boolean), box = $('cMatRes');
    if (!q.length) { box.hidden = true; return; }
    var res = allMat.filter(function (m) { return matSel.indexOf(m.it.href) < 0 && q.every(function (w) { return m.key.indexOf(w) > -1; }); }).sort(function (a, b) { return (a.sec.kind === 'Lección' ? 0 : 1) - (b.sec.kind === 'Lección' ? 0 : 1); }).slice(0, 8);
    box.innerHTML = res.length ? res.map(function (m) { return '<li><button type="button" data-add="' + esc(m.it.href) + '"><span class="k">' + (m.sec.kind === 'Lección' ? 'Lección' : 'Ejercicio') + '</span>' + esc(m.it.text) + '<small>' + esc(m.sec.level) + '</small></button></li>'; }).join('') : '<li class="none">Sin resultados.</li>';
    box.hidden = false;
  }
  $('cMatQ').addEventListener('input', searchMat);
  $('cMatQ').addEventListener('keydown', function (e) { if (e.key === 'Enter') { e.preventDefault(); var b = $('cMatRes').querySelector('[data-add]'); if (b) b.click(); } });
  $('cMatRes').addEventListener('click', function (e) { var b = e.target.closest('[data-add]'); if (!b) return; matSel.push(b.dataset.add); $('cMatQ').value = ''; $('cMatRes').hidden = true; renderMat(); $('cMatQ').focus(); });
  $('cMat').addEventListener('click', function (e) { var b = e.target.closest('[data-rm]'); if (!b) return; matSel.splice(+b.dataset.rm, 1); renderMat(); });
  function resetDel() { clearTimeout(delArm && delArm.t); delArm = null; $('cDel').classList.remove('arm'); $('cDelF').classList.remove('arm'); if (editing) { $('cDel').textContent = editing.series ? 'Eliminar solo esta' : 'Eliminar'; $('cDelF').textContent = 'Eliminar esta y las siguientes'; } }
  ['cDate', 'cTime', 'cDur', 'cStudent'].forEach(function (id) { $(id).addEventListener('input', function () { forceSave = false; $('cWarn').hidden = true; $('cSave').textContent = 'Guardar'; }); });
  $('cRep').addEventListener('change', toggleRep);
  $('cStatus').addEventListener('change', function () { if (mode === 'edit') $('cChargeW').hidden = this.value !== 'cancel-alumno'; });
  $('cResched').addEventListener('click', function () {
    mode = 'resched'; var c = editing;
    ['cStudentW', 'cStatusW', 'cChargeW', 'cRepW', 'cScopeW', 'cMore', 'cDel', 'cDelF', 'cNotesW'].forEach(function (id) { $(id).hidden = true; });
    $('clsTitle').textContent = 'Reagendar clase';
    $('cInfo').textContent = (student(c.student) || { name: '' }).name + ' — ahora: ' + DAYS_L[wd(c.date)] + ' ' + short(c.date) + ', ' + c.time + '–' + ft(endOf(c)) + '. Elige el nuevo día y hora; solo cambia esta clase.';
    $('cInfo').hidden = false; $('cSave').textContent = 'Reagendar'; $('cDate').focus();
  });
  $('cDisc').addEventListener('click', function () { editing.status = 'descartada'; save(); dc.close(); });
  $('cDiscW').addEventListener('click', function () { weekClasses(editing).forEach(function (o) { o.status = 'descartada'; }); save(); dc.close(); });
  dc.addEventListener('close', function () { dialogOpen = false; render(); });
  $('cCancel').addEventListener('click', function () { dc.close(); });

  function formClass() {
    var date = $('cDate').value, time = $('cTime').value, dur = parseInt($('cDur').value, 10);
    if (!$('cStudent').value || !date || !time || !(dur >= 15 && dur <= 300)) return null;
    if (mode === 'resched') return { student: editing.student, date: date, time: time, dur: dur, status: editing.status, forceOne: true, cobrar: editing.cobrar, notes: editing.notes, material: editing.material };
    return { student: $('cStudent').value, date: date, time: time, dur: dur, status: $('cStatus').value, cobrar: $('cStatus').value === 'cancel-alumno' && $('cCharge').checked, notes: $('cNotes').value.trim(), material: matSel.slice() };
  }
  $('fClass').addEventListener('submit', function (e) {
    e.preventDefault();
    var f = formClass();
    if (!f) { warn('Revisa el alumno, la fecha, la hora y la duración (entre 15 y 300 minutos).'); return; }
    var probe = { id: editing ? editing.id : '_new', date: f.date, time: f.time, dur: f.dur, status: editing ? f.status : 'programada' };
    var cl = clashes(probe);
    if (cl.length && !forceSave) {
      forceSave = true;
      warn('Choca con ' + cl.map(function (o) { return (student(o.student) || { name: '?' }).name + ' (' + o.time + '–' + ft(endOf(o)) + ')'; }).join(', ') + '.');
      $('cSave').textContent = 'Guardar de todos modos'; return;
    }
    if (editing) saveEdit(f); else saveNew(f);
    save(); dc.close();
  });
  function warn(msg) { var w = $('cWarn'); w.textContent = msg; w.hidden = false; }
  function saveNew(f) {
    if ($('cRep').checked) {
      var s = { id: uid('s'), student: f.student, wd: wd(f.date), time: f.time, dur: f.dur, start: f.date, until: $('cUntil').value || null, skips: [] };
      db.series.push(s); ensureRange(f.date, addDays(today(), 28) > f.date ? addDays(today(), 28) : f.date);
    } else db.classes.push({ id: uid('c'), student: f.student, date: f.date, time: f.time, dur: f.dur, status: 'programada' });
    weekStart = monday(f.date);
  }
  function saveEdit(f) {
    var c = editing, s = c.series && serie(c.series), scope = f.forceOne ? 'one' : document.querySelector('input[name=cScope]:checked').value;
    if (s && scope === 'following') {
      var old = { until: s.until, skips: s.skips.slice() };
      db.classes = db.classes.filter(function (o) { return !(o.series === s.id && o.slot >= c.slot && o.status === 'programada'); });
      s.until = addDays(c.slot, -1);
      var ns = { id: uid('s'), student: f.student, wd: wd(f.date), time: f.time, dur: f.dur, start: f.date, until: old.until, skips: wd(f.date) === s.wd ? old.skips.filter(function (d) { return d >= c.slot; }) : [] };
      db.series.push(ns);
      ensureRange(f.date, addDays(today(), 28) > f.date ? addDays(today(), 28) : f.date);
      var nc = db.classes.filter(function (o) { return o.series === ns.id && o.slot === f.date; })[0];
      if (nc) { nc.status = f.status; nc.cobrar = f.cobrar; nc.notes = f.notes; nc.material = f.material; }
    } else {
      if (c.date !== f.date || c.time !== f.time) { if (!c.moved) c.moved = { date: c.date, time: c.time }; else if (c.moved.date === f.date && c.moved.time === f.time) delete c.moved; }
      c.notes = f.notes; c.material = f.material;
      c.cobrar = f.cobrar; c.student = f.student; c.date = f.date; c.time = f.time; c.dur = f.dur; c.status = f.status; }
    weekStart = monday(f.date);
  }
  function arm(btn, key, label) {
    if (delArm && delArm.key === key) return true;
    resetDel(); btn.textContent = label; btn.classList.add('arm');
    delArm = { key: key, t: setTimeout(resetDel, 4000) }; return false;
  }
  $('cDel').addEventListener('click', function () {
    if (!arm($('cDel'), 'one', '¿Seguro? Clic para eliminar')) return;
    var c = editing;
    if (c.series && serie(c.series)) serie(c.series).skips.push(c.slot);
    db.classes = db.classes.filter(function (o) { return o.id !== c.id; }); save(); dc.close();
  });
  $('cDelF').addEventListener('click', function () {
    if (!arm($('cDelF'), 'fol', '¿Seguro? Clic para eliminar')) return;
    var c = editing, s = serie(c.series);
    db.classes = db.classes.filter(function (o) { return !(o.series === s.id && o.slot >= c.slot && o.status === 'programada'); });
    s.until = addDays(c.slot, -1); save(); dc.close();
  });

  // ---------- Diálogo de alumnos ----------
  var ds = $('dlgStud'), editStud = null;
  function openStudents() { dialogOpen = true; $('sCurrency').value = db.settings.currency; $('sThreshold').value = db.settings.threshold; renderStud(); resetStudForm(); ds.showModal(); }
  function lastMat(id) {
    var cs = db.classes.filter(function (c) { return c.student === id && c.status === 'dada' && c.material && c.material.length; }).sort(function (a, b) { return (a.date + a.time) < (b.date + b.time) ? 1 : -1; });
    if (!cs.length) return null;
    var ms = cs[0].material.map(function (h) { return byHref[h]; }).filter(Boolean);
    return ms.filter(function (m) { return m.sec.kind === 'Lección'; }).pop() || ms[ms.length - 1] || null;
  }
  function renderStud() {
    var l = $('sList');
    if (!db.students.length) { l.innerHTML = '<li class="none">Aún no hay alumnos.</li>'; return; }
    l.innerHTML = db.students.map(function (s) {
      var n = db.classes.filter(function (c) { return c.student === s.id && c.status === 'dada'; }).length;
      return '<li class="' + (s.archived ? 'arch' : '') + '"><span class="dot" style="--h:' + s.hue + '"></span><span class="nm"><b>' + esc(s.name) + '</b><small>' + (s.level ? esc(s.level) + ' · ' : '') + (rateAt(s, today()) ? money(rateAt(s, today())) + '/clase · ' : '') + n + (n === 1 ? ' clase dada' : ' clases dadas') + (s.archived ? ' · archivado' : '') + (lastMat(s.id) ? ' · va en: ' + esc(lastMat(s.id).it.text.split(':')[0]) : '') + '</small></span>' +
        '<button type="button" class="btn btn-ghost" data-acct="' + s.id + '">Cuenta</button><button type="button" class="btn btn-ghost" data-edit="' + s.id + '">Editar</button><button type="button" class="btn btn-ghost" data-arch="' + s.id + '">' + (s.archived ? 'Reactivar' : 'Archivar') + '</button></li>';
    }).join('');
  }
  function resetStudForm() { editStud = null; $('sName').value = ''; $('sLevel').value = ''; $('sRate').value = ''; $('sFrom').value = today(); $('sFromW').hidden = true; $('sFormTitle').textContent = 'Nuevo alumno'; $('sNameW').hidden = false; }
  $('sList').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.acct) { ds.close(); openAcct(b.dataset.acct); return; }
    if (b.dataset.edit) { var s = student(b.dataset.edit); editStud = s; $('sName').value = s.name; $('sLevel').value = s.level || ''; $('sRate').value = rateAt(s, today()) || ''; $('sFrom').value = today(); $('sFromW').hidden = false; $('sFormTitle').textContent = 'Editar alumno'; $('sName').focus(); }
    if (b.dataset.arch) {
      var st = student(b.dataset.arch); st.archived = !st.archived;
      if (st.archived) db.classes = db.classes.filter(function (c) { return !(c.student === st.id && c.status === 'programada' && !isPast(c)); });
      save(); renderStud();
    }
  });
  $('fStud').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('sName').value.trim(); if (!name) { $('sName').focus(); return; }
    var rate = Math.max(0, parseFloat($('sRate').value) || 0), st = editStud;
    if (st) { st.name = name; st.level = $('sLevel').value; }
    else { st = { id: uid('a'), name: name, level: $('sLevel').value, hue: (db.students.length * 47 + 205) % 360, archived: false, rates: [] }; db.students.push(st); }
    st.rates = st.rates || [];
    if (rate !== rateAt(st, today()) || (rate && !st.rates.length)) {
      var from = !st.rates.length ? '0000-01-01' : ($('sFrom').value || today());
      st.rates = st.rates.filter(function (r) { return r.from !== from; }); st.rates.push({ from: from, amount: rate });
    }
    save(); renderStud(); resetStudForm(); $('sName').focus();
  });
  $('sReset').addEventListener('click', resetStudForm);
  $('sCurrency').addEventListener('change', function () { db.settings.currency = this.value.trim() || '$'; save(); renderStud(); });
  $('sThreshold').addEventListener('change', function () { db.settings.threshold = Math.max(0, parseInt(this.value, 10) || 0); save(); });
  $('sClose').addEventListener('click', function () { ds.close(); });
  ds.addEventListener('close', function () { dialogOpen = false; render(); });

  // ---------- Cuenta del alumno y pagos ----------
  var da = $('dlgAcct'), acctId = null, payArm = null;
  function openAcct(id) { acctId = id; dialogOpen = true; $('pDate').value = today(); renderAcct(true); da.showModal(); }
  function renderAcct(prefill) {
    var a = account(acctId), st = a.st;
    $('aTitle').textContent = 'Cuenta de ' + st.name;
    var rate = rateAt(st, today());
    $('aSum').innerHTML = '<div><b>' + a.count + '</b><span>clases cobrables</span></div><div><b>' + a.pending + '</b><span>sin pagar</span></div><div class="' + (a.balance > 0 ? 'due' : '') + '"><b>' + money(Math.abs(a.balance)) + '</b><span>' + (a.balance > 0 ? 'pendiente' : a.balance < 0 ? 'saldo a favor' : 'al día') + '</span></div>' +
      (rate ? '' : '<p class="warn">Este alumno no tiene tarifa: define el precio por clase en Alumnos → Editar.</p>');
    if (prefill) $('pAmt').value = a.balance > 0 ? a.balance : '';
    hint();
    var pays = db.payments.filter(function (p) { return p.student === acctId; }).sort(function (x, y) { return x.date < y.date ? 1 : -1; });
    $('aPays').innerHTML = pays.length ? pays.map(function (p) {
      return '<li><span class="nm"><b>' + money(p.amount) + '</b><small>' + short(p.date) + ' ' + p.date.slice(0, 4) + ' · ' + esc(p.method) + '</small></span><button type="button" class="btn btn-ghost danger" data-delpay="' + p.id + '">Eliminar</button></li>';
    }).join('') : '<li class="none">Sin pagos registrados.</li>';
    var rows = a.rows.slice().reverse().slice(0, 40), lbl = { pagada: 'Pagada', parcial: 'Pago parcial', pendiente: 'Pendiente', 'sin-tarifa': 'Sin tarifa' };
    $('aClasses').innerHTML = rows.length ? rows.map(function (r) {
      return '<li><span class="nm"><b>' + DAYS[wd(r.c.date)] + ' ' + short(r.c.date) + ', ' + r.c.time + '</b><small>' + (r.c.status === 'dada' ? 'Dada' : 'Cancelada, cobrada') + ' · ' + money(r.price) + '</small></span><span class="tag ' + r.state + '">' + lbl[r.state] + '</span></li>';
    }).join('') : '<li class="none">Aún no hay clases dadas.</li>';
  }
  function hint() {
    var amt = parseFloat($('pAmt').value) || 0, h = $('pHint'); if (!(amt > 0)) { h.textContent = ''; return; }
    var a = account(acctId), b = account(acctId, amt), n = a.pending - b.pending;
    h.textContent = 'Cubre ' + n + (n === 1 ? ' clase' : ' clases') + (b.pending ? '; quedarían ' + b.pending + ' sin pagar (' + money(Math.max(b.balance, 0)) + ').' : (b.balance < 0 ? '; quedaría un saldo a favor de ' + money(-b.balance) + '.' : '; la cuenta quedaría al día.'));
  }
  $('pAmt').addEventListener('input', hint);
  $('fPay').addEventListener('submit', function (e) {
    e.preventDefault();
    var amt = Math.round((parseFloat($('pAmt').value) || 0) * 100) / 100;
    if (!(amt > 0) || !$('pDate').value) { $('pHint').textContent = 'Escribe un monto mayor que cero y la fecha.'; return; }
    db.payments.push({ id: uid('p'), student: acctId, date: $('pDate').value, amount: amt, method: $('pMethod').value });
    save(); $('pAmt').value = ''; renderAcct(true);
  });
  $('aPays').addEventListener('click', function (e) {
    var b = e.target.closest('[data-delpay]'); if (!b) return;
    if (payArm !== b.dataset.delpay) { payArm = b.dataset.delpay; b.textContent = '¿Seguro?'; b.classList.add('arm'); setTimeout(function () { payArm = null; }, 4000); return; }
    db.payments = db.payments.filter(function (p) { return p.id !== payArm; }); payArm = null; save(); renderAcct(true);
  });
  $('aClose').addEventListener('click', function () { da.close(); });
  da.addEventListener('close', function () { dialogOpen = false; render(); });
  $('agDue').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.pay || b.dataset.acct) { openAcct(b.dataset.pay || b.dataset.acct); if (b.dataset.pay) $('pAmt').focus(); }
  });

  // ---------- Interacción general ----------
  root.addEventListener('click', function (e) {
    var b = e.target.closest('[data-id]');
    if (b) { openClass(cls(b.dataset.id)); return; }
    var n = e.target.closest('[data-new]');
    if (n) { openClass(null, n.dataset.new); return; }
    var col = e.target.closest('.ag-col');
    if (col) {
      var y = e.clientY - col.getBoundingClientRect().top, m = Math.floor((+col.dataset.lo + y / HPX * 60) / 15) * 15;
      openClass(null, col.dataset.date, ft(Math.max(0, Math.min(m, 23 * 60 + 45))));
    }
  });
  $('agPending').addEventListener('click', function (e) {
    var b = e.target.closest('[data-set]'); if (!b) return;
    cls(b.dataset.set).status = b.dataset.st; save(); render();
  });
  $('agPrev').addEventListener('click', function () { weekStart = addDays(weekStart, -7); render(); });
  $('agNext').addEventListener('click', function () { weekStart = addDays(weekStart, 7); render(); });
  $('agToday').addEventListener('click', function () { weekStart = monday(today()); render(); });
  $('agNew').addEventListener('click', function () { openClass(null, today() >= weekStart && today() <= addDays(weekStart, 6) ? today() : weekStart); });
  $('agStudents').addEventListener('click', openStudents);
  document.addEventListener('keydown', function (e) {
    if (dialogOpen || e.target.closest('input, select, textarea') || e.altKey || e.ctrlKey || e.metaKey) return;
    if (e.key === 'ArrowLeft') $('agPrev').click(); else if (e.key === 'ArrowRight') $('agNext').click();
  });
  setInterval(function () { if (!dialogOpen) render(); }, 60000);

  // ---------- Respaldo ----------
  $('agExport').addEventListener('click', function () {
    var a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify(db, null, 1)], { type: 'application/json' }));
    a.download = 'agenda-' + today() + '.json'; document.body.appendChild(a); a.click(); a.remove();
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  });
  $('agImport').addEventListener('change', function () {
    var f = this.files[0], inp = this; if (!f) return;
    var r = new FileReader();
    r.onload = function () {
      var msg = $('agMsg');
      try {
        var d = JSON.parse(r.result);
        if (!d || !Array.isArray(d.students) || !Array.isArray(d.classes) || !Array.isArray(d.series)) throw 0;
        if (!confirm('Esto reemplaza la agenda actual por la del archivo (' + d.students.length + ' alumnos, ' + d.classes.length + ' clases). ¿Continuar?')) { inp.value = ''; return; }
        db = norm(d); save(); render(); msg.textContent = 'Agenda importada.';
      } catch (e) { msg.textContent = 'Ese archivo no es una copia válida de la agenda.'; }
      inp.value = '';
    };
    r.readAsText(f);
  });

  // ---------- Sesión y sincronización ----------
  var SYNC = { saving: 'Guardando…', saved: 'Guardado en la nube', offline: 'Sin conexión: guardado solo en este navegador; se enviará al volver internet', conflict: 'Los datos cambiaron en otro dispositivo. Recarga la página antes de seguir.' };
  SC.onStatus(function (st) { var e = $('agSync'); e.textContent = SYNC[st] || ''; e.className = st; if (st === 'conflict') e.insertAdjacentHTML('beforeend', ' <button type="button" class="btn btn-ghost" onclick="location.reload()">Recargar</button>'); });
  function show(which) { $('agLoad').hidden = which !== 'load'; $('agLogin').hidden = which !== 'login'; $('agApp').hidden = which !== 'app'; }
  function start(r) {
    db = norm(r.data || { v: 1, seq: 1, students: [], classes: [], series: [] });
    show('app'); ensureAll(); render();
    if (r.state === 'offline') $('agSync').textContent = SYNC.offline, $('agSync').className = 'offline';
    else if (r.migrated) { $('agSync').textContent = 'Se subieron a la nube los datos que tenías en este navegador.'; $('agSync').className = 'saved'; }
    else if (r.conflict) { $('agSync').textContent = 'Había cambios sin subir en este navegador, pero la nube tenía datos más nuevos: se usaron los de la nube.'; $('agSync').className = 'conflict'; }
  }
  function boot() {
    show('load');
    SC.open().then(function (r) {
      if (r.state === 'login') { show('login'); return; }
      if (r.state === 'offline' && !r.data) { show('login'); $('lErr').textContent = 'No hay conexión y no hay datos guardados en este navegador.'; $('lErr').hidden = false; return; }
      start(r);
    });
  }
  $('fLogin').addEventListener('submit', function (e) {
    e.preventDefault(); $('lErr').hidden = true; var b = $('lBtn'); b.disabled = true; b.textContent = 'Entrando…';
    SC.signIn($('lEmail').value.trim(), $('lPass').value).then(function () { $('lPass').value = ''; boot(); }).catch(function () {
      $('lErr').textContent = 'Correo o contraseña incorrectos, o no hay conexión.'; $('lErr').hidden = false;
    }).then(function () { b.disabled = false; b.textContent = 'Entrar'; });
  });
  $('agOut').addEventListener('click', function () { SC.signOut().then(function () { location.href = 'index.html'; }); });
  boot();
})();
