"""Komasan (Yo-kai Watch), modélisé d'après l'illustration officielle (_outils/officielles/komasan_source.png).

  blender -b -P _outils/compagnons/komasan.py              -> assets/3d/compagnons/komasan.glb (+ .glb.js)
  blender -b -P _outils/compagnons/komasan.py -- --calque  -> + rendu de face (calque.py)

Unité : la demi-largeur de la tête = 1 (400 px sur l'illustration). Pieds en z = 0.
Os : ko_racine > ko_corps > ko_tete > (ko_oreille_g/d, ko_meche_g1 > g2, ko_meche_d1 > d2),
     ko_corps > ko_bras_g/d, ko_queue, ko_baluchon ; ko_racine > ko_jambe_g/d.
Animations : komasan_repos (boucle), komasan_clic, komasan_content.
"""
import math
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from mathutils import Matrix, Vector  # noqa: E402

import commun as C  # noqa: E402

C.vider()
CALQUE = "--calque" in sys.argv

BLANC = C.srgb("#f5ead7")
BLANC_OMBRE = C.srgb("#e6d7c4")
BLEU = C.srgb("#4fb6e6")
BLEU_FONCE = C.srgb("#3178ad")
BLEU_CLAIR = C.srgb("#8fd6f6")
BLEU_OREILLE = C.srgb("#3a80b8")
NOIR = C.srgb("#141414")
JAUNE_VERT = C.srgb("#dbf548")
ROUGE = C.srgb("#da5741")
ROSE = C.srgb("#e4a29a")
BOUCHE = C.srgb("#4a332e")
BLEU_QUEUE = C.srgb("#8dc5e6")
BLEU_QUEUE_F = C.srgb("#4480a3")
VERT = C.srgb("#5d8314")
VERT_FONCE = C.srgb("#3f5c0e")
CREME = C.srgb("#e8dfc4")
SARCELLE = C.srgb("#2f736c")
OR = C.srgb("#c9a04e")
CUIR = C.srgb("#8a6a3a")

M = C.mat("ko_corps", rough=0.6)
lum = Vector((-0.45, -0.6, 0.65)).normalized()

TETE = Vector((0, 0, 1.95))
RX, RY, RZ = 1.0, 0.8, 0.68


def ombre_douce(base, sombre=None, force=0.35):
    sombre = sombre or tuple(x * 0.82 for x in base)
    return lambda co, n: C.melange(sombre, base, 0.65 + force * max(-1.0, min(1.0, n.dot(lum))))


# ─── tête « mochi » : super-ellipsoïde un peu carrée, visage aplati ─────────
tete = C.sphere("tete", 1.0, 72, 40, M)


def forme_tete(co):
    p = Vector((math.copysign(abs(co.x) ** 0.82, co.x), math.copysign(abs(co.y) ** 0.9, co.y),
                math.copysign(abs(co.z) ** 0.86, co.z)))
    p.x *= RX * (1 + 0.05 * p.z)            # un peu plus large en haut
    p.y *= RY * (0.86 if p.y < 0 else 1.0)  # visage aplati
    p.z *= RZ
    return p + TETE


C.deformer_sommets(tete, forme_tete)
C.peindre(tete, lambda co, n: C.melange(BLANC_OMBRE, BLANC, C.lissage(-0.6, 0.5, n.dot(lum))))
surf = C.Surface(tete)


def sur_tete(x, z, avant=True):
    """Point du visage (x, z relatifs au centre de la tête), plaqué sur la surface."""
    p, _ = surf.plaquer(TETE + Vector((x, -2.0 if avant else 2.0, z)) * 1.0, 0)
    return p


def visage(x, z):
    # rayon depuis l'avant : on projette un point devant la tête vers la surface la plus proche
    base = TETE + Vector((x, -RY * 0.9, z))
    p, _ = surf.plaquer(base, 0)
    return p


# Yeux : grands ovales noirs cerclés de jaune-vert
yeux = []
for cote in (-1, 1):
    oeil = C.decal(f"oeil_{cote}", surf, visage(0.5 * cote, -0.06), 0.25, 0.185,
                   lambda rho, a: NOIR if rho < 0.7 else (JAUNE_VERT if rho < 0.9 else NOIR), M,
                   ecart=0.008, bombe=0.02, rotation=0.0, segs=48, anneaux=12)
    yeux.append(oeil)

# Joues : spirales rouges ; nez rose ; bouche en « ω »
details = []
for cote in (-1, 1):
    details.append(C.spirale(f"joue_{cote}", surf, visage(0.76 * cote, -0.36), 0.09, 1.7, 0.017, ROUGE, M,
                             sens=cote, rotation=math.pi * (0 if cote > 0 else 1)))
nez = C.sphere("nez", 1.0, 16, 10, M)
pn = visage(0.0, -0.17)
nez.scale = (0.05, 0.03, 0.032)
nez.location = pn + Vector((0, 0.012, 0))
C.figer(nez)
C.peindre(nez, ROSE)
details.append(nez)
bouche = []
for x, z in ((-0.085, -0.25), (-0.045, -0.285), (0.0, -0.255), (0.045, -0.285), (0.085, -0.25)):
    q, _ = surf.plaquer(visage(x, z), 0.01)
    bouche.append((*q, 0.012))
details.append(C.tube("bouche", bouche, M, resolution=6))
C.peindre(details[-1], BOUCHE)

# ─── oreilles de chat (intérieur bleu) ───────────────────────────────────────
oreilles = {}
for cote, nom in ((-1, "g"), (1, "d")):
    o = C.tour(f"oreille_{nom}", [(0.34, 0.0), (0.31, 0.15), (0.22, 0.35), (0.11, 0.5), (0.03, 0.59), (0.0, 0.61)],
               segs=32, materiau=M, ferme_bas=True)
    C.deformer_sommets(o, lambda co: Vector((co.x, co.y * 0.42, co.z)))
    C.peindre(o, lambda co, n: BLEU_OREILLE if (n.y < -0.35 and abs(co.x) < 0.25 - 0.4 * co.z and co.z < 0.5) else BLANC)
    direction = Vector((0.62 * cote, 0.08, 1.0)).normalized()
    base, _ = surf.plaquer(TETE + Vector((0.74 * cote, 0.08, 0.42)), -0.09)
    rot = direction.to_track_quat("Z", "Y").to_matrix().to_4x4()
    o.matrix_world = Matrix.Translation(base) @ rot
    C.figer(o)
    oreilles[nom] = (o, base, base + direction * 0.61)

# ─── mèches-flammes bleues sur le front (base ronde avec spirale, pointe très haute) ─
L_MECHE = 1.6
PROFIL_MECHE = [(0.0, 0.0), (0.17, 0.03), (0.24, 0.1), (0.25, 0.18), (0.2, 0.28), (0.13, 0.37), (0.09, 0.48),
                (0.065, 0.63), (0.045, 0.78), (0.022, 0.91), (0.007, 0.98), (0.0, 1.0)]
meches = {}
for cote, nom in ((-1, "g"), (1, "d")):
    def ligne(t, cote=cote):
        # dehors (x), vers l'arrière (y), haut (z) : s'élève, s'écarte un peu, la pointe revient vers l'arrière
        return Vector((cote * (0.1 * t ** 1.2 + 0.09 * math.sin(t * math.pi * 2.0)), 0.3 * t ** 2.0 - 0.05 * t, 0))

    def deformer(x, y, z, a, t, ligne=ligne):
        zz = z * L_MECHE
        d = ligne(zz / L_MECHE)
        return x + d.x, y * 0.78 + d.y, zz

    m = C.tour(f"meche_{nom}", [(r, z) for r, z in PROFIL_MECHE], segs=36, materiau=M, deformer=deformer)
    C.peindre(m, lambda co, n, cote=cote: C.melange(
        BLEU_FONCE, C.melange(BLEU, BLEU_CLAIR, C.lissage(0.55, 0.95, n.dot(Vector((-0.5 * cote, -0.6, 0.6)).normalized())) * 0.45),
        C.lissage(-0.55, 0.15, n.dot(lum) + 0.1 * (1 if co.z < 0.45 else 0))))
    # spirale bleu foncé sur l'avant de la base
    sm = C.Surface(m)
    sp = C.spirale(f"spirale_meche_{nom}", sm, Vector((0, -0.4, 0.3)), 0.15, 1.6, 0.022, BLEU_FONCE, M,
                   sens=-cote, haut=(0, 0, 1))
    piece = C.fusionner(f"komasan_meche_{nom}", [m, sp])
    # la base se pose sur le front, au-dessus de l'œil (un peu vers l'intérieur)
    front, nf = surf.plaquer(TETE + Vector((0.44 * cote, -1.0, 0.4)), 0)
    origine = front + nf * 0.08 - Vector((0, 0, 0.2))
    piece.matrix_world = Matrix.Translation(origine) @ Matrix.Rotation(-0.12, 4, "X")
    C.figer(piece)
    meches[nom] = (piece, origine)

# ─── corps, bras, jambes (peaux « skin » lissées) ───────────────────────────
torse = C.peau("komasan_torse", [(0, 0.02, 0.38), (0, 0.0, 0.7), (0, 0.0, 1.05), (0, 0.02, 1.32)], [(0, 1), (1, 2), (2, 3)],
               [(0.28, 0.25), (0.32, 0.28), (0.28, 0.25), (0.2, 0.19)], M, niveaux=2)
C.peindre(torse, ombre_douce(BLANC, BLANC_OMBRE))
bras = {}
for cote, nom in ((-1, "g"), (1, "d")):
    epaule = Vector((0.21 * cote, 0.0, 1.12))
    main = Vector((0.5 * cote, -0.08, 0.76))
    b = C.peau(f"komasan_bras_{nom}", [epaule, epaule.lerp(main, 0.55), main], [(0, 1), (1, 2)], [0.085, 0.085, 0.105], M)
    C.peindre(b, ombre_douce(BLANC, BLANC_OMBRE))
    bras[nom] = (b, epaule, main)
jambes = {}
for cote, nom in ((-1, "g"), (1, "d")):
    hanche = Vector((0.13 * cote, 0.0, 0.46))
    pied = Vector((0.16 * cote, -0.02, 0.09))
    orteil = Vector((0.17 * cote, -0.13, 0.07))
    j = C.peau(f"komasan_jambe_{nom}", [hanche, hanche.lerp(pied, 0.5), pied, orteil], [(0, 1), (1, 2), (2, 3)],
               [0.12, 0.11, 0.115, 0.1], M)
    C.peindre(j, ombre_douce(BLANC, BLANC_OMBRE))
    jambes[nom] = (j, hanche, pied)

# ─── queue en spirale (bleu ciel) ────────────────────────────────────────────
queue = C.sphere("queue", 1.0, 32, 18, M)
queue.scale = (0.25, 0.17, 0.14)
queue.location = (0.05, 0.37, 0.56)
C.figer(queue)
pointe = C.tour("queue_pointe", [(0.09, 0.0), (0.07, 0.07), (0.035, 0.14), (0.0, 0.19)], segs=16, materiau=M)
pointe.matrix_world = Matrix.Translation((0.27, 0.39, 0.54)) @ Matrix.Rotation(-1.35, 4, "Y")
C.figer(pointe)
for o in (queue, pointe):
    C.peindre(o, lambda co, n: C.melange(C.srgb("#6f9dc6"), BLEU_QUEUE, C.lissage(-0.4, 0.4, n.dot(lum) + n.z * 0.3)))
sq = C.Surface(queue)
spq = C.spirale("queue_spirale", sq, Vector((0.05, 0.37, 0.84)), 0.12, 1.8, 0.02, BLEU_QUEUE_F, M, haut=(0, -1, 0))
piece_queue = C.fusionner("komasan_queue", [queue, pointe, spq])

# ─── bourse (porte-monnaie à fermoir) et baluchon ────────────────────────────
bourse = C.sphere("bourse", 1.0, 28, 16, M)
bourse.scale = (0.15, 0.09, 0.13)
bourse.location = (-0.3, -0.12, 0.5)
C.figer(bourse)
C.deformer_sommets(bourse, lambda co: Vector((co.x, co.y, min(co.z, 0.55))))
C.peindre(bourse, ombre_douce(SARCELLE))
fermoir = [C.tube("fermoir", [(-0.3 + 0.14 * math.cos(a), -0.12 - 0.02, 0.55 + 0.03 * math.sin(a)) for a in
                              [math.radians(d) for d in range(180, -1, -20)]], M, rayon_defaut=0.018, resolution=6)]
for dx in (-0.025, 0.025):
    bille = C.sphere("bille", 0.028, 12, 8, M)
    bille.location = (-0.3 + dx, -0.14, 0.6)
    C.figer(bille)
    fermoir.append(bille)
for o in fermoir:
    C.peindre(o, OR)
sangle = C.tube("sangle", [(-0.3, -0.12, 0.56, 0.014), (-0.18, -0.24, 0.76, 0.014), (0.0, -0.29, 0.97, 0.014),
                           (0.16, -0.22, 1.16, 0.014), (0.22, -0.02, 1.28, 0.014), (0.18, 0.2, 1.22, 0.014)], M)
C.peindre(sangle, CUIR)
piece_bourse = C.fusionner("komasan_bourse", [bourse, sangle] + fermoir)

baluchon = C.sphere("baluchon", 1.0, 36, 20, M)
baluchon.scale = (0.46, 0.38, 0.38)
baluchon.location = (0.5, 0.42, 1.0)
C.figer(baluchon)
C.peindre(baluchon, ombre_douce(VERT, VERT_FONCE, 0.5))
sb = C.Surface(baluchon)
motifs = [C.spirale(f"motif_{i}", sb, Vector(p), r, 1.6, 0.025, CREME, M, haut=(0, 0, 1))
          for i, (p, r) in enumerate((((0.5, 0.9, 1.05), 0.17), ((1.0, 0.42, 1.0), 0.13), ((0.55, 0.4, 1.4), 0.09),
                                      ((0.6, 0.0, 0.95), 0.1)))]
noeud = []
for dx in (-0.06, 0.06):
    k = C.tour("noeud", [(0.06, 0.0), (0.05, 0.07), (0.02, 0.13), (0.0, 0.15)], segs=12, materiau=M)
    k.matrix_world = Matrix.Translation((0.3 + dx, 0.18, 1.3)) @ Matrix.Rotation(dx * 6, 4, "Y")
    C.figer(k)
    C.peindre(k, ombre_douce(VERT, VERT_FONCE))
    noeud.append(k)
piece_baluchon = C.fusionner("komasan_baluchon", [baluchon] + motifs + noeud)

piece_tete = C.fusionner("komasan_tete", [tete] + yeux + details)

# ─── squelette ────────────────────────────────────────────────────────────────
S = C.Squelette("komasan_rig")
S.os_("ko_racine", (0, 0, 0), (0, 0, 0.3))
S.os_("ko_corps", (0, 0, 0.3), (0, 0, 1.25), "ko_racine")
S.os_("ko_tete", (0, 0, 1.3), (0, 0, 2.08), "ko_corps")
for nom in ("g", "d"):
    o, base, bout = oreilles[nom]
    S.os_(f"ko_oreille_{nom}", base, bout, "ko_tete")
    piece, origine = meches[nom]
    S.os_(f"ko_meche_{nom}1", origine, origine + Vector((0, 0.05, 0.75)), "ko_tete")
    S.os_(f"ko_meche_{nom}2", origine + Vector((0, 0.05, 0.75)), origine + Vector((0, 0.3, L_MECHE)), f"ko_meche_{nom}1")
    b, epaule, main = bras[nom]
    S.os_(f"ko_bras_{nom}", epaule, main, "ko_corps")
    j, hanche, pied = jambes[nom]
    S.os_(f"ko_jambe_{nom}", hanche, pied, "ko_racine")
S.os_("ko_queue", (0.0, 0.25, 0.56), (0.3, 0.4, 0.56), "ko_corps")
S.os_("ko_baluchon", (0.3, 0.2, 1.3), (0.5, 0.42, 1.0), "ko_corps")
S.finir()

S.attacher(torse, "ko_corps")
S.attacher(piece_bourse, "ko_corps")
S.attacher(piece_tete, "ko_tete")
S.attacher(piece_queue, "ko_queue")
S.attacher(piece_baluchon, "ko_baluchon")
for nom in ("g", "d"):
    S.attacher(oreilles[nom][0], f"ko_oreille_{nom}")
    S.attacher(bras[nom][0], f"ko_bras_{nom}")
    S.attacher(jambes[nom][0], f"ko_jambe_{nom}")
    piece, origine = meches[nom]

    def poids(co, origine=origine, nom=nom):
        h = co.z - origine.z
        w2 = C.lissage(0.45, 1.05, h)
        return {f"ko_meche_{nom}1": 1 - w2, f"ko_meche_{nom}2": w2}

    S.peser(piece, poids)

# ─── animations ───────────────────────────────────────────────────────────────
X, Y, Z = (1, 0, 0), (0, 1, 0), (0, 0, 1)


def lever_bras(nom, angle):
    """Lever le bras sur le côté (positif = vers le haut)."""
    return (Y, -angle if nom == "d" else angle)


def anim_repos():
    P = 48
    cles = {
        "ko_corps": C.boucle_sin(P, P, lambda ph: {"ech": (1 + 0.012 * math.sin(ph), 1 + 0.02 * math.sin(ph), 1 + 0.012 * math.sin(ph))}),
        "ko_tete": C.boucle_sin(P, P, lambda ph: {"rot": [(Y, 0.05 * math.sin(ph)), (X, 0.03 * math.sin(2 * ph))]}),
        "ko_queue": C.boucle_sin(P, 24, lambda ph: {"rot": [(Z, 0.25 * math.sin(ph))]}),
        "ko_baluchon": C.boucle_sin(P, P, lambda ph: {"rot": [(X, 0.03 * math.sin(ph + 1))]}),
    }
    for k, nom in enumerate(("g", "d")):
        s = 1 if nom == "d" else -1
        cles[f"ko_meche_{nom}1"] = C.boucle_sin(P, P, lambda ph, k=k, s=s: {"rot": [(Y, -s * 0.06 * math.sin(ph + k * 1.5)), (X, 0.04 * math.sin(ph * 2 + k))]})
        cles[f"ko_meche_{nom}2"] = C.boucle_sin(P, P, lambda ph, k=k, s=s: {"rot": [(Y, -s * 0.16 * math.sin(ph - 0.8 + k * 1.5)), (X, 0.08 * math.sin(ph * 2 - 1 + k))]})
        cles[f"ko_bras_{nom}"] = C.boucle_sin(P, P, lambda ph, nom=nom: {"rot": [lever_bras(nom, 0.06 * math.sin(ph))]})
        # petit frémissement d'oreille à la fin de la boucle
        cles[f"ko_oreille_{nom}"] = [(1, {}), (34 + k * 3, {}), (37 + k * 3, {"rot": [(Y, -s * 0.3)]}), (41 + k * 3, {}), (P + 1, {})]
    S.action("komasan_repos", P, cles, boucle=True)


def anim_clic():
    cles = {
        "ko_racine": [(1, {}), (4, {"ech": (1.08, 0.86, 1.08)}), (10, {"pos": (0, 0.42, 0)}), (16, {}), (19, {"ech": (1.06, 0.9, 1.06)}), (26, {})],
        "ko_tete": [(1, {}), (8, {"rot": [(X, -0.2)]}), (18, {"rot": [(X, 0.08)]}), (26, {})],
    }
    for nom in ("g", "d"):
        s = 1 if nom == "d" else -1
        cles[f"ko_bras_{nom}"] = [(1, {}), (7, {"rot": [lever_bras(nom, 1.25)]}), (16, {"rot": [lever_bras(nom, 0.9)]}), (26, {})]
        cles[f"ko_meche_{nom}1"] = [(1, {}), (6, {"ech": (1.15, 1.25, 1.15)}), (14, {"rot": [(Y, s * 0.12)]}), (26, {})]
        cles[f"ko_meche_{nom}2"] = [(1, {}), (8, {"rot": [(Y, -s * 0.35)]}), (15, {"rot": [(Y, s * 0.25)]}), (26, {})]
        cles[f"ko_oreille_{nom}"] = [(1, {}), (6, {"ech": (1, 1.25, 1)}), (20, {}), (26, {})]
    S.action("komasan_clic", 26, cles)


def anim_content():
    P = 36
    cles = {
        "ko_corps": [(f, {"rot": [(Y, 0.16 * math.sin(2 * math.pi * (f - 1) / 18))]}) for f in range(1, P + 2, 3)],
        "ko_racine": [(f, {"pos": (0, 0.12 * abs(math.sin(math.pi * (f - 1) / 9)), 0)}) for f in range(1, P + 2, 3)],
        "ko_tete": [(f, {"rot": [(Y, -0.12 * math.sin(2 * math.pi * (f - 1) / 18))]}) for f in range(1, P + 2, 3)],
        "ko_queue": [(f, {"rot": [(Z, 0.45 * math.sin(2 * math.pi * (f - 1) / 9))]}) for f in range(1, P + 2, 2)],
    }
    for k, nom in enumerate(("g", "d")):
        cles[f"ko_bras_{nom}"] = [(f, {"rot": [lever_bras(nom, 0.6 + 0.6 * math.sin(2 * math.pi * (f - 1) / 18 + k * math.pi))]})
                                  for f in range(1, P + 2, 3)]
        s = 1 if nom == "d" else -1
        cles[f"ko_meche_{nom}2"] = [(f, {"rot": [(Y, -s * 0.25 * math.sin(2 * math.pi * (f - 1) / 12 + k))]}) for f in range(1, P + 2, 2)]
    S.action("komasan_content", P, cles)


anim_repos()
anim_clic()
anim_content()

C.exporter("komasan")
if CALQUE:
    C.rendu_face("komasan", azimut_deg=-18, cadre=1561 / 400, centre=(0.3, 0, 1.85))
