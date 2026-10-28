from PIL import Image, ImageDraw, ImageFilter
import os
OUT = os.path.join(os.path.dirname(os.path.dirname(os.path.abspath(__file__))), 'icons')

def icon(size, pad):
    S = size * 2
    im = Image.new('RGB', (S, S), (4, 6, 15))
    glow = Image.new('RGB', (S, S), (0, 0, 0)); d = ImageDraw.Draw(glow)
    c = S // 2; r = int(S * (0.5 - pad) * 0.92)
    d.ellipse([c - r, c - r, c + r, c + r], outline=(70, 230, 255), width=S // 28)
    for a in (0.55, 0.33):
        rr = int(r * a); d.ellipse([c - rr, c - rr, c + rr, c + rr], outline=(255, 70, 200), width=S // 60)
    # N glyph
    w = int(r * 0.7); h = int(r * 0.95); t = S // 22
    pts = [(c - w // 2, c + h // 2), (c - w // 2, c - h // 2), (c + w // 2, c + h // 2), (c + w // 2, c - h // 2)]
    d.line(pts, fill=(255, 255, 255), width=t, joint='curve')
    blur = glow.filter(ImageFilter.GaussianBlur(S // 40))
    im = Image.blend(im, Image.eval(blur, lambda v: v), 0)
    from PIL import ImageChops
    im = ImageChops.add(im, blur); im = ImageChops.add(im, glow)
    return im.resize((size, size), Image.LANCZOS)

icon(192, 0.06).save(f'{OUT}/icon-192.png')
icon(512, 0.06).save(f'{OUT}/icon-512.png')
icon(512, 0.2).save(f'{OUT}/icon-maskable-512.png')
icon(180, 0.06).save(f'{OUT}/apple-touch-icon.png')
