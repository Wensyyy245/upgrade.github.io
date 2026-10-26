"""Упаковка js/cs2_data.json -> js/data_loader.js (компактный вид + размеры превью Steam)."""
import json
import os

with open('js/cs2_data.json', 'r', encoding='utf-8') as f:
    data = json.load(f)


def img(u):
    """Steam CDN требует суффикс размера, иначе отдаёт оригинал большого размера."""
    if not u:
        return ''
    u = u.rstrip('/')
    if '/economy/image/' in u and not u.split('/')[-1][:3].isdigit():
        u += '/256fx160f'
    return u


def compact(s):
    return {
        'id': s['id'],
        'w': s.get('short_weapon') or s.get('weapon'),
        'n': s.get('skin'),
        'p': s.get('price'),
        'c': s.get('category'),
        'i': img(s.get('image')),
    }


payload = {
    'skins': [compact(s) for s in data['skins']],
    'cases': [{
        'id': c['id'],
        'name': c['name'],
        'price': c['price'],
        'image': img(c.get('image')),
        'pool': [compact(s) for s in c.get('pool', [])],
        'rare': [compact(s) for s in c.get('rare_pool', [])],
    } for c in data['cases']],
}

out = '/* Сгенерировано из открытого CS2 API (ByMykel/CSGO-API). Цены — оценка для демо. */\n'
out += 'window.CS2_DATA = ' + json.dumps(payload, ensure_ascii=False, separators=(',', ':')) + ';\n'

with open('js/data_loader.js', 'w', encoding='utf-8') as f:
    f.write(out)

size = os.path.getsize('js/data_loader.js')
print(f"js/data_loader.js: {size / 1024:.0f} KB | skins={len(payload['skins'])} cases={len(payload['cases'])}")
