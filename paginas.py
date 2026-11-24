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
            '<nav class="menu" aria-label="Principal"><a href="index.html"%s>Inicio</a>%s%s<a href="agenda.html"%s>Agenda</a></nav>'
            '<button class="findbtn" type="button" aria-label="Buscar material">%s<span>Buscar</span><kbd>/</kbd></button><button class="burger" type="button" aria-label="Menú" aria-expanded="false"><span></span></button></div></header>\n'
            % (LOGO, ' class="on"' if active == 'index' else '', menu('lec', 'Lecciones'), menu('ej', 'Ejercicios'), ' class="on"' if active == 'agenda' else '', SEARCH))

def footer():
    lec = ''.join('<li><a href="%s.html">%s</a></li>' % (l['lec'], l['name']) for l in LEVELS)
    ej = ''.join('<li><a href="%s.html">%s</a></li>' % (i, v[0]) for i, v in EJ.items())
    return ('<footer><div class="wrap"><div><a class="brand" href="index.html">%s<span>Spanish Classes</span></a>'
            '<p>Material de clase organizado por nivel, con cada lección enlazada a sus ejercicios.</p></div>'
            '<div><h4>Lecciones</h4><ul>%s</ul></div><div><h4>Ejercicios</h4><ul>%s</ul></div>'
            '<div class="legal">Atajos: <kbd>/</kbd> o <kbd>Ctrl</kbd> + <kbd>K</kbd> para buscar. Todo se abre en una pestaña nueva. <button type="button" class="linkbtn" data-logout>Cerrar sesión</button></div></div></footer>\n'
            '<script src="catalog.js"></script>\n<script src="site.js"></script>\n<script src="store.js"></script>\n</body>\n</html>\n' % (LOGO, lec, ej))

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
        '<main id="main"><section class="loginbox"><div class="loginbox-in"><span class="loginbrand">%s</span><h1>Spanish Classes</h1><p>Inicia sesión para entrar al material y a tu agenda.</p>'
        '<form id="fLogin"><label for="lEmail">Correo</label><input id="lEmail" type="email" autocomplete="username" required><label for="lPass">Contraseña</label><input id="lPass" type="password" autocomplete="current-password" required>'
        '<p class="lerr" id="lErr" role="alert" hidden></p><button class="btn btn-primary" type="submit" id="lBtn">Entrar</button></form></div></section>'
        '<section class="desk"><div class="wrap"><h1>Material de clase</h1>'
        '<p class="lead"><span data-count="Lección"></span> lecciones y <span data-count="Ejercicio"></span> ejercicios. Busca por tema o número, o entra por nivel.</p>'
        '<div class="finder" id="homeFinder"><div class="searchbox" id="buscar">%s<input id="searchInput" type="search" placeholder="Tema o número: imperativo, 012…" aria-label="Buscar lecciones y ejercicios" autocomplete="off"></div>'
        '<div class="filters"><div class="seg" role="group" aria-label="Tipo"><button type="button" data-kind="" aria-pressed="true">Todo</button><button type="button" data-kind="Lección" aria-pressed="false">Lecciones</button><button type="button" data-kind="Ejercicio" aria-pressed="false">Ejercicios</button></div>'
        '<select class="select" aria-label="Nivel"><option value="">Todos los niveles</option><option>Beginner I</option><option>Beginner II</option><option>Intermediate</option><option>Advanced</option></select></div></div>'
        '<div class="quick"><span>Temas frecuentes:</span>%s</div></div></section>'
        '<div class="wrap"><section class="results" id="searchResults"><div class="count" id="searchCount" aria-live="polite"></div><ul class="rows" id="resultList" style="margin-top:10px"></ul>'
        '<div class="empty" id="noResults"><b>No encontramos <span id="noTerm"></span></b><p>Prueba con otra palabra, con el número de la lección o quita los filtros.</p><button class="btn btn-primary" id="clearSearch" type="button">Borrar búsqueda</button></div></section>'
        '<div id="homeContent"><section class="block" id="hoy" hidden></section><section class="block" id="favs" hidden><h2>Favoritos <small>marcados con la estrella</small></h2><ul class="rows"></ul></section>'
        '<section class="block" id="recent" hidden><h2>Abiertos hace poco</h2><ul class="rows"></ul></section>'
        '<section class="block" id="niveles"><h2>Todo el material por nivel</h2><div class="matrix">%s</div></section></div></div></main>\n'
        % (LOGO, SEARCH, quick, rows) + footer().replace('<script src="store.js"></script>', '<script src="store.js"></script>\n<script src="hoy.js"></script>\n<script src="login.js"></script>'))

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

def agenda():
    head = HEAD.format(title='Agenda · Spanish Classes', desc='Agenda semanal de clases por alumno.').replace('<link rel="stylesheet" href="site.css">', '<link rel="stylesheet" href="site.css">\n<link rel="stylesheet" href="agenda.css">')
    opts = ''.join('<option>%s</option>' % n for n in ('Beginner I', 'Beginner II', 'Intermediate I', 'Intermediate II', 'Advanced I', 'Advanced II'))
    body = '''<main id="main"><section class="ag-top"><div class="wrap"><h1>Agenda</h1><p class="lead">Clases de la semana por alumno. Los datos se guardan solo en este navegador: haz una copia de vez en cuando.</p></div></section>
<p class="wrap ag-load" id="agLoad">Cargando…</p>
<div class="wrap ag-login" id="agLogin" hidden><h2>Inicia sesión</h2><p>La agenda guarda nombres y pagos de alumnos, así que está protegida con tu cuenta.</p>
<form id="fLogin"><div class="fld"><label for="lEmail">Correo</label><input id="lEmail" type="email" autocomplete="username" required></div><div class="fld"><label for="lPass">Contraseña</label><input id="lPass" type="password" autocomplete="current-password" required></div>
<p class="warn" id="lErr" role="alert" hidden></p><button class="btn btn-primary" type="submit" id="lBtn">Entrar</button></form></div>
<div class="wrap ag" id="agApp" hidden><p class="ag-warn" id="agWarn" role="alert" hidden>El navegador no permite guardar datos: los cambios se perderán al cerrar esta página.</p>
<div class="ag-pending" id="agPending" hidden></div>
<div class="ag-due" id="agDue" hidden></div>
<div class="ag-bar"><div class="ag-nav"><button type="button" id="agPrev" aria-label="Semana anterior">‹</button><button type="button" id="agToday">Hoy</button><button type="button" id="agNext" aria-label="Semana siguiente">›</button><h2 id="agLabel" aria-live="polite"></h2></div>
<div class="ag-acts"><button type="button" class="btn btn-ghost" id="agStudents">Alumnos</button><button type="button" class="btn btn-primary" id="agNew">+ Nueva clase</button></div></div>
<div id="agView"></div>
<div class="ag-foot"><button type="button" class="btn btn-ghost" id="agExport">Exportar copia</button><label class="btn btn-ghost">Importar copia<input type="file" id="agImport" accept="application/json,.json" hidden></label><span id="agMsg" role="status"></span><span id="agSync" role="status"></span><button type="button" class="btn btn-ghost" id="agOut">Cerrar sesión</button></div></div></main>
<dialog id="dlgClass" class="ag-dlg" aria-labelledby="clsTitle"><form id="fClass" novalidate><h2 id="clsTitle">Nueva clase</h2>
<p class="ag-info" id="cInfo" hidden></p>
<div class="fld" id="cStudentW"><label for="cStudent">Alumno</label><select id="cStudent"></select></div>
<div class="row3"><div class="fld"><label for="cDate">Fecha</label><input type="date" id="cDate" required></div><div class="fld"><label for="cTime">Hora</label><input type="time" id="cTime" step="300" required></div><div class="fld"><label for="cDur">Duración (min)</label><input type="number" id="cDur" min="15" max="300" step="5" value="60"></div></div>
<div class="fld" id="cStatusW"><label for="cStatus">Estado</label><select id="cStatus"><option value="programada">Programada</option><option value="dada">Dada</option><option value="cancel-alumno">Canceló el alumno</option><option value="cancel-maestro">Canceló el maestro</option><option value="descartada">Descartada</option></select></div>
<div class="fld" id="cChargeW" hidden><label class="chk"><input type="checkbox" id="cCharge"> Cobrar esta clase aunque no se dio</label></div>
<div class="fld" id="cRepW"><label class="chk"><input type="checkbox" id="cRep"> Repetir cada semana</label><div id="cUntilW" hidden><label for="cUntil">Hasta (opcional)</label><input type="date" id="cUntil"></div></div>
<fieldset id="cScopeW" hidden><legend>Esta clase se repite cada semana. Aplicar los cambios a:</legend><label class="chk"><input type="radio" name="cScope" value="one" checked> Solo esta clase</label><label class="chk"><input type="radio" name="cScope" value="following"> Esta y las siguientes</label></fieldset>
<div id="cNotesW" hidden><div class="fld"><label for="cNotes">Lo que se dio / notas</label><textarea id="cNotes" rows="3" maxlength="1000" placeholder="Ej.: repasamos el pretérito; le costó irregulares"></textarea></div>
<div class="fld"><label for="cMatQ">Material de la clase</label><input id="cMatQ" type="search" placeholder="Buscar lección o ejercicio: tema o número" autocomplete="off"><ul class="matres" id="cMatRes" hidden></ul><ul class="chips" id="cMat"></ul></div></div>
<p class="warn" id="cWarn" role="alert" hidden></p>
<div class="dlg-more" id="cMore" hidden><button type="button" class="btn btn-ghost" id="cResched">Reagendar</button><button type="button" class="btn btn-ghost" id="cDisc" title="La clase no se da y no se cobra">Descartar clase</button><button type="button" class="btn btn-ghost" id="cDiscW">Descartar la semana</button></div>
<div class="dlg-acts"><button type="button" class="btn btn-ghost danger" id="cDel" hidden>Eliminar</button><button type="button" class="btn btn-ghost danger" id="cDelF" hidden>Eliminar esta y las siguientes</button><span class="sp"></span><button type="button" class="btn btn-ghost" id="cCancel">Cancelar</button><button type="submit" class="btn btn-primary" id="cSave">Guardar</button></div></form></dialog>
<dialog id="dlgStud" class="ag-dlg" aria-labelledby="studTitle"><h2 id="studTitle">Alumnos</h2><ul class="slist" id="sList"></ul>
<form id="fStud"><h3 id="sFormTitle">Nuevo alumno</h3><div class="row2"><div class="fld" id="sNameW"><label for="sName">Nombre</label><input id="sName" maxlength="60" autocomplete="off" required></div><div class="fld"><label for="sLevel">Nivel</label><select id="sLevel"><option value="">—</option>%s</select></div></div>
<div class="row2"><div class="fld"><label for="sRate">Tarifa por clase</label><input id="sRate" type="number" min="0" step="0.01" inputmode="decimal" placeholder="0"></div><div class="fld" id="sFromW" hidden><label for="sFrom">Si cambia, vigente desde</label><input id="sFrom" type="date"></div></div>
<div class="dlg-acts"><button type="button" class="btn btn-ghost" id="sClose">Cerrar</button><span class="sp"></span><button type="button" class="btn btn-ghost" id="sReset">Nuevo</button><button type="submit" class="btn btn-primary">Guardar alumno</button></div></form>
<h3>Ajustes de cobro</h3><div class="row2"><div class="fld"><label for="sCurrency">Moneda (símbolo)</label><input id="sCurrency" maxlength="5"></div><div class="fld"><label for="sThreshold">Avisar desde N clases sin pagar</label><input id="sThreshold" type="number" min="0" max="99"></div></div></dialog>
<dialog id="dlgAcct" class="ag-dlg" aria-labelledby="aTitle"><h2 id="aTitle">Cuenta</h2><div class="a-sum" id="aSum"></div>
<form id="fPay"><h3>Registrar pago</h3><div class="row3"><div class="fld"><label for="pDate">Fecha</label><input type="date" id="pDate" required></div><div class="fld"><label for="pAmt">Monto</label><input type="number" id="pAmt" min="0" step="0.01" inputmode="decimal"></div><div class="fld"><label for="pMethod">Método</label><select id="pMethod"><option>Efectivo</option><option>Transferencia</option><option>Otro</option></select></div></div>
<p class="hint" id="pHint" aria-live="polite"></p><div class="dlg-acts"><button type="button" class="btn btn-ghost" id="aClose">Cerrar</button><span class="sp"></span><button type="submit" class="btn btn-primary">Registrar pago</button></div></form>
<h3>Pagos</h3><ul class="slist" id="aPays"></ul><h3>Clases cobrables (las más recientes)</h3><ul class="slist" id="aClasses"></ul></dialog>
''' % opts
    return head + nav('agenda') + body + footer().replace('<script src="store.js"></script>', '<script src="store.js"></script>\n<script src="agenda.js"></script>')

GATE = ("<script>(function(){var ok=false;try{for(var i=0;i<localStorage.length;i++)if(/^sb-.+-auth-token$/.test(localStorage.key(i)))ok=true}catch(e){}"
        "if(!ok){%s}})();</script>\n")
def gated(name, text):
    # Sin sesión: la portada muestra solo el inicio de sesión y las demás páginas llevan a ella
    if name == '404.html': return text
    act = "document.documentElement.classList.add('nolog')" if name == 'index.html' else \
          "var p=location.pathname.split('/').pop()||'index.html';location.replace('index.html?next='+encodeURIComponent(p))"
    return text.replace('</head>', GATE % act + '</head>', 1)

def write(name, text):
    open(name, 'w', encoding='utf-8').write(gated(name, text))

write('index.html', home())
write('404.html', notfound())
write('agenda.html', agenda())
for l in LEVELS: write(l['lec'] + '.html', listing(l['lec']))
for e in EJ: write(e + '.html', listing(e))
print('Generadas', 3 + len(LEVELS) + len(EJ), 'páginas')
