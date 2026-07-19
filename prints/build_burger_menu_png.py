"""Surgical text edits on the original Ralf's Burgers menu design.

Changes:
  - Hambúrguer -> Burguer (price lines)
  - Ralf's Monster: 2 smash -> 4 smash
  - Remove ", Ketchup, Mostarda" except on Clássico, Bacon, Monster
  - Clean residue only inside the edited line bands (no overlap into neighbors)
"""

from pathlib import Path

from PIL import Image, ImageDraw, ImageFont

asset_path = Path(
    "/Users/coinfocoinfo/.cursor/projects/Users-coinfocoinfo-Documents-PizzaRalfs/assets/ralfs-burgers-menu-a4.png"
)
out_path = Path("prints/ralfs-burgers-menu-a4.png")
wa_path = Path("prints/ralfs-burgers-menu-whatsapp.png")

img = Image.open(asset_path).convert("RGB")
img_orig = img.copy()
draw = ImageDraw.Draw(img)
px = img.load()
px_orig = img_orig.load()

font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 18)
big_font = ImageFont.truetype("/System/Library/Fonts/Supplemental/Arial.ttf", 68)
text_color = (242, 240, 241)
desc_color = (220, 220, 220)
bg = (0, 0, 0)

PANEL_L, PANEL_R = 64, 545

price_ys = [360, 513, 664, 816, 966, 1111, 1218, 1338, 1452]
prices = [
    "Burguer R$ 22,00 • Combo (+ batata + refri) R$ 30,00",
    "Burguer R$ 20,00 • Combo (+ batata + refri) R$ 28,00",
    "Burguer R$ 21,00 • Combo (+ batata + refri) R$ 29,00",
    "Burguer R$ 18,00 • Combo (+ batata + refri) R$ 26,00",
    "Burguer R$ 24,00 • Combo (+ batata + refri) R$ 32,00",
    "Burguer R$ 19,00 • Combo (+ batata + refri) R$ 27,00",
    "Burguer R$ 23,00 • Combo (+ batata + refri) R$ 31,00",
    "Burguer R$ 34,00 • Combo (+ batata + refri) R$ 42,00",
    "Burguer R$ 24,00 • Combo (+ batata + refri) R$ 32,00",
]


def wipe(x0, y0, x1, y1):
    """Fill with cloned quiet background from the original art (no flat patch)."""
    # Prefer a nearby dark source row from the pristine original
    src_y = None
    for cand in range(y0 - 1, max(0, y0 - 25), -1):
        dark = sum(1 for x in range(x0, x1) if sum(px_orig[x, cand]) / 3 < 12)
        if dark > (x1 - x0) * 0.85:
            src_y = cand
            break
    if src_y is None:
        draw.rectangle([x0, y0, x1, y1], fill=bg)
        return
    for yy in range(y0, y1 + 1):
        for xx in range(x0, x1 + 1):
            # If source pixel is bright (text), fall back to black
            c = px_orig[xx, src_y]
            px[xx, yy] = c if sum(c) / 3 < 20 else bg


def render_line(text, height=14):
    big = Image.new("L", (1800, 120), 0)
    bd = ImageDraw.Draw(big)
    bd.text((4, 4), text, font=big_font, fill=255)
    big = big.crop(big.getbbox())
    w = max(8, int(big.size[0] * height / big.size[1]))
    glyph = big.resize((w, height), Image.Resampling.LANCZOS)
    rgb = Image.new("RGB", glyph.size, desc_color)
    return rgb, glyph


def scrub_band(y0, y1, x0=PANEL_L, x1=PANEL_R, keep_mask=None):
    """Restore original dark background over gray/white residue; leave gold alone."""
    for yy in range(y0, y1 + 1):
        for xx in range(x0, x1 + 1):
            if keep_mask is not None:
                mx, my = xx - keep_mask[0], yy - keep_mask[1]
                mask = keep_mask[2]
                if 0 <= mx < mask.size[0] and 0 <= my < mask.size[1] and mask.getpixel((mx, my)) > 20:
                    continue
            r, g, b = px[xx, yy]
            if r > 80 and r > b + 40:  # gold titles
                continue
            if (r + g + b) / 3 > 8:
                # clone from original if that pixel was dark; else black
                oc = px_orig[xx, min(yy, img_orig.size[1] - 1)]
                px[xx, yy] = oc if sum(oc) / 3 < 20 else bg


def line_y_span(mid_y, search=12):
    """Exact vertical span of the text line around mid_y."""
    ys = []
    for y in range(mid_y - search, mid_y + search + 1):
        bright = sum(
            1
            for x in range(PANEL_L, PANEL_R)
            if sum(px[x, y]) / 3 > 70
        )
        if bright > 12:
            ys.append(y)
    if not ys:
        return mid_y - 8, mid_y + 8
    return min(ys) - 1, max(ys) + 1


# --- Price lines: Hambúrguer -> Burguer ---
for y, price in zip(price_ys, prices):
    y0, y1 = line_y_span(y, search=14)
    # Clamp so we don't eat neighboring ingredient lines
    y0 = max(y0, y - 14)
    y1 = min(y1, y + 12)
    wipe(PANEL_L, y0, PANEL_R, y1)
    bbox = draw.textbbox((0, 0), price, font=font)
    th = bbox[3] - bbox[1]
    tx, ty = PANEL_L + 4, y - th // 2 - 1
    draw.text((tx, ty), price, font=font, fill=text_color)
    bb = draw.textbbox((tx, ty), price, font=font)
    for yy in range(y0, y1 + 1):
        for xx in range(PANEL_L, PANEL_R + 1):
            if bb[0] <= xx <= bb[2] + 1 and bb[1] - 1 <= yy <= bb[3] + 1:
                continue
            r, g, b = px[xx, yy]
            if r > 80 and r > b + 40:
                continue
            if (r + g + b) / 3 > 8:
                px[xx, yy] = bg

# --- Monster first ingredient line: 4 smash ---
monster_line = "Pão Brioche, 4 smash 100g, Queijo, Bacon,"
y0, y1 = line_y_span(1358, search=12)
y0, y1 = max(y0, 1347), min(y1, 1367)
wipe(PANEL_L, y0, PANEL_R, y1)
rgb, glyph = render_line(monster_line, height=14)
img.paste(rgb, (68, 1351), mask=glyph)
scrub_band(y0, y1, keep_mask=(68, 1351, glyph))

# --- Remove Ketchup/Mostarda except Clássico, Bacon, Monster ---
remove_ketchup_lines = [
    (434, "trim"),   # Smash Duplo
    (888, "trim"),   # Chicken
    (1044, "trim"),  # Gorgonzola
    (1163, "trim"),  # Burger
    (1279, "full"),  # Nordestino
    (1506, "trim"),  # Hoclaroma
]

def next_gold_y(start_y, limit=45):
    """First row of a gold title below start_y (or start_y+limit)."""
    for y in range(start_y, start_y + limit):
        for x in range(70, 320):
            r, g, b = px[x, y]
            if r > 150 and r > b + 55 and g > 80:
                return y
    return start_y + limit


def content_clusters(y_start, y_end):
    """Return list of (y0,y1) bright-text clusters between y_start and y_end."""
    rows = []
    for y in range(y_start, y_end + 1):
        bright = sum(1 for x in range(PANEL_L, PANEL_R) if sum(px[x, y]) / 3 > 55)
        if bright > 10:
            rows.append(y)
    clusters = []
    cur = []
    for y in rows:
        if not cur or y - cur[-1] <= 2:
            cur.append(y)
        else:
            clusters.append((cur[0], cur[-1]))
            cur = [y]
    if cur:
        clusters.append((cur[0], cur[-1]))
    return clusters


for mid_y, mode in remove_ketchup_lines:
    gold_y = next_gold_y(mid_y + 6)
    clusters = content_clusters(mid_y - 40, gold_y - 1)
    target = None
    prev_bottom = mid_y - 16
    for i, (c0, c1) in enumerate(clusters):
        if c0 - 2 <= mid_y <= c1 + 2:
            target = (c0, c1)
            if i > 0:
                prev_bottom = clusters[i - 1][1]
            break
    if target is None:
        target = (mid_y - 10, mid_y + 10)
    # Tighten previous-line bottom so sparse AA fringe is included in the wipe
    tight_prev = prev_bottom
    for y in range(prev_bottom, max(prev_bottom - 8, 0), -1):
        solid = sum(1 for x in range(PANEL_L, PANEL_R) if sum(px[x, y]) / 3 > 100)
        if solid > 20:
            tight_prev = y
            break
    y0 = tight_prev + 1
    y1 = gold_y - 2
    # Include a bit of headroom above the measured sauce cluster
    y0 = min(y0, max(target[0] - 4, tight_prev + 1))
    wipe(PANEL_L, y0, PANEL_R, y1)
    if mode == "full":
        scrub_band(y0, y1)
        continue
    rgb, glyph = render_line("Molho Ralf's", height=14)
    paste_y = target[0] + max(0, (target[1] - target[0] - 14) // 2)
    img.paste(rgb, (68, paste_y), mask=glyph)
    scrub_band(y0, y1, keep_mask=(68, paste_y, glyph))
    # Extra: kill any fringe between previous line and new Molho
    scrub_band(tight_prev + 1, paste_y - 1)

img.save(out_path, "PNG", optimize=True)
wa = img.resize((1080, int(1080 * img.size[1] / img.size[0])), Image.Resampling.LANCZOS)
wa.save(wa_path, "PNG", optimize=True)
print("saved", out_path, img.size)
print("saved", wa_path, wa.size)
