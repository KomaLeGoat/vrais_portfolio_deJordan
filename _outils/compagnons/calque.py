"""Superpose le rendu de face d'un compagnon à son illustration officielle, pour comparer les proportions.

  py -3.13 _outils/compagnons/calque.py lugulabre   -> calques/lugulabre_calque.png
(le rendu vient de : blender -b -P _outils/compagnons/<nom>.py -- --calque)
"""
import sys
from pathlib import Path

from PIL import Image

ICI = Path(__file__).resolve().parent
nom = sys.argv[1]
ref = Image.open(ICI.parent / "officielles" / f"{nom}_source.png").convert("RGBA")
fond = Image.new("RGBA", ref.size, (255, 255, 255, 255))
fond.alpha_composite(ref)
rendu = Image.open(ICI / "calques" / f"{nom}_face.png").convert("RGBA").resize(ref.size)
# côte à côte : illustration | rendu | superposition (rendu à 55 %)
melange = fond.copy()
r2 = rendu.copy()
r2.putalpha(r2.getchannel("A").point(lambda a: int(a * 0.55)))
melange.alpha_composite(r2)
seul = Image.new("RGBA", ref.size, (255, 255, 255, 255))
seul.alpha_composite(rendu)
w, h = ref.size
out = Image.new("RGB", (w * 3, h), "white")
for i, im in enumerate((fond, seul, melange)):
    out.paste(im.convert("RGB"), (i * w, 0))
out.thumbnail((1500, 500))
out.save(ICI / "calques" / f"{nom}_calque.png")
print("calque :", ICI / "calques" / f"{nom}_calque.png")
