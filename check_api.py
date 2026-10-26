import json

# Check skins.json
with open('skins.json', 'r', encoding='utf-8') as f:
    d = json.load(f)

print(f'Skins total: {len(d)}')
print(f'First skin keys: {list(d[0].keys())}')
print(f'First skin: {json.dumps(d[0], indent=2, ensure_ascii=False)[:3000]}')

# Check crates.json
with open('crates.json', 'r', encoding='utf-8') as f:
    c = json.load(f)

print(f'\nCrates total: {len(c)}')
weapon_cases = [x for x in c if x.get('type') == 'Case']
print(f'Weapon cases: {len(weapon_cases)}')
print(f'First weapon case: {json.dumps(weapon_cases[0], indent=2, ensure_ascii=False)[:2000]}')
