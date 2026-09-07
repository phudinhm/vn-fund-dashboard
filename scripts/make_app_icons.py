#!/usr/bin/env python3
"""Dựng icon PNG cho màn hình chính iOS/Android từ đúng ký hiệu của favicon.

iOS bỏ qua favicon SVG khi người dùng "Add to Home Screen": nó chỉ đọc
<link rel="apple-touch-icon"> và bắt buộc là ảnh raster, nền đục (nền trong
suốt bị tô đen). Nên icon phải được dựng sẵn thành PNG, không thể để runtime.

Ký hiệu vẽ lại y hệt public/favicon.svg (viewBox 64x64) để cả trang chỉ có
một biểu tượng duy nhất - cùng nét giá đang đi lên với BrandMark ở header.

Chạy lại khi ký hiệu đổi:  python3 scripts/make_app_icons.py
"""
from pathlib import Path

from PIL import Image, ImageDraw

BG = (201, 100, 66)      # #c96442, đúng nền favicon
FG = (250, 249, 245)     # #faf9f5
VIEWBOX = 64
STROKE = 6               # cùng stroke-width của favicon
DOT_R = 4
# Nét "M16 43 27 31l8 7 13-17" trải phẳng thành các điểm tuyệt đối.
LINE = [(16, 43), (27, 31), (35, 38), (48, 21)]
DOT = (48, 21)

SS = 8                   # khử răng cưa bằng cách vẽ lớn rồi thu nhỏ

OUT_DIR = Path(__file__).resolve().parent.parent / 'public'
# iOS lấy 180x180 cho iPhone hiện đại và tự bo góc, nên nền để tràn viền.
# 192/512 là hai cỡ manifest Android hay dùng.
SIZES = {
    'apple-touch-icon.png': 180,
    'icon-192.png': 192,
    'icon-512.png': 512,
}


def render(size: int) -> Image.Image:
    px = size * SS
    scale = px / VIEWBOX
    img = Image.new('RGB', (px, px), BG)
    draw = ImageDraw.Draw(img)

    width = round(STROKE * scale)
    pts = [(x * scale, y * scale) for x, y in LINE]
    draw.line(pts, fill=FG, width=width, joint='curve')
    # ImageDraw không có round cap: tự chấm tròn ở hai đầu nét.
    r = width / 2
    for x, y in (pts[0], pts[-1]):
        draw.ellipse((x - r, y - r, x + r, y + r), fill=FG)

    cx, cy = DOT[0] * scale, DOT[1] * scale
    dr = DOT_R * scale
    draw.ellipse((cx - dr, cy - dr, cx + dr, cy + dr), fill=FG)

    return img.resize((size, size), Image.LANCZOS)


def main() -> None:
    for name, size in SIZES.items():
        path = OUT_DIR / name
        render(size).save(path, 'PNG', optimize=True)
        print(f'{path.relative_to(OUT_DIR.parent)}  {size}x{size}  {path.stat().st_size} B')


if __name__ == '__main__':
    main()
