import json, io, re

raw = io.open('js/data_loader.js', encoding='utf-8').read()
data = json.loads(raw.split('=', 1)[1].strip().rstrip(';'))

skins = data['skins']
cases = data['cases']

cats = {}
for s in skins:
    cats[s['c']] = cats.get(s['c'], 0) + 1
print('categories:', cats)

prices = sorted(s['p'] for s in skins)
print('price min/median/max:', prices[0], prices[len(prices)//2], prices[-1])

print('\nTOP 12 skins:')
for s in skins[:12]:
    print(f"  {s['w']:24s} | {s['n']:26s} ${s['p']:>10,.2f}  {s['c']}")

print('\nKNIFE sample:')
kn = [s for s in skins if s['c'] == 'knife']
for s in kn[:10]:
    print(f"  {s['w']:24s} | {s['n']:26s} ${s['p']:>10,.2f}")

print('\nCASES:')
for c in cases:
    pool = c['pool']
    kn_count = len([s for s in pool if s['c'] == 'knife'])
    best = max(pool, key=lambda x: x['p'])
    print(f"  {c['name'][:34]:34s} ${c['price']:>5.2f}  pool={len(pool):2d} knives={kn_count} best={best['w']}|{best['n']} ${best['p']:,.2f}")

# Проверка битых картинок
bad = [s for s in skins if 'economy/image' not in s['i'] or not s['i']]
print('\nskins with bad image url:', len(bad))
print('cases with bad image url:', len([c for c in cases if 'economy/image' not in c['image']]))
