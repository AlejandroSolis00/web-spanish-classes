/* Inicio de sesión de la portada: sin sesión, la portada es solo esta pantalla. Tras entrar, vuelve a la página que se pedía (?next=). */
(function () {
  var f = document.getElementById('fLogin'); if (!f || !window.SC) return;
  var next = new URLSearchParams(location.search).get('next') || '';
  var okNext = /^[\w-]+\.html$/.test(next) || (/^(Lessons|Exercises)\/[^:?#\\]+\.html$/.test(next) && next.indexOf('..') < 0);
  var $ = function (id) { return document.getElementById(id); };
  f.addEventListener('submit', function (e) {
    e.preventDefault(); $('lErr').hidden = true; var b = $('lBtn'); b.disabled = true; b.textContent = 'Entrando…';
    SC.signIn($('lEmail').value.trim(), $('lPass').value).then(function () {
      location.replace(okNext ? encodeURI(next) : 'index.html');
    }).catch(function () {
      $('lErr').textContent = 'Correo o contraseña incorrectos, o no hay conexión.'; $('lErr').hidden = false; b.disabled = false; b.textContent = 'Entrar';
    });
  });
})();
