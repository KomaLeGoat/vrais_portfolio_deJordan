"""Pyrax (Volcarona), modélisé d'après l'illustration officielle (_outils/officielles/pyrax_source.png).

  blender -b -P _outils/compagnons/pyrax.py              -> assets/3d/compagnons/pyrax.glb (+ .glb.js)
  blender -b -P _outils/compagnons/pyrax.py -- --calque  -> + rendu de face (calque.py)

Unité : 100 px de l'illustration ; origine = centre de la crinière blanche.
Os : py_racine > py_corps > (py_tete, py_abdomen, py_aile_1..6).
Animations : pyrax_repos (boucle), pyrax_clic, pyrax_content.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Matrix, Vector  # noqa: E402

import commun as C  # noqa: E402

C.vider()
CALQUE = "--calque" in sys.argv

BLANC = C.srgb("#f4f7fb")
GRIS = C.srgb("#b4b5bb")
GRIS_FONCE = C.srgb("#8a8b92")
NOIR = C.srgb("#2b2829")
TETE_C = C.srgb("#4d4a49")
TETE_CLAIR = C.srgb("#6e6a68")
BLEU = C.srgb("#3ab8e8")
BLEU_CLAIR = C.srgb("#a5ecff")
ROUGE_CORNE = C.srgb("#c8524a")
ROSE_CORNE = C.srgb("#e0948b")
CYAN = C.srgb("#b2e1e1")
CYAN_OMBRE = C.srgb("#88adaf")
LIGNE_VENTRE = C.srgb("#6f9497")
AILE_BASE = C.srgb("#f7a37d")
AILE_MILIEU = C.srgb("#f08050")
AILE_BORD = C.srgb("#c96060")

M = C.mat("py_corps", rough=0.6)
lum = Vector((-0.45, -0.6, 0.65)).normalized()


def ombre_douce(base, sombre, force=0.5):
    return lambda co, n: C.melange(sombre, base, C.lissage(-0.5, 0.45, n.dot(lum)) * force + (1 - force))


# ─── crinière blanche duveteuse ──────────────────────────────────────────────
criniere = C.sphere("criniere", 1.0, 72, 44, M)


def touffes(co):
    d = co.normalized()
    az = math.atan2(d.x, -d.y)
    el = math.asin(max(-1.0, min(1.0, d.z)))
    # mèches de poils : surtout en bas et sur les épaules
    motif = max(0.0, math.sin(7 * az + 2.0 * math.sin(5 * el)) * math.cos(6 * el + 0.6 * math.sin(4 * az))) ** 2
    masque = C.lissage(0.15, -0.35, d.z) + 0.6 * C.lissage(0.55, 0.85, abs(d.x)) * C.lissage(-0.2, 0.3, d.z)
    k = 1 + 0.19 * motif * min(1.0, masque)
    return Vector((d.x * 0.95, d.y * 0.72, d.z * 0.8)) * k


C.deformer_sommets(criniere, touffes)
C.peindre(criniere, lambda co, n: C.melange(C.melange(GRIS_FONCE, GRIS, C.lissage(-0.95, -0.55, co.z)), BLANC,
                                             C.lissage(-0.45, 0.05, co.z) * (0.75 + 0.25 * C.lissage(-0.4, 0.4, n.dot(lum)))))
sc = C.Surface(criniere)

# Pattes : six petites bosses noires sur le devant du poitrail
pattes = []
for cote in (-1, 1):
    for x, z in ((0.3, 0.02), (0.38, -0.26)):
        p, n = sc.plaquer(Vector((x * cote, -1.2, z)), 0.02)
        b = C.sphere("patte", 1.0, 16, 10, M)
        b.matrix_world = Matrix.Translation(p) @ n.to_track_quat("Z", "Y").to_matrix().to_4x4() @ Matrix.Diagonal((0.095, 0.08, 0.075, 1))
        C.figer(b)
        C.peindre(b, lambda co, nn: C.melange(TETE_C, C.srgb("#8a8584"), C.lissage(0.5, 0.95, nn.dot(lum)) * 0.7))
        pattes.append(b)
corps = C.fusionner("pyrax_criniere", [criniere] + pattes)

# ─── tête noire (casque), yeux en losange bleus, cornes rouges en crochet ────
H = Vector((0.0, -0.55, 0.5))
tete = C.sphere("tete", 1.0, 48, 28, M)


def forme_tete(co):
    k = 1 + 0.45 * min(0.0, co.z)          # le bas (le visage) s'affine en pointe
    return Vector((co.x * 0.4 * k, co.y * 0.37, co.z * 0.5))


C.deformer_sommets(tete, forme_tete)
tete.matrix_world = Matrix.Translation(H) @ Matrix.Rotation(0.42, 4, "X")
C.figer(tete)
C.peindre(tete, lambda co, n: C.melange(TETE_C, TETE_CLAIR, C.lissage(0.5, 0.95, n.dot(lum)) * 0.8))
st = C.Surface(tete)
yeux = []
for cote in (-1, 1):
    centre = H + Vector((0.15 * cote, -0.5, -0.16))
    yeux.append(C.decal(f"oeil_{cote}", st, centre, 0.085, 0.14,
                        lambda rho, a: (C.melange(BLEU_CLAIR, BLEU, C.lissage(0.0, 0.6, rho))
                                        if rho * (abs(math.cos(a)) + abs(math.sin(a))) < 0.82 else
                                        (NOIR if rho * (abs(math.cos(a)) + abs(math.sin(a))) < 0.98 else TETE_C)),
                        M, ecart=0.008, bombe=0.015, rotation=-0.35 * cote, segs=40, anneaux=12))
cornes = []
for cote in (-1, 1):
    pts = [(0.18, 0.04, 0.3, 0.13), (0.3, 0.12, 0.54, 0.12), (0.4, 0.26, 0.7, 0.1), (0.5, 0.22, 0.86, 0.085),
           (0.56, 0.06, 0.86, 0.065), (0.53, -0.04, 0.74, 0.045), (0.47, -0.04, 0.66, 0.02)]
    c = C.tube(f"corne_{cote}", [(H.x + x * cote, H.y + y, H.z + z, r) for x, y, z, r in pts], M, resolution=12)
    C.peindre(c, lambda co, n: C.melange(ROUGE_CORNE, ROSE_CORNE, C.lissage(0.3, 0.9, n.dot(lum)) * 0.7))
    cornes.append(c)
piece_tete = C.fusionner("pyrax_tete", [tete] + yeux + cornes)

# ─── abdomen bleu-vert segmenté, bande noire qui finit en pointe ────────────
A = Vector((0.0, 0.0, -1.12))
ventre = C.sphere("abdomen", 1.0, 56, 32, M)
ventre.matrix_world = Matrix.Translation(A) @ Matrix.Rotation(0.5, 4, "X") @ Matrix.Diagonal((0.64, 0.56, 0.72, 1))
C.figer(ventre)
C.peindre(ventre, ombre_douce(CYAN, CYAN_OMBRE, 0.6))
sv = C.Surface(ventre)
anneaux = []
for z in (-0.72, -0.98, -1.24, -1.5):
    pts = []
    for k in range(41):
        a = 2 * math.pi * k / 40
        p, _ = sv.plaquer(Vector((math.sin(a) * 2, -math.cos(a) * 2, z + 0.06 * math.cos(a))), 0.008)
        pts.append((*p, 0.014))
    t = C.tube("anneau", pts, M, resolution=6)
    C.peindre(t, LIGNE_VENTRE)
    anneaux.append(t)
taches = []
for cote in (-1, 1):
    for z in (-0.85, -1.1, -1.36):
        taches.append(C.decal("tache_ventre", sv, Vector((0.62 * cote, -0.25, z)), 0.05, 0.035,
                              lambda rho, a: NOIR, M, ecart=0.01))
centres = [Vector((0, -1.0, z)) for z in (-0.72, -0.9, -1.08, -1.26, -1.44, -1.62, -1.78)]
raie = C.bande("raie", sv, centres, [0.22, 0.2, 0.17, 0.14, 0.1, 0.07, 0.04], NOIR, M, ecart=0.03)
bas, nb = sv.plaquer(Vector((0, -0.6, -2.2)), -0.05)
pique = C.tour("pique", [(0.1, 0.0), (0.08, 0.15), (0.05, 0.32), (0.02, 0.46), (0.0, 0.52)], segs=20, materiau=M,
               ferme_bas=True)
pique.matrix_world = Matrix.Translation(bas) @ Vector((0, -0.55, -1)).normalized().to_track_quat("Z", "Y").to_matrix().to_4x4()
C.figer(pique)
C.peindre(pique, lambda co, n: C.melange(NOIR, TETE_CLAIR, C.lissage(0.5, 0.95, n.dot(lum)) * 0.5))
piece_ventre = C.fusionner("pyrax_abdomen", [ventre, raie, pique] + anneaux + taches)

# ─── six ailes en flamme ─────────────────────────────────────────────────────
# (angle depuis le haut vers la droite, longueur, largeur, courbe, taches (u, v, rx, ry))
AILES = [
    (36, 2.6, 0.62, 0.55, [(0.55, 0.15, 0.07, 0.11), (0.74, -0.1, 0.05, 0.07), (0.38, -0.3, 0.04, 0.05)]),
    (98, 2.2, 0.56, -0.45, [(0.5, 0.0, 0.08, 0.1), (0.7, 0.3, 0.04, 0.05)]),
    (150, 1.95, 0.54, 0.5, [(0.52, -0.1, 0.07, 0.1), (0.74, 0.2, 0.04, 0.06)]),
]


def largeur(u, W):
    u = min(1.0, max(0.0, u))
    return W * (0.16 + 0.84 * math.sin(math.pi * u ** 0.8)) * (1 - u) ** 0.35


def mediane(u, W, courbe, signe):
    u = min(1.0, max(0.0, u))
    return signe * (courbe * W * 0.55 * math.sin(u * math.pi * 1.15) + 0.28 * W * u ** 4)


def aile(nom, L, W, courbe, signe):
    """Aile plate (avant = -Y) : u le long (axe Z local), v en travers (axe X local)."""
    N, K = 46, 16
    verts, faces = [], []
    for i in range(N + 1):
        u = i / N
        w = largeur(u, W)
        cx = mediane(u, W, courbe, signe)
        for k in range(K + 1):
            v = -1 + 2 * k / K
            x = cx + v * w * (1 + 0.07 * math.sin(u * 15 + v * 2))
            y = 0.1 * W * v * v - 0.06 * math.sin(u * math.pi)
            verts.append((x, y, u * L))
    for i in range(N):
        for k in range(K):
            a = i * (K + 1) + k
            faces.append((a, a + 1, a + K + 2, a + K + 1))
    me = C.bpy.data.meshes.new(nom)
    me.from_pydata(verts, [], faces)
    ob = C.objet(nom, me, M)
    C.lisse(me)

    def couleur(co, n):
        u = co.z / L
        bord = abs(co.x - mediane(u, W, courbe, signe)) / max(0.05, largeur(u, W))
        c = C.melange(AILE_BASE, AILE_MILIEU, C.lissage(0.05, 0.45, u))
        return C.melange(c, AILE_BORD, max(C.lissage(0.62, 0.95, u), 0.85 * C.lissage(0.55, 1.0, bord)))

    C.peindre(ob, couleur)
    sol = ob.modifiers.new("epaisseur", "SOLIDIFY")
    sol.thickness = 0.045
    sol.offset = 0
    ob = C.appliquer(ob, nom)
    C.lisse(ob.data)
    return ob


ailes = []
for cote in (-1, 1):
    for k, (ang, L, W, courbe, taches_aile) in enumerate(AILES):
        n = k + 1 + (0 if cote > 0 else 3)
        a = math.radians(ang) * cote
        piece = aile(f"pyrax_aile_{n}", L, W, courbe, cote)
        sa = C.Surface(piece)
        points = []
        for u, v, rx, ry in taches_aile:
            # largeur locale pour placer la tache en travers
            w = largeur(u, W)
            cx = mediane(u, W, courbe, cote)
            for face in (-1, 1):
                points.append(C.decal("tache", sa, Vector((cx + v * cote * w, face * 0.6, u * L)), rx * 1.25, ry * 1.25,
                                      lambda rho, aa: NOIR, M, ecart=0.006, haut=(1, 0, 0)))
        piece = C.fusionner(f"pyrax_aile_{n}", [piece] + points)
        # repère : X local = travers, Z local = le long de l'aile, puis légère coupe vers l'avant
        d = Vector((math.sin(a), 0, math.cos(a)))
        e1 = Vector((math.cos(a), 0, -math.sin(a)))
        rot = Matrix((e1, (0, 1, 0), d)).transposed().to_4x4()
        base = Vector((math.sin(a) * 0.32, 0.28, math.cos(a) * 0.3))
        tasse = Matrix.Rotation(0.26, 4, e1)
        piece.matrix_world = Matrix.Translation(base) @ tasse @ rot
        C.figer(piece)
        bout = base + (tasse.to_3x3() @ d) * L * 0.6
        ailes.append((n, piece, base, bout, e1))

# ─── squelette ────────────────────────────────────────────────────────────────
S = C.Squelette("pyrax_rig")
S.os_("py_racine", (0, 0, -0.4), (0, 0, 0.3))
S.os_("py_corps", (0, 0, -0.5), (0, 0, 0.5), "py_racine")
S.os_("py_tete", (0, -0.35, 0.2), (0, -0.6, 0.85), "py_corps")
S.os_("py_abdomen", (0, 0.0, -0.55), (0, -0.25, -1.9), "py_corps")
for n, piece, base, bout, e1 in ailes:
    S.os_(f"py_aile_{n}", base, bout, "py_corps")
S.finir()
S.attacher(corps, "py_corps")
S.attacher(piece_tete, "py_tete")
S.attacher(piece_ventre, "py_abdomen")
for n, piece, base, bout, e1 in ailes:
    S.attacher(piece, f"py_aile_{n}")

# ─── animations ───────────────────────────────────────────────────────────────
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)
AXES = {n: tuple(e1) for n, piece, base, bout, e1 in ailes}


def battre(n, angle):
    """Battement : positif = l'aile vient vers l'avant."""
    return (AXES[n], angle)


def anim_repos():
    P = 48
    cles = {
        "py_tete": C.boucle_sin(P, P, lambda ph: {"rot": [(X, 0.05 * math.sin(ph)), (Y, 0.04 * math.sin(ph + 1))]}),
        "py_abdomen": C.boucle_sin(P, P, lambda ph: {"rot": [(X, 0.06 * math.sin(ph + 0.6)), (Y, 0.05 * math.sin(ph))]}),
        "py_corps": C.boucle_sin(P, P, lambda ph: {"ech": (1 + 0.015 * math.sin(ph * 2), 1 + 0.015 * math.sin(ph * 2), 1 + 0.015 * math.sin(ph * 2))}),
    }
    for n, *_ in ailes:
        k = (n - 1) % 3
        cles[f"py_aile_{n}"] = C.boucle_sin(P, 24, lambda ph, n=n, k=k: {"rot": [battre(n, 0.17 * math.sin(ph - k * 0.7))]}, pas=3)
    S.action("pyrax_repos", P, cles, boucle=True)


def anim_clic():
    cles = {
        "py_tete": [(1, {}), (6, {"rot": [(X, -0.25)]}), (16, {"rot": [(X, 0.1)]}), (24, {})],
        "py_abdomen": [(1, {}), (7, {"rot": [(X, -0.3)]}), (16, {"rot": [(X, 0.12)]}), (24, {})],
        "py_racine": [(1, {}), (8, {"pos": (0, 0.25, 0)}), (24, {})],
    }
    for n, *_ in ailes:
        k = (n - 1) % 3
        cles[f"py_aile_{n}"] = [(1, {}), (4 + k, {"rot": [battre(n, 0.75)]}), (9 + k, {"rot": [battre(n, -0.45)]}),
                                (15 + k, {"rot": [battre(n, 0.3)]}), (24, {})]
    S.action("pyrax_clic", 24, cles)


def anim_content():
    P = 36
    cles = {
        "py_racine": [(f, {"pos": (0, 0.12 * math.sin(2 * math.pi * (f - 1) / 18), 0), "rot": [(Y, 0.12 * math.sin(2 * math.pi * (f - 1) / 36))]})
                      for f in range(1, P + 2, 3)],
        "py_tete": [(f, {"rot": [(Y, 0.15 * math.sin(2 * math.pi * (f - 1) / 18))]}) for f in range(1, P + 2, 3)],
    }
    for n, *_ in ailes:
        k = (n - 1) % 3
        cles[f"py_aile_{n}"] = [(f, {"rot": [battre(n, 0.4 * math.sin(2 * math.pi * (f - 1) / 9 - k * 0.6))]}) for f in range(1, P + 2, 1)]
    S.action("pyrax_content", P, cles)


anim_repos()
anim_clic()
anim_content()

C.exporter("pyrax")
if CALQUE:
    C.rendu_face("pyrax", azimut_deg=-12, cadre=4.75, centre=(0.22, 0, 0.18))
