"""Le mot « SLAM » en 3D pour la section Formation (une pièce par lettre, pour les animer séparément).

Usage : blender -b -P _outils/slam.py [-- --apercu]  ->  assets/3d/slam.glb (+ .glb.js)
Face avant rouge (regarde -Y), flancs et biseaux noirs. Lettres nommées slam_S, slam_L, slam_A, slam_M,
origine au centre de chaque lettre.
"""
import base64
import math
import os
import sys

import bmesh
import bpy
from mathutils import Matrix, Vector

ICI = os.path.dirname(os.path.abspath(__file__))
RACINE = os.path.dirname(ICI)
DEST = os.path.join(RACINE, "assets", "3d", "slam.glb")
APERCU = "--apercu" in sys.argv

bpy.ops.wm.read_factory_settings(use_empty=True)
sc = bpy.context.scene
col = sc.collection


def srgb(h):
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def mat(nom, hexa, rough):
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    b = m.node_tree.nodes["Principled BSDF"]
    b.inputs["Base Color"].default_value = (*srgb(hexa), 1)
    b.inputs["Roughness"].default_value = rough
    return m


ROUGE = mat("slam_face", "#e3141c", 0.35)
NOIR = mat("slam_flanc", "#17151a", 0.55)

police = bpy.data.fonts.load(os.path.join(ICI, "polices", "Anton-Regular.ttf"))
lettres = []
x = 0.0
for c in "SLAM":
    cu = bpy.data.curves.new(f"txt_{c}", "FONT")
    cu.body = c
    cu.font = police
    cu.size = 1.0
    cu.extrude = 0.11
    cu.bevel_depth = 0.018
    cu.bevel_resolution = 3
    cu.resolution_u = 8
    cu.align_x = "LEFT"
    ob = bpy.data.objects.new(f"t_{c}", cu)
    col.objects.link(ob)
    ob.location.x = x
    bpy.context.view_layer.update()
    # avance = largeur de la lettre + interlettrage
    xs = [ (ob.matrix_world @ Vector(v)).x for v in ob.bound_box]
    x = max(xs) + 0.07
    lettres.append(ob)

total = x - 0.07
pieces = []
dg = bpy.context.evaluated_depsgraph_get()
for ob in lettres:
    me = bpy.data.meshes.new_from_object(ob.evaluated_get(dg))
    # debout face à -Y : le texte est dans XY (extrusion sur Z) -> rotation de 90° autour de X
    me.transform(Matrix.Translation((ob.location.x - total / 2, 0, 0)))
    me.transform(Matrix.Rotation(math.radians(90), 4, "X"))
    nom = "slam_" + ob.data.body
    nouv = bpy.data.objects.new(nom, me)
    col.objects.link(nouv)
    me.materials.append(ROUGE)
    me.materials.append(NOIR)
    for p in me.polygons:
        p.use_smooth = False
        p.material_index = 0 if p.normal.y < -0.9 else 1
    # origine au centre de la lettre
    vs = [v.co for v in me.vertices]
    centre = sum(vs, Vector()) / len(vs)
    me.transform(Matrix.Translation(-centre))
    nouv.location = centre
    pieces.append(nouv)
for ob in lettres:
    bpy.data.objects.remove(ob)

# hauteur ~1 : Anton a des capitales d'environ 0.73 -> on remet à l'échelle, base à z = 0
zmin = min((o.matrix_world @ v.co).z for o in pieces for v in o.data.vertices) if pieces else 0
for o in pieces:
    o.location.z -= zmin

os.makedirs(os.path.dirname(DEST), exist_ok=True)
for o in pieces:
    o.select_set(True)
bpy.ops.export_scene.gltf(filepath=DEST, export_format="GLB", use_selection=True, export_apply=True, export_yup=True,
                          export_normals=True, export_materials="EXPORT")
print(f"GLB : {DEST} ({os.path.getsize(DEST) // 1024} Ko), largeur {total:.2f}")
with open(DEST, "rb") as f:
    b64 = base64.b64encode(f.read()).decode()
with open(DEST + ".js", "w", encoding="utf-8") as f:
    f.write("// généré par _outils/slam.py — ne pas éditer\nwindow.SLAM_GLB='" + b64 + "';\n")

if APERCU:
    sc.render.engine = "BLENDER_EEVEE"
    sc.render.resolution_x, sc.render.resolution_y = 1000, 560
    sc.view_settings.view_transform = "Standard"
    w = bpy.data.worlds.new("monde")
    w.use_nodes = True
    w.node_tree.nodes["Background"].inputs[0].default_value = (0.9, 0.88, 0.84, 1)
    sc.world = w
    ld = bpy.data.lights.new("cle", "AREA")
    ld.energy, ld.size = 500, 4
    lo = bpy.data.objects.new("cle", ld)
    col.objects.link(lo)
    lo.location = (-2, -4, 3)
    lo.rotation_euler = (Vector((0, 0, 0.4)) - lo.location).to_track_quat("-Z", "Y").to_euler()
    cam = bpy.data.objects.new("cam", bpy.data.cameras.new("cam"))
    col.objects.link(cam)
    sc.camera = cam
    cam.location = (1.2, -4.2, 1.3)
    cam.rotation_euler = (Vector((0, 0, 0.4)) - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.render.filepath = os.path.join(ICI, "apercu", "slam.png")
    bpy.ops.render.render(write_still=True)
