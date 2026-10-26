import re, io, sys
sys.stdout.reconfigure(encoding='utf-8')

js = io.open('js/main.js', encoding='utf-8').read()
html = io.open('index.html', encoding='utf-8').read()
css = io.open('css/style.css', encoding='utf-8').read()

emoji = re.findall(r'[\U0001F300-\U0001FAFF\u2600-\u27BF\u2B00-\u2BFF\uFE0F]', js + html)
print('EMOJI leftovers:', sorted(set(emoji)) or 'none')

print('upgradeReward writes:', re.findall(r"upgradeReward[^;]{0,80}", js)[:3])
print('Sell history entries:', len(re.findall(r"addGameHistory\('Sell", js)))
print('inventory remove on sell:', bool(re.search(r'inventory\.splice', js)))
print('sell price uses SELL_RATE:', js.count('SELL_RATE'))
print('admin pass modal:', bool(re.search(r"openModal\('pass'\)", js)))
print('confetti canvas in html:', 'id="confetti"' in html)
print('lucide script in html:', 'unpkg.com/lucide' in html)
print('data-lucide without handler-safe:', len(re.findall(r'data-lucide="([a-z0-9-]+)"', js)))
print('keyframes in css:', sorted(set(re.findall(r'@keyframes\s+([\w-]+)', css))))
print('tilt bind:', js.count('bindTilt'))
print('onclick html fns:', len(set(re.findall(r'onclick="(\w+)\(', html))))
