"""
Textures du décor de l'escalier (js/escalier.js) -> assets/decor/*.webp + assets/decor/textures.js

  py -3.13 _outils/decor_textures.py

- pierre-* / dalles-* : textures « roche » et « marches » Poly Haven (CC0), reprises du projet Clipsco
- papier-peint : papier peint jaune des Backrooms (fines rayures verticales, motif discret, taches)
- moquette     : moquette beige humide (fibres + auréoles)
- plafond      : dalles de faux plafond (grille, micro-perforations)
Toutes les textures se répètent sans couture (bruit fabriqué par FFT, donc périodique).
textures.js les embarque en base64 : la scène marche aussi en double-clic sur index.html (file://).
"""
import base64
import io
import shutil
from pathlib import Path

import numpy as np
from PIL import Image

RACINE = Path(__file__).resolve().parent.parent
SORTIE = RACINE / 'assets' / 'decor'
CLIPSCO = RACINE.parent / 'marketing-main' / 'marketing-main' / 'public' / 'clipsco' / 'plongee' / 'tex'
N = 512
UTILISEES = {'pierre-couleur', 'pierre-relief', 'dalles-couleur', 'dalles-relief'}
rng = np.random.default_rng(7)


def bruit(taille, echelle, puissance=2.0):
    """Bruit périodique (tileable) : bruit blanc filtré en 1/f^puissance, coupé sous `echelle` pixels."""
    b = rng.standard_normal((taille, taille))
    f = np.fft.fftfreq(taille)
    fx, fy = np.meshgrid(f, f)
    r = np.sqrt(fx ** 2 + fy ** 2)
    r[0, 0] = 1
    filtre = 1 / r ** puissance * np.exp(-(r * echelle) ** 2)
    filtre[0, 0] = 0
    s = np.real(np.fft.ifft2(np.fft.fft2(b) * filtre))
    s -= s.min()
    return s / s.max()


def sauver(nom, rgb):
    img = Image.fromarray(np.clip(rgb, 0, 255).astype(np.uint8))
    img.save(SORTIE / f'{nom}.webp', quality=86, method=6)
    return img


def papier_peint():
    y, x = np.mgrid[0:N, 0:N]
    base = np.array([196, 178, 92], float)
    # fines rayures verticales (8 par tuile), un ton à peine plus clair
    rayures = (np.sin(x / N * 2 * np.pi * 8) > 0.55) * 7.0
    # motif en chevrons discret, 8 x 8 par tuile
    cx, cy = (x % 64) - 32, (y % 64) - 32
    chevron = ((np.abs(np.abs(cx) - cy * 0.6 - 4) < 1.6) & (np.abs(cx) < 14) & (np.abs(cy) < 14)) * -9.0
    taches = bruit(N, 6, 2.2)
    grain = bruit(N, 0.6, 0.8)
    v = rayures + chevron
    rgb = base[None, None, :] + v[..., None]
    rgb *= (0.86 + 0.22 * taches)[..., None]
    rgb[..., 2] *= (0.92 + 0.12 * taches)          # les taches tirent sur le brun
    rgb += (grain[..., None] - 0.5) * 10
    sauver('papier-peint', rgb)


def moquette():
    base = np.array([150, 128, 82], float)
    fibres = bruit(N, 0.35, 0.3)
    moyen = bruit(N, 3, 1.6)
    aureoles = bruit(N, 14, 2.4)
    humide = np.clip((aureoles - 0.62) * 4, 0, 1)
    rgb = base[None, None, :] * (0.86 + 0.16 * moyen)[..., None]
    rgb += (fibres[..., None] - 0.5) * 46
    rgb *= (1 - 0.2 * humide)[..., None]
    sauver('moquette', rgb)


def plafond():
    y, x = np.mgrid[0:N, 0:N]
    base = np.array([214, 206, 178], float)
    t = N // 2                                     # 2 x 2 dalles par tuile
    bord = np.minimum(np.minimum(x % t, t - 1 - x % t), np.minimum(y % t, t - 1 - y % t))
    joint = np.clip(1 - bord / 3.0, 0, 1)
    trous = (rng.random((N, N)) > 0.985) * 1.0
    salete = bruit(N, 8, 2.0)
    rgb = base[None, None, :] * (0.9 + 0.12 * salete)[..., None]
    rgb -= trous[..., None] * 40
    rgb = rgb * (1 - 0.55 * joint)[..., None] + np.array([120, 110, 90]) * 0.55 * joint[..., None]
    sauver('plafond', rgb)


def pierre():
    shutil.copy(CLIPSCO / 'roche-couleur.webp', SORTIE / 'pierre-couleur.webp')
    shutil.copy(CLIPSCO / 'roche-relief.webp', SORTIE / 'pierre-relief.webp')
    shutil.copy(CLIPSCO / 'marches-couleur.webp', SORTIE / 'dalles-couleur.webp')
    shutil.copy(CLIPSCO / 'marches-relief.webp', SORTIE / 'dalles-relief.webp')


def embarquer():
    lignes = ['/* Textures du décor (généré par _outils/decor_textures.py) : base64, pour marcher aussi en file:// */',
              'window.DECOR_TEX = {']
    # seules les textures des îles sont embarquées (celles des Backrooms ne servent plus)
    for f in sorted(SORTIE.glob('*.webp')):
        if f.stem not in UTILISEES:
            continue
        b = base64.b64encode(f.read_bytes()).decode()
        lignes.append(f"  '{f.stem}': 'data:image/webp;base64,{b}',")
    lignes.append('};')
    (SORTIE / 'textures.js').write_text('\n'.join(lignes) + '\n', encoding='utf-8')


if __name__ == '__main__':
    SORTIE.mkdir(parents=True, exist_ok=True)
    papier_peint()
    moquette()
    plafond()
    pierre()
    embarquer()
    for f in sorted(SORTIE.iterdir()):
        print(f.name, f.stat().st_size // 1024, 'Ko')
