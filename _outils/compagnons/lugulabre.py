"""Lugulabre (Chandelure), modélisé d'après l'illustration officielle (_outils/officielles/lugulabre_source.png).

  blender -b -P _outils/compagnons/lugulabre.py              -> assets/3d/compagnons/lugulabre.glb (+ .glb.js)
  blender -b -P _outils/compagnons/lugulabre.py -- --calque  -> + rendu de face pour la comparaison (calque.py)

Unité : rayon du globe = 1 (85 px sur l'illustration ; centre du globe = (238, 315) px).
Os : lug_racine > lug_corps > lug_flamme_1..3 (grande flamme, souple), lug_bras_1..4 > lug_flammeche_1..4.
Animations : lugulabre_repos (boucle), lugulabre_clic, lugulabre_content.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Matrix, Vector  # noqa: E402

import commun as C  # noqa: E402

C.vider()
CALQUE = "--calque" in sys.argv

NOIR = C.srgb("#2c2b31")
NOIR_CLAIR = C.srgb("#4a4852")
VERRE = C.srgb("#b6cdea")
VERRE_CLAIR = C.srgb("#dcefff")
VERRE_FONCE = C.srgb("#93acd6")
JAUNE = C.srgb("#f0d24a")
VIOLET = C.srgb("#7774b4")
VIOLET_CLAIR = C.srgb("#a2a0de")
BLEU = C.srgb("#97bae0")
BLEU_CLAIR = C.srgb("#c4dcf4")

M_CORPS = C.mat("lug_corps", rough=0.45)
M_FLAMME = C.mat("flamme_lugulabre", rough=1.0, emission=1.0)

EZ = 0.75   # le globe est aplati


def surface(theta, elev, marge=0.0):
    """Point du globe : theta = 0 devant (-Y), 90° à droite (+X) ; elev en degrés."""
    t, e = math.radians(theta), math.radians(elev)
    return Vector((math.sin(t) * math.cos(e), -math.cos(t) * math.cos(e), EZ * math.sin(e))) * (1 + marge)


def plaquer(v, marge):
    """Ramène un point sur la surface du globe (ellipsoïde), un peu au-dessus."""
    k = math.sqrt(v.x ** 2 + v.y ** 2 + (v.z / EZ) ** 2)
    return v / k * (1 + marge)


# ─── globe ────────────────────────────────────────────────────────────────────
globe = C.sphere("globe", 1.0, 64, 32, M_CORPS)
C.deformer_sommets(globe, lambda co: Vector((co.x, co.y, co.z * EZ)))
lum = Vector((0.45, -0.55, 0.7)).normalized()
C.peindre(globe, lambda co, n: C.melange(C.melange(VERRE_FONCE, VERRE, C.lissage(-0.7, 0.1, co.z)),
                                          VERRE_CLAIR, C.lissage(0.55, 0.95, n.dot(lum)) * 0.8))

# Nervures (méridiens sombres) : une devant, une sous chaque œil, sur les côtés et derrière
nervures = []
for th in range(0, 360, 45):
    pts = [(*surface(th, e, 0.012), 0.026) for e in range(-58, 72, 8)]
    nervures.append(C.tube(f"nervure_{th}", pts, M_CORPS, resolution=8))
for o in nervures:
    C.peindre(o, NOIR)

# Yeux jaunes cerclés de noir, à ±45° du devant
yeux = []
for cote in (-1, 1):
    oeil = C.tour("oeil", [(0.0, 0.035), (0.1, 0.032), (0.165, 0.022), (0.18, 0.02), (0.225, 0.0)], segs=36,
                  materiau=M_CORPS)
    C.peindre(oeil, lambda co, n: JAUNE if math.hypot(co.x, co.y) < 0.172 else NOIR)
    centre = surface(45 * cote, 11)
    normale = Vector((centre.x, centre.y, centre.z / EZ ** 2)).normalized()
    oeil.matrix_world = Matrix.Translation(centre) @ normale.to_track_quat("Z", "Y").to_matrix().to_4x4()
    C.figer(oeil)
    C.deformer_sommets(oeil, lambda co: plaquer(co, 0.006 + max(0.0, (co - plaquer(co, 0)).length)))
    yeux.append(oeil)

# La ligne « en arête » qui relie les yeux, avec ses petits traits
arete = [C.tube("arete", [(*surface(th, 8, 0.014), 0.024) for th in range(-34, 35, 4)], M_CORPS, resolution=8)]
for th in (-24, -12, 0, 12, 24):
    arete.append(C.tube("trait", [(*surface(th, e, 0.014), 0.02) for e in (-2, 8, 18)], M_CORPS, resolution=8,
                        lisse_courbe=False))
for o in arete:
    C.peindre(o, NOIR)

# ─── couronne à pointes (en haut du globe) ───────────────────────────────────
N_POINTES = 7


def pointe(a):
    f = (a * N_POINTES / (2 * math.pi)) % 1.0
    return max(0.0, 1 - abs(f - 0.5) * 2) ** 1.6


def deformer_couronne(x, y, z, a, t):
    if t > 0.35 and t < 0.75:          # bord supérieur : les pointes montent et s'écartent
        p = pointe(a)
        k = 1 + 0.22 * p
        return x * k, y * k, z + 0.34 * p
    return x, y, z


couronne = C.tour("couronne", [(0.3, 0.6), (0.4, 0.66), (0.45, 0.74), (0.43, 0.76), (0.37, 0.7), (0.29, 0.64)],
                  segs=N_POINTES * 14, materiau=M_CORPS, deformer=deformer_couronne)
C.peindre(couronne, NOIR)

# ─── coupe du bas et pointe ───────────────────────────────────────────────────
coupe = C.tour("coupe", [(0.0, -0.95), (0.16, -0.95), (0.3, -0.88), (0.52, -0.76), (0.72, -0.6), (0.76, -0.55),
                         (0.7, -0.53), (0.5, -0.62)], segs=64, materiau=M_CORPS)
C.peindre(coupe, lambda co, n: C.melange(NOIR, NOIR_CLAIR, C.lissage(0.6, 1.0, n.dot(lum)) * 0.6))
pique = C.tour("pique", [(0.17, -0.9), (0.15, -1.05), (0.11, -1.25), (0.06, -1.45), (0.0, -1.62)], segs=32,
               materiau=M_CORPS)
C.peindre(pique, NOIR)

corps = C.fusionner("lugulabre_corps", [globe, couronne, coupe, pique] + nervures + yeux + arete)

# ─── flammes ──────────────────────────────────────────────────────────────────
def couleur_flamme(base_bleue, haut):
    def f(co, n):
        a = math.atan2(co.y, co.x)
        dent = 0.07 * abs(((a * 5 / math.pi) % 2) - 1)       # bord en dents de scie
        if co.z < base_bleue + dent:
            return C.melange(BLEU, BLEU_CLAIR, C.lissage(-0.2, 0.9, n.dot(lum)) * 0.6)
        clair = C.lissage(0.2, 0.9, n.dot(Vector((-0.6, -0.6, 0.4)).normalized()))
        return C.melange(VIOLET, VIOLET_CLAIR, clair * 0.35 * (1 - C.lissage(haut * 0.7, haut, co.z)))
    return f


# Grande flamme : profil et ligne médiane mesurés sur l'illustration (S, pointe qui revient à droite)
GF = [(0.58, 0.16, 0.0), (0.8, 0.2, 0.06), (0.95, 0.23, 0.08), (1.21, 0.25, 0.04), (1.64, 0.26, 0.02),
      (1.92, 0.3, 0.2), (2.2, 0.26, 0.32), (2.49, 0.19, 0.31), (2.78, 0.12, 0.17), (3.06, 0.065, 0.07),
      (3.3, 0.025, 0.1), (3.4, 0.0, 0.13)]


def ligne(z):
    for (z0, _, x0), (z1, _, x1) in zip(GF, GF[1:]):
        if z <= z1:
            return x0 + (x1 - x0) * (z - z0) / (z1 - z0)
    return GF[-1][2]


def deformer_grande(x, y, z, a, t):
    return x + ligne(z), y * 0.82, z


grande = C.tour("flamme_lugulabre_haut", [(r, z) for z, r, _ in GF], segs=40, materiau=M_FLAMME,
                deformer=deformer_grande, ferme_bas=True)
C.peindre(grande, couleur_flamme(0.98, 3.4))

# ─── bras : deux par côté — un long vers l'avant (coupelle basse, volute), un court vers l'arrière (plus haut) ───
# Tracés dans le plan vertical du bras : (r = distance à l'axe, z). Le long est mesuré sur le bras extérieur gauche.
LONG = [(0.12, -0.98), (0.45, -1.13), (0.9, -1.15), (1.35, -0.95), (1.65, -0.5), (1.82, -0.05), (1.9, 0.3)]
COURT = [(0.12, -0.98), (0.45, -1.1), (0.9, -1.02), (1.2, -0.65), (1.3, -0.15), (1.22, 0.25), (1.15, 0.45)]
BRAS = [(-70, LONG, True, 1.0, 1), (70, LONG, True, 1.0, 2), (118, COURT, False, 0.78, 3), (-118, COURT, False, 0.78, 4)]


def dans_plan(theta, r, z):
    t = math.radians(theta)
    return Vector((math.sin(t) * r, -math.cos(t) * r, z))


def deformer_tulipe(x, y, z, a, t):
    if t > 0.8:
        return x, y, z + 0.09 * max(0.0, 1 - abs(((a * 5 / (2 * math.pi)) % 1) - 0.5) * 2) ** 1.3
    return x, y, z


coupelles = {}
pieces_bras = {}
for theta, trace, avec_volute, h, n in BRAS:
    pts = [(*dans_plan(theta, r, z), 0.085 - 0.03 * i / (len(trace) - 1)) for i, (r, z) in enumerate(trace)]
    morceaux = [C.tube(f"bras_{n}", pts, M_CORPS, resolution=12)]
    if avec_volute:
        # Volute : spirale entre le globe et le bras, qui part du bas et s'enroule vers le haut
        vol = []
        cx, cz, r0 = 1.22, -0.5, 0.58
        for i in range(32):
            u = i / 31
            ang = math.radians(-105 + 440 * u)
            rr = r0 * (1 - 0.84 * u)
            vol.append((*dans_plan(theta, cx + math.cos(ang) * rr, cz + math.sin(ang) * rr), 0.052 * (1 - 0.45 * u)))
        morceaux.append(C.tube(f"volute_{n}", vol, M_CORPS, resolution=10))
    # Coupelle en tulipe, bord en pétales pointus ; son bord est à 0,5 au-dessus du bout du bras
    tulipe = C.tour(f"coupelle_{n}", [(0.05, -0.56), (0.12, -0.5), (0.22, -0.4), (0.29, -0.24), (0.29, -0.12),
                                      (0.25, -0.02), (0.235, 0.0), (0.2, -0.02), (0.16, -0.1)],
                    segs=50, materiau=M_CORPS, deformer=deformer_tulipe)
    pos_coupe = dans_plan(theta, trace[-1][0], trace[-1][1] + 0.5)
    tulipe.location = pos_coupe
    morceaux.append(tulipe)
    for o in morceaux:
        C.peindre(o, lambda co, nn: C.melange(NOIR, NOIR_CLAIR, C.lissage(0.6, 1.0, nn.dot(lum)) * 0.5))
    pieces_bras[n] = C.fusionner(f"lugulabre_bras_{n}", morceaux)
    # Flammèche (petite flamme), un peu penchée vers l'extérieur
    fl = C.tour(f"flamme_lugulabre_{n}", [(0.0, -0.05), (0.2, 0.0), (0.25, 0.14 * h), (0.23, 0.34 * h),
                                          (0.16, 0.6 * h), (0.075, 0.84 * h), (0.0, 1.0 * h)],
                segs=32, materiau=M_FLAMME)
    C.peindre(fl, couleur_flamme(0.26 * h, h))
    t = math.radians(theta)
    fl.matrix_world = Matrix.Translation(pos_coupe + Vector((0, 0, -0.06))) @         Matrix.Rotation(-0.13, 4, Vector((-math.cos(t), -math.sin(t), 0)))
    C.figer(fl)
    coupelles[n] = (pos_coupe, fl, trace)

# ─── squelette ────────────────────────────────────────────────────────────────
S = C.Squelette("lugulabre_rig")
S.os_("lug_racine", (0, 0, -0.3), (0, 0, 0.2))
S.os_("lug_corps", (0, 0, -0.2), (0, 0, 0.55), "lug_racine")
S.os_("lug_flamme_1", (0, 0, 0.7), (0.04, 0, 1.6), "lug_corps")
S.os_("lug_flamme_2", (0.04, 0, 1.6), (0.3, 0, 2.4), "lug_flamme_1")
S.os_("lug_flamme_3", (0.3, 0, 2.4), (0.12, 0, 3.4), "lug_flamme_2")
for theta, trace, _, h, n in BRAS:
    pos_coupe = coupelles[n][0]
    S.os_(f"lug_bras_{n}", dans_plan(theta, 0.12, -0.98), pos_coupe, "lug_corps")
    S.os_(f"lug_flammeche_{n}", pos_coupe, pos_coupe + Vector((0, 0, 0.8)), f"lug_bras_{n}")
S.finir()

S.attacher(corps, "lug_corps")
for theta, trace, _, h, n in BRAS:
    S.attacher(pieces_bras[n], f"lug_bras_{n}")
    S.attacher(coupelles[n][1], f"lug_flammeche_{n}")


def poids_grande(co):
    z = co.z
    w1 = 1 - C.lissage(0.9, 1.9, z)
    w3 = C.lissage(2.0, 2.9, z)
    w2 = max(0.0, 1 - w1 - w3)
    return {"lug_flamme_1": w1, "lug_flamme_2": w2, "lug_flamme_3": w3}


S.peser(grande, poids_grande)

# ─── animations ───────────────────────────────────────────────────────────────
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)


def axe_lever(theta):
    """Axe horizontal perpendiculaire au bras : une rotation positive lève le bout du bras."""
    t = math.radians(theta)
    return (-math.cos(t), -math.sin(t), 0)


def anim_repos():
    cles = {}
    P = 48
    for k, nom in enumerate(("lug_flamme_1", "lug_flamme_2", "lug_flamme_3")):
        amp = (0.06, 0.12, 0.2)[k]
        cles[nom] = C.boucle_sin(P, P, lambda ph, k=k, amp=amp: {
            "rot": [(Y, amp * math.sin(ph - k * 0.9)), (X, amp * 0.5 * math.sin(2 * ph - k))]})
    for theta, _, _, _, n in BRAS:
        cles[f"lug_bras_{n}"] = C.boucle_sin(P, P, lambda ph, n=n, th=theta: {
            "rot": [(axe_lever(th), 0.05 * math.sin(ph + n * 1.3))]})
        cles[f"lug_flammeche_{n}"] = C.boucle_sin(P, 12, lambda ph, n=n: {
            "ech": (1 - 0.05 * math.sin(ph + n), 1 + 0.09 * math.sin(ph + n), 1 - 0.05 * math.sin(ph + n))}, pas=2)
    S.action("lugulabre_repos", P, cles, boucle=True)


def anim_clic():
    cles = {}
    for theta, _, _, _, n in BRAS:
        cles[f"lug_bras_{n}"] = [(1, {}), (6, {"rot": [(axe_lever(theta), 0.38)]}),
                                 (14, {"rot": [(axe_lever(theta), 0.3)]}), (24, {})]
        cles[f"lug_flammeche_{n}"] = [(1, {}), (5, {"ech": (1.35, 1.7, 1.35)}), (12, {"ech": (1.1, 1.2, 1.1)}),
                                      (24, {})]
    cles["lug_flamme_1"] = [(1, {}), (5, {"ech": (1.2, 1.25, 1.2)}), (24, {})]
    cles["lug_flamme_2"] = [(1, {}), (6, {"rot": [(Y, -0.35)]}), (12, {"rot": [(Y, 0.3)]}), (18, {"rot": [(Y, -0.12)]}),
                            (24, {})]
    cles["lug_flamme_3"] = [(1, {}), (7, {"rot": [(Y, 0.4)]}), (13, {"rot": [(Y, -0.4)]}), (19, {"rot": [(Y, 0.15)]}),
                            (24, {})]
    S.action("lugulabre_clic", 24, cles)


def anim_content():
    cles = {}
    P = 36
    for theta, _, _, _, n in BRAS:
        signe = 1 if n in (1, 3) else -1
        cles[f"lug_bras_{n}"] = [(f, {"rot": [(axe_lever(theta), 0.28 * max(0.0, math.sin(2 * math.pi * (f - 1) / 18) * signe))]})
                                 for f in range(1, P + 2, 3)]
        cles[f"lug_flammeche_{n}"] = [(f, {"ech": (1.15, 1.3 + 0.2 * math.sin(f), 1.15)}) for f in range(1, P + 2, 4)]
    for k, nom in enumerate(("lug_flamme_1", "lug_flamme_2", "lug_flamme_3")):
        cles[nom] = [(f, {"rot": [(Y, (0.1 + 0.12 * k) * math.sin(2 * math.pi * (f - 1) / 12 - k))]})
                     for f in range(1, P + 2, 2)]
    S.action("lugulabre_content", P, cles)


anim_repos()
anim_clic()
anim_content()

C.exporter("lugulabre")
if CALQUE:
    C.rendu_face("lugulabre", azimut_deg=45, cadre=475 / 85, centre=(0, 0, (315 - 237.5) / 85))
