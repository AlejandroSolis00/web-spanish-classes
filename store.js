/* Capa de datos de la agenda: Supabase (inicio de sesión + una fila JSON por usuario) con copia local en este navegador.
   La URL y la clave "publishable" son públicas por diseño: los datos los protege el inicio de sesión y RLS (supabase/schema.sql). */
(function () {
  var URL = 'https://zaxilrxnylasolcwdgko.supabase.co', KEY = 'sb_publishable_MIo2mJEJLIoCBt65g188ZQ_Hpv_oKg9';
  var LIB = 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/dist/umd/supabase.min.js', SRI = 'sha384-GFr3yTh5lJznCbZfpTtXnwboFsxqtTQoeTZCRHhE0579KrRmlCzen5AA8ohaB5ug';
  var CACHE = 'sc.agenda.v1', DIRTY = 'sc.agenda.dirty';
  var sb = null, userId = null, version = 0, timer = null, pushing = false, again = false, latest = null, lastJson = null, listeners = [], last = 'idle';

  function ls(k, v) { try { if (v === undefined) return localStorage.getItem(k); if (v === null) localStorage.removeItem(k); else localStorage.setItem(k, v); return true; } catch (e) { return null; } }
  function cache() { try { var d = JSON.parse(ls(CACHE)); return d && d.students && d.classes && d.series ? d : null; } catch (e) { return null; } }
  function status(s) { last = s; listeners.forEach(function (f) { f(s); }); }
  function hasSession() { try { for (var i = 0; i < localStorage.length; i++) if (/^sb-.+-auth-token$/.test(localStorage.key(i))) return true; } catch (e) {} return false; }
  function lib() {
    return new Promise(function (ok, no) {
      if (window.supabase) return ok();
      var s = document.createElement('script'); s.src = LIB; s.integrity = SRI; s.crossOrigin = 'anonymous'; s.onload = ok; s.onerror = function () { no(new Error('lib')); };
      document.head.appendChild(s);
    });
  }
  function client() { return sb || (sb = window.supabase.createClient(URL, KEY, { auth: { persistSession: true, autoRefreshToken: true } })); }

  // Abre la sesión y trae los datos: { state: 'login' | 'ok' | 'offline', data, migrated }
  function open() {
    var cached = cache();
    return lib().then(function () { return client().auth.getSession(); }).then(function (r) {
      var sess = r.data && r.data.session; if (!sess) return { state: 'login' };
      userId = sess.user.id;
      return client().from('agenda').select('data,version').eq('user_id', userId).maybeSingle().then(function (q) {
        if (q.error) throw q.error;
        var row = q.data, dirty = ls(DIRTY);
        if (row) {
          version = row.version;
          // Había cambios sin subir de la sesión anterior y la nube no se movió: se suben ahora
          if (dirty !== null && +dirty === version && cached) { latest = cached; push(); return { state: 'ok', data: cached }; }
          var d = row.data && row.data.students ? row.data : null;
          if (d) { lastJson = JSON.stringify(d); ls(CACHE, lastJson); ls(DIRTY, null); }
          return { state: 'ok', data: d, conflict: dirty !== null && +dirty !== version };
        }
        // Primera vez: se sube lo que hubiera guardado en este navegador
        var first = cached || {};
        return client().from('agenda').insert({ user_id: userId, data: first, version: 1 }).then(function (i) {
          if (i.error) throw i.error; version = 1; ls(DIRTY, null);
          return { state: 'ok', data: cached, migrated: !!cached };
        });
      });
    }).catch(function () { return { state: 'offline', data: cached }; });
  }
  function signIn(email, pass) { return lib().then(function () { return client().auth.signInWithPassword({ email: email, password: pass }); }).then(function (r) { if (r.error) throw r.error; prefsSync(); }); }
  function signOut() {
    return (hasSession() ? lib().then(function () { return client().auth.signOut(); }) : Promise.resolve()).catch(function () {}).then(function () {
      ls(CACHE, null); ls(DIRTY, null); try { Object.keys(localStorage).forEach(function (k) { if (/^sb-.+-auth-token/.test(k)) localStorage.removeItem(k); }); } catch (e) {}
    });
  }

  function push() {
    if (!sb || !userId || !latest) return;
    if (pushing) { again = true; return; }
    pushing = true; status('saving');
    var snap = latest, v = version;
    client().from('agenda').update({ data: snap, version: v + 1, updated_at: new Date().toISOString() }).eq('user_id', userId).eq('version', v).select('version').then(function (r) {
      pushing = false;
      if (r.error) throw r.error;
      if (!r.data || !r.data.length) { status('conflict'); return; }   // otro dispositivo guardó antes
      version = r.data[0].version;
      if (again || latest !== snap) { again = false; push(); return; }
      lastJson = JSON.stringify(snap); ls(DIRTY, null); status('saved');
    }).catch(function () { pushing = false; status('offline'); });
  }
  // Guarda: copia local al instante y envío a la nube con una pequeña espera. Devuelve false si el navegador no deja guardar.
  function save(data) {
    var j = JSON.stringify(data);
    if (j === lastJson) return true;   // sin cambios reales: no se vuelve a subir
    var ok = ls(CACHE, j) !== null;
    latest = data; ls(DIRTY, String(version)); status('saving');
    clearTimeout(timer); timer = setTimeout(push, 400);
    return ok;
  }
  window.addEventListener('online', function () { if (latest && last === 'offline') push(); });
  window.addEventListener('pagehide', function () { if (timer) { clearTimeout(timer); push(); } });

  // ---------- Preferencias: favoritos y recientes (si hay cambios locales sin subir, ganan; si no, manda la nube) ----------
  var PDIRTY = 'sc.prefs.dirty', ptimer = null, psyncing = false;
  function arr(k) { try { var a = JSON.parse(ls(k)); return Array.isArray(a) ? a.filter(function (x) { return typeof x === 'string'; }) : []; } catch (e) { return []; } }
  function prefsLocal() { return { fav: arr('sc.fav').slice(0, 300), rec: arr('sc.rec').slice(0, 8) }; }
  function prefsPush() {
    if (!hasSession()) return Promise.resolve();
    return lib().then(function () { return client().auth.getSession(); }).then(function (r) {
      var sess = r.data && r.data.session; if (!sess) return;
      return client().from('preferencias').upsert({ user_id: sess.user.id, data: prefsLocal(), updated_at: new Date().toISOString() }).then(function (u) { if (u.error) throw u.error; ls(PDIRTY, null); });
    }).catch(function () {});
  }
  function prefsChanged() { ls(PDIRTY, '1'); clearTimeout(ptimer); ptimer = setTimeout(prefsPush, 600); }
  function prefsSync() {
    if (psyncing || !hasSession()) return Promise.resolve(); psyncing = true;
    return lib().then(function () { return client().auth.getSession(); }).then(function (r) {
      var sess = r.data && r.data.session; if (!sess) return;
      return client().from('preferencias').select('data').eq('user_id', sess.user.id).maybeSingle().then(function (q) {
        if (q.error) throw q.error;
        if (!q.data || ls(PDIRTY) !== null) return prefsPush();        // primera vez o cambios locales pendientes: sube lo local
        var d = q.data.data || {}, fav = (d.fav || []).filter(function (x) { return typeof x === 'string'; }).slice(0, 300), rec = (d.rec || []).filter(function (x) { return typeof x === 'string'; }).slice(0, 8);
        var cur = prefsLocal();
        if (JSON.stringify(cur.fav) !== JSON.stringify(fav) || JSON.stringify(cur.rec) !== JSON.stringify(rec)) {
          ls('sc.fav', JSON.stringify(fav)); ls('sc.rec', JSON.stringify(rec)); document.dispatchEvent(new Event('sc:prefs'));
        }
      });
    }).catch(function () {}).then(function () { psyncing = false; });
  }
  window.addEventListener('online', function () { if (ls(PDIRTY) !== null) prefsPush(); });
  if (hasSession()) setTimeout(prefsSync, 0);

  function logout() { signOut().then(function () { location.href = 'index.html'; }); }
  document.addEventListener('click', function (e) { if (e.target.closest('[data-logout]')) logout(); });
  // Las lecciones no pueden hablar con Supabase (su CSP lo impide): dejan esta marca y vienen aquí a cerrar la sesión
  try { if (sessionStorage.getItem('sc.logout')) { sessionStorage.removeItem('sc.logout'); logout(); } } catch (e) {}
  if (!hasSession()) Array.prototype.forEach.call(document.querySelectorAll('[data-logout]'), function (b) { b.hidden = true; });

  window.SC = { open: open, signIn: signIn, signOut: signOut, save: save, cache: cache, hasSession: hasSession, prefs: { changed: prefsChanged, sync: prefsSync }, onStatus: function (f) { listeners.push(f); } };
})();
