import json, io

c = json.load(io.open('crates.json', encoding='utf-8'))
cases = [x for x in c if x.get('type') == 'Case']
print('total cases:', len(cases))
print('\ncases with dates (last 30):')
for x in sorted(cases, key=lambda z: z.get('first_sale_date') or '', reverse=True)[:30]:
    print(f"  {x.get('first_sale_date')}  {x['name'][:40]:40s} contains={len(x.get('contains',[]))} rare={len(x.get('contains_rare',[]))}")

print('\nrare names sample (Kilowatt):')
for x in cases:
    if 'Kilowatt' in x['name']:
        for r in x.get('contains_rare', []):
            print('  ', r.get('name'), '| paint_index=', r.get('paint_index'), '| rarity=', (r.get('rarity') or {}).get('name'))

s = json.load(io.open('skins.json', encoding='utf-8'))
print('\nrarity values in skins.json:')
from collections import Counter
print(Counter(x['rarity']['name'] for x in s))
print('\nHowl entry:')
for x in s:
    if 'Howl' in x['name']:
        print('  ', x['name'], '|', x['rarity']['name'], '|', x['weapon']['name'])
