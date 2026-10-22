"""
Textures du décor réaliste : Poly Haven (CC0), en 2K, recompressées pour le web.

  py -3.13 _outils/decor_textures_reel.py

Pour chaque texture : assets/decor/reel/<nom>_couleur.jpg (sRGB), _relief.jpg (normales OpenGL),
_arm.jpg (R = occlusion, G = rugosité, B = métal : les canaux qu'attend three.js).
"""
import io
import os
import urllib.request

from PIL import Image

RACINE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SORTIE = os.path.join(RACINE, 'assets', 'decor', 'reel')
RES = '2k'
TEXTURES = {
    'falaise': 'cliff_side',          # roche en strates sous les îles
    'mousse': 'rocky_terrain_03',     # roche moussue (haut des falaises)
    'herbe': 'sparse_grass',          # dessus des îles
    'dalles': 'stone_tiles_02',       # esplanades et marches
}
CARTES = {'couleur': 'diff', 'relief': 'nor_gl', 'arm': 'arm'}


def main():
    os.makedirs(SORTIE, exist_ok=True)
    for nom, ph in TEXTURES.items():
        for carte, suffixe in CARTES.items():
            url = f'https://dl.polyhaven.org/file/ph-assets/Textures/jpg/{RES}/{ph}/{ph}_{suffixe}_{RES}.jpg'
            dest = os.path.join(SORTIE, f'{nom}_{carte}.jpg')
            with urllib.request.urlopen(url, timeout=120) as r:
                im = Image.open(io.BytesIO(r.read())).convert('RGB')
            im.save(dest, quality=82 if carte != 'relief' else 90, optimize=True)
            print(nom, carte, im.size, '%.2f Mo' % (os.path.getsize(dest) / 1e6))


if __name__ == '__main__':
    main()
