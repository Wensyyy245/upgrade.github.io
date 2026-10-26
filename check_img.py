import json, io, re

s = io.open('js/data_loader.js', encoding='utf-8').read()
d = json.loads(s.split('=', 1)[1].strip().rstrip(';'))

print('=== sample skin images ===')
for x in d['skins'][:3]:
    print(' ', x['w'], '|', x['n'], '->', x['i'][-40:])

with_size = sum(1 for x in d['skins'] if re.search(r'/\d+fx\d+f$', x['i']))
print('\nskins with /NNNxNNNf size suffix:', with_size, 'of', len(d['skins']))

case_size = sum(1 for c in d['cases'] if re.search(r'/\d+fx\d+f$', c['image']))
print('cases with size suffix:', case_size, 'of', len(d['cases']))

# Проверка main.js на дубликаты
m = io.open('js/main.js', encoding='utf-8').read()
funcs = re.findall(r'^function\s+(\w+)', m, re.M)
dups = {f: funcs.count(f) for f in set(funcs) if funcs.count(f) > 1}
print('\nmain.js top-level functions:', len(funcs), '| duplicates:', dups or 'none')

consts = re.findall(r'^(?:const|let|var)\s+(\w+)', m, re.M)
cdups = {c: consts.count(c) for c in set(consts) if consts.count(c) > 1}
print('const/let/var declarations:', len(consts), '| duplicates:', cdups or 'none')
