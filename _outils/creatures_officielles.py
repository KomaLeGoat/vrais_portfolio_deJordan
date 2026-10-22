"""Pyrax, Lugulabre, Mentali et Komasan en 3D à partir de leurs illustrations officielles.

Chaque illustration détourée devient un volume « gonflé » (relief = distance au bord, forme de coussin),
texturé avec l'illustration : de face c'est exactement l'officiel, en tournant on voit le volume.
Préparation des images : py -3.13 _outils/gonfler.py
Usage : blender -b -P _outils/creatures_officielles.py [-- --apercu]  ->  assets/3d/creatures.glb (+ .glb.js)

Repère Blender : Z en haut, face avant vers -Y, pieds à z = 0, hauteur 1 m.
Objets nommés pyrax, lugulabre, mentali, komasan (lus par js/hero3d.js).
"""
import base64
import json
import math
import os
import sys

import bpy
import numpy as np
from mathutils import Vector

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
OFF = os.path.join(ICI, "officielles")
DEST = os.path.join(RACINE, "assets", "3d", "creatures.glb")
APERCU = "--apercu" in sys.argv
NOMS = ["pyrax", "lugulabre", "mentali", "komasan"]
HAUTEUR = 1.0

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
col = sc.collection


def materiau(nom, image):
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = 0.7
    t = nt.nodes.new("ShaderNodeTexImage")
    t.image = bpy.data.images.load(image)
    nt.links.new(t.outputs["Color"], b.inputs["Base Color"])
    nt.links.new(t.outputs["Alpha"], b.inputs["Alpha"])
    try:
        m.surface_render_method = "DITHERED"
    except Exception:
        pass
    return m


def construire(nom):
    info = json.load(open(os.path.join(OFF, f"{nom}.json")))
    hgt = np.load(os.path.join(OFF, f"{nom}_hauteur.npy"))      # (lignes+1, cols+1), 0..1
    alp = np.load(os.path.join(OFF, f"{nom}_alpha.npy"))
    L, C = hgt.shape[0] - 1, hgt.shape[1] - 1
    w_px, h_px = info["largeur_px"], info["hauteur_px"]
    echelle = HAUTEUR / h_px
    W = w_px * echelle
    ep = info["epaisseur_rel"] * HAUTEUR

    # cellules gardées : au moins un coin un peu opaque (la silhouette exacte est coupée par la transparence)
    garde = np.zeros((L, C), bool)
    for dj in (0, 1):
        for di in (0, 1):
            garde |= alp[dj:dj + L, di:di + C] > 0.06
    utilise = np.zeros((L + 1, C + 1), bool)
    for dj in (0, 1):
        for di in (0, 1):
            utilise[dj:dj + L, di:di + C] |= garde

    js, is_ = np.nonzero(utilise)
    idx = -np.ones((L + 1, C + 1), int)
    idx[js, is_] = np.arange(len(js))
    n = len(js)
    x = (is_ / C - 0.5) * W
    z = (1 - js / L) * HAUTEUR
    h = hgt[js, is_]
    # profil arrondi : on adoucit le relief vers le bord
    relief = np.power(np.clip(h, 0, 1), 0.85) * ep
    devant = np.stack([x, -relief, z], 1)
    derriere = np.stack([x, relief * 0.75, z], 1)
    verts = np.concatenate([devant, derriere])

    faces = []
    cj, ci = np.nonzero(garde)
    for j, i in zip(cj, ci):
        a, b, c, d = idx[j, i], idx[j, i + 1], idx[j + 1, i + 1], idx[j + 1, i]
        faces.append((a, d, c, b))                    # avant (normale vers -Y)
        faces.append((a + n, b + n, c + n, d + n))    # arrière
    me = bpy.data.meshes.new(nom)
    me.from_pydata(verts.tolist(), [], faces)
    me.update()
    uv = me.uv_layers.new(name="UVMap")
    u_s = np.concatenate([is_ / C, is_ / C])
    v_s = np.concatenate([1 - js / L, 1 - js / L])
    vi = np.zeros(len(me.loops), int)
    me.loops.foreach_get("vertex_index", vi)
    uvs = np.stack([u_s[vi], v_s[vi]], 1).ravel()
    uv.data.foreach_set("uv", uvs)
    for p in me.polygons:
        p.use_smooth = True
    ob = bpy.data.objects.new(nom, me)
    col.objects.link(ob)
    me.materials.append(materiau(f"officiel_{nom}", os.path.join(OFF, f"{nom}.png")))
    print(nom, f"{len(faces)} faces, {W:.2f} x {HAUTEUR:.2f} m, épaisseur {ep:.2f}")
    return ob


objets = [construire(n) for n in NOMS]

os.makedirs(os.path.dirname(DEST), exist_ok=True)
for o in objets:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=DEST, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                          export_image_format="WEBP", export_texcoords=True, export_normals=True, export_materials="EXPORT")
print(f"GLB : {DEST} ({os.path.getsize(DEST) // 1024} Ko)")
with open(DEST, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
with open(DEST + ".js", "w", encoding="utf-8") as f:
    f.write("// généré par _outils/creatures_officielles.py — ne pas éditer\nwindow.CREATURES_GLB='" + b64 + "';\n")

if APERCU:
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 1500, 560
    sc.view_settings.view_transform = "Standard"
    w = bpy.data.worlds.new("monde")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.92, 0.9, 0.86, 1)
    w.node_tree.nodes["Background"].inputs[1].default_value = 0.7
    sc.world = w
    ld = bpy.data.lights.new("cle", "AREA")
    ld.energy, ld.size = 500, 4
    lo = bpy.data.objects.new("cle", ld)
    col.objects.link(lo)
    lo.location = (-3, -5, 4)
    lo.rotation_euler = (Vector((0, 0, 0.5)) - lo.location).to_track_quat("-Z", "Y").to_euler()
    for i, o in enumerate(objets):
        o.location.x = (i - 1.5) * 1.35
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    col.objects.link(cam)
    sc.camera = cam
    cam.data.lens = 50
    for nom_vue, az in (("face", 0), ("trois_quarts", 38)):
        a = math.radians(az)
        cible = Vector((0, 0, 0.5))
        cam.location = cible + Vector((-math.sin(a), -math.cos(a), 0.15)) * 6.5
        cam.rotation_euler = (cible - cam.location).to_track_quat("-Z", "Y").to_euler()
        sc.render.filepath = os.path.join(ICI, "apercu", f"officielles_{nom_vue}.png")
        bpy.ops.render.render(write_still=True)
    print("aperçus OK")
