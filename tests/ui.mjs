// Comprueba el diseño unificado en Chrome sin ventana.  Uso: node tests/ui.mjs [carpeta-para-capturas]
import fs from 'fs';
import os from 'os';
import path from 'path';
import { spawn } from 'child_process';
process.chdir(path.join(path.dirname(new URL(import.meta.url).pathname), '..'));

const CHROME = process.env.CHROME || '/Applications/Google Chrome.app/Contents/MacOS/Google Chrome';
const PORT = 8771, DBG = 9341, B = `http://127.0.0.1:${PORT}/`;
const shots = process.argv[2];
const sleep = ms => new Promise(r => setTimeout(r, ms));
const profile = fs.mkdtempSync(path.join(os.tmpdir(), 'ui-'));
const procs = [
  spawn('python3', ['-m', 'http.server', String(PORT), '--bind', '127.0.0.1'], { stdio: 'ignore' }),
  spawn(CHROME, ['--headless=new', `--remote-debugging-port=${DBG}`, `--user-data-dir=${profile}`, 'about:blank'], { stdio: 'ignore' })
];
process.on('exit', () => procs.forEach(p => p.kill()));

let tab;
for (let i = 0; i < 60 && !tab; i++) { await sleep(250); tab = await fetch(`http://127.0.0.1:${DBG}/json/new?about:blank`, { method: 'PUT' }).then(r => r.json()).catch(() => null); }
const ws = new WebSocket(tab.webSocketDebuggerUrl); await new Promise(r => ws.onopen = r);
let id = 0; const wait = {}; const errors = [];
ws.onmessage = e => { const m = JSON.parse(e.data); if (m.id) wait[m.id](m); else if (m.method === 'Runtime.exceptionThrown') errors.push(m.params.exceptionDetails.exception?.description || m.params.exceptionDetails.text); };
const cmd = (method, params = {}) => new Promise(r => { wait[++id] = r; ws.send(JSON.stringify({ id, method, params })); });
const ev = async x => { const r = await cmd('Runtime.evaluate', { expression: x, returnByValue: true, awaitPromise: true }); if (r.result.exceptionDetails) throw new Error(r.result.exceptionDetails.exception.description); return r.result.result.value; };
const go = async u => { await cmd('Page.navigate', { url: B + u }); await sleep(1200); };
const size = w => cmd('Emulation.setDeviceMetricsOverride', { width: w, height: 800, deviceScaleFactor: 1, mobile: w < 700 });
const shot = async name => { if (!shots) return; const s = await cmd('Page.captureScreenshot', {}); fs.writeFileSync(path.join(shots, name + '.png'), Buffer.from(s.result.data, 'base64')); };
const login = async () => { await go('404.html'); await ev("localStorage.setItem('sb-test-auth-token','{}')"); };

let fails = 0;
const ok = (cond, msg, got) => { if (!cond) { fails++; console.log('FALLA', msg, got === undefined ? '' : JSON.stringify(got)); } };

const cat = JSON.parse(fs.readFileSync('catalog.json'));
const items = cat.flatMap(s => s.items);
const find = (re, pred) => items.find(i => re.test(i.href) && pred(fs.readFileSync(i.href, 'utf8'))).href;
const lesson = find(/^Lessons.*\.html$/, s => s.includes('<table'));
const colored = find(/^Exercises.*\.html$/, s => /<span style='color:/.test(s));
const exercise = find(/^Exercises.*\.html$/, s => s.includes('wpforms-container'));
const embedded = find(/^Exercises.*\.html$/, s => s.includes('pdfemb'));
const pdf = items.find(i => /^Exercises/.test(i.href) && i.type === 'pdf').href;
const pages = {
  listado: 'lecciones-beginner1.html', agenda: 'agenda.html',
  leccion: encodeURI(lesson), ejercicio: encodeURI(exercise), pdfemb: encodeURI(embedded), colores: encodeURI(colored),
  visor: 'ver.html?f=' + encodeURIComponent(pdf)
};

await cmd('Page.enable'); await cmd('Runtime.enable'); await cmd('DOM.enable');
await login();

for (const width of [320, 390, 768, 1280]) {
  await size(width);
  for (const [name, url] of Object.entries(pages)) {
    const at = `${width} ${name}:`;
    errors.length = 0;
    await go(url);
    await shot(`${width}-${name}`);

    // --- Barra superior igual en todas partes ---
    const h = await ev(`(async () => {
      await document.fonts.ready;
      const top = document.querySelector('header.top'); if (!top) return null;
      const out = top.querySelector('[data-logout]'), a = top.querySelector('.menu > a'), burger = top.querySelector('.burger');
      const vis = e => !!e && e.getBoundingClientRect().width > 0 && getComputedStyle(e).visibility !== 'hidden';
      const inside = e => { const r = e.getBoundingClientRect(); return r.left >= 0 && r.right <= document.documentElement.clientWidth + .5; };
      let menu = vis(a);
      if (!menu && vis(burger)) { burger.click(); menu = vis(a); burger.click(); }
      return {
        height: Math.round(top.getBoundingClientRect().height), brand: vis(top.querySelector('.brand')),
        out: vis(out) && inside(out), text: out && out.textContent.trim(), menu,
        fits: [...top.querySelectorAll('.brand, .findbtn, .logoutbtn, .burger')].filter(vis).every(inside),
        font: getComputedStyle(a).fontFamily, loaded: [...document.fonts].some(f => f.family.replace(/"/g, '') === 'Figtree' && f.status === 'loaded'),
        color: out && getComputedStyle(out).color,
        brandColor: getComputedStyle(top.querySelector('.brand')).color, findWeight: getComputedStyle(top.querySelector('.findbtn')).fontWeight, menuSize: getComputedStyle(a).fontSize + ' ' + getComputedStyle(a).fontWeight
      };
    })()`);
    ok(h, at + ' sin header.top');
    if (h) {
      ok(h.brand, at + ' sin marca');
      ok(h.out && h.text === 'Cerrar sesión', at + ' botón de cerrar sesión', h);
      ok(h.menu, at + ' menú inaccesible');
      ok(h.fits, at + ' la barra se sale');
      ok(h.brandColor === 'rgb(16, 26, 58)' && h.findWeight === '500' && h.menuSize === '15px 600', at + ' la barra no es igual que en el resto', [h.brandColor, h.findWeight, h.menuSize]);
      ok(h.height === 65, at + ' altura de la barra', h.height);
      ok(h.font.startsWith('Figtree') && h.loaded, at + ' fuente Figtree', [h.font, h.loaded]);
      ok(h.color !== 'rgb(180, 40, 63)', at + ' cerrar sesión en rojo estando en reposo', h.color);
    }
    ok(!errors.length, at + ' errores de JavaScript', errors);

    // --- Contenido de lecciones y ejercicios ---
    if (name === 'leccion' || name === 'ejercicio' || name === 'pdfemb' || name === 'colores') {
      const c = await ev(`(() => {
        const q = s => document.querySelector(s), st = (e, p) => e && getComputedStyle(e)[p];
        const shown = s => [...document.querySelectorAll(s)].some(e => e.getClientRects().length);
        const h1 = q('h1.postitle'), box = q('.single_post_content').getBoundingClientRect(), td = q('.single_post_content td');
        const inline = [...document.querySelectorAll('.single_post_content [style*="color:"]')].find(e => /(^|;)\\s*color:/.test(e.getAttribute('style')));
        let inlineOk = true;
        if (inline) { const p = document.createElement('i'); p.style.color = inline.style.color; document.body.appendChild(p); inlineOk = getComputedStyle(p).color === getComputedStyle(inline).color; p.remove(); }
        const first = q('.single_post_content > .thn_post_wrap:not(.wp_link_pages)');
        const kid = first && [...first.children].find(e => e.getClientRects().length);
        const plain = [...document.querySelectorAll('.single_post_content td')].find(e => !e.closest('.wpforms-container') && !e.querySelector('*') && e.textContent.trim());
        return {
          blank: !!kid && !kid.textContent.trim() && !kid.matches('img,table,div,form') && !kid.querySelector('img,table,input'), weight: plain ? getComputedStyle(plain).fontWeight : '400',
          extra: shown('#sidebar') || shown('.footer_wrap'), font: st(h1, 'fontFamily'), caps: st(h1, 'textTransform'), color: st(h1, 'color'),
          left: Math.round(box.left), right: Math.round(document.documentElement.clientWidth - box.right), width: Math.round(box.width),
          border: td && !td.closest('.wpforms-container') ? st(td, 'borderTopColor') : null,
          scroll: document.documentElement.scrollWidth, view: document.documentElement.clientWidth, inlineOk,
          embed: !q('.pdfemb-viewer, .pdfemb-the-canvas, .single_post_content img') || shown('.single_post_content img, .pdfemb-viewer, .pdfemb-the-canvas')
        };
      })()`);
      ok(!c.blank, at + ' hueco vacío al principio');
      ok(c.weight === '400', at + ' texto de tabla en negrita', c.weight);
      ok(!c.extra, at + ' se ve la columna o el pie antiguos');
      ok(c.font.includes('Bricolage') && c.caps === 'none' && c.color === 'rgb(16, 26, 58)', at + ' título', [c.font, c.caps, c.color]);
      ok(Math.abs(c.left - c.right) <= 2 && c.width <= 820, at + ' contenido centrado y estrecho', [c.left, c.right, c.width]);
      if (c.border) ok(c.border === 'rgb(224, 228, 240)', at + ' borde de celda', c.border);
      ok(c.scroll <= c.view, at + ' la página se desplaza en horizontal', [c.scroll, c.view]);
      ok(c.inlineOk, at + ' se perdió un color puesto a mano');
      ok(c.embed, at + ' no se ve el material incrustado');
      if (name === 'pdfemb') ok(await ev(`(() => { const e = document.querySelector('.single_post_content canvas'); return !!e && e.getBoundingClientRect().height > 100; })()`), at + ' falta el PDF incrustado');
    }

    // --- Contenido relacionado como las filas de los listados ---
    if (name === 'leccion' || name === 'ejercicio') {
      const r = await ev(`(() => { const w = document.querySelector('#ast_related_wrap'); if (!w) return null; const h = w.querySelector('h3'), list = w.querySelector('#ast_related'), rows = [...w.querySelectorAll('.rel_tab')];
        const st = getComputedStyle, a = rows[0].querySelector('a.rel_hover'), lw = list.getBoundingClientRect().width;
        return { title: h.textContent.trim(), font: st(h).fontFamily.includes('Bricolage'), caps: st(h).textTransform, rule: [...w.querySelectorAll('.widget_border')].some(e => e.getClientRects().length),
          card: st(list).backgroundColor + ' ' + st(list).borderTopColor, full: rows.every(e => e.getBoundingClientRect().width >= lw - 4), tall: rows.every(e => e.getBoundingClientRect().height >= 48),
          link: [st(a).color, st(a).fontFamily.includes('Figtree'), st(a).textTransform, parseFloat(st(a).fontSize) >= 15],
          insets: [...new Set(rows.map(e => Math.round(e.firstElementChild.getBoundingClientRect().left - e.getBoundingClientRect().left)))],
          img: Math.max(0, ...[...w.querySelectorAll('img')].map(i => Math.round(i.getBoundingClientRect().width))) }; })()`);
      ok(r && r.title === 'Contenido relacionado' && r.font && r.caps === 'none' && !r.rule, at + ' título de relacionados', r);
      ok(r && r.card === 'rgb(255, 255, 255) rgb(224, 228, 240)' && r.full && r.tall, at + ' relacionados sin forma de lista', r);
      ok(r && r.insets.length === 1 && r.insets[0] >= 12, at + ' filas relacionadas sin el mismo margen', r && r.insets);
      ok(r && r.link[0] === 'rgb(16, 26, 58)' && r.link[1] && r.link[2] === 'none' && r.link[3] && r.img <= 80, at + ' enlaces relacionados', r);
    }

    // --- Barra inferior común ---
    if (name === 'leccion' || name === 'ejercicio' || name === 'visor') {
      const p = await ev(`(() => { const b = document.querySelector('.pn'); if (!b) return null; const s = getComputedStyle(b); const r = b.getBoundingClientRect();
        return { h: Math.round(r.height), bg: s.backgroundColor, font: s.fontFamily.split(',')[0], bottom: Math.round(innerHeight - r.bottom), fits: [...b.children].every(e => { const x = e.getBoundingClientRect(); return x.left >= 0 && x.right <= document.documentElement.clientWidth + .5; }) }; })()`);
      ok(p && p.h === 56 && p.bg === 'rgb(16, 26, 58)' && p.font.includes('Figtree') && p.bottom === 0, at + ' barra inferior', p);
      ok(p && p.fits, at + ' la barra inferior se sale');
    }
  }
}

// --- La fuente guardada pesa lo mismo que la de Google: mismo ancho de texto en una lección y en un listado ---
await size(1280);
const widths = {};
for (const name of ['listado', 'leccion']) {
  await go(pages[name]);
  widths[name] = await ev(`(async () => { await document.fonts.ready; return [400, 700].map(w => { const e = document.createElement('span'); e.style.cssText = 'position:absolute;white-space:nowrap;font:' + w + ' 100px Figtree'; e.textContent = 'Buenos días, ¿cómo está usted?'; document.body.appendChild(e); return e.getBoundingClientRect().width; }); })()`);
}
ok(Math.abs(widths.listado[0] - widths.leccion[0]) < 2 && widths.leccion[1] - widths.leccion[0] > 5, 'peso de la fuente', widths);

// --- Columnas flotantes dentro de su tarjeta ---
const floated = items.find(i => /^Lessons.*005-Antonimos/i.test(i.href)).href;
await size(1280); await go(encodeURI(floated));
const spill = await ev(`(() => { const card = document.querySelector('.single_post_content > .thn_post_wrap'); const bottom = card.getBoundingClientRect().bottom;
  return Math.round(Math.max(0, ...[...card.querySelectorAll('table')].map(t => t.getBoundingClientRect().bottom - bottom))); })()`);
ok(spill === 0, 'columnas fuera de la tarjeta (' + floated + ')', spill);

// --- La Bricolage guardada es la variable con tamaño óptico, como la que sirve Google al sitio ---
await go(pages.leccion);
const opsz = await ev(`(async () => { await document.fonts.ready; const w = px => { const e = document.createElement('span'); e.style.cssText = 'position:absolute;white-space:nowrap;font:800 ' + px + 'px "Bricolage Grotesque"'; e.textContent = 'Material de clase'; document.body.appendChild(e); return e.getBoundingClientRect().width; };
  w(48); w(12); await document.fonts.ready; return w(48) / (w(12) * 4); })()`);
ok(Math.abs(opsz - 1) > .02, 'Bricolage guardada sin tamaño óptico', opsz);

// --- Las columnas ocupan toda la tabla (sin recuadros vacíos al lado) ---
const narrow = items.find(i => /^Lessons.*Lesson-028-/.test(i.href)).href;
for (const width of [390, 1280]) {
  await size(width); await go(encodeURI(narrow));
  const bad = await ev(`[...document.querySelectorAll('.sc-scroll > table')].filter(t => t.getBoundingClientRect().width - Math.max(...[...t.rows].map(r => [...r.cells].reduce((a, c) => a + c.getBoundingClientRect().width, 0))) > 4).length`);
  ok(bad === 0, width + ' tablas con recuadro vacío (' + narrow + ')', bad);
}
await size(1280);

// --- Foco de teclado: el botón se pone rojo ---
await size(1280);
for (const name of ['listado', 'leccion', 'visor']) {
  await go(pages[name]);
  await ev(`document.querySelector('header.top .findbtn')?.focus()`);
  await cmd('Input.dispatchKeyEvent', { type: 'keyDown', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await cmd('Input.dispatchKeyEvent', { type: 'keyUp', key: 'Tab', code: 'Tab', windowsVirtualKeyCode: 9 });
  await sleep(300);
  const f = await ev(`[document.activeElement.hasAttribute('data-logout'), getComputedStyle(document.activeElement).backgroundColor]`);
  ok(f[0] && f[1] === 'rgb(180, 40, 63)', `foco ${name}: cerrar sesión`, f);
}

// --- Imprimir: solo título y contenido ---
for (const name of ['leccion', 'ejercicio']) {
  await go(pages[name]);
  await cmd('Emulation.setEmulatedMedia', { media: 'print' });
  const v = await ev(`['header.top', '.pn', '#sidebar', '#ast_related_wrap'].filter(s => { const e = document.querySelector(s); return e && e.getClientRects().length; })`);
  ok(!v.length, `imprimir ${name}: se cuela`, v);
  ok(await ev(`!!document.querySelector('h1.postitle').getClientRects().length`), `imprimir ${name}: sin título`);
  const pr = await ev(`(() => { const s = getComputedStyle(document.body); return [s.backgroundColor, s.paddingBottom, s.fontFamily.includes('Figtree')]; })()`);
  ok(pr[0] === 'rgb(255, 255, 255)' && pr[1] === '0px' && !pr[2], `imprimir ${name}: fondo, margen o letra`, pr);
  await cmd('Emulation.setEmulatedMedia', { media: '' });
}

// --- Cerrar sesión funciona ---
for (const name of ['listado', 'leccion', 'visor', 'agenda']) {
  await login();
  await go(pages[name]);
  await ev(`document.querySelector('header.top [data-logout]')?.click()`);
  await sleep(3000);
  const r = await ev(`({ path: location.pathname, tokens: Object.keys(localStorage).filter(k => /auth-token/.test(k)).length })`);
  ok(r.path === '/index.html' && r.tokens === 0, `salir desde ${name}`, r);
}

console.log(fails ? `${fails} comprobaciones fallan` : 'TODO BIEN');
ws.close();
process.exit(fails ? 1 : 0);
