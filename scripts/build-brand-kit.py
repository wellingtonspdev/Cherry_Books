"""Build original path-based brand masters and optimized runtime PNGs.

Requires fonttools, Pillow and PyMuPDF. Uses the licensed Playfair font already
in assets/fonts; no network, SVG transformer or runtime drawing dependency.
"""
from pathlib import Path
import json
import math
from io import BytesIO
from PIL import Image, ImageDraw, ImageFont
from fontTools.ttLib import TTFont
from fontTools.varLib.instancer import instantiateVariableFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen
import fitz

ROOT = Path(__file__).resolve().parents[1]
ASSETS = ROOT / "apps/sdk54/assets"
OUT = ASSETS / "brand"
OUT.mkdir(exist_ok=True)
WINE, PINK, PAPER, GOLD = "#8F3A50", "#F1BBCB", "#FBF8F4", "#C3A36B"
font = instantiateVariableFont(TTFont(ASSETS / "fonts/Playfair.ttf"), {"wght": 600})
glyphs, cmap = font.getGlyphSet(), font.getBestCmap()
units = font["head"].unitsPerEm
inventory = []


def outline(text, size, x, baseline, color=WINE):
    pen = SVGPathPen(glyphs)
    cursor, scale = x, size / units
    for char in text:
        glyph = glyphs[cmap[ord(char)]]
        glyph.draw(TransformPen(pen, (scale, 0, 0, -scale, cursor, baseline)))
        cursor += glyph.width * scale
    return f'<path fill="{color}" d="{pen.getCommands()}"/>', cursor - x


def flower(x=96, y=53, radius=36, mono=None):
    petals = []
    # Each petal has a shallow sakura notch; five rotations share one center.
    for angle in range(0, 360, 72):
        petals.append(f'<path transform="rotate({angle} 96 53)" d="M96 55 C81 46 75 32 82 21 C86 15 92 14 96 21 C100 14 106 15 110 21 C117 32 111 46 96 55Z" fill="{mono or PINK}" stroke="{mono or WINE}" stroke-opacity=".38" stroke-width=".8"/>')
    for angle in range(0, 360, 45):
        a = math.radians(angle)
        xx, yy = 96 + 8 * math.cos(a), 53 + 8 * math.sin(a)
        petals.append(f'<path d="M96 53 L{xx:.2f} {yy:.2f}" stroke="{mono or WINE}" stroke-width="1.1"/><circle cx="{xx:.2f}" cy="{yy:.2f}" r="1.7" fill="{mono or GOLD}"/>')
    petals.append(f'<circle cx="96" cy="53" r="3" fill="{mono or WINE}"/>')
    scale = radius / 38
    return f'<g transform="translate({x} {y}) scale({scale}) translate(-96 -53)">{"".join(petals)}</g>'


def symbol(color=WINE, mono=None):
    book = f'''<g fill="none" stroke="{color}" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round">
    <path d="M96 102 C75 82 46 80 18 87 L18 143 C46 136 73 139 96 156 C119 139 146 136 174 143 L174 87 C146 80 117 82 96 102Z"/>
    <path d="M96 102 L96 156 M24 135 C50 130 73 136 90 147 M102 147 C119 136 142 130 168 135"/>
    <path d="M32 99 C51 96 69 100 82 108 M32 111 C51 108 69 113 82 121 M110 108 C123 100 141 96 160 99 M110 121 C123 113 141 108 160 111" stroke-width="1.2" opacity=".65"/></g>'''
    return book + flower(96, 51, 35, mono)


def raster(svg, width, height):
    document = fitz.open(stream=svg.encode(), filetype="svg")
    page = document[0]
    pixmap = page.get_pixmap(matrix=fitz.Matrix(width / page.rect.width, height / page.rect.height), alpha=True)
    return Image.open(BytesIO(pixmap.tobytes("png"))).convert("RGBA")


def save(name, content, width, height, function, usage, png_scale=2):
    svg = f'<svg xmlns="http://www.w3.org/2000/svg" width="{width}" height="{height}" viewBox="0 0 {width} {height}" role="img" aria-label="Cherry Books"><title>Cherry Books — Cherry Editorial V3</title>{content}</svg>'
    (OUT / f"{name}.svg").write_text(svg, encoding="utf-8")
    image = raster(svg, width * png_scale, height * png_scale)
    image.save(OUT / f"{name}.png", optimize=True)
    inventory.append({"name": name, "function": function, "formats": ["SVG", "PNG RGBA"], "viewBox": [0, 0, width, height], "pngDimensions": list(image.size), "variant": name, "origin": "Original vector drawing; wordmark outlines from licensed Playfair Display 600", "usage": usage})
    return svg


wordmark, word_width = outline("Cherry Books", 58, 190, 109)
save("logo-primary", symbol() + wordmark, 582, 166, "Official primary lockup", ["brand kit", "loading"])
save("logo-horizontal", symbol() + wordmark, 582, 166, "Horizontal lockup", ["Home", "empty states"])
vertical_word, vertical_width = outline("Cherry Books", 54, 0, 0)
save("logo-vertical", f'<g transform="translate(122 0)">{symbol()}</g><g transform="translate({(436-vertical_width)/2:.2f} 226)">{vertical_word}</g>', 436, 250, "Vertical lockup", ["brand kit"])
save("logo-compact", symbol(), 192, 166, "Compact application mark", ["compact header", "small sizes"])
symbol_svg = save("logo-symbol", symbol(), 192, 166, "Book and five-petal sakura", ["icons", "splash"])
mono_word, _ = outline("Cherry Books", 58, 190, 109)
save("logo-monochrome", symbol(mono=WINE) + mono_word, 582, 166, "Single-color lockup", ["single-color printing"])
inverted_word, _ = outline("Cherry Books", 58, 190, 109, PAPER)
save("logo-inverted", symbol(PAPER, PAPER) + inverted_word, 582, 166, "Inverted lockup", ["dark backgrounds"])

branch_paths = f'<g fill="none" stroke="{WINE}" stroke-width="2" stroke-linecap="round"><path d="M308 12 C277 47 251 71 222 97 C191 125 145 163 50 222"/><path d="M196 121 C211 151 222 183 234 239 M247 72 C266 88 285 108 297 128"/></g>'
branch_flowers = flower(256, 65, 24) + flower(190, 128, 28) + flower(99, 190, 19) + flower(233, 235, 18) + flower(294, 126, 13)
save("sakura-branch-right", branch_paths + branch_flowers, 320, 274, "Top-right branch", ["Home", "Library"])
save("sakura-branch-compact", f'<path d="M12 100 Q90 90 165 18" fill="none" stroke="{WINE}" stroke-width="2"/>' + flower(55, 87, 18) + flower(108, 58, 23) + flower(155, 25, 14), 180, 120, "Compact branch", ["compact catalog headers"])
save("sakura-flower", flower(44, 44, 36), 88, 88, "Isolated five-petal flower", ["brand kit", "editorial accents"])
save("sakura-petal", f'<path d="M28 66 C3 49 6 17 24 8 C29 5 31 12 32 16 C37 7 46 7 49 16 C61 38 45 57 28 66Z" fill="{PINK}" stroke="{WINE}" stroke-opacity=".4" stroke-width=".8"/>', 60, 74, "Individual petal", ["brand kit"])
save("sakura-cluster", f'<path d="M25 112 Q74 82 146 38" fill="none" stroke="{WINE}" stroke-width="1.6"/>' + flower(54, 91, 23) + flower(96, 59, 28) + flower(142, 35, 18), 180, 130, "Small blossom cluster", ["empty states", "brand kit"])
empty = f'<g transform="translate(120 80)">{symbol()}</g><g opacity=".6" transform="translate(0 10) scale(.65)">{branch_paths}{branch_flowers}</g><path d="M100 242 Q220 250 345 242" fill="none" stroke="{WINE}" stroke-opacity=".18" stroke-width="2"/>'
save("library-empty", empty, 436, 260, "Empty Library illustration", ["Library empty", "search empty"])
save("editorial-ornament", f'<path d="M8 24 H98 M150 24 H240" fill="none" stroke="{WINE}" stroke-opacity=".45"/>' + flower(124, 24, 16), 248, 48, "Quiet editorial separator", ["details editorial separator"])

icons = ASSETS / "icons"
icons.mkdir(exist_ok=True)
for name, size, opaque, mark_size in [("app-icon", 1024, True, 710), ("adaptive-foreground", 1024, False, 560), ("splash-icon", 512, False, 420), ("web-icon-192", 192, True, 126), ("web-icon-512", 512, True, 336), ("web-maskable-512", 512, True, 280), ("favicon", 48, True, 40)]:
    canvas = Image.new("RGBA", (size, size), PAPER if opaque else (0, 0, 0, 0))
    mark = raster(symbol_svg, mark_size, round(mark_size * 166 / 192))
    canvas.alpha_composite(mark, ((size - mark.width) // 2, (size - mark.height) // 2))
    if opaque:
        canvas = canvas.convert("RGB")
    canvas.save(icons / f"{name}.png", optimize=True)
    inventory.append({"name": name, "function": "Application icon" if "icon" in name else name, "formats": ["PNG RGB" if opaque else "PNG RGBA"], "pngDimensions": [size, size], "variant": name, "origin": "Original Cherry Books vector master", "usage": ["app.json", "Web/PWA" if name.startswith("web") else "native application"]})
mono_svg = f'<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 192 166">{symbol("#000000", "#000000")}</svg>'
canvas = Image.new("RGBA", (1024, 1024))
mark = raster(mono_svg, 560, 484)
canvas.alpha_composite(mark, (232, 270))
canvas.save(icons / "adaptive-monochrome.png", optimize=True)
inventory.append({"name": "adaptive-monochrome", "function": "Android themed icon", "formats": ["PNG RGBA"], "pngDimensions": [1024, 1024], "variant": "monochrome", "origin": "Original Cherry Books master", "usage": ["Android adaptive icon"]})
(OUT / "inventory.json").write_text(json.dumps({"brand": "Cherry Books V3", "palette": {"wine": WINE, "pink": PINK, "paper": PAPER}, "assets": inventory}, ensure_ascii=False, indent=2), encoding="utf-8")

# Local QA contact sheet, never included in application assets.
proof = Image.new("RGB", (740, 400), PAPER)
draw = ImageDraw.Draw(proof)
cursor = 20
for size in [24, 32, 48, 128, 256]:
    mark = raster(symbol_svg, size, round(size * 166 / 192))
    proof.paste(mark, (cursor, 45), mark)
    draw.text((cursor, 20), f"{size}px", fill=WINE)
    cursor += size + 26
logo = Image.open(OUT / "logo-horizontal.png")
logo.thumbnail((470, 140))
proof.paste(logo, (25, 265), logo)
(ROOT / ".local/refinement").mkdir(exist_ok=True, parents=True)
proof.save(ROOT / ".local/refinement/brand-sizes.png")
print(f"Created {len(inventory)} production asset variants with path-based masters.")
# Cover art remains original; use the approved editorial face with legible weight.
cover_specs = [
 ('arquitetura',['Arquitetura de','Software'],'#104E49','#268D80','blocks'),
 ('python',['Python para','Automação'],'#39294C','#AA6597','code'),
 ('redes',['Redes Neurais','Essenciais'],'#1E2A46','#99709C','network'),
 ('seguranca',['Segurança em','Aplicações'],'#492C3C','#A64A65','shield'),
 ('ia',['IA Aplicada'],'#174E48','#77A89B','network'),
 ('mobile',['React Native','na Prática'],'#0B3149','#1599B5','orbit'),
 ('algoritmos',['Algoritmos','Essenciais'],'#3E354E','#8875B6','network'),
 ('clean',['Clean Code','na Prática'],'#384D45','#7CA68B','code'),
 ('sql',['Bancos de','Dados SQL'],'#213F58','#6895B2','database'),
 ('apis',['APIs com Node'],'#2E4740','#83A383','network'),
 ('cloud',['Cloud para','Desenvolvedores'],'#42324F','#AF809B','cloud'),
 ('ux',['UX para Produtos','Digitais'],'#603A42','#C58C96','layout')]
for identity, lines, background, accent, figure in cover_specs:
    art = [f'<path fill="{background}" d="M0 0H600V900H0Z"/>']
    for y in range(350,1000,100):
        art.append(f'<path d="M0 {y+120} L300 {y-70} L600 {y+120} L600 {y+170} L300 {y-20} L0 {y+170}Z" fill="{accent}" opacity=".8"/>')
    for index,line in enumerate(lines):art.append(outline(line,48,42,85+index*62,PAPER)[0])
    art.append('<path d="M42 230H260" stroke="#F2D4AE" stroke-width="4"/>')
    if figure=='blocks':
        for x,y in [(300,430),(220,500),(380,500)]:
            art.extend([f'<path d="M{x} {y}l60 32-60 32-60-32Z" fill="#B9DDD0"/>',f'<path d="M{x-60} {y+32}l60 32v66l-60-34Z" fill="#458B83"/>',f'<path d="M{x} {y+64}l60-32v64l-60 34Z" fill="#71B5A2"/>'])
    elif figure=='code':
        art.append('<path d="M155 440H445V655H155Z" fill="'+background+'" stroke="#DABCD6" stroke-width="3"/>')
        art.append('<path d="M238 494l-44 47 44 47 M362 494l44 47-44 47 M323 480l-46 122" fill="none" stroke="#F7E5AB" stroke-width="12" stroke-linecap="round" stroke-linejoin="round"/>')
    elif figure=='shield':art.append('<path d="M300 420l110 45-16 150-94 65-94-65-16-150Z" fill="#EBC1CC"/><path d="M300 465l65 27-9 94-56 40-56-40-9-94Z" fill="'+background+'"/>')
    elif figure=='network':
        points=[(300,420),(190,495),(410,495),(180,615),(420,615),(300,690)]
        for i,(x,y) in enumerate(points):
            for xx,yy in points[i+1:]:art.append(f'<path d="M{x} {y}L{xx} {yy}" stroke="#E5B7CE" stroke-width="3"/>')
        for x,y in points:art.append(f'<circle cx="{x}" cy="{y}" r="13" fill="#F5C3D6"/>')
    elif figure=='database':art.append('<path d="M200 465v180c0 50 200 50 200 0V465" fill="'+background+'" stroke="#C8E0EC" stroke-width="5"/><ellipse cx="300" cy="465" rx="100" ry="35" fill="'+accent+'" stroke="#C8E0EC" stroke-width="5"/><path d="M200 530c0 50 200 50 200 0 M200 590c0 50 200 50 200 0" fill="none" stroke="#C8E0EC" stroke-width="5"/>')
    elif figure=='cloud':art.append('<path d="M215 620c-90-5-85-125 0-127-3-105 150-125 175-22 104-8 126 145 23 149Z" fill="'+background+'" stroke="#F1C6D7" stroke-width="6"/><path d="M260 550h80 M300 510v80" stroke="#F1C6D7" stroke-width="5"/>')
    elif figure=='layout':art.append('<path d="M170 430H430V670H170Z M170 480H430 M245 480V670 M265 510H407V565H265Z M265 590H407 M265 614H385" fill="none" stroke="#F8DDE2" stroke-width="5"/>')
    else:
        for angle in [0,60,120]:art.append(f'<ellipse cx="300" cy="550" rx="125" ry="48" transform="rotate({angle} 300 550)" fill="none" stroke="#A1DEE0" stroke-width="4"/>')
        art.append('<circle cx="300" cy="550" r="15" fill="#A1DEE0"/>')
    art.append(outline('CHERRY BOOKS  ·  EDITORIAL',14,42,858,PAPER)[0])
    svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 600 900">'+''.join(art)+'</svg>'
    (ASSETS/'covers'/f'{identity}.svg').write_text(svg,encoding='utf-8')
    raster(svg,600,900).convert('RGB').save(ASSETS/'covers'/f'{identity}.png',optimize=True)
    inventory.append({'name':f'covers/{identity}','function':'Original technical book cover','formats':['SVG','PNG RGB'],'pngDimensions':[600,900],'variant':identity,'origin':'Original illustration; Playfair Display outlined typography','usage':['Home','Library','Search','Details']})
for family in ['Playfair','Lora','Inter']:
    inventory.append({'name':f'fonts/{family}.ttf','function':'Licensed typeface','formats':['TTF','OFL license TXT'],'variant':family,'origin':'Google Fonts; SIL Open Font License bundled in assets/fonts','usage':['App.js font loading']})
(OUT/'inventory.json').write_text(json.dumps({'brand':'Cherry Books V3','palette':{'wine':WINE,'pink':PINK,'paper':PAPER},'assets':inventory},ensure_ascii=False,indent=2),encoding='utf-8')
