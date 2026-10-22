"""Prépare les images du portfolio v4 à partir de l'ancien (portfolio_v3/portfolio_clean).

Usage : py -3.13 _outils/images.py
L'ancien dossier n'est jamais modifié : on lit, on écrit dans images/.
"""
from pathlib import Path
from PIL import Image, ImageSequence

ICI = Path(__file__).resolve().parent.parent
SRC = ICI.parent / "portfolio_v3" / "portfolio_clean" / "images"
DST = ICI / "images"
DST.mkdir(exist_ok=True)


def fixe(nom, sortie, largeur_max=1400, q=82):
    im = Image.open(SRC / nom)
    im = im.convert("RGBA" if im.mode in ("RGBA", "P", "LA") else "RGB")
    if im.width > largeur_max:
        im = im.resize((largeur_max, round(im.height * largeur_max / im.width)), Image.LANCZOS)
    im.save(DST / sortie, "WEBP", quality=q, method=6)
    print(sortie, im.size, (DST / sortie).stat().st_size // 1024, "Ko")


def anime(nom, sortie, largeur_max=600, q=78, pas=1):
    im = Image.open(SRC / nom)
    images, durees = [], []
    for i, fr in enumerate(ImageSequence.Iterator(im)):
        if i % pas:
            continue
        f = fr.convert("RGBA")
        if f.width > largeur_max:
            f = f.resize((largeur_max, round(f.height * largeur_max / f.width)), Image.LANCZOS)
        images.append(f)
        durees.append(fr.info.get("duration", 60) * pas)
    images[0].save(DST / sortie, "WEBP", save_all=True, append_images=images[1:],
                   duration=durees, loop=0, quality=q, method=4)
    print(sortie, len(images), "images", (DST / sortie).stat().st_size // 1024, "Ko")


# Photos et captures
for nom, sortie, lm in [
    ("aproposdemoi_jordan.jpg", "jordan.webp", 1100),
    ("AFKmon.png", "afkmon.webp", 1200),
    ("Yo_Game (Projet 1).png", "yogame.webp", 1200),
    ("roblox.png", "roblox.webp", 900),
    ("BTS_SIO.jpg", "bts_sio.webp", 1000),
    ("HTB_certif.jpg", "cert_htb.webp", 1400),
    ("SecNum_certif.png", "cert_secnum.webp", 1000),
    ("cisco_certif.png", "cert_cisco.webp", 1000),
    ("certification_mimo.png", "cert_mimo.webp", 1000),
    ("Hackagou.webp", "ev_hackagou.webp", 1000),
    ("olympiade.webp", "ev_olympiade.webp", 1000),
    ("stationN.jpg", "ev_stationn.webp", 1000),
    ("Semaine_numerique.webp", "ev_semaine.webp", 1200),
    ("sortit_dinum.webp", "ev_dinum.webp", 1200),
    ("jordan_dialogue.png", "dialogue1.webp", 700),
    ("jordan_dialogue2.png", "dialogue2.webp", 700),
    ("jordan_dialogue3.png", "dialogue3.webp", 700),
]:
    fixe(nom, sortie, lm)

# Animations
anime("aproposdemoi_pokemon.gif", "pokemon_bw.webp", 500)
anime("evolie.gif", "evolie.webp", 593)
anime("yuji.webp", "yuji_pas.webp", 498)

# Carte « Yuji Itadori » extraite du fond animé (une image fixe, le GIF fait 70 Mo)
g = Image.open(SRC / "yuji_fond.gif")
g.seek(110)
carte = g.convert("RGB")
w, h = carte.size
# la carte occupe ~ x 24.5 %..58.5 % de la largeur (cf. planche), toute la hauteur
carte = carte.crop((int(w * 0.245), 0, int(w * 0.585), h))
carte.save(DST / "yuji_carte.webp", "WEBP", quality=86, method=6)
print("yuji_carte.webp", carte.size)

# Portraits façon Pokémon Donjon Mystère (carrés, pixelisés) pour la veille
for nom, sortie, boite, couleurs in [
    ("jordan_dialogue.png", "portrait1.png", (142, 180, 882, 920), None),
    ("jordan_dialogue2.png", "portrait2.png", (110, 110, 990, 990), 40),
    ("jordan_dialogue3.png", "portrait3.png", (45, 45, 407, 407), None),
]:
    im = Image.open(SRC / nom).convert("RGBA")
    fond = Image.new("RGBA", im.size, (232, 226, 210, 255))
    fond.alpha_composite(im)
    p = fond.crop(boite).convert("RGB").resize((80, 80), Image.BOX)
    if couleurs:
        p = p.quantize(couleurs, method=Image.Quantize.MEDIANCUT).convert("RGB")
    p.resize((320, 320), Image.NEAREST).save(DST / sortie)
    print(sortie)
