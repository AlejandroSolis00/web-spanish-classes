#!/usr/bin/env python3
"""Valida catalog.json contra los archivos reales y genera catalog.js.
Los elementos cuyo archivo no existe se eliminan; los archivos sin entrada se avisan.
Uso: python3 build.py   (ejecutar tras añadir/borrar lecciones o ejercicios)"""
import json, os, glob, re, unicodedata
from relations import RULES
ALIAS = {}  # entradas con nombre distinto al archivo real: {"ruta en catalog.json": "ruta real"}
os.chdir(os.path.dirname(os.path.abspath(__file__)))
secs = json.load(open('catalog.json'))
used, removed = set(), []
for s in secs:
    keep = []
    for it in s['items']:
        it['href'] = ALIAS.get(it['href'], it['href'])
        if os.path.exists(it['href']):
            keep.append(it); used.add(it['href'])
        else:
            removed.append(it['href'])
    s['items'] = keep

def norm(t): return unicodedata.normalize('NFD', t.lower()).encode('ascii', 'ignore').decode()
def num(text): m = re.search(r'(?:Lesson|Exercise) [A-Z]?-?\d?-?(\d+)', text); return int(m.group(1)) if m else None
byid = {s['id']: s for s in secs}
for s in secs:
    for it in s['items']: it['rel'] = []
claimed = set()
for (lsec, n), rules in RULES.items():
    lesson = [i for i in byid[lsec]['items'] if num(i['text']) == n and i['type'] == 'html']
    if not lesson: continue  # lección eliminada: sus ejercicios quedan sin enlace
    lesson = lesson[0]
    for r in rules:
        for esec in r[0]:
            for ex in byid[esec]['items']:
                title = norm(ex['text'].split(':', 1)[-1].strip())
                k = num(ex['text'])
                if re.search(r[1], title) and (len(r) < 3 or r[2][0] <= k <= r[2][1]) and ex['href'] not in lesson['rel']:
                    lesson['rel'].append(ex['href']); ex['rel'].append(lesson['href']); claimed.add(ex['href'])
disk = {p for p in glob.glob('Lessons/*/*') + glob.glob('Exercises/*/*') if not p.endswith('.DS_Store')}
open('catalog.js', 'w').write('window.CATALOG = ' + json.dumps(secs, ensure_ascii=False) + ';\n')
nex = sum(len(s['items']) for s in secs if s['kind'] == 'Ejercicio')
print(f'{len(claimed)} de {nex} ejercicios enlazados a una lección')
print(f'{sum(len(s["items"]) for s in secs)} elementos en catálogo')
for r in removed: print('  eliminado (no existe):', r)
for u in sorted(disk - used): print('  sin entrada en catalog.json:', u)
