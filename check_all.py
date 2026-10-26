import re, io, sys, json
sys.stdout.reconfigure(encoding='utf-8')

html = io.open('index.html', encoding='utf-8').read()
js = io.open('js/main.js', encoding='utf-8').read()
css = io.open('css/style.css', encoding='utf-8').read()

# 1. дубликаты объявлений
names = re.findall(r'^(?:function|const|let|var)\s+([A-Za-z_$][\w$]*)', js, re.M)
dups = sorted({n for n in names if names.count(n) > 1})
print('DUP declares:', dups or 'none')

# 2. onclick/onchange/onkeydown handlers -> есть ли функция
calls = set()
for m in re.findall(r'on(?:click|change|keydown)="([^"]+)"', html):
    calls |= set(re.findall(r'([A-Za-z_$][\w$]*)\s*\(', m))
missing = [c for c in sorted(calls) if not re.search(r'(function|const|let|var)\s+' + re.escape(c) + r'\b', js)]
print('MISSING js fns (html handlers):', missing or 'none')

# 3. getElementById в js -> id в html (или создаётся динамически)
ids_html = set(re.findall(r'id="([^"]+)"', html))
dyn = set(re.findall(r'id="([^"{$]+)', js)) | set(re.findall(r'innerHTML[^;]*?id=\\?"([^"{$]+)', js))
needed = set(re.findall(r"getElementById\('([^']+)'\)", js))
miss_ids = [i for i in sorted(needed) if i not in ids_html and i not in dyn]
print('MISSING ids:', miss_ids or 'none')

# 4. lucide иконки: есть ли в lucide
icons = set(re.findall(r'data-lucide="([^"]+)"', html)) | set(re.findall(r'data-lucide="([^"]+)"', js))
print('ICONS:', len(icons), sorted(icons))

# 5. onclick в js-строках
calls2 = set()
for m in re.findall(r'on(?:click|change)="([^"]+)"', js):
    calls2 |= set(re.findall(r'([A-Za-z_$][\w$]*)\s*\(', m))
miss2 = [c for c in sorted(calls2) if not re.search(r'(function|const|let|var)\s+' + re.escape(c) + r'\b', js)]
print('MISSING js fns (js handlers):', miss2 or 'none')

# 6. скобки
print('braces js:', js.count('{') - js.count('}'), 'parens:', js.count('(') - js.count(')'))
print('braces css:', css.count('{') - css.count('}'))
print('js lines:', js.count(chr(10)), 'css lines:', css.count(chr(10)))
