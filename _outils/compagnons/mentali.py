"""Mentali (Espeon), assis comme sur l'illustration officielle (_outils/officielles/mentali_source.png).

  blender -b -P _outils/compagnons/mentali.py              -> assets/3d/compagnons/mentali.glb (+ .glb.js)
  blender -b -P _outils/compagnons/mentali.py -- --calque  -> + rendu de face (calque.py)

Unité : 100 px de l'illustration. Pattes au sol en z = 0, regard vers l'avant (-Y).
Os : me_racine > me_corps > (me_tete > me_oreille_g/d, me_patte_g/d, me_queue_1 > … > me_queue_4 > me_queue_5a / 5b).
Animations : mentali_repos (boucle), mentali_clic, mentali_content.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Matrix, Vector  # noqa: E402

import commun as C  # noqa: E402

C.vider()
CALQUE = "--calque" in sys.argv

LILAS = C.srgb("#dcbfd2")
LILAS_OMBRE = C.srgb("#b899ac")
LILAS_CLAIR = C.srgb("#efdcea")
OREILLE_INT = C.srgb("#3f4556")
OREILLE_BLEU = C.srgb("#4f7598")
ROUGE = C.srgb("#cc1f2e")
ROUGE_CLAIR = C.srgb("#ff8a8a")
IRIS = C.srgb("#b3a6e6")
IRIS_FONCE = C.srgb("#6e5cb0")
CONTOUR = C.srgb("#2a2232")
NEZ = C.srgb("#9b7f8c")

M = C.mat("me_corps", rough=0.6)
lum = Vector((-0.45, -0.6, 0.65)).normalized()


def lilas(co, n):
    return C.melange(LILAS_OMBRE, C.melange(LILAS, LILAS_CLAIR, C.lissage(0.6, 0.95, n.dot(lum)) * 0.5),
                     C.lissage(-0.55, 0.25, n.dot(lum)))


# ─── corps assis : buste, cou, croupe (peau « skin ») ───────────────────────
corps = C.peau("mentali_corps",
               [(0, 0.42, 0.5), (0, 0.15, 0.95), (0, -0.12, 1.4), (0, -0.2, 1.8), (0, -0.24, 2.05)],
               [(0, 1), (1, 2), (2, 3), (3, 4)],
               [(0.56, 0.56), (0.42, 0.4), (0.36, 0.37), (0.21, 0.22), (0.19, 0.2)], M, niveaux=2)
cuisses = []
for cote in (-1, 1):
    c = C.sphere("cuisse", 1.0, 32, 20, M)
    c.matrix_world = Matrix.Translation((0.33 * cote, 0.36, 0.42)) @ Matrix.Rotation(0.5, 4, "X") @ Matrix.Diagonal((0.27, 0.5, 0.38, 1))
    C.figer(c)
    pied = C.peau("pied_arriere", [(0.36 * cote, 0.05, 0.12), (0.34 * cote, -0.2, 0.07)], [(0, 1)], [0.1, 0.09], M)
    cuisses += [c, pied]
for o in [corps] + cuisses:
    C.peindre(o, lilas)
piece_corps = C.fusionner("mentali_corps", [corps] + cuisses)

pattes = {}
for cote, nom in ((-1, "g"), (1, "d")):
    pts = [(0.19 * cote, -0.18, 1.32), (0.19 * cote, -0.3, 0.8), (0.18 * cote, -0.34, 0.2), (0.18 * cote, -0.44, 0.08)]
    p = C.peau(f"mentali_patte_{nom}", pts, [(0, 1), (1, 2), (2, 3)], [0.15, 0.11, 0.085, 0.095], M)
    C.peindre(p, lilas)
    pattes[nom] = (p, Vector(pts[0]), Vector(pts[2]))

# ─── tête de chat, gemme rouge, yeux en amande ───────────────────────────────
H = Vector((0.0, -0.34, 2.42))
tete = C.sphere("tete", 1.0, 64, 36, M)


def forme_tete(co):
    p = Vector((co.x * 0.56, co.y * 0.5, co.z * 0.47))
    if co.y < 0 and co.z < 0.2:
        # museau : le bas du visage avance un peu et s'affine
        k = C.lissage(0.2, -0.6, co.z) * C.lissage(0.0, -0.9, co.y)
        p.y -= 0.1 * k
        p.x *= 1 - 0.25 * k
    if co.z < -0.5:
        p.x *= 1 - 0.2 * C.lissage(-0.5, -1.0, co.z)
    return p + H


C.deformer_sommets(tete, forme_tete)
C.peindre(tete, lilas)
st = C.Surface(tete)


def visage(x, z, ecart=0.0):
    p, n = st.plaquer(H + Vector((x, -0.8, z)), ecart)
    return p


yeux = []
for cote in (-1, 1):
    def couleur_oeil(rho, a):
        x, y = rho * math.cos(a), rho * math.sin(a)
        if rho > 0.84:
            return CONTOUR
        if (x + 0.28) ** 2 + (y - 0.3) ** 2 < 0.06:
            return (1.0, 1.0, 1.0)
        return C.melange(IRIS, IRIS_FONCE, C.lissage(0.2, 0.84, rho))
    yeux.append(C.decal(f"oeil_{cote}", st, visage(0.24 * cote, -0.02), 0.16, 0.1, couleur_oeil, M,
                        ecart=0.008, bombe=0.012, rotation=0.32 * cote, segs=44, anneaux=12))
gemme = C.sphere("gemme", 1.0, 24, 14, M)
pg = visage(0.0, 0.24)
gemme.scale = (0.095, 0.065, 0.095)
gemme.location = pg + Vector((0, 0.025, 0))
C.figer(gemme)
C.peindre(gemme, lambda co, n: ROUGE_CLAIR if n.dot(Vector((-0.4, -0.7, 0.6)).normalized()) > 0.8 else ROUGE)
nez = C.sphere("nez", 1.0, 12, 8, M)
nez.scale = (0.035, 0.022, 0.022)
nez.location = visage(0.0, -0.26) + Vector((0, -0.005, 0))
C.figer(nez)
C.peindre(nez, NEZ)

# Touffes des joues (deux pointes vers l'extérieur et le bas)
touffes = []
for cote in (-1, 1):
    for k, (lg, ang, dz) in enumerate(((0.46, -0.3, 0.0), (0.34, -0.85, -0.1))):
        t = C.tour("touffe", [(0.15, 0.0), (0.145, 0.1), (0.11, 0.24), (0.06, 0.36), (0.0, lg)], segs=16, materiau=M,
                   ferme_bas=True)
        C.deformer_sommets(t, lambda co: Vector((co.x, co.y * 0.35, co.z)))
        direction = Vector((cote, 0.15, math.sin(ang))).normalized()
        base, _ = st.plaquer(H + Vector((0.5 * cote, -0.02, -0.14 + dz)), -0.08)
        t.matrix_world = Matrix.Translation(base) @ direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
        C.figer(t)
        C.peindre(t, lilas)
        touffes.append(t)
piece_tete = C.fusionner("mentali_tete", [tete, gemme, nez] + yeux + touffes)

# ─── grandes oreilles (intérieur bleu nuit) ──────────────────────────────────
oreilles = {}
for cote, nom in ((-1, "g"), (1, "d")):
    o = C.tour(f"oreille_{nom}", [(0.38, 0.0), (0.37, 0.2), (0.28, 0.52), (0.16, 0.88), (0.06, 1.15), (0.0, 1.25)],
               segs=36, materiau=M, ferme_bas=True)
    C.deformer_sommets(o, lambda co: Vector((co.x, co.y * 0.34 + 0.05 * (co.x / 0.38) ** 2, co.z)))

    def couleur_oreille(co, n):
        dedans = n.y < -0.3 and abs(co.x) < 0.3 - 0.24 * co.z and 0.05 < co.z < 1.12
        if not dedans:
            return C.melange(LILAS_OMBRE, LILAS, C.lissage(-0.4, 0.4, n.dot(lum)))
        bord = abs(co.x) / max(0.02, 0.3 - 0.24 * co.z)
        return C.melange(OREILLE_INT, OREILLE_BLEU, C.lissage(0.55, 0.95, bord))
    C.peindre(o, couleur_oreille)
    direction = Vector((0.62 * cote, 0.12, 1.0)).normalized()
    base, _ = st.plaquer(H + Vector((0.34 * cote, 0.05, 0.4)), -0.08)
    o.matrix_world = Matrix.Translation(base) @ direction.to_track_quat("Z", "Y").to_matrix().to_4x4() @ Matrix.Rotation(-0.25 * cote, 4, "Z")
    C.figer(o)
    oreilles[nom] = (o, base, base + direction * 1.25)

# ─── queue qui monte derrière et se sépare en deux ───────────────────────────
Q = [(0.2, 0.85, 0.42), (0.55, 1.0, 0.72), (0.8, 1.02, 1.3), (0.9, 0.98, 1.9), (0.94, 0.94, 2.32)]
QA = [(1.12, 0.92, 2.56), (1.36, 0.9, 2.62), (1.55, 0.88, 2.52)]   # branche qui part vers l'extérieur
QB = [(0.97, 0.96, 2.66), (1.02, 0.98, 2.98), (0.94, 0.98, 3.16)]  # branche qui monte
sommets = Q + QA + QB
aretes = [(i, i + 1) for i in range(len(Q) - 1)] + [(4, 5), (5, 6), (6, 7), (4, 8), (8, 9), (9, 10)]
rayons = [0.13, 0.11, 0.095, 0.09, 0.088, 0.075, 0.055, 0.015, 0.075, 0.055, 0.015]
queue = C.peau("mentali_queue", sommets, aretes, rayons, M, niveaux=2)
C.peindre(queue, lilas)

# ─── squelette ────────────────────────────────────────────────────────────────
S = C.Squelette("mentali_rig")
S.os_("me_racine", (0, 0.1, 0), (0, 0.1, 0.4))
S.os_("me_corps", (0, 0.35, 0.5), (0, -0.15, 1.5), "me_racine")
S.os_("me_tete", (0, -0.22, 1.85), (0, -0.34, 2.7), "me_corps")
for nom in ("g", "d"):
    o, base, bout = oreilles[nom]
    S.os_(f"me_oreille_{nom}", base, bout, "me_tete")
    p, epaule, bas = pattes[nom]
    S.os_(f"me_patte_{nom}", epaule, bas, "me_corps")
S.os_("me_queue_1", Q[0], Q[1], "me_corps")
S.os_("me_queue_2", Q[1], Q[2], "me_queue_1")
S.os_("me_queue_3", Q[2], Q[3], "me_queue_2")
S.os_("me_queue_4", Q[3], Q[4], "me_queue_3")
S.os_("me_queue_5a", Q[4], QA[-1], "me_queue_4")
S.os_("me_queue_5b", Q[4], QB[-1], "me_queue_4")
S.finir()
S.attacher(piece_corps, "me_corps")
S.attacher(piece_tete, "me_tete")
for nom in ("g", "d"):
    S.attacher(oreilles[nom][0], f"me_oreille_{nom}")
    S.attacher(pattes[nom][0], f"me_patte_{nom}")
OS_QUEUE = ["me_queue_1", "me_queue_2", "me_queue_3", "me_queue_4", "me_queue_5a", "me_queue_5b"]
S.peser(queue, lambda co: S.poids_segments(co, OS_QUEUE))

# ─── animations ───────────────────────────────────────────────────────────────
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)


def anim_repos():
    P = 48
    cles = {
        "me_corps": C.boucle_sin(P, P, lambda ph: {"ech": (1 + 0.012 * math.sin(ph), 1 + 0.018 * math.sin(ph), 1 + 0.012 * math.sin(ph))}),
        "me_tete": C.boucle_sin(P, P, lambda ph: {"rot": [(Y, 0.06 * math.sin(ph)), (X, 0.03 * math.sin(2 * ph))]}),
    }
    for k, nom in enumerate(OS_QUEUE):
        amp = (0.04, 0.07, 0.1, 0.12, 0.14, 0.14)[k]
        cles[nom] = C.boucle_sin(P, P, lambda ph, k=k, amp=amp: {"rot": [(Y, amp * math.sin(ph - k * 0.6)), (X, amp * 0.5 * math.sin(ph * 2 - k))]})
    for k, nom in enumerate(("g", "d")):
        s = 1 if nom == "d" else -1
        cles[f"me_oreille_{nom}"] = [(1, {}), (28 + k * 6, {}), (31 + k * 6, {"rot": [(Y, -s * 0.28)]}), (35 + k * 6, {}), (P + 1, {})]
    S.action("mentali_repos", P, cles, boucle=True)


def anim_clic():
    cles = {
        "me_tete": [(1, {}), (6, {"rot": [(Y, 0.32), (X, -0.12)]}), (16, {"rot": [(Y, 0.25)]}), (26, {})],
        "me_racine": [(1, {}), (5, {"ech": (1.05, 0.92, 1.05)}), (11, {"pos": (0, 0.25, 0)}), (17, {}), (26, {})],
    }
    for k, nom in enumerate(OS_QUEUE):
        cles[nom] = [(1, {}), (5 + k, {"rot": [(Y, 0.35)]}), (11 + k, {"rot": [(Y, -0.3)]}), (18 + k, {"rot": [(Y, 0.1)]}), (26 + k, {})]
    for nom in ("g", "d"):
        s = 1 if nom == "d" else -1
        cles[f"me_oreille_{nom}"] = [(1, {}), (5, {"rot": [(Y, s * 0.18)], "ech": (1, 1.12, 1)}), (18, {}), (26, {})]
    S.action("mentali_clic", 31, cles)


def anim_content():
    P = 36
    cles = {
        "me_tete": [(f, {"rot": [(Y, 0.18 * math.sin(2 * math.pi * (f - 1) / 18)), (X, -0.06)]}) for f in range(1, P + 2, 3)],
        "me_patte_d": [(f, {"rot": [(X, -0.5 * max(0.0, math.sin(2 * math.pi * (f - 1) / 18)))]}) for f in range(1, P + 2, 3)],
    }
    for k, nom in enumerate(OS_QUEUE):
        cles[nom] = [(f, {"rot": [(Y, (0.12 + 0.05 * k) * math.sin(2 * math.pi * (f - 1) / 12 - k * 0.7))]}) for f in range(1, P + 2, 2)]
    S.action("mentali_content", P, cles)


anim_repos()
anim_clic()
anim_content()

C.exporter("mentali")
if CALQUE:
    C.rendu_face("mentali", azimut_deg=-35, cadre=4.75, centre=(0.3, 0, 2.15))
