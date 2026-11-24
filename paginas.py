#!/usr/bin/env python3
"""Genera index.html y las 10 páginas de listado (lecciones-*.html / ejercicios-*.html).
Las cifras y las listas se rellenan en el navegador desde catalog.js; aquí solo va el esqueleto.
Uso: python3 paginas.py"""
import os, html
os.chdir(os.path.dirname(os.path.abspath(__file__)))

LEVELS = [
    dict(n=1, name='Beginner I', lec='lecciones-beginner1', ejs=['ejercicios-beginner1'],
         blurb='Preséntate, haz preguntas y habla del presente. Aquí empiezas con ser, estar, haber y gustar.',
         topics=[('Mini diálogos', 'mini'), ('Números', 'numeros'), ('Ser y estar', 'ser'), ('Gustar', 'gustar'), ('Presente', 'presente'), ('Reflexivos', 'reflexivos')]),
    dict(n=2, name='Beginner II', lec='lecciones-beginner2', ejs=['ejercicios-beginner2'],
         blurb='Cuenta lo que pasó: pretérito, imperfecto y las expresiones que se usan todos los días.',
         topics=[('Pretérito', 'pretérito'), ('Imperfecto', 'imperfecto'), ('Demostrativos', 'demostrativos'), ('Adverbios', 'adverbios'), ('Usos de SE', 'se')]),
    dict(n=3, name='Intermediate I', lec='lecciones-intermediate1', ejs=['ejercicios-intermediate1', 'ejercicios-intermediate2'],
         blurb='Habla del futuro, compara y combina tiempos: condicional, progresivos, participios y perfectos.',
         topics=[('Futuro', 'futuro'), ('Por y para', 'por'), ('Condicional', 'condicional'), ('Progresivos', 'progresivo'), ('Voz pasiva', 'pasiva'), ('Perfectos', 'perfecto')]),
    dict(n=4, name='Advanced', lec='lecciones-advanced', ejs=['ejercicios-advanced1', 'ejercicios-advanced2'],
         blurb='El imperativo, el subjuntivo en todos sus tiempos y los pronombres relativos.',
         topics=[('Imperativo', 'imperativo'), ('Subjuntivo', 'subjuntivo'), ('Cláusulas', 'cláusula'), ('Pronombres relativos', 'relativos')]),
]
EJ = {  # id -> (nombre, descripción, nivel)
    'ejercicios-beginner1': ('Beginner I', 'Minidiálogos, números, artículos, ser y estar, presente y gustar, para practicar lo básico.', 0),
    'ejercicios-beginner2': ('Beginner II', 'Pretérito regular e irregular, imperfecto, demostrativos, adverbios y usos de SE.', 1),
    'ejercicios-intermediate1': ('Intermediate I', 'Futuro, por y para, sinónimos y antónimos, condicional y pronombres de complemento.', 2),
    'ejercicios-intermediate2': ('Intermediate II', 'Participios, tiempos progresivos, voz pasiva y tiempos perfectos.', 2),
    'ejercicios-advanced1': ('Advanced I', 'Imperativo formal, familiar y de nosotros, con sus formas negativas.', 3),
    'ejercicios-advanced2': ('Advanced II', 'Subjuntivo en todos sus tiempos, cláusulas y pronombres relativos.', 3),
}
LEC_INTRO = {
    'lecciones-beginner1': 'Lecciones para empezar desde cero: saludos, números, artículos y sustantivos, el trío ser, estar y haber, y el presente de indicativo.',
    'lecciones-beginner2': 'Cuenta historias en pasado. Aprenderás el pretérito, el imperfecto y cuándo usar cada uno, además de demostrativos, adverbios y pronombres.',
    'lecciones-intermediate1': 'Del futuro y el condicional a los tiempos progresivos y perfectos. Incluye por y para, voz pasiva y discurso indirecto.',
    'lecciones-advanced': 'El nivel más completo: imperativo, presente, imperfecto y perfectos de subjuntivo, y pronombres relativos.',
}

LOGO = ("<svg viewBox='0 0 96 96' aria-hidden='true'><rect width='96' height='96' fill='#2547d0'/><path d='M48 6c10 14 24 14 42 0-14 18-14 32 0 42-14 10-14 24 0 42-18-14-32-14-42 0-10-14-24-14-42 0 14-18 14-32 0-42 14-10 14-24 0-42 18 14 32 14 42 0z' fill='#fff' fill-opacity='.22'/><circle cx='48' cy='48' r='13' fill='#f6b92b'/></svg>")
SEARCH = "<svg viewBox='0 0 24 24' fill='none' stroke='currentColor' stroke-width='2.2' stroke-linecap='round' aria-hidden='true'><circle cx='11' cy='11' r='7'/><path d='M20 20l-4-4'/></svg>"
HEAD = """<!DOCTYPE html>
<html lang="es">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>{title}</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Bricolage+Grotesque:opsz,wght@12..96,600;12..96,750;12..96,800&family=Figtree:wght@400;500;600;700&display=swap" rel="stylesheet">
<link rel="stylesheet" href="site.css">
</head>
<body>
<a class="skip" href="#main">Saltar al contenido</a>
"""

def nav(active):
    def menu(kind, label):
        links = ''.join('<a href="{0}.html"{1}>{2}</a>'.format(i, ' class="on"' if i == active else '', n)
                        for i, n in ((l['lec'], l['name']) for l in LEVELS)) if kind == 'lec' else \
                ''.join('<a href="{0}.html"{1}>{2}</a>'.format(i, ' class="on"' if i == active else '', v[0]) for i, v in EJ.items())
        on = ' on' if active and active.startswith('lecciones' if kind == 'lec' else 'ejercicios') else ''
        return '<div class="dd%s"><button type="button">%s</button><div class="dd-panel">%s</div></div>' % (on, label, links)
    return ('<header class="top"><div class="wrap"><a class="brand" href="index.html">%s<span>Spanish Classes</span></a>'
            '<nav class="menu" aria-label="Principal"><a href="index.html"%s>Inicio</a>%s%s</nav>'
            '<button class="findbtn" type="button" aria-label="Buscar material">%s<span>Buscar</span><kbd>/</kbd></button><button class="burger" type="button" aria-label="Menú" aria-expanded="false"><span></span></button></div></header>\n'
            % (LOGO, ' class="on"' if active == 'index' else '', menu('lec', 'Lecciones'), menu('ej', 'Ejercicios'), SEARCH))

def footer():
    lec = ''.join('<li><a href="%s.html">%s</a></li>' % (l['lec'], l['name']) for l in LEVELS)
    ej = ''.join('<li><a href="%s.html">%s</a></li>' % (i, v[0]) for i, v in EJ.items())
    return ('<footer><div class="wrap"><div><a class="brand" href="index.html">%s<span>Spanish Classes</span></a>'
            '<p>Material de clase organizado por nivel, con cada lección enlazada a sus ejercicios.</p></div>'
            '<div><h4>Lecciones</h4><ul>%s</ul></div><div><h4>Ejercicios</h4><ul>%s</ul></div>'
            '<div class="legal">Atajos: <kbd>/</kbd> o <kbd>Ctrl</kbd> + <kbd>K</kbd> para buscar. Todo se abre en una pestaña nueva.</div></div></footer>\n'
            '<script src="catalog.js"></script>\n<script src="site.js"></script>\n</body>\n</html>\n' % (LOGO, lec, ej))

def home():
    rows = ''
    for l in LEVELS:
        ids = ','.join(l['ejs'])
        ej_links = ''.join('<a class="go-btn ej" href="%s.html">Ejercicios%s<em><span data-count="%s"></span></em></a>' % (e, '' if len(l['ejs']) == 1 else ' ' + EJ[e][0].split()[-1], e) for e in l['ejs'])
        tp = ''.join('<li><a href="%s.html?q=%s">%s</a></li>' % (l['lec'], q, t) for t, q in l['topics'])
        rows += ('<div class="mrow"><h3>%s<span><span data-count="%s"></span> lecciones</span></h3>'
                 '<div class="mcol"><b>Lecciones</b><a class="go-btn" href="%s.html">Todas las lecciones<em><span data-count="%s"></span></em></a><ul class="topics">%s</ul></div>'
                 '<div class="mcol"><b>Ejercicios</b>%s</div></div>' % (l['name'], l['lec'], l['lec'], l['lec'], tp, ej_links))
    quick = ''.join('<button type="button">%s</button>' % t for t in ['imperativo', 'subjuntivo', 'pretérito', 'ser y estar', 'por y para', 'gustar', 'participio'])
    return (HEAD.format(title='Spanish Classes · Material de clase', desc='Lecciones y ejercicios de español organizados por nivel, para localizarlos rápido en clase.') + nav('index') +
        '<main id="main"><section class="desk"><div class="wrap"><h1>Material de clase</h1>'
        '<p class="lead"><span data-count="Lección"></span> lecciones y <span data-count="Ejercicio"></span> ejercicios. Busca por tema o número, o entra por nivel.</p>'
        '<div class="finder" id="homeFinder"><div class="searchbox" id="buscar">%s<input id="searchInput" type="search" placeholder="Tema o número: imperativo, 012…" aria-label="Buscar lecciones y ejercicios" autocomplete="off"></div>'
        '<div class="filters"><div class="seg" role="group" aria-label="Tipo"><button type="button" data-kind="" aria-pressed="true">Todo</button><button type="button" data-kind="Lección" aria-pressed="false">Lecciones</button><button type="button" data-kind="Ejercicio" aria-pressed="false">Ejercicios</button></div>'
        '<select class="select" aria-label="Nivel"><option value="">Todos los niveles</option><option>Beginner I</option><option>Beginner II</option><option>Intermediate</option><option>Advanced</option></select></div></div>'
        '<div class="quick"><span>Temas frecuentes:</span>%s</div></div></section>'
        '<div class="wrap"><section class="results" id="searchResults"><div class="count" id="searchCount" aria-live="polite"></div><ul class="rows" id="resultList" style="margin-top:10px"></ul>'
        '<div class="empty" id="noResults"><b>No encontramos <span id="noTerm"></span></b><p>Prueba con otra palabra, con el número de la lección o quita los filtros.</p><button class="btn btn-primary" id="clearSearch" type="button">Borrar búsqueda</button></div></section>'
        '<div id="homeContent"><section class="block" id="favs" hidden><h2>Favoritos <small>marcados con la estrella</small></h2><ul class="rows"></ul></section>'
        '<section class="block" id="recent" hidden><h2>Abiertos hace poco</h2><ul class="rows"></ul></section>'
        '<section class="block" id="niveles"><h2>Todo el material por nivel</h2><div class="matrix">%s</div></section></div></div></main>\n'
        % (SEARCH, quick, rows) + footer())

def listing(sid):
    kind = 'lecciones' if sid.startswith('lecciones') else 'ejercicios'
    lec = sid.startswith('lecciones')
    if lec:
        lv = [l for l in LEVELS if l['lec'] == sid][0]; name = lv['name']; idx = LEVELS.index(lv); intro = LEC_INTRO[sid]
        tabs = [(l['lec'], l['name']) for l in LEVELS]
        nxt = LEVELS[idx + 1] if idx + 1 < len(LEVELS) else None
        ctas = ''.join('<a class="cta alt" href="%s.html"><small>Material del mismo nivel</small><strong>Ejercicios %s</strong></a>' % (e, EJ[e][0]) for e in lv['ejs'])
        if nxt: ctas += '<a class="cta" href="%s.html"><small>Siguiente nivel</small><strong>Lecciones %s</strong></a>' % (nxt['lec'], nxt['name'])
        facts = '<span><b data-count="%s"></b> lecciones</span><span><b data-count="%s"></b> ejercicios relacionados</span>' % (sid, ','.join(lv['ejs']))
        seg = ''
    else:
        name, intro, li = EJ[sid]; lv = LEVELS[li]
        tabs = [(i, v[0]) for i, v in EJ.items()]
        keys = list(EJ); k = keys.index(sid)
        ctas = '<a class="cta alt" href="%s.html"><small>Material del mismo nivel</small><strong>Lecciones %s</strong></a>' % (lv['lec'], lv['name'])
        if k + 1 < len(keys): ctas += '<a class="cta" href="%s.html"><small>Siguiente serie</small><strong>Ejercicios %s</strong></a>' % (keys[k + 1], EJ[keys[k + 1]][0])
        facts = '<span><b data-count="%s"></b> ejercicios</span><span><b data-pdf="%s"></b> en PDF</span>' % (sid, sid)
        seg = '<div class="seg" role="group" aria-label="Formato"><button type="button" data-type="all" aria-pressed="true">Todos</button><button type="button" data-type="html" aria-pressed="false">HTML</button><button type="button" data-type="pdf" aria-pressed="false">PDF</button></div>'
    tabs_html = ''.join('<a href="%s.html"%s>%s</a>' % (i, ' class="on" aria-current="page"' if i == sid else '', n) for i, n in tabs)
    kl = 'Lecciones' if lec else 'Ejercicios'
    return (HEAD.format(title='%s %s · Spanish Classes' % (kl, name), desc=intro) + nav(sid) +
        '<main id="main"><section class="pagehead%s"><div class="wrap"><div class="crumbs"><a href="index.html">Inicio</a><span>/</span><span>%s</span></div>'
        '<div class="headgrid"><div><h1>%s</h1><p class="lead">%s</p><div class="facts">%s</div></div><div class="levelmark" aria-hidden="true"><span>%d</span></div></div><nav class="tabs" aria-label="Niveles de %s">%s</nav></div></section>'
        '<div class="wrap"><div class="toolbar"><div class="searchbox">%s<input id="filterInput" type="search" placeholder="Filtrar este nivel: tema o número" aria-label="Filtrar" autocomplete="off"></div>%s</div>'
        '<div class="count" id="listCount" aria-live="polite"></div><div class="jump" id="jump"></div>'
        '<div id="fileList" data-section="%s"></div>'
        '<div class="empty" id="empty"><b>Nada coincide con <span id="emptyTerm"></span></b><p>Revisa la ortografía o prueba con una palabra más corta.</p><button class="btn btn-primary" id="clearFilter" type="button">Quitar filtros</button></div>'
        '<div class="nextlevel">%s</div></div></main>\n'
        % (' ej' if not lec else '', kl, kl + ' ' + name, html.escape(intro), facts, lv['n'], kl.lower(), tabs_html, SEARCH, seg, sid, ctas)
        + footer())

def notfound():
    base = ("<script>(function(){var p=location.pathname.split('/');var b=/github\\.io$/.test(location.hostname)?'/'+p[1]+'/':'/';"
            "document.write('<base href=\"'+b+'\">');})();</script>\n")
    head = HEAD.format(title='Página no encontrada · Spanish Classes', desc='La página que buscas no existe.').replace('<title>', base + '<title>', 1)
    lec = ''.join('<a class="go-btn" href="%s.html">Lecciones %s</a>' % (l['lec'], l['name']) for l in LEVELS)
    ej = ''.join('<a class="go-btn ej" href="%s.html">Ejercicios %s</a>' % (i, v[0]) for i, v in EJ.items())
    return (head + nav(None) +
        '<main id="main"><div class="wrap"><div class="lost"><h1>No encontramos esa página</h1>'
        '<p class="lead">El enlace puede estar mal escrito o el archivo ya no está. Busca la lección o el ejercicio, o entra por nivel.</p>'
        '<div class="lost-actions"><a class="btn btn-primary" href="index.html">Ir al inicio</a><button class="btn btn-ghost findbtn-open" type="button">Buscar material</button></div>'
        '<div class="lost-grid"><div class="mcol"><b>Lecciones</b>%s</div><div class="mcol"><b>Ejercicios</b>%s</div></div></div></div></main>\n' % (lec, ej) + footer())

def write(name, text):
    open(name, 'w', encoding='utf-8').write(text)

write('index.html', home())
write('404.html', notfound())
for l in LEVELS: write(l['lec'] + '.html', listing(l['lec']))
for e in EJ: write(e + '.html', listing(e))
print('Generadas', 2 + len(LEVELS) + len(EJ), 'páginas')
