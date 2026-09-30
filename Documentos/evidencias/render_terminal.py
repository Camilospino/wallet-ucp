#!/usr/bin/env python3
"""
Renderiza salidas REALES de terminal como imagenes PNG para las evidencias
del laboratorio. No simula nada: recibe el texto que el comando produjo y lo
dibuja con la tipografia monoespaciada del sistema.

Uso: render_terminal.py <salida.txt> <salida.png> "<titulo opcional>"
"""
import sys
from PIL import Image, ImageDraw, ImageFont

# Paleta sobria, legible impresa en B/N
BG = (13, 17, 23)
BAR = (22, 27, 34)
FG = (228, 232, 240)
GREEN = (126, 231, 135)
BLUE = (121, 192, 255)
YELLOW = (240, 200, 120)
GREY = (139, 148, 158)
TITLE_BG = (30, 36, 45)

MONO = "/System/Library/Fonts/Menlo.ttc"
SANS = "/System/Library/Fonts/Supplemental/Arial.ttf"
SANS_B = "/System/Library/Fonts/Supplemental/Arial Bold.ttf"

PADDING = 26
TITLEBAR = 44
LINE_H = 21
FS_MONO = 15
FS_TITLE = 16


def hex_to_rgb(h):
    h = h.lstrip("#")
    return tuple(int(h[i:i + 2], 16) for i in (0, 2, 4))


def parse(line):
    """Marcado: @@ titulo, %%%N color, ok ok, >> comentario, normal."""
    s = line.rstrip("\n")
    if s.startswith("%%%"):
        return hex_to_rgb(s[3:9]), s[9:]
    if s.startswith("@@"):
        return YELLOW, s[2:]
    if s.startswith("ok"):
        return GREEN, s[2:]
    if s.startswith(">>"):
        return GREY, s[2:]
    return FG, s


def render(in_path, out_path, title=None):
    with open(in_path, "r", encoding="utf-8", errors="replace") as fh:
        raw = fh.read()

    rows = []
    for line in raw.split("\n"):
        color, text = parse(line)
        rows.append((color, text))

    mono = ImageFont.truetype(MONO, FS_MONO)
    sans_b = ImageFont.truetype(SANS_B, FS_TITLE)

    probe = Image.new("RGB", (10, 10))
    d0 = ImageDraw.Draw(probe)
    max_w = max((d0.textlength(t, font=mono) for _, t in rows), default=0)
    if title:
        max_w = max(max_w, d0.textlength(title, font=sans_b))

    width = int(max_w + PADDING * 2)
    width = max(width, 760)
    height = TITLEBAR + PADDING * 2 + LINE_H * max(len(rows), 1)
    height = max(height, 200)

    img = Image.new("RGB", (width, height), BG)
    dr = ImageDraw.Draw(img)

    # Barra de titulo con los tres puntos, estilo terminal
    dr.rectangle([0, 0, width, TITLEBAR], fill=BAR)
    for i, c in enumerate([(255, 95, 86), (255, 189, 46), (39, 201, 63)]):
        dr.ellipse([16 + i * 18, 17, 27 + i * 18, 28], fill=c)
    if title:
        tw = dr.textlength(title, font=sans_b)
        dr.text(((width - tw) / 2, 13), title, font=sans_b, fill=(190, 199, 210))

    dr.line([0, TITLEBAR, width, TITLEBAR], fill=(48, 54, 61))

    y = TITLEBAR + PADDING
    for color, text in rows:
        dr.text((PADDING, y), text, font=mono, fill=color)
        y += LINE_H

    img.save(out_path, "PNG", optimize=True)
    return out_path, width, height


if __name__ == "__main__":
    src = sys.argv[1]
    dst = sys.argv[2]
    ttl = sys.argv[3] if len(sys.argv) > 3 else None
    p, w, h = render(src, dst, ttl)
    print(f"OK {p} ({w}x{h})")
