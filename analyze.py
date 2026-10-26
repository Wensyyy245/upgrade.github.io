import urllib.request, json, os

# Test Steam CDN
test_url = 'https://community.akamai.steamstatic.com/economy/image/i0CoZ81Ui0m-9KwlBY1L_18myuGuq1wfhWSaZgMttyVfPaERSR0Wqmu7LAocGIGz3UqlXOLrxM-vMGmW8VNxu4vx603vRA_Olpfu-TVJ7uK9V6xsLvSEHGaA_u13ve5WSDu2jCIrujqNjsH_InuUaQQmDJd2Fu4NshO7kIGyYeu24Affg98UxCX_iXhJ5i465bwHT-N7rXbV3WG0/320fx168f'
try:
    req = urllib.request.Request(test_url, headers={'User-Agent': 'Mozilla/5.0'})
    r = urllib.request.urlopen(req, timeout=30)
    data = r.read()
    print(f"CDN OK: {r.status} {len(data)} bytes")
except Exception as e:
    print(f"CDN FAIL: {e}")

# Analyze skins.json
with open('skins.json', 'r') as f:
    skins = json.load(f)
print(f"\nSkins total: {len(skins)}")

# Group by weapon
from collections import Counter
weapons = Counter(s['weapon']['name'] for s in skins)
print(f"\nUnique weapons: {len(weapons)}")
for w, c in weapons.most_common(20):
    print(f"  {w}: {c}")

# Show first 5 skins with images
print("\nFirst 5 skins:")
for s in skins[:5]:
    print(f"  {s['name']} | {s['weapon']['name']} | {s['image'][:80]}...")

# Analyze crates.json
with open('crates.json', 'r') as f:
    crates = json.load(f)
print(f"\nCrates total: {len(crates)}")

# Filter weapon cases
weapon_cases = [c for c in crates if c.get('type') == 'Case']
print(f"Weapon cases: {len(weapon_cases)}")
print("\nWeapon cases:")
for c in weapon_cases[:15]:
    contains_count = len(c.get('contains', []))
    rare_count = len(c.get('contains_rare', []))
    print(f"  {c['name']} | {contains_count} common, {rare_count} rare, img: {c.get('image','')[:100]}...")
