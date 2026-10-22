"""Textures des talismans (ofuda) et de la bande de scellé, pour la Poké Ball scellée.

Usage : py -3.13 _outils/textures.py  ->  _outils/textures/*.png (lues par pokeball.py dans Blender)
"""
import random
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter, ImageFont

ICI = Path(__file__).resolve().parent
OUT = ICI / "textures"
OUT.mkdir(exist_ok=True)
POLICE = str(ICI / "polices" / "YujiBoku-Regular.ttf")

PAPIER = (236, 226, 200)
ENCRE = (22, 16, 14)
VERMILLON = (196, 30, 26)

rng = np.random.default_rng(7)


def papier(w, h, teinte=PAPIER):
    """Papier washi : fibres + taches légères."""
    base = np.ones((h, w, 3), np.float32) * np.array(teinte, np.float32)
    bruit = rng.normal(0, 1, (h // 4 + 1, w // 4 + 1)).astype(np.float32)
    bruit = np.array(Image.fromarray(((bruit * 20) + 128).clip(0, 255).astype(np.uint8)).resize((w, h), Image.BICUBIC), np.float32) - 128
    fibres = rng.normal(0, 1, (h, w)).astype(np.float32)
    fibres = np.array(Image.fromarray(((fibres * 30) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(0.6)), np.float32) - 128
    base += (bruit * 0.35 + fibres * 0.12)[..., None]
    # vieillissement sur les bords
    yy, xx = np.mgrid[0:h, 0:w]
    bord = np.minimum.reduce([xx, w - 1 - xx, yy, h - 1 - yy]).astype(np.float32)
    base *= (0.86 + 0.14 * np.clip(bord / 40, 0, 1))[..., None]
    return Image.fromarray(base.clip(0, 255).astype(np.uint8))


def tampon(d, cx, cy, r, texte, police):
    """Sceau vermillon rond avec un kanji en réserve."""
    d.ellipse((cx - r, cy - r, cx + r, cy + r), fill=VERMILLON)
    d.ellipse((cx - r + 7, cy - r + 7, cx + r - 7, cy + r - 7), outline=PAPIER, width=4)
    f = ImageFont.truetype(police, int(r * 1.15))
    d.text((cx, cy + 2), texte, font=f, fill=PAPIER, anchor="mm")


def encre_irreguliere(img):
    """Abîme un peu l'encre pour qu'elle ait l'air peinte au pinceau."""
    a = np.array(img).astype(np.float32)
    n = rng.normal(0, 1, a.shape[:2]).astype(np.float32)
    n = np.array(Image.fromarray(((n * 40) + 128).clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(1.2)), np.float32) - 128
    a += (n * 0.18)[..., None]
    return Image.fromarray(a.clip(0, 255).astype(np.uint8))


def ofuda(nom, kanjis, sceau, petits, seed):
    random.seed(seed)
    W, H = 320, 1024
    img = papier(W, H)
    d = ImageDraw.Draw(img)
    # double cadre vermillon
    d.rectangle((14, 14, W - 15, H - 15), outline=VERMILLON, width=6)
    d.rectangle((26, 26, W - 27, H - 27), outline=VERMILLON, width=2)
    # en-tête : symbole « 符 » dans un petit cartouche
    f_petit = ImageFont.truetype(POLICE, 44)
    d.text((W // 2, 76), petits[0], font=f_petit, fill=VERMILLON, anchor="mm")
    d.line((50, 112, W - 50, 112), fill=VERMILLON, width=3)
    # grands kanji verticaux à l'encre
    n = len(kanjis)
    haut, bas = 150, H - 230
    taille = min(190, int((bas - haut) / n * 0.98))
    f = ImageFont.truetype(POLICE, taille)
    for i, k in enumerate(kanjis):
        cy = haut + (i + 0.5) * (bas - haut) / n
        dx = random.uniform(-5, 5)
        d.text((W // 2 + dx, cy), k, font=f, fill=ENCRE, anchor="mm")
    # sceau vermillon
    tampon(d, W // 2, H - 140, 62, sceau, POLICE)
    # petites inscriptions latérales
    f_lat = ImageFont.truetype(POLICE, 26)
    for i, k in enumerate(petits[1:]):
        d.text((48, 170 + i * 34), k, font=f_lat, fill=VERMILLON, anchor="mm")
    img = encre_irreguliere(img)
    img.save(OUT / f"{nom}.png")
    print(nom, img.size)


ofuda("ofuda_1", "封印呪物", "呪", "符急急如", 1)
ofuda("ofuda_2", "急急如律令", "封", "符勅令", 2)
ofuda("ofuda_3", "黒閃", "虎", "符領域展開", 3)

# Bande de scellé : longue bande, texte qui se répète dans le sens de la longueur
W, H = 2048, 160
img = papier(W, H, (232, 222, 198))
d = ImageDraw.Draw(img)
d.line((0, 12, W, 12), fill=VERMILLON, width=6)
d.line((0, H - 13, W, H - 13), fill=VERMILLON, width=6)
f = ImageFont.truetype(POLICE, 96)
motif = "封印 ◆ 呪 ◆ 急急如律令 ◆ "
x = 30
while x < W:
    for c in motif:
        if c == " ":
            x += 28
            continue
        col = VERMILLON if c in "◆呪" else ENCRE
        fc = f if c != "◆" else ImageFont.truetype(POLICE, 40)
        d.text((x, H // 2 + 4), c, font=fc, fill=col, anchor="lm")
        x += int(d.textlength(c, font=fc)) + 6
img = encre_irreguliere(img)
img.save(OUT / "bande.png")
print("bande", img.size)
