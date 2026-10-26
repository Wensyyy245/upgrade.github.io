import re, json, os, io

# 1. Проверка дубликатов функций в main.js
src = io.open('js/main.js', encoding='utf-8').read()
funcs = re.findall(r'^function\s+(\w+)', src, re.M)
dupes = {f: funcs.count(f) for f in set(funcs) if funcs.count(f) > 1}
print('main.js functions:', len(funcs), '| duplicates:', dupes or 'none')

consts = re.findall(r'^const\s+(\w+)', src, re.M)
cdupes = {c: consts.count(c) for c in set(consts) if consts.count(c) > 1}
print('const duplicates:', cdupes or 'none')

# 2. Проверка data_loader.js
raw = io.open('js/data_loader.js', encoding='utf-8').read()
print('data_loader.js size:', round(len(raw) / 1024, 1), 'KB')
print('starts with window.CS2_DATA:', raw.count('window.CS2_DATA'))

body = raw.split('=', 1)[1].strip().rstrip(';')
try:
    data = json.loads(body)
    print('JSON OK. skins:', len(data['skins']), 'cases:', len(data['cases']))
    s = data['skins'][0]
    print('sample skin keys:', list(s.keys()))
    print('sample skin:', {k: (v[:60] + '...' if isinstance(v, str) and len(v) > 60 else v) for k, v in s.items()})
    c = data['cases'][0]
    print('sample case:', c['name'], '| price:', c['price'], '| pool:', len(c['pool']))
    # Проверка что все кейсы имеют пул
    empty = [x['name'] for x in data['cases'] if len(x.get('pool', [])) < 5]
    print('cases with <5 items:', len(empty))
    # Проверка категорий
    cats = {}
    for sk in data['skins']:
        cats[sk['c']] = cats.get(sk['c'], 0) + 1
    print('categories:', cats)
    # Проверка наличия размера в URL картинок
    no_size = sum(1 for sk in data['skins'] if '320fx168f' not in sk['i'])
    print('images without size suffix:', no_size)
except Exception as e:
    print('JSON PARSE ERROR:', e)

# 3. Проверка HTML на соответствие id из JS
html = io.open('index.html', encoding='utf-8').read()
ids_in_html = set(re.findall(r'id="([^"]+)"', html))
ids_used = set(re.findall(r"getElementById\('([^']+)'\)", src))
missing = ids_used - ids_in_html
print('\nIDs used in JS but missing in HTML:', missing or 'none')

# 4. Проверка классов кнопок навигации
pages = set(re.findall(r'id="page-([^"]+)"', html))
navs = set(re.findall(r'data-page="([^"]+)"', html))
print('pages in HTML:', sorted(pages))
print('nav buttons:', sorted(navs))
print('nav without page:', navs - pages)

# 5. Функции, вызываемые из HTML onclick
onclick_funcs = set(re.findall(r'onclick="(\w+)\(', html))
defined = set(funcs)
undef = onclick_funcs - defined
print('\nonclick functions not defined in JS:', undef or 'none')
