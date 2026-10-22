"""
Ciels du décor réaliste : HDRI Poly Haven (CC0) -> images JPG pour le site + position du soleil.

  py -3.13 _outils/decor_ciel.py <dossier_hdr>

Pour chaque ciel « puresky » 4K (.hdr, téléchargé sur polyhaven.com) :
  - assets/decor/ciel/<nom>.jpg       ciel tonemappé (ACES), coupé à -25° sous l'horizon (les nuages cachent le reste)
  - assets/decor/ciel/<nom>.jpg.js    la même image en base64 (pour l'ouverture en double-clic, file://)
  - assets/decor/ciel/ciels.json      direction et couleur du soleil, exposition (lus par js/escalier.js)
Mapping équirectangulaire (le même que le shader du ciel) :
  u = atan2(z, x) / 2pi + 0.5 ; v = asin(y) / pi + 0.5 ; ligne 0 = zénith.
"""
import base64
import json
import os
import sys

import numpy as np
from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, 'assets', 'decor', 'ciel')
BAS = -25.0                  # on garde le ciel jusqu'à 25° sous l'horizon
LARGEUR = 4096

# nom du fichier HDR -> (nom court, exposition)
CIELS = {
    'belfast_sunset_puresky_4k.hdr': ('coucher', 0.115),
    'qwantani_dusk_2_puresky_4k.hdr': ('crepuscule', 0.10),
}


def lire_hdr(chemin):
    """Décodeur Radiance RGBE (RLE « nouveau style ») -> tableau float32 (H, W, 3)."""
    with open(chemin, 'rb') as f:
        donnees = f.read()
    i = 0
    while True:                                   # en-tête jusqu'à la ligne vide
        j = donnees.index(b'\n', i)
        ligne = donnees[i:j]
        i = j + 1
        if ligne == b'':
            break
    j = donnees.index(b'\n', i)
    taille = donnees[i:j].split()
    i = j + 1
    H, W = int(taille[1]), int(taille[3])
    brut = np.frombuffer(donnees, dtype=np.uint8, offset=i)
    rgbe = np.empty((H, W, 4), dtype=np.uint8)
    p = 0
    for y in range(H):
        if brut[p] != 2 or brut[p + 1] != 2:
            raise ValueError('format RLE non géré')
        p += 4
        for c in range(4):
            x = 0
            ligne = rgbe[y, :, c]
            while x < W:
                n = int(brut[p]); p += 1
                if n > 128:
                    n -= 128
                    ligne[x:x + n] = brut[p]; p += 1
                else:
                    ligne[x:x + n] = brut[p:p + n]; p += n
                x += n
    e = rgbe[..., 3].astype(np.int32)
    k = np.where(e > 0, np.ldexp(1.0, e - 136), 0.0).astype(np.float32)
    return rgbe[..., :3].astype(np.float32) * k[..., None]


def aces(x):
    a, b, c, d, e = 2.51, 0.03, 2.43, 0.59, 0.14
    return np.clip((x * (a * x + b)) / (x * (c * x + d) + e), 0, 1)


def srgb(x):
    return np.where(x <= 0.0031308, 12.92 * x, 1.055 * np.power(x, 1 / 2.4) - 0.055)


def main(dossier):
    os.makedirs(SORTIE, exist_ok=True)
    infos = {}
    for fichier, (nom, expo) in CIELS.items():
        img = lire_hdr(os.path.join(dossier, fichier))
        H, W, _ = img.shape
        lum = img @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        # soleil : pixel le plus lumineux au-dessus de -5°
        haut = int(H * (0.5 + 5 / 180))
        r, x = np.unravel_index(np.argmax(lum[:haut]), lum[:haut].shape)
        u, v = (x + 0.5) / W, 1 - (r + 0.5) / H
        phi, lat = (u - 0.5) * 2 * np.pi, (v - 0.5) * np.pi
        soleil = [float(np.cos(phi) * np.cos(lat)), float(np.sin(lat)), float(np.sin(phi) * np.cos(lat))]
        # couleur de la lumière du soleil : moyenne autour du disque (normalisée), et ciel moyen (ambiance)
        z = img[max(0, r - 6):r + 7, max(0, x - 6):x + 7].reshape(-1, 3).mean(0)
        couleur = (z / max(z.max(), 1e-6)).tolist()
        ciel_moyen = img[:H // 2].reshape(-1, 3).mean(0)
        # exposition : la médiane du ciel (au-dessus de l'horizon) amenée à `expo` avant ACES (soir sombre et coloré)
        med = float(np.median(lum[:H // 2]))
        k = expo / max(med, 1e-6)
        ldr = aces(img * k)
        gris = ldr @ np.array([0.2126, 0.7152, 0.0722], dtype=np.float32)
        ldr = srgb(np.clip(gris[..., None] + (ldr - gris[..., None]) * 1.15, 0, 1))   # un peu plus de couleur
        bas = int(H * (0.5 - BAS / 180))
        ldr = (ldr[:bas] * 255 + 0.5).astype(np.uint8)
        im = Image.fromarray(ldr).resize((LARGEUR, int(bas * LARGEUR / W)), Image.LANCZOS)
        jpg = os.path.join(SORTIE, nom + '.jpg')
        im.save(jpg, quality=86, optimize=True, progressive=True)
        with open(jpg, 'rb') as f:
            b64 = base64.b64encode(f.read()).decode()
        with open(jpg + '.js', 'w', encoding='utf-8') as f:
            f.write('window.CIEL_%s = "data:image/jpeg;base64,%s";\n' % (nom.upper(), b64))
        lig = int(bas * (90 / (90 - BAS)))          # ligne de l'horizon dans l'image coupée
        horizon = (ldr[max(0, lig - 12):lig + 4].reshape(-1, 3).mean(0) / 255).tolist()
        infos[nom] = {
            'horizon': horizon,
            'soleil': soleil, 'couleur': couleur, 'exposition': k,
            'ciel': (ciel_moyen * k).tolist(), 'bas': BAS, 'taille': im.size,
            'source': fichier.replace('_4k.hdr', '') + ' (Poly Haven, CC0)'
        }
        print(nom, 'soleil', np.round(soleil, 3), 'élévation %.1f°' % np.degrees(lat), 'couleur', np.round(couleur, 2),
              'jpg %.1f Mo' % (os.path.getsize(jpg) / 1e6))
    with open(os.path.join(SORTIE, 'ciels.json'), 'w', encoding='utf-8') as f:
        json.dump(infos, f, indent=2, ensure_ascii=False)
    # la même chose en JS, lue au chargement par js/escalier.js (aussi en double-clic)
    with open(os.path.join(SORTIE, 'ciels.js'), 'w', encoding='utf-8') as f:
        f.write('window.CIELS = ' + json.dumps(infos, ensure_ascii=False) + ';' + chr(10))


if __name__ == '__main__':
    main(sys.argv[1] if len(sys.argv) > 1 else '.')
