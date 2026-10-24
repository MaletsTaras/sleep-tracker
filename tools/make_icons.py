"""
Генерує іконку застосунку, адаптивну іконку Android (передній план, фон, монохромна) і заставку.
Запуск з кореня проєкту:   python3 tools/make_icons.py
Потрібно: Python 3 з бібліотеками Pillow і numpy.

Усе малюється на полотні в 4 рази більшому за потрібне й зменшується — так краї виходять гладкими.
"""
import math
import tempfile
from pathlib import Path

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

OUT = Path(__file__).resolve().parent.parent / "assets"
SIZE = 1024
SS = 4  # коефіцієнт згладжування
BIG = SIZE * SS

BG_TOP_LEFT = np.array([0x3A, 0x35, 0xC4], dtype=np.float32)
BG_BOTTOM_RIGHT = np.array([0x80, 0x44, 0xD6], dtype=np.float32)
MOON_TOP = np.array([0xFF, 0xF7, 0xDC], dtype=np.float32)
MOON_BOTTOM = np.array([0xF2, 0xD7, 0x8A], dtype=np.float32)


def gradient_background(size: int) -> Image.Image:
    """Діагональний градієнт «від сутінків до світанку» з м'яким світлом біля місяця."""
    y, x = np.mgrid[0:size, 0:size].astype(np.float32)
    t = (x + y) / (2.0 * (size - 1))
    t = t[..., None]
    img = BG_TOP_LEFT * (1 - t) + BG_BOTTOM_RIGHT * t
    cx, cy = 0.46 * size, 0.52 * size
    d = np.sqrt((x - cx) ** 2 + (y - cy) ** 2) / (0.55 * size)
    glow = np.clip(1.0 - d, 0.0, 1.0) ** 2.2 * 0.20
    img = img * (1 - glow[..., None]) + np.array([255, 235, 190], dtype=np.float32) * glow[..., None]
    return Image.fromarray(np.clip(img, 0, 255).astype(np.uint8), "RGB")


def crescent_mask(size: int, cx: float, cy: float, r: float) -> Image.Image:
    """Серп: коло мінус зсунуте коло. Отвір дивиться вгору-вправо."""
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).ellipse([cx - r, cy - r, cx + r, cy + r], fill=255)
    cut = Image.new("L", (size, size), 0)
    r2 = r * 0.84
    ox, oy = cx + r * 0.56, cy - r * 0.40
    ImageDraw.Draw(cut).ellipse([ox - r2, oy - r2, ox + r2, oy + r2], fill=255)
    return ImageChops.subtract(mask, cut)


def sparkle_mask(size: int, cx: float, cy: float, r: float) -> Image.Image:
    """Чотирипроменева зірка з увігнутими боками."""
    pts = []
    for i in range(8):
        ang = math.pi / 2 * (i / 2.0) - math.pi / 2
        rad = r if i % 2 == 0 else r * 0.26
        pts.append((cx + rad * math.cos(ang), cy + rad * math.sin(ang)))
    mask = Image.new("L", (size, size), 0)
    ImageDraw.Draw(mask).polygon(pts, fill=255)
    return mask


def vertical_fill(size: int, top: np.ndarray, bottom: np.ndarray, y0: float, y1: float) -> Image.Image:
    y = np.arange(size, dtype=np.float32)
    t = np.clip((y - y0) / max(1.0, (y1 - y0)), 0, 1)[:, None, None]
    col = top * (1 - t) + bottom * t
    col = np.repeat(col, size, axis=1)
    return Image.fromarray(col.astype(np.uint8), "RGB")


def artwork(size: int, scale: float, mono: bool) -> Image.Image:
    """Місяць і зірки на прозорому тлі. `scale` стискає композицію до центру (для безпечної зони Android)."""
    c = size / 2
    k = scale * size / 1024.0

    def pos(x: float, y: float) -> tuple[float, float]:
        return c + (x - 512) * k, c + (y - 512) * k

    mx, my = pos(470, 545)
    moon = crescent_mask(size, mx, my, 285 * k)

    layer = Image.new("RGBA", (size, size), (0, 0, 0, 0))
    if mono:
        white = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        layer.paste(white, (0, 0), moon)
    else:
        fill = vertical_fill(size, MOON_TOP, MOON_BOTTOM, my - 285 * k, my + 285 * k).convert("RGBA")
        layer.paste(fill, (0, 0), moon)

    stars = [(690, 335, 92), (785, 505, 50), (600, 245, 36)]
    for sx, sy, sr in stars:
        px, py = pos(sx, sy)
        m = sparkle_mask(size, px, py, sr * k)
        white = Image.new("RGBA", (size, size), (255, 255, 255, 255))
        layer.paste(white, (0, 0), m)
    return layer


def downscale(img: Image.Image) -> Image.Image:
    return img.resize((SIZE, SIZE), Image.LANCZOS)


def with_glow(art: Image.Image, strength: float = 0.5) -> Image.Image:
    """М'яке світіння навколо місяця (тільки для кольорових версій)."""
    alpha = art.split()[3]
    blurred = alpha.filter(ImageFilter.GaussianBlur(SS * 38))
    glow = Image.new("RGBA", art.size, (255, 238, 196, 0))
    glow.putalpha(blurred.point(lambda v: int(v * strength)))
    return Image.alpha_composite(glow, art)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)

    bg_small = gradient_background(SIZE)

    # Іконка (повне тло, без прозорості) — місяць трохи більший, бо маски Android обрізають лише кути.
    art_full = with_glow(artwork(BIG, 1.0, mono=False))
    icon = bg_small.convert("RGBA")
    icon = Image.alpha_composite(icon, downscale(art_full))
    icon.convert("RGB").save(OUT / "icon.png", optimize=True)

    # Адаптивна іконка: композиція стиснута до безпечної зони (центральні ~62%).
    safe = 0.74
    art_safe = with_glow(artwork(BIG, safe, mono=False))
    downscale(art_safe).save(OUT / "adaptive-icon-foreground.png", optimize=True)
    bg_small.save(OUT / "adaptive-icon-background.png", optimize=True)
    downscale(artwork(BIG, safe, mono=True)).save(OUT / "adaptive-icon-monochrome.png", optimize=True)

    # Заставка: місяць і зірки на прозорому тлі (колір тла задано в app.json).
    downscale(with_glow(artwork(BIG, 0.9, mono=False), strength=0.35)).save(OUT / "splash-icon.png", optimize=True)

    # Попередній перегляд для перевірки очима (не потрапляє в збірку).
    preview = Image.new("RGB", (SIZE * 3, SIZE), (30, 30, 36))
    preview.paste(icon.convert("RGB"), (0, 0))
    fg = Image.alpha_composite(bg_small.convert("RGBA"), downscale(art_safe))
    mask = Image.new("L", (SIZE, SIZE), 0)
    ImageDraw.Draw(mask).ellipse([SIZE * 0.0, SIZE * 0.0, SIZE, SIZE], fill=255)
    preview.paste(fg.convert("RGB"), (SIZE, 0), mask)
    mono = Image.new("RGB", (SIZE, SIZE), (214, 220, 255))
    m = downscale(artwork(BIG, safe, mono=True))
    dark = Image.new("RGB", (SIZE, SIZE), (46, 44, 120))
    mono.paste(dark, (0, 0), m.split()[3])
    preview.paste(mono, (SIZE * 2, 0), mask)
    preview_path = Path(tempfile.gettempdir()) / "sleep-tracker-icon-preview.png"
    preview.resize((SIZE * 3 // 4, SIZE // 4), Image.LANCZOS).save(preview_path)
    print("Попередній перегляд:", preview_path)
    print("Готово:", ", ".join(sorted(p.name for p in OUT.glob("*.png"))))


if __name__ == "__main__":
    main()
