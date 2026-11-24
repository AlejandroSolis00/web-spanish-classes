#!/usr/bin/env python3
"""Quita de lecciones/ejercicios lo que venía del sitio original (WordPress) y no funciona en esta web:
buscador y cabecera, formulario de envío al profesor (Name/Email/Teacher/archivo/Submit), botones y paneles
de la plantilla, y los <link> de WordPress del <head>. Conserva el contenido y los campos de las preguntas.
Idempotente. Conserva canonical, Open Graph/Twitter/JSON-LD y el pie con el crédito."""
import re, glob, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
E_ = dict(encoding='utf-8', errors='surrogateescape', newline='')
TAG = re.compile(r'<(/?)div\b', re.I)

def balanced_end(s, start):
    """índice justo después del </div> que cierra el <div que empieza en start"""
    depth = 0
    for m in TAG.finditer(s, start):
        depth += -1 if m.group(1) else 1
        if depth == 0:
            return s.index('>', m.start()) + 1
    return None

def remove_divs(s, open_re, keep=lambda tag: False, replace=''):
    out, pos, n = [], 0, 0
    for m in re.finditer(open_re, s):
        if m.start() < pos: continue
        end = balanced_end(s, m.start())
        if end is None or keep(s[m.start():end]): continue
        out.append(s[pos:m.start()]); out.append(replace); pos = end; n += 1
    out.append(s[pos:]); return ''.join(out), n

def clean(s):
    # 1) <head>: enlaces de WordPress (se deja canonical)
    def link(m):
        t = m.group(0)
        if re.search(r'rel=["\']?(canonical)\b', t): return t
        if re.search(r'rel=["\']?(pingback|shortlink|EditURI|profile|https://api\.w\.org/)', t) or re.search(r'rel=["\']?alternate', t) and re.search(r'ixchelschool|wp-json|oembed|feed', t):
            return ''
        return t
    s = re.sub(r'<link\b[^>]*>', link, s)
    # 2) cabecera (menú, buscador, login): queda un contenedor vacío que lesson-nav.js rellena con el menú propio
    s, _ = remove_divs(s, r'<div\b[^>]*class="header_wrap[^"]*"[^>]*>', replace='<div class="header_wrap"></div>', keep=lambda t: t.strip() == '<div class="header_wrap"></div>')
    # 3) elementos de plantilla sin función aquí
    for pat in (r'<div\b[^>]*class="pace[ "][^>]*>', r'<div\b[^>]*\bid=["\']?um_upload_single\b[^>]*>', r'<div\b[^>]*\bid=["\']?um_view_photo\b[^>]*>',
                r'<div\b[^>]*\bid=["\']?sidr-main\b[^>]*>', r'<div\b[^>]*\bid=["\']?sidr-topbar\b[^>]*>', r'<div\b[^>]*\bid=["\']?miniTip\b[^>]*>'):
        s, _ = remove_divs(s, pat)
    s = re.sub(r'<a\b[^>]*class=["\']?to_top\b[^>]*>.*?</a>', '', s, flags=re.S)
    # enlaces a archivos del servidor original (p. ej. "Fill out this exercise"): no existen aquí
    s = re.sub(r'<a\b[^>]*href=["\']?https?://[^"\' >]*ixchelschool[^"\' >]*wp-content[^"\' >]*["\']?[^>]*>.*?</a>', '', s, flags=re.S)
    # 4) formulario de envío al profesor: campos Name/Email/Teacher/archivo, separador "Send…" y botón Submit
    def is_send(block):
        head = block[:260]
        if re.search(r'wpforms-field-(name|email|file-upload)\b', head): return True
        if 'wpforms-field-select' in head and re.search(r'Teacher', block): return True
        if 'wpforms-field-divider' in head and re.search(r'>\s*Send', block): return True
        return False
    s, _ = remove_divs(s, r'<div id=wpforms-\d+-field_\d+-container\b[^>]*>', keep=lambda b: not is_send(b))
    s, _ = remove_divs(s, r'<div\b[^>]*class=["\']?wpforms-submit-container\b[^>]*>')
    # miniaturas vacías de "Related posts" (imágenes que no se guardaron): se quitan, queda el título enlazado
    s, _ = remove_divs(s, r'<div class=related_img>', keep=lambda b: 'rect fill-opacity="0"' not in b)
    s = re.sub(r'<input\b[^>]*dz-hidden-input[^>]*>', '', s)  # restos del cargador de archivos
    # 5) el <form> ya no envía nada: queda como contenedor (los campos de las preguntas siguen siendo editables)
    s, _ = remove_divs(s, r'<div\b[^>]*class="wpforms-container[^"]*"[^>]*>', keep=lambda b: re.search(r'<(input|textarea|select)\b', b) is not None)
    s = re.sub(r'<form\b[^>]*>', '<div class="lm-form">', s); s = s.replace('</form>', '</div>')
    return s

if __name__ == '__main__':
    tot = 0
    for f in sorted(glob.glob('Lessons/*/*.html') + glob.glob('Exercises/*/*.html')):
        s = open(f, **E_).read(); n = clean(s)
        if n != s:
            open(f, 'w', **E_).write(n); tot += 1
    print('páginas modificadas:', tot)
