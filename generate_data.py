"""Сборка каталога CS2 из открытого API ByMykel/CSGO-API.

Цены детерминированы по хэшу названия, чтобы каталог не «прыгал» между сборками.
Отбор сбалансирован по редкостям, кейсы отсортированы по дате выхода (новые в приоритете).
"""
import json
import hashlib
import os

with open('skins.json', 'r', encoding='utf-8') as f:
    raw_skins = json.load(f)

with open('crates.json', 'r', encoding='utf-8') as f:
    raw_crates = json.load(f)


def h01(*parts):
    key = '||'.join(str(p) for p in parts).lower()
    return int(hashlib.md5(key.encode('utf-8')).hexdigest()[:12], 16) / 0xFFFFFFFFFFFF


def rng(lo, hi, *parts):
    return lo + h01(*parts) * (hi - lo)


KNIVES = ['karambit', 'butterfly knife', 'bayonet', 'flip knife', 'gut knife', 'talon knife',
          'kukri', 'shadow claws', 'classic knife', 'nomad knife', 'stiletto knife',
          'skeleton knife', 'paracord', 'navaja', 'ultraviolet', 'survival', 'huntsman knife',
          'falchion knife', 'shadow daggers', 'ursus knife', 'bogged']

GLOVES = ['sport gloves', 'specialist gloves', 'driver gloves', 'moto gloves',
          'hand wraps', 'broken fang gloves', 'hydra gloves', 'bloodhound']

RIFLE_COVERT = (9, 240)
RIFLE_OTHER = (0.03, 30)
PISTOL_TOP = (1.2, 110)
PISTOL_OTHER = (0.02, 10)
SMG_TOP = (1.2, 40)
SMG_OTHER = (0.02, 7)
HEAVY = (0.02, 5)

PREMIUM_SKINS = {
    'dragon lore': (9000, 16000), 'gungnir': (6000, 11000), 'howl': (3000, 5500),
    'fire serpent': (350, 900), 'wild lotus': (1200, 2200), 'medusa': (700, 1500),
    'murder after midnight': (900, 1800), 'apocalyptic': (600, 1400),
    'printstream': (90, 400), 'redline': (12, 45), 'asiimov': (18, 90),
    'hyper beast': (14, 70), 'vulcan': (55, 220), 'blaze': (40, 130),
    'kill confirmed': (12, 60), 'neo-noir': (12, 60), 'neo noir': (12, 60),
    'water elemental': (0.8, 12), 'neon rider': (3, 22), 'night terror': (1.5, 14),
    'bloodsport': (25, 120), 'acid fade': (30, 150), 'the end': (40, 180),
    'wraiths': (20, 90), 'bone mask': (6, 40), 'metallic': (4, 30),
    'desolate space': (6, 32), 'borealis': (8, 40), 'franklin': (5, 25),
    'green gem': (200, 700), 'blue gem': (180, 650), 'red gem': (220, 750),
    'yellow gem': (240, 800), 'white gem': (300, 950), 'black gem': (350, 1100),
}

KNIFE_MODS = {
    'sapphire': (3000, 8000), 'ruby': (3400, 8500), 'emerald': (2400, 6500),
    'black pearl': (1900, 5500), 'marble fade': (1300, 3000), 'fade': (850, 2400),
    'tiger tooth': (650, 1900), 'gamma doppler': (380, 1200), 'doppler': (320, 1050),
    'crimson web': (380, 1150), 'slaughter': (280, 850), 'ultraviolet': (230, 700),
    'case hardened': (190, 640), 'night stripe': (170, 520), 'stained': (140, 420),
    'scorpion': (190, 560), 'urban masked': (120, 350), 'blue steel': (100, 300),
    'borre': (110, 320), 'rust coat': (100, 290), 'dark water': (120, 350),
    'skeleton': (150, 450), 'forest ddpat': (110, 320), 'boreal forest': (110, 320),
    'scorched': (105, 310), 'safari mesh': (100, 300), 'vanilla': (65, 190),
}

GLOVE_MODS = {
    'pandora': (1600, 4200), 'emperor': (380, 1300), 'crimson kimono': (380, 1150),
    'asterion': (280, 850), 'superconductor': (190, 650), 'vice': (140, 450),
    'moonrise': (110, 360), 'oxo': (95, 320), 'gunner': (85, 280),
    'badlands': (65, 240), 'pillars': (55, 200), 'race day': (55, 190),
    'dragor': (60, 210), 'cobalt skulls': (90, 300), 'slumber': (70, 240),
    'vanilla': (55, 170), 'guerrilla': (60, 190), 'marmoreal': (100, 330),
    'big game': (70, 230), 'tuxedo': (60, 200), 'lunar weaves': (75, 250),
    'field agent': (65, 215), 'dot matrix': (60, 200), 'slaughter': (90, 300),
    'bamboo print': (60, 210), 'spruce ddpat': (50, 160), 'desert shamagh': (50, 160),
    'duct tape': (45, 150), 'camo storm': (48, 155), 'taper': (52, 170),
}

# Множитель престижа модели ножа
KNIFE_MODEL_BOOST = {
    'karambit': 1.7, 'butterfly knife': 1.5, 'talon knife': 1.35, 'm9 bayonet': 1.45,
    'bayonet': 1.15, 'classic knife': 1.05, 'chromatic': 1.0,
}


def find_range(name, table, default):
    n = name.lower()
    for key, bounds in table.items():
        if key in n:
            return bounds
    return default


def estimate_price(name, weapon, rarity, category, stattrak):
    n = (name or '').lower()
    w = (weapon or '').lower()

    if category == 'knife':
        is_glove = any(g in w for g in GLOVES)
        table = GLOVE_MODS if is_glove else KNIFE_MODS
        lo, hi = find_range(n, table, (70, 200) if not is_glove else (55, 180))
        for model, boost in KNIFE_MODEL_BOOST.items():
            if model in w:
                lo, hi = lo * boost, hi * boost
                break
        price = rng(lo, hi, 'knife', name, weapon)
    else:
        hit = find_range(n, PREMIUM_SKINS, None)
        if hit:
            lo, hi = hit
        elif rarity in ('Covert', 'Extraordinary Weapon'):
            lo, hi = RIFLE_COVERT
        elif any(k in w for k in ('desert eagle', 'usp-s', 'glock-18', 'five-seven', 'five-seve',
                                  'tec-9', 'cz75', 'p250', 'dual berettas', 'r8 revolver', 'p2000')):
            lo, hi = PISTOL_TOP if rarity == 'Classified' else PISTOL_OTHER
        elif any(k in w for k in ('mp9', 'mac-10', 'mp7', 'mp5', 'ump', 'p90', 'pp-bizon')):
            lo, hi = SMG_TOP if rarity in ('Covert', 'Classified') else SMG_OTHER
        elif any(k in w for k in ('negev', 'm249', 'nova', 'xm1014', 'mag-7', 'sawed-off')):
            lo, hi = HEAVY
        else:
            lo, hi = RIFLE_OTHER
        price = rng(lo, hi, 'skin', name, rarity)

    if stattrak:
        price *= 1.3
    return round(max(0.05, min(price, 16000)), 2)


def classify(weapon_name, skin_name, rarity_name):
    full = (weapon_name + ' ' + skin_name).lower()
    if any(k in full for k in KNIVES) or any(g in full for g in GLOVES) or '★' in skin_name:
        return 'knife'
    if rarity_name in ('Covert', 'Contraband', 'Extraordinary'):
        return 'covert'
    if rarity_name == 'Classified':
        return 'classified'
    if rarity_name == 'Restricted':
        return 'restricted'
    if rarity_name == 'Mil-Spec Grade':
        return 'milspec'
    if rarity_name == 'Industrial Grade':
        return 'industrial'
    return 'common'


print('Processing skins...')
valid = []
for s in raw_skins:
    if not s.get('image'):
        continue

    weapon = s['weapon']['name']
    name = s['name']
    rarity = s['rarity']['name']
    st = s.get('stattrak', False)
    cat = classify(weapon, name, rarity)
    price = estimate_price(name, weapon, rarity, cat, st)

    if '|' in name:
        left, right = name.split('|', 1)
        short_w = left.strip().replace('★', '').strip()
        skin = right.strip()
    else:
        short_w, skin = weapon.replace('★', '').strip(), ''

    valid.append({
        'id': s['id'],
        'weapon': weapon,
        'short_weapon': short_w or weapon,
        'skin': skin or 'Vanilla',
        'rarity': rarity,
        'category': cat,
        'price': price,
        'image': s['image'],
        'paint_index': s.get('paint_index', ''),
        'stattrak': st,
    })

# Индекс для связки кейсов со скинами
by_paint = {}
for s in valid:
    pi = s.get('paint_index')
    if pi:
        by_paint.setdefault(pi, []).append(s)

print(f'  total classified: {len(valid)}')

# ---- Сбалансированный отбор в каталог ----
QUOTA = {'knife': 150, 'covert': 260, 'classified': 250, 'restricted': 250,
         'milspec': 200, 'industrial': 60, 'common': 30}

by_cat = {}
for s in valid:
    by_cat.setdefault(s['category'], []).append(s)

catalog = []
for cat, limit in QUOTA.items():
    pool = sorted(by_cat.get(cat, []), key=lambda x: -x['price'])[:limit]
    catalog.extend(pool)

catalog.sort(key=lambda x: x['price'], reverse=True)
print(f'  catalog: {len(catalog)} skins')

# ---- Кейсы ----
CASE_PRICES = {
    'Kilowatt Case': 1.85, 'Gallery Case': 1.35, 'Fever Case': 1.10, 'Recoil Case': 0.75,
    'Dreams & Nightmares Case': 2.45, 'Snakebite Case': 0.85, 'Fracture Case': 0.62,
    'Revolution Case': 1.95, 'Recharged Case': 0.42, 'Danger Zone Case': 0.55,
    'Clutch Case': 0.35, 'Horizon Case': 0.45, 'Shattered Web Case': 0.50,
    'CS20 Case': 0.60, 'Spectrum Case': 1.15, 'Spectrum 2 Case': 1.25,
    'Prisma Case': 0.55, 'Prisma 2 Case': 0.85, 'Glove Case': 2.10,
    'Chroma Case': 1.05, 'Chroma 2 Case': 1.30, 'Chroma 3 Case': 0.95,
    'Operation Riptide Case': 0.95, 'Operation Broken Fang Case': 0.85,
    'Huntsman Weapon Case': 0.95, 'Falchion Case': 0.80, 'Shadow Case': 0.70,
    'Winter Offensive Weapon Case': 1.40, 'CS:GO Weapon Case': 2.60,
    'CS:GO Weapon Case 2': 3.20, 'CS:GO Weapon Case 3': 2.40,
    'Revolver Case': 1.44, 'Operation Wildfire Case': 1.53,
    'Operation Hydra Case': 0.73, 'Operation Phoenix Weapon Case': 0.71,
    'Operation Breakout Weapon Case': 1.63, 'Operation Vanguard Weapon Case': 0.65,
    'Operation Bravo Case': 45.0, 'Gamma Case': 1.63, 'Gamma 2 Case': 1.34,
    'eSports 2013 Case': 12.0, 'eSports 2014 Summer Case': 1.62,
}

weapon_cases = [c for c in raw_crates if c.get('type') == 'Case']


def sale_key(c):
    d = (c.get('first_sale_date') or '1970-01-01').replace('/', '-')
    try:
        y, m, dd = d.split('-')[:3]
        return (int(y), int(m), int(dd))
    except Exception:
        return (1970, 1, 1)


# Новые кейсы идут первыми
weapon_cases.sort(key=sale_key, reverse=True)

catalog_ids = {s['id'] for s in catalog}
catalog_by_id = {s['id']: s for s in catalog}

print('Processing cases...')
cases = []
for c in weapon_cases:
    name = c.get('name') or ''
    if not c.get('image') or not c.get('contains'):
        continue

    price = CASE_PRICES.get(name, round(0.35 + h01('caseprice', name) * 1.6, 2))

    pool, knives = [], []
    for item in c.get('contains', []):
        for sk in by_paint.get(item.get('paint_index', ''), []):
            if sk['id'] in catalog_ids and sk['category'] != 'knife':
                pool.append(sk)
                break

    for item in c.get('contains_rare', []):
        pi = item.get('paint_index', '')
        found = [x for x in by_paint.get(pi, []) if x['id'] in catalog_ids]
        if found:
            knives.append(found[0])
        else:
            rn = (item.get('name') or '')
            cand = [s for s in catalog if s['category'] == 'knife' and s['weapon'].lower() in rn.lower()]
            if cand:
                knives.append(cand[0])

    if len(pool) < 8:
        continue

    seen, uniq = set(), []
    for s in pool:
        if s['id'] not in seen:
            seen.add(s['id'])
            uniq.append(s)

    def uniq_by_id(items):
        out, used = [], set()
        for x in items:
            if x['id'] not in used:
                used.add(x['id'])
                out.append(x)
        return out

    knives = uniq_by_id(knives)

    # Разнообразные ножи: берём до 6 разных моделей
    kn_seen, kn_pool = set(), []
    for s in sorted(knives, key=lambda x: -x['price']):
        if s['weapon'] not in kn_seen:
            kn_seen.add(s['weapon'])
            kn_pool.append(s)
        if len(kn_pool) >= 6:
            break

    # Дешёвые варианты тех же моделей — для наглядности рулетки
    if len(kn_pool) < 8:
        for s in sorted(knives, key=lambda x: x['price'])[:2]:
            if s['id'] not in {k['id'] for k in kn_pool}:
                kn_pool.append(s)

    final = uniq + kn_pool
    cases.append({
        'id': c['id'],
        'name': name,
        'price': price,
        'image': c['image'],
        'pool': final[:26],
        'rare_pool': kn_pool[:4],
    })

print(f'  cases: {len(cases)}')

payload = {'skins': catalog, 'cases': cases[:20]}
os.makedirs('js', exist_ok=True)
with open('js/cs2_data.json', 'w', encoding='utf-8') as f:
    json.dump(payload, f, ensure_ascii=False)

print(f"OK: {len(payload['skins'])} skins, {len(payload['cases'])} cases")
