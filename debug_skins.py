import json

with open('skins.json', 'r', encoding='utf-8') as f:
    raw_skins = json.load(f)

print(f'Total skins: {len(raw_skins)}')

# Check market_hash_name
with_no_market = [s for s in raw_skins if not s.get('market_hash_name')]
with_market = [s for s in raw_skins if s.get('market_hash_name')]
print(f'Without market_hash_name: {len(with_no_market)}')
print(f'With market_hash_name: {len(with_market)}')

# Check image
with_image = [s for s in raw_skins if s.get('image')]
print(f'With image: {len(with_image)}')

# Check first skin with market_hash_name
for s in raw_skins:
    if s.get('market_hash_name') and s.get('image'):
        print(f'\nFirst valid skin:')
        print(f'  name: {s.get("name")}')
        print(f'  weapon: {s.get("weapon",{}).get("name")}')
        print(f'  market_hash_name: {s.get("market_hash_name")}')
        print(f'  rarity: {s.get("rarity",{}).get("name")}')
        print(f'  image length: {len(s.get("image",""))}')
        print(f'  image preview: {s.get("image")[:100]}...')
        break

# Check a few more
count = 0
for s in raw_skins:
    if s.get('market_hash_name') and s.get('image'):
        count += 1
        if count <= 3:
            print(f'\nValid #{count}: {s["market_hash_name"]} | {s["rarity"]["name"]}')
