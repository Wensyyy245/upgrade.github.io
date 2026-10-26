import re, io, sys
sys.stdout.reconfigure(encoding='utf-8')

js = io.open('js/main.js', encoding='utf-8').read()
html = io.open('index.html', encoding='utf-8').read()
css = io.open('css/style.css', encoding='utf-8').read()

used = set()
for src in (js, html):
    for m in re.findall(r'class="([^"]*)"', src):
        m = re.sub(r'\$\{[^}]*\}', ' ', m)
        for c in m.split():
            if re.fullmatch(r'[a-z][a-z0-9-]*', c):
                used.add(c)
    used |= set(re.findall(r"classList\.(?:add|toggle|remove)\('([\w-]+)'", js))

css_defs = set(re.findall(r'\.([a-z][a-z0-9-]*)', css))
missing = sorted(c for c in used if c not in css_defs)
print('classes used:', len(used))
print('NOT styled in css:', missing or 'none')
