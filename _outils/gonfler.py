"""Prépare les illustrations officielles pour en faire des modèles 3D « gonflés » dans Blender.

Pour chaque personnage : détourage (Komasan est sur fond blanc), recadrage, texture RGBA,
et carte de hauteur (distance au bord -> relief arrondi, lissé) échantillonnée sur une grille.

Usage : py -3.13 _outils/gonfler.py   ->  _outils/officielles/<nom>.png, <nom>_hauteur.npy, <nom>.json
Ensuite : blender -b -P _outils/creatures_officielles.py
"""
import json
from pathlib import Path

import numpy as np
from PIL import Image, ImageDraw, ImageFilter

ICI = Path(__file__).resolve().parent / "officielles"
TEX_MAX = 768      # côté max de la texture
COLONNES = 100     # résolution de la grille du maillage (en largeur)


def detourer_fond_blanc(im):
    """Fond blanc relié aux bords -> transparent (les contours noirs ferment le personnage)."""
    rgb = im.convert("RGB")
    w, h = rgb.size
    marque = (255, 0, 255)
    for xy in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1), (w // 2, 0), (w // 2, h - 1), (0, h // 2), (w - 1, h // 2)):
        if rgb.getpixel(xy) != marque and sum(rgb.getpixel(xy)) > 700:
            ImageDraw.floodfill(rgb, xy, marque, thresh=48)
    a = np.array(rgb)
    fond = (a[..., 0] == 255) & (a[..., 1] == 0) & (a[..., 2] == 255)
    alpha = np.where(fond, 0, 255).astype(np.uint8)
    # adoucit le bord d'un pixel
    alpha = np.array(Image.fromarray(alpha).filter(ImageFilter.GaussianBlur(0.7)))
    out = np.dstack([np.array(im.convert("RGB")), alpha])
    return Image.fromarray(out, "RGBA")


def distance_au_bord(masque, max_iter=400):
    """Distance (en pixels) au fond, par érosions successives (pas besoin de scipy)."""
    m = Image.fromarray((masque * 255).astype(np.uint8))
    d = np.zeros(masque.shape, np.float32)
    for i in range(max_iter):
        a = np.array(m) > 127
        if not a.any():
            break
        d += a
        m = m.filter(ImageFilter.MinFilter(3))
    return d


def flou_np(x, r, passes=3):
    """Flou ~gaussien sur un tableau flottant (boîtes successives, séparable)."""
    r = max(1, int(r))
    for _ in range(passes):
        for axe in (0, 1):
            p = np.pad(x, [(r + 1, r)] * 1 + [(0, 0)] if axe == 0 else [(0, 0), (r + 1, r)], mode="edge")
            c = np.cumsum(p, axis=axe)
            if axe == 0:
                x = (c[2 * r + 1:] - c[:-2 * r - 1]) / (2 * r + 1)
            else:
                x = (c[:, 2 * r + 1:] - c[:, :-2 * r - 1]) / (2 * r + 1)
    return x


def preparer(nom, epaisseur_rel):
    src = Image.open(ICI / f"{nom}_source.png")
    im = src.convert("RGBA")
    if np.array(im)[..., 3].min() == 255:  # pas de transparence : fond blanc à retirer
        im = detourer_fond_blanc(src)
    # recadrage serré + petite marge
    boite = im.getchannel("A").point(lambda v: 255 if v > 20 else 0).getbbox()
    marge = 6
    boite = (max(0, boite[0] - marge), max(0, boite[1] - marge), min(im.width, boite[2] + marge), min(im.height, boite[3] + marge))
    im = im.crop(boite)
    if max(im.size) > TEX_MAX:
        k = TEX_MAX / max(im.size)
        im = im.resize((round(im.width * k), round(im.height * k)), Image.LANCZOS)
    w, h = im.size
    # la couleur des pixels transparents = couleur du bord (évite un liseré clair au filtrage)
    a = np.array(im).astype(np.float32)
    al = a[..., 3:4] / 255
    def flouter(x):
        return np.array(Image.fromarray(x.clip(0, 255).astype(np.uint8)).filter(ImageFilter.GaussianBlur(4)), np.float32)
    prem = np.dstack([flouter(a[..., c] * al[..., 0]) for c in range(3)])
    poids = flouter(al[..., 0] * 255)[..., None] / 255
    flou = prem / np.maximum(poids, 1e-3)
    a[..., :3] = a[..., :3] * al + flou * (1 - al)
    im = Image.fromarray(a.clip(0, 255).astype(np.uint8), "RGBA")
    im.save(ICI / f"{nom}.png")

    # relief : racine de la distance au bord (forme de coussin), puis lissage
    masque = (a[..., 3] > 127).astype(np.float32)
    d = distance_au_bord(masque)
    hgt = np.sqrt(d)
    hgt = flou_np(hgt, max(2, w / 160))
    hgt *= masque
    hgt /= max(1e-6, hgt.max())
    # échantillonnage sur la grille du maillage
    cols = COLONNES
    lignes = max(2, round(cols * h / w))
    g = np.array(Image.fromarray(hgt.astype(np.float32), "F").resize((cols + 1, lignes + 1), Image.BILINEAR), np.float32)
    al_g = np.array(Image.fromarray(a[..., 3].astype(np.uint8)).resize((cols + 1, lignes + 1), Image.BILINEAR), np.float32) / 255
    np.save(ICI / f"{nom}_hauteur.npy", g)
    np.save(ICI / f"{nom}_alpha.npy", al_g)
    info = {"largeur_px": w, "hauteur_px": h, "colonnes": cols, "lignes": lignes, "epaisseur_rel": epaisseur_rel}
    (ICI / f"{nom}.json").write_text(json.dumps(info))
    print(nom, im.size, "grille", cols, "x", lignes)


preparer("pyrax", 0.13)
preparer("lugulabre", 0.16)
preparer("mentali", 0.16)
preparer("komasan", 0.17)
