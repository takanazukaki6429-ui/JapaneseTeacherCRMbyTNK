#!/usr/bin/env python3
"""
色D ⇔ 色E の切り替え道具（2026-09-13 かずき：一旦色Eで進める。色Dに戻すかもしれないので保存）

使い方（crm フォルダで）:
    python3 scripts/design/switch-color.py to-d   # 今の画面の色を D（くすみローズ・生成り）にする
    python3 scripts/design/switch-color.py to-e   # 今の画面の色を E（くすみラベンダー・ミント・ピンク）にする

- 書体（丸ゴシック）と配置は変えない。変えるのは色だけ
- 色Dの版の元：GitHub の目印 keep/design-d-2026-09-13（置き場 feat/design-d）
- 画面案：my-company/03_japanese-teacher-crm/strategy/デザイン案_色D書体E_2026-09-11/ と デザイン案_色E書体E_2026-09-11/
- D→E は、実際に feat/design-e を作ったときの置き換え表そのもの。
  E→D は、その逆。E側で同じ色にまとめた組（例：線の色2種→1種）は代表の色に戻すので、
  使ったあとは画面を見て確かめること（2026-09-13 に今の画面で試した結果は HANDOFF に記録）
"""
import glob, re, sys

# D → E（2026-09-12 feat/design-e を作ったときの表）
D_TO_E = {'#534344':'#484550','#9c4f5a':'#6b5ca5','#3b2e2a':'#3a3350','#f1ebe1':'#f0ebf8','#d9a7ae':'#ccbeff','#f8e8e7':'#efe9ff',
 '#dccfc4':'#d6cfe2','#f7f3ec':'#f6f3fb','#ece8f3':'#dff1ea','#6f625c':'#5d5868','#6b5b8c':'#2a6f5a','#8a7d77':'#7a7485',
 '#7a5a3a':'#a8475f','#f1e7da':'#fbe7ed','#c2b5ac':'#bdb6c8','#f3dcdb':'#e7deff','#a3968f':'#9b95a6','#b56c77':'#8f82c4',
 '#5c2a33':'#3f3470','#b87a84':'#9a8fcf','#fbf8f3':'#fbf9ff','#ece5da':'#ece6f6','#2e2540':'#2a2440','#e6ddd2':'#e4ddf0',
 '#fcfbf9':'#fbfaff','#e2dbcf':'#e4ddf0','#f4ede2':'#efe9f8','#faf3e7':'#f8f1ff','#7f3843':'#55488a','#f9f0f2':'#ede8fa',
 '#d8c1c2':'#cfc6ea','#ffd9dc':'#e7deff','#d8cfe5':'#bfe3d4','#e0daec':'#cfebd0','#664928':'#a8475f','#867274':'#797581',
 '#6a5852':'#5d5868','#6f5d5b':'#635d70','#8a434d':'#5a4c94','#1e1b15':'#3a3350','#eee7dc':'#ede4ff','#e9e2d7':'#e8ddff',
 '#fff8f0':'#fdf7ff','#665687':'#1b6a55','#d1bdf5':'#8bd5bb','#8a7672':'#7d7789'}
# ホームと左のナビ・ホームの部品は、最初のEの画面案（e2_home）と同じ割り当て
HOME_FILES = {'src/app/(main)/page.tsx', 'src/components/layout/sidebar.tsx',
              'src/components/home/add-student-inline.tsx', 'src/components/home/ask-asta.tsx'}
D_TO_E_HOME = dict(D_TO_E, **{'#7f3843':'#6b5ca5', '#f4ede2':'#f2eaff', '#faf3e7':'#f8f1ff'})
# 逆向き（E→D）で、E側で1色にまとめた組をどの色に戻すか（代表の色）
E_TO_D_PICK = {'#e4ddf0':'#e2dbcf', '#5d5868':'#6a5852', '#a8475f':'#664928', '#3a3350':'#3b2e2a', '#e7deff':'#ffd9dc'}
E_TO_D_HOME_PICK = dict(E_TO_D_PICK, **{'#6b5ca5':'#7f3843'})

TOKENS = {  # 共通の色一覧（globals.css）
 'd': {'--background':'#f7f3ec','--foreground':'#3b2e2a','--primary':'#9c4f5a','--primary-container':'#d9a7ae','--primary-fixed':'#f8e8e7',
       '--secondary':'#6b5b8c','--secondary-container':'#ece8f3','--on-secondary-container':'#2e2540','--tertiary':'#7a5a3a',
       '--tertiary-container':'#f1e7da','--on-tertiary-container':'#3b2e2a','--surface':'#f7f3ec','--surface-low':'#f1ebe1',
       '--on-surface':'#3b2e2a','--on-surface-variant':'#534344','--outline-variant':'#dccfc4'},
 'e': {'--background':'#f6f3fb','--foreground':'#3a3350','--primary':'#6b5ca5','--primary-container':'#ccbeff','--primary-fixed':'#efe9ff',
       '--secondary':'#2a6f5a','--secondary-container':'#dff1ea','--on-secondary-container':'#1b4d3f','--tertiary':'#a8475f',
       '--tertiary-container':'#fbe7ed','--on-tertiary-container':'#3f0016','--surface':'#f6f3fb','--surface-low':'#f0ebf8',
       '--on-surface':'#3a3350','--on-surface-variant':'#484550','--outline-variant':'#d6cfe2'}}
COMMENT = {'d': '/* 色＝D 上質な手帳（くすみローズ・生成り）／書体＝E 丸ゴシック（2026-09-11 かずき決定） */',
           'e': '/* 色＝E やわらかパステル（くすみラベンダー＋ミント＋ピンク）／書体＝E 丸ゴシック（2026-09-12 かずき指示：色だけEにした版） */'}
SHADOW = {'d': 'rgba(156,79,90,', 'e': 'rgba(107,92,165,'}

def invert(m, pick):
    inv = {}
    for k, v in m.items():
        inv.setdefault(v, k)
    inv.update(pick)
    return inv

def main(to):
    if to == 'to-e':
        general, home, target, other = D_TO_E, D_TO_E_HOME, 'e', 'd'
    elif to == 'to-d':
        general, home, target, other = invert(D_TO_E, E_TO_D_PICK), invert(D_TO_E_HOME, E_TO_D_HOME_PICK), 'd', 'e'
    else:
        sys.exit(__doc__)
    hexre = re.compile(r'#[0-9a-fA-F]{6}\b')
    files = [f for pat in ('src/app/**/*.tsx', 'src/app/**/*.ts', 'src/components/**/*.tsx', 'src/components/**/*.ts') for f in glob.glob(pat, recursive=True)]
    changed = spots = 0
    for f in files:
        m = home if f in HOME_FILES else general
        s = open(f).read(); o = s
        spots += sum(1 for x in hexre.finditer(s) if x.group(0).lower() in m)
        s = hexre.sub(lambda x: m.get(x.group(0).lower(), x.group(0)), s)
        s = s.replace(SHADOW[other], SHADOW[target]).replace(SHADOW[other].replace(',', ', '), SHADOW[target])
        s = s.replace('色＝D' if target == 'e' else '色＝E', '色＝E' if target == 'e' else '色＝D')
        if s != o:
            open(f, 'w').write(s); changed += 1
    p = 'src/app/globals.css'; s = open(p).read()
    for k, v in TOKENS[target].items():
        s = re.sub(rf'(\n  {re.escape(k)}: )#[0-9a-fA-F]{{6}};', rf'\g<1>{v};', s)
    s = s.replace(COMMENT[other], COMMENT[target])
    open(p, 'w').write(s)
    print(f'{to}: 色を置き換えたファイル {changed} ／ {spots} か所（globals.css の共通の色一覧も {target.upper()} に）')

if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '')
