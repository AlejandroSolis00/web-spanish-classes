(function () {
  var C = window.CATALOG || [];
  var norm = function (s) { return s.toLowerCase().normalize('NFD').replace(/[̀-ͯ]/g, ''); };
  var li = function (it, level) {
    return '<li><a href="' + encodeURI(it.href) + '" target="_blank" rel="noopener"><span class="badge badge-' + it.type + '">' +
      it.type.toUpperCase() + '</span>' + it.text + (level ? '<span class="result-level">' + level + '</span>' : '') + '</a></li>';
  };
  var list = document.getElementById('fileList');
  if (list) {
    var sec = C.filter(function (s) { return s.id === list.dataset.section; })[0];
    list.innerHTML = sec ? sec.items.map(function (i) { return li(i); }).join('') : '';
  }
  var input = document.getElementById('searchInput');
  if (!input) return;
  var all = [];
  C.forEach(function (s) { s.items.forEach(function (i) { all.push({ it: i, level: s.kind + ' · ' + s.level }); }); });
  var el = function (id) { return document.getElementById(id); };
  input.addEventListener('input', function () {
    var q = norm(this.value.trim());
    if (!q) { el('searchResults').style.display = 'none'; el('homeContent').style.display = 'block'; el('searchCount').textContent = ''; return; }
    el('homeContent').style.display = 'none'; el('searchResults').style.display = 'block';
    var m = all.filter(function (x) { return norm(x.it.text).includes(q) || norm(x.level).includes(q); });
    el('resultList').innerHTML = m.map(function (x) { return li(x.it, x.level).replace('<li>', '<li class="result-item">'); }).join('');
    el('searchCount').textContent = m.length + ' resultado' + (m.length !== 1 ? 's' : '');
    el('noResults').style.display = m.length ? 'none' : 'block';
  });
})();
