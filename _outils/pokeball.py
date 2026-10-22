"""Poké Ball scellée par des talismans (objet maudit) — modélisée entièrement en script.

Usage :
  blender -b -P _outils/pokeball.py              -> assets/3d/pokeball.glb (+ pokeball.glb.js pour file://)
  blender -b -P _outils/pokeball.py -- --apercu  -> + 4 rendus de contrôle dans _outils/apercu/

Repère Blender : Z en haut, l'avant (bouton) regarde -Y ; l'export glTF convertit en Y en haut, avant = +Z.
Noms d'objets lus par js/hero3d.js : « bouton » (émissif qui pulse), « ofuda_pendant_* » (flottent au vent).
"""
import base64
import math
import os
import random
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
TEX = os.path.join(ICI, "textures")
DEST = os.path.join(RACINE, "assets", "3d", "pokeball.glb")
APERCU = "--apercu" in sys.argv
IMAGE = "--image" in sys.argv  # image de secours (si WebGL indisponible)
random.seed(4)

# ─── scène vide ───────────────────────────────────────────────────────────────
bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
col = sc.collection


def objet(nom, me):
    ob = bpy.data.objects.new(nom, me)
    col.objects.link(ob)
    return ob


def lisse(me):
    for p in me.polygons:
        p.use_smooth = True


# ─── matériaux ────────────────────────────────────────────────────────────────
def mat(nom, couleur, rough=0.4, metal=0.0, clearcoat=0.0, emission=None, force=0.0, image=None, alpha=False):
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*couleur, 1)
    b.inputs["Roughness"].default_value = rough
    b.inputs["Metallic"].default_value = metal
    if clearcoat:
        b.inputs["Coat Weight"].default_value = clearcoat
        b.inputs["Coat Roughness"].default_value = 0.08
    if emission:
        b.inputs["Emission Color"].default_value = (*emission, 1)
        b.inputs["Emission Strength"].default_value = force
    if image:
        t = nt.nodes.new("ShaderNodeTexImage")
        t.image = bpy.data.images.load(os.path.join(TEX, image))
        nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    m.use_backface_culling = False
    return m


def srgb(h):
    """#rrggbb -> couleur linéaire (Blender travaille en linéaire)."""
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


M_ROUGE = mat("coque_rouge", srgb("#c8121b"), rough=0.32, clearcoat=0.9)
M_BLANC = mat("coque_blanche", srgb("#e9e6df"), rough=0.38, clearcoat=0.7)
M_NOIR = mat("noir", srgb("#0d0d0f"), rough=0.55)
M_BOUTON = mat("bouton", srgb("#f1ece4"), rough=0.25, emission=srgb("#ff2a2a"), force=2.5)
M_BANDE = mat("bande_scelle", (1, 1, 1), rough=0.85, image="bande.png")
M_OFUDA = [mat(f"ofuda_{i}", (1, 1, 1), rough=0.82, image=f"ofuda_{i}.png") for i in (1, 2, 3)]
M_CORDE_R = mat("cordon_rouge", srgb("#a3101a"), rough=0.7)
M_CORDE_B = mat("cordon_blanc", srgb("#efe8da"), rough=0.75)

R = 1.0  # rayon de la coque

# ─── coque : deux hémisphères séparés par la rainure ──────────────────────────
def hemisphere(nom, haut, m):
    me = bpy.data.meshes.new(nom)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=96, v_segments=48, radius=R)
    jeu = 0.052
    a_suppr = [f for f in bm.faces if (f.calc_center_median().z < jeu if haut else f.calc_center_median().z > -jeu)]
    bmesh.ops.delete(bm, geom=a_suppr, context="FACES")
    # lèvre arrondie vers l'intérieur au bord de la rainure
    bord = [e for e in bm.edges if e.is_boundary]
    ext = bmesh.ops.extrude_edge_only(bm, edges=bord)
    vs = [v for v in ext["geom"] if isinstance(v, bmesh.types.BMVert)]
    for v in vs:
        d = Vector((v.co.x, v.co.y, 0)).normalized()
        v.co = d * (R - 0.035) + Vector((0, 0, v.co.z * 0.92))
    bm.to_mesh(me)
    bm.free()
    lisse(me)
    me.materials.append(m)
    ob = objet(nom, me)
    mod = ob.modifiers.new("biseau", "BEVEL")
    mod.width, mod.segments, mod.limit_method = 0.012, 2, "ANGLE"
    return ob


hemisphere("coque_haut", True, M_ROUGE)
hemisphere("coque_bas", False, M_BLANC)

# rainure noire (cylindre plein au centre)
bpy.ops.mesh.primitive_cylinder_add(vertices=128, radius=R - 0.03, depth=0.11, location=(0, 0, 0))
rainure = bpy.context.object
rainure.name = "rainure"
lisse(rainure.data)
rainure.data.materials.append(M_NOIR)

# ─── bouton (face -Y) ─────────────────────────────────────────────────────────
def disque(nom, rayon, y0, y1, m, segs=96, biseau=0.01):
    bpy.ops.mesh.primitive_cylinder_add(vertices=segs, radius=rayon, depth=abs(y1 - y0),
                                        location=(0, (y0 + y1) / 2, 0), rotation=(math.pi / 2, 0, 0))
    ob = bpy.context.object
    ob.name = nom
    ob.data.materials.append(m)
    mod = ob.modifiers.new("biseau", "BEVEL")
    mod.width, mod.segments = biseau, 3
    for p in ob.data.polygons:
        p.use_smooth = True
    return ob


disque("bague_noire", 0.30, -0.80, -1.035, M_NOIR, biseau=0.02)
disque("bague_blanche", 0.205, -0.95, -1.065, M_BLANC, biseau=0.015)
disque("bouton", 0.135, -1.0, -1.085, M_BOUTON, biseau=0.02)

# ─── outils de surface : points sur la sphère ─────────────────────────────────
def repere(c):
    c = c.normalized()
    a = Vector((0, 0, 1)) if abs(c.z) < 0.95 else Vector((1, 0, 0))
    t1 = a.cross(c).normalized()
    t2 = c.cross(t1).normalized()
    return c, t1, t2


def bande_sur_sphere(nom, normale, largeur, rayon, m, rep_u=2.0, n=256, ondul=0.004):
    """Bande de papier qui suit un grand cercle de plan `normale`."""
    nrm = normale.normalized()
    u = nrm.orthogonal().normalized()
    v = nrm.cross(u).normalized()
    me = bpy.data.meshes.new(nom)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    lignes = []
    for i in range(n + 1):
        th = 2 * math.pi * i / n
        ligne = []
        for j, w in enumerate((-largeur / 2, 0, largeur / 2)):
            p = (math.cos(th) * u + math.sin(th) * v + w * nrm).normalized()
            r = rayon + ondul * math.sin(th * 23 + j) + 0.002 * random.random()
            ligne.append(bm.verts.new(p * r))
        lignes.append(ligne)
    for i in range(n):
        for j in range(2):
            f = bm.faces.new((lignes[i][j], lignes[i + 1][j], lignes[i + 1][j + 1], lignes[i][j + 1]))
            for lp, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uv].uv = (a / n * rep_u, b / 2)
    bm.to_mesh(me)
    bm.free()
    lisse(me)
    me.materials.append(m)
    return objet(nom, me)


def ofuda_colle(nom, centre, angle, w, h, m, rayon=R + 0.018, decolle=0.0):
    """Talisman rectangulaire plaqué sur la sphère (un coin peut se décoller)."""
    c, t1, t2 = repere(centre)
    rot = Matrix.Rotation(angle, 3, c)
    t1, t2 = rot @ t1, rot @ t2
    nx, ny = 6, 18
    me = bpy.data.meshes.new(nom)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    grille = []
    for j in range(ny + 1):
        row = []
        for i in range(nx + 1):
            a = (i / nx - 0.5) * w
            b = (j / ny - 0.5) * h
            p = (c + a * t1 + b * t2).normalized()
            lev = decolle * max(0.0, (j / ny) - 0.72) ** 2 * 6 * (0.6 + 0.4 * i / nx)
            row.append(bm.verts.new(p * (rayon + lev)))
        grille.append(row)
    for j in range(ny):
        for i in range(nx):
            f = bm.faces.new((grille[j][i], grille[j][i + 1], grille[j + 1][i + 1], grille[j + 1][i]))
            for lp, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uv].uv = (a / nx, b / ny)
    bm.to_mesh(me)
    bm.free()
    lisse(me)
    me.materials.append(m)
    ob = objet(nom, me)
    s = ob.modifiers.new("epaisseur", "SOLIDIFY")
    s.thickness = 0.004
    return ob


def ofuda_pendant(nom, attache, direction_ext, w, h, m, segs=24):
    """Talisman qui pend sous un point d'attache. Origine = point d'attache (pour l'animation web)."""
    me = bpy.data.meshes.new(nom)
    bm = bmesh.new()
    uv = bm.loops.layers.uv.new()
    lat = Vector((0, 0, 1)).cross(direction_ext).normalized()
    rows = []
    for j in range(segs + 1):
        t = j / segs
        # légère courbe : s'écarte de la boule en descendant
        dz = -t * h
        ecart = direction_ext * (0.06 * t + 0.10 * t * t)
        row = []
        for i in range(3):
            a = (i / 2 - 0.5) * w
            row.append(bm.verts.new(lat * a + ecart + Vector((0, 0, dz))))
        rows.append(row)
    for j in range(segs):
        for i in range(2):
            f = bm.faces.new((rows[j][i], rows[j][i + 1], rows[j + 1][i + 1], rows[j + 1][i]))
            for lp, (a, b) in zip(f.loops, ((i, j), (i + 1, j), (i + 1, j + 1), (i, j + 1))):
                lp[uv].uv = (a / 2, 1 - b / segs)
    bm.to_mesh(me)
    bm.free()
    lisse(me)
    me.materials.append(m)
    ob = objet(nom, me)
    ob.location = attache
    return ob


# bandes de scellé croisées (leurs plans évitent le bouton à -Y)
bande_sur_sphere("bande_1", Vector((0.82, 0.30, 0.48)), 0.20, R + 0.012, M_BANDE, rep_u=2.6)
bande_sur_sphere("bande_2", Vector((-0.80, 0.34, 0.50)), 0.20, R + 0.016, M_BANDE, rep_u=2.6)

# talismans collés (dessus rouge, flancs, arrière)
ofuda_colle("ofuda_colle_1", Vector((0.25, -0.55, 0.80)), 0.35, 0.30, 0.95, M_OFUDA[0], decolle=0.05)
ofuda_colle("ofuda_colle_2", Vector((-0.62, -0.45, 0.45)), -0.55, 0.28, 0.88, M_OFUDA[1], decolle=0.03)
ofuda_colle("ofuda_colle_3", Vector((0.70, -0.30, -0.45)), 0.25, 0.26, 0.80, M_OFUDA[2])
ofuda_colle("ofuda_colle_4", Vector((-0.2, 0.75, 0.55)), 0.1, 0.30, 0.9, M_OFUDA[0])
ofuda_colle("ofuda_colle_5", Vector((-0.45, -0.25, -0.80)), -0.2, 0.26, 0.8, M_OFUDA[2])

# talismans pendants, accrochés à la rainure sur les flancs
for k, (ang, mt) in enumerate(((-0.55, M_OFUDA[1]), (math.pi + 0.45, M_OFUDA[2]))):
    d = Vector((math.cos(ang), math.sin(ang), 0))
    ofuda_pendant(f"ofuda_pendant_{k + 1}", d * (R + 0.04) + Vector((0, 0, -0.05)), d, 0.24, 0.95, mt)

# ─── cordon tressé rouge et blanc dans la rainure ─────────────────────────────
def cordon(nom, rayon_anneau, r_brin, m, phase, tours=56, n=840, k=7):
    me = bpy.data.meshes.new(nom)
    bm = bmesh.new()
    anneaux = []
    for i in range(n):
        t = 2 * math.pi * i / n
        radial = Vector((math.cos(t), math.sin(t), 0))
        tang = Vector((-math.sin(t), math.cos(t), 0))
        ang = tours * t + phase
        decal = 0.016 * (math.cos(ang) * radial + math.sin(ang) * Vector((0, 0, 1)))
        centre = radial * rayon_anneau + decal
        b1 = radial
        b2 = Vector((0, 0, 1))
        anneau = []
        for j in range(k):
            a = 2 * math.pi * j / k
            anneau.append(bm.verts.new(centre + r_brin * (math.cos(a) * b1 + math.sin(a) * b2)))
        anneaux.append(anneau)
    for i in range(n):
        a1, a2 = anneaux[i], anneaux[(i + 1) % n]
        for j in range(k):
            bm.faces.new((a1[j], a2[j], a2[(j + 1) % k], a1[(j + 1) % k]))
    bm.to_mesh(me)
    bm.free()
    lisse(me)
    me.materials.append(m)
    return objet(nom, me)


cordon("cordon_rouge", R + 0.0, 0.018, M_CORDE_R, 0.0)
cordon("cordon_blanc", R + 0.0, 0.018, M_CORDE_B, math.pi)

# ─── export ───────────────────────────────────────────────────────────────────
os.makedirs(os.path.dirname(DEST), exist_ok=True)
for ob in col.objects:
    ob.select_set(True)
bpy.ops.export_scene.gltf(filepath=DEST, export_format="GLB", use_selection=True, export_apply=True,
                          export_yup=True, export_image_format="WEBP", export_texcoords=True,
                          export_normals=True, export_materials="EXPORT")
taille = os.path.getsize(DEST)
print(f"GLB : {DEST} ({taille // 1024} Ko)")

# copie base64 pour que la page marche aussi ouverte en double-clic (file://)
with open(DEST, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
with open(DEST + ".js", "w", encoding="utf-8") as f:
    f.write("// généré par _outils/pokeball.py — ne pas éditer\nwindow.POKEBALL_GLB='" + b64 + "';\n")

# ─── rendus de contrôle ───────────────────────────────────────────────────────
if APERCU:
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x = sc.render.resolution_y = 640
    sc.view_settings.view_transform = "Standard"
    w = bpy.data.worlds.new("monde")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.02, 0.02, 0.025, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 1.0
    sc.world = w
    for nom, loc, en, coul in (("cle", (-3, -4, 4), 900, (1, 0.95, 0.9)), ("contre", (3, 4, 2), 700, (1, 0.15, 0.1)),
                               ("bas", (0, -3, -3), 200, (0.8, 0.85, 1))):
        ld = bpy.data.lights.new(nom, "AREA")
        ld.energy, ld.color, ld.size = en, coul, 3
        lo = objet(nom, ld)
        lo.location = loc
        lo.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam = objet("cam", bpy.data.cameras.new("cam"))
    sc.camera = cam
    cam.data.lens = 70
    os.makedirs(os.path.join(ICI, "apercu"), exist_ok=True)
    for i, (az, el) in enumerate(((0, 12), (40, 25), (110, 5), (200, 30))):
        a, e = math.radians(az), math.radians(el)
        d = 6.2
        cam.location = (-math.sin(a) * d * math.cos(e), -math.cos(a) * d * math.cos(e), math.sin(e) * d)
        cam.rotation_euler = (Vector((0, 0, 0)) - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(ICI, "apercu", f"vue_{i}.png")
        bpy.ops.render.render(write_still=True)
    print("aperçus OK")

# ─── image de secours : la balle seule, fond transparent ──────────────────────
if IMAGE:
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x = sc.render.resolution_y = 900
    sc.render.film_transparent = True
    sc.view_settings.view_transform = "Standard"
    sc.render.image_settings.file_format = "WEBP"
    sc.render.image_settings.color_mode = "RGBA"
    sc.render.image_settings.quality = 88
    if not sc.world:
        w = bpy.data.worlds.new("monde")
        w.use_nodes = True
        w.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.88, 0.84, 1)
        w.node_tree.nodes["Background"].inputs[1].default_value = 0.6
        sc.world = w
    for nom, loc, en, coul in (("cle_i", (-3, -4, 4), 700, (1, 0.97, 0.92)), ("contre_i", (3, 4, 2), 500, (1, 0.3, 0.25))):
        ld = bpy.data.lights.new(nom, "AREA")
        ld.energy, ld.color, ld.size = en, coul, 3
        lo = objet(nom, ld)
        lo.location = loc
        lo.rotation_euler = (Vector((0, 0, 0)) - Vector(loc)).to_track_quat("-Z", "Y").to_euler()
    cam = objet("cam_i", bpy.data.cameras.new("cam_i"))
    cam.data.lens = 70
    sc.camera = cam
    cam.location = (-1.9, -6.6, 1.6)
    cam.rotation_euler = (Vector((0, 0, -0.1)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(RACINE, "assets", "3d", "pokeball.webp")
    bpy.ops.render.render(write_still=True)
    print("image de secours OK")
