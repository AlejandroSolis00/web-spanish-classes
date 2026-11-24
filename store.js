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
  function signIn(email, pass) { return lib().then(function () { return client().auth.signInWithPassword({ email: email, password: pass }); }).then(function (r) { if (r.error) throw r.error; }); }
  function signOut() {
    return (sb ? sb.auth.signOut() : Promise.resolve()).catch(function () {}).then(function () {
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

  window.SC = { open: open, signIn: signIn, signOut: signOut, save: save, cache: cache, hasSession: hasSession, onStatus: function (f) { listeners.push(f); } };
})();
