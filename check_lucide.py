import re, io, sys
sys.stdout.reconfigure(encoding='utf-8')

t = io.open('_lucide_tmp.js', encoding='utf-8', errors='replace').read()
html = io.open('index.html', encoding='utf-8').read()
js = io.open('js/main.js', encoding='utf-8').read()

names = sorted(set(re.findall(r'data-lucide="([a-z0-9-]+)"', html + js)))


def pascal(n):
    return ''.join(p[:1].upper() + p[1:] for p in n.split('-'))


# \bSword\b НЕ совпадёт с Swords, \bArrowUp\b не совпадёт с ArrowUpCircle — точный тест
missing = [n for n in names if not re.search(r'\b' + re.escape(pascal(n)) + r'\b', t)]
print('used icons:', len(names))
print('STRICT MISSING:', missing if missing else 'none')
for api in ['createIcons', 'Lucide', 'lucide']:
    print(api, '->', bool(re.search(r'\b' + api + r'\b', t)))
