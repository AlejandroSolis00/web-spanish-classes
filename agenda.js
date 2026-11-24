/* Agenda del maestro: clases semanales por alumno, con repetición, duración variable y detección de choques.
   Los datos viven solo en este navegador (localStorage) y se pueden exportar/importar como respaldo. */
(function () {
  var root = document.getElementById('agView'); if (!root) return;
  var KEY = 'sc.agenda.v1', HPX = 48;
  var DAYS = ['Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb', 'Dom'];
  var DAYS_L = ['Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado', 'Domingo'];
  var MONTHS = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
  var STATUS = { programada: 'Programada', dada: 'Dada', 'cancel-alumno': 'Canceló el alumno', 'cancel-maestro': 'Canceló el maestro' };
  var $ = function (id) { return document.getElementById(id); };
  var esc = function (s) { return String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;'); };
  var p2 = function (n) { return (n < 10 ? '0' : '') + n; };

  // ---------- Datos ----------
  var storageOk = true;
  function load() {
    try { var d = JSON.parse(localStorage.getItem(KEY)); if (d && d.students && d.classes && d.series) return d; } catch (e) {}
    return { v: 1, seq: 1, students: [], classes: [], series: [] };
  }
  var db = load();
  function save() {
    try { localStorage.setItem(KEY, JSON.stringify(db)); storageOk = true; } catch (e) { storageOk = false; }
    $('agWarn').hidden = storageOk;
  }
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
          '<b>' + esc(st.name) + '</b><span>' + c.time + '–' + ft(endOf(c)) + (c.status === 'dada' ? ' ✓' : '') + '</span></button>';
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
        html += '<button type="button" class="li st-' + c.status + (clashes(c).length ? ' clash' : '') + (c.status === 'programada' && isPast(c) ? ' pend' : '') + '" data-id="' + c.id + '" style="--h:' + st.hue + '"><b>' + c.time + '–' + ft(endOf(c)) + '</b><span>' + esc(st.name) + '</span><em>' + STATUS[c.status] + '</em></button>';
      });
      html += '</section>';
    });
    html += '</div>';
    root.innerHTML = html;
    if (!db.students.length) root.insertAdjacentHTML('afterbegin', '<p class="ag-empty">Empieza agregando a tus alumnos con el botón <b>Alumnos</b>; después podrás programar sus clases.</p>');
    renderPending();
  }

  function renderPending() {
    var p = db.classes.filter(function (c) { return c.status === 'programada' && isPast(c); }).sort(function (x, y) { return (x.date + x.time) < (y.date + y.time) ? -1 : 1; });
    var box = $('agPending'); box.hidden = !p.length; if (!p.length) return;
    box.innerHTML = '<h2>Por confirmar <small>' + p.length + (p.length === 1 ? ' clase ya pasó' : ' clases ya pasaron') + '</small></h2><ul>' + p.map(function (c) {
      var st = student(c.student) || { name: '(alumno eliminado)' };
      return '<li><span><b>' + esc(st.name) + '</b> · ' + DAYS[wd(c.date)] + ' ' + short(c.date) + ', ' + c.time + '</span><span class="acts">' +
        '<button type="button" class="btn btn-primary" data-set="' + c.id + '" data-st="dada">Se dio</button>' +
        '<button type="button" class="btn btn-ghost" data-set="' + c.id + '" data-st="cancel-alumno">Canceló el alumno</button>' +
        '<button type="button" class="btn btn-ghost" data-set="' + c.id + '" data-st="cancel-maestro">Cancelé yo</button></span></li>';
    }).join('') + '</ul>';
  }

  // ---------- Diálogo de clase ----------
  var dc = $('dlgClass'), editing = null, forceSave = false, delArm = null;
  function fillStudents(sel) {
    var opts = db.students.filter(function (s) { return !s.archived || s.id === sel; });
    $('cStudent').innerHTML = opts.map(function (s) { return '<option value="' + s.id + '"' + (s.id === sel ? ' selected' : '') + '>' + esc(s.name) + (s.archived ? ' (archivado)' : '') + '</option>'; }).join('');
  }
  function toggleRep() { $('cUntilW').hidden = !$('cRep').checked; }
  function openClass(c, date, time) {
    if (!db.students.some(function (s) { return !s.archived; }) && !c) { openStudents(); return; }
    editing = c || null; forceSave = false; resetDel();
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
    $('cDel').textContent = isSer ? 'Eliminar solo esta' : 'Eliminar';
    $('cWarn').hidden = true; $('cSave').textContent = 'Guardar';
    dialogOpen = true; dc.showModal();
  }
  function resetDel() { clearTimeout(delArm && delArm.t); delArm = null; $('cDel').classList.remove('arm'); $('cDelF').classList.remove('arm'); if (editing) { $('cDel').textContent = editing.series ? 'Eliminar solo esta' : 'Eliminar'; $('cDelF').textContent = 'Eliminar esta y las siguientes'; } }
  ['cDate', 'cTime', 'cDur', 'cStudent'].forEach(function (id) { $(id).addEventListener('input', function () { forceSave = false; $('cWarn').hidden = true; $('cSave').textContent = 'Guardar'; }); });
  $('cRep').addEventListener('change', toggleRep);
  dc.addEventListener('close', function () { dialogOpen = false; render(); });
  $('cCancel').addEventListener('click', function () { dc.close(); });

  function formClass() {
    var date = $('cDate').value, time = $('cTime').value, dur = parseInt($('cDur').value, 10);
    if (!$('cStudent').value || !date || !time || !(dur >= 15 && dur <= 300)) return null;
    return { student: $('cStudent').value, date: date, time: time, dur: dur, status: $('cStatus').value };
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
    var c = editing, s = c.series && serie(c.series), scope = document.querySelector('input[name=cScope]:checked').value;
    if (s && scope === 'following') {
      var old = { until: s.until, skips: s.skips.slice() };
      db.classes = db.classes.filter(function (o) { return !(o.series === s.id && o.slot >= c.slot && o.status === 'programada'); });
      s.until = addDays(c.slot, -1);
      var ns = { id: uid('s'), student: f.student, wd: wd(f.date), time: f.time, dur: f.dur, start: f.date, until: old.until, skips: wd(f.date) === s.wd ? old.skips.filter(function (d) { return d >= c.slot; }) : [] };
      db.series.push(ns);
      ensureRange(f.date, addDays(today(), 28) > f.date ? addDays(today(), 28) : f.date);
      var nc = db.classes.filter(function (o) { return o.series === ns.id && o.slot === f.date; })[0];
      if (nc) nc.status = f.status;
    } else { c.student = f.student; c.date = f.date; c.time = f.time; c.dur = f.dur; c.status = f.status; }
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
  function openStudents() { dialogOpen = true; renderStud(); resetStudForm(); ds.showModal(); }
  function renderStud() {
    var l = $('sList');
    if (!db.students.length) { l.innerHTML = '<li class="none">Aún no hay alumnos.</li>'; return; }
    l.innerHTML = db.students.map(function (s) {
      var n = db.classes.filter(function (c) { return c.student === s.id && c.status === 'dada'; }).length;
      return '<li class="' + (s.archived ? 'arch' : '') + '"><span class="dot" style="--h:' + s.hue + '"></span><span class="nm"><b>' + esc(s.name) + '</b><small>' + (s.level ? esc(s.level) + ' · ' : '') + n + (n === 1 ? ' clase dada' : ' clases dadas') + (s.archived ? ' · archivado' : '') + '</small></span>' +
        '<button type="button" class="btn btn-ghost" data-edit="' + s.id + '">Editar</button><button type="button" class="btn btn-ghost" data-arch="' + s.id + '">' + (s.archived ? 'Reactivar' : 'Archivar') + '</button></li>';
    }).join('');
  }
  function resetStudForm() { editStud = null; $('sName').value = ''; $('sLevel').value = ''; $('sFormTitle').textContent = 'Nuevo alumno'; $('sNameW').hidden = false; }
  $('sList').addEventListener('click', function (e) {
    var b = e.target.closest('button'); if (!b) return;
    if (b.dataset.edit) { var s = student(b.dataset.edit); editStud = s; $('sName').value = s.name; $('sLevel').value = s.level || ''; $('sFormTitle').textContent = 'Editar alumno'; $('sName').focus(); }
    if (b.dataset.arch) {
      var st = student(b.dataset.arch); st.archived = !st.archived;
      if (st.archived) db.classes = db.classes.filter(function (c) { return !(c.student === st.id && c.status === 'programada' && !isPast(c)); });
      save(); renderStud();
    }
  });
  $('fStud').addEventListener('submit', function (e) {
    e.preventDefault();
    var name = $('sName').value.trim(); if (!name) { $('sName').focus(); return; }
    if (editStud) { editStud.name = name; editStud.level = $('sLevel').value; }
    else db.students.push({ id: uid('a'), name: name, level: $('sLevel').value, hue: (db.students.length * 47 + 205) % 360, archived: false });
    save(); renderStud(); resetStudForm(); $('sName').focus();
  });
  $('sReset').addEventListener('click', resetStudForm);
  $('sClose').addEventListener('click', function () { ds.close(); });
  ds.addEventListener('close', function () { dialogOpen = false; render(); });

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
        db = d; db.seq = db.seq || 1; save(); render(); msg.textContent = 'Agenda importada.';
      } catch (e) { msg.textContent = 'Ese archivo no es una copia válida de la agenda.'; }
      inp.value = '';
    };
    r.readAsText(f);
  });

  ensureAll(); render();
})();
