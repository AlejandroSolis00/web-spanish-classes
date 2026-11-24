#!/usr/bin/env python3
"""Reduce el peso de las lecciones/ejercicios HTML sin cambiar su aspecto:
- los bloques <style> grandes (idénticos entre páginas) pasan a assets/css/<hash>.css, compartidos;
- las imágenes base64 incrustadas en atributos pasan a assets/img/<hash>.<ext>, compartidas.
Es idempotente: se puede volver a ejecutar tras añadir páginas nuevas."""
import re, glob, hashlib, os, sys
os.chdir(os.path.dirname(os.path.abspath(__file__)))
MIN_CSS, MIN_IMG = 1000, 2000
EXT = {'png': 'png', 'jpeg': 'jpg', 'jpg': 'jpg', 'gif': 'gif', 'webp': 'webp', 'svg+xml': 'svg', 'x-icon': 'ico', 'vnd.microsoft.icon': 'ico'}
E_ = dict(encoding='utf-8', errors='surrogateescape', newline='')
def save(path, text):
    if not os.path.exists(path):
        os.makedirs(os.path.dirname(path), exist_ok=True)
        with open(path, 'w', **E_) as f: f.write(text)
def h(t): return hashlib.md5(t.encode('utf-8', 'surrogateescape')).hexdigest()[:12]
before = after = 0
for f in sorted(glob.glob('Lessons/*/*.html') + glob.glob('Exercises/*/*.html')):
    s = open(f, **E_).read(); before += len(s.encode('utf-8', 'surrogateescape'))
    up = '../../'
    def style(m):
        attrs, css = m.group(1), m.group(2)
        if len(css) < MIN_CSS: return m.group(0)
        name = 'assets/css/%s.css' % h(css); save(name, css)
        return '<link rel="stylesheet"%s href="%s%s">' % (attrs.replace(' type="text/css"', ''), up, name)
    s = re.sub(r'<style\b([^>]*)>(.*?)</style>', style, s, flags=re.S)
    def img(m):
        mime, data = m.group(2), m.group(3)
        if len(data) < MIN_IMG or mime not in EXT: return m.group(0)
        name = 'assets/img/%s.%s' % (h(data), EXT[mime]); save(name, '')  # placeholder, escrito en binario abajo
        import base64
        p = name
        if os.path.getsize(p) == 0: open(p, 'wb').write(base64.b64decode(data))
        return m.group(1) + up + name
    s = re.sub(r'''((?:src|srcset|data-src|data-lazy-src|poster)=["']?)data:image/([a-z0-9.+\-]+);base64,([A-Za-z0-9+/=]+)''', img, s)
    # la CSP guardada por el descargador bloquea scripts/estilos externos; permitir los del propio sitio
    s = s.replace("script-src 'unsafe-inline' data:", "script-src 'self' 'unsafe-inline' data:").replace("style-src 'unsafe-inline';", "style-src 'self' 'unsafe-inline';")
    open(f, 'w', **E_).write(s); after += len(s.encode('utf-8', 'surrogateescape'))
print('HTML: %.0f MB -> %.0f MB' % (before / 1e6, after / 1e6))
tot = lambda d: sum(os.path.getsize(p) for p in glob.glob(d + '/*'))
print('assets/css %.1f MB, assets/img %.1f MB' % (tot('assets/css') / 1e6, tot('assets/img') / 1e6))
