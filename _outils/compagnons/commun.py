"""
Outils communs pour modéliser les compagnons dans Blender (lugulabre.py, komasan.py, pyrax.py, mentali.py).

Principe : chaque personnage est fait de pièces propres (tours / lathe, tubes, peaux « skin » lissées),
attachées aux os d'une armature. Les pièces rigides suivent leur os ; les pièces souples (flammes, queues)
sont pondérées sur plusieurs os. Les animations (repos, clic, content…) sont des pistes NLA exportées
en glTF, jouées dans le site par THREE.AnimationMixer (js/hero3d.js).

Repère Blender : Z en haut, l'avant regarde -Y. L'export glTF passe en Y en haut, avant = +Z.
Couleurs : par sommet (attribut « Col ») ; le site les rend en toon + contour noir (js/trois-outils.js).
"""
import base64
import json
import math
import os
import struct

import bmesh
import bpy
from mathutils import Matrix, Quaternion, Vector

ICI = os.path.dirname(os.path.abspath(__file__))
OUTILS = os.path.dirname(ICI)
RACINE = os.path.dirname(OUTILS)
SORTIE = os.path.join(RACINE, "assets", "3d", "compagnons")
FPS = 24


def vider():
    bpy.ops.wm.read_factory_settings(use_empty=True)
    sc = bpy.context.scene
    sc.render.fps = FPS
    return sc


def col():
    return bpy.context.scene.collection


def srgb(h):
    """#rrggbb -> couleur linéaire (Blender travaille en linéaire)."""
    h = h.lstrip("#")
    c = [int(h[i:i + 2], 16) / 255 for i in (0, 2, 4)]
    return tuple(x / 12.92 if x <= 0.04045 else ((x + 0.055) / 1.055) ** 2.4 for x in c)


def melange(a, b, k):
    return tuple(x + (y - x) * k for x, y in zip(a, b))


def lissage(a, b, x):
    t = max(0.0, min(1.0, (x - a) / (b - a)))
    return t * t * (3 - 2 * t)


# ─── matériaux ────────────────────────────────────────────────────────────────
_mats = {}


def mat(nom, rough=0.6, emission=0.0):
    """Matériau blanc qui prend la couleur des sommets (attribut « Col »)."""
    if nom in _mats:
        return _mats[nom]
    m = bpy.data.materials.new(nom)
    m.use_nodes = True
    nt = m.node_tree
    b = nt.nodes["Principled BSDF"]
    b.inputs["Roughness"].default_value = rough
    attr = nt.nodes.new("ShaderNodeVertexColor")
    attr.layer_name = "Col"
    nt.links.new(attr.outputs["Color"], b.inputs["Base Color"])
    if emission:
        nt.links.new(attr.outputs["Color"], b.inputs["Emission Color"])
        b.inputs["Emission Strength"].default_value = emission
    _mats[nom] = m
    return m


# ─── fabrication des maillages ────────────────────────────────────────────────
def objet(nom, me, materiau=None):
    ob = bpy.data.objects.new(nom, me)
    col().objects.link(ob)
    if materiau:
        me.materials.append(materiau)
    return ob


def lisse(me):
    for p in me.polygons:
        p.use_smooth = True


def peindre(ob, couleur):
    """Colore chaque sommet : `couleur` est un tuple, ou une fonction (co local, normale) -> tuple."""
    me = ob.data
    if "Col" not in me.color_attributes:
        me.color_attributes.new("Col", "FLOAT_COLOR", "POINT")
    attr = me.color_attributes["Col"]
    me.color_attributes.active_color = attr
    for v in me.vertices:
        c = couleur(v.co, v.normal) if callable(couleur) else couleur
        attr.data[v.index].color = (*c[:3], 1.0)


def tour(nom, profil, segs=48, materiau=None, deformer=None, ferme_haut=False, ferme_bas=False):
    """Surface de révolution autour de Z. `profil` : [(rayon, z), …] de bas en haut.
    `deformer(x, y, z, angle, t)` -> (x, y, z) pour déformer (t = position 0..1 le long du profil)."""
    me = bpy.data.meshes.new(nom)
    bm = bmesh.new()
    n = len(profil)
    anneaux = []
    for i, (r, z) in enumerate(profil):
        t = i / (n - 1)
        anneau = []
        for k in range(segs):
            a = 2 * math.pi * k / segs
            x, y = r * math.cos(a), r * math.sin(a)
            if deformer:
                x, y, z2 = deformer(x, y, z, a, t)
            else:
                z2 = z
            anneau.append(bm.verts.new((x, y, z2)))
        anneaux.append(anneau)
    for i in range(n - 1):
        for k in range(segs):
            a, b = anneaux[i][k], anneaux[i][(k + 1) % segs]
            c, d = anneaux[i + 1][(k + 1) % segs], anneaux[i + 1][k]
            if len({a, b, c, d}) == 4:
                bm.faces.new((a, b, c, d))
    if ferme_bas and profil[0][0] > 1e-4:
        bm.faces.new(list(reversed(anneaux[0])))
    if ferme_haut and profil[-1][0] > 1e-4:
        bm.faces.new(anneaux[-1])
    bmesh.ops.remove_doubles(bm, verts=bm.verts, dist=1e-5)
    bmesh.ops.recalc_face_normals(bm, faces=bm.faces)
    bm.to_mesh(me)
    bm.free()
    lisse(me)
    return objet(nom, me, materiau)


def tube(nom, points, materiau=None, rayon_defaut=0.05, resolution=12, lisse_courbe=True, bouts=True):
    """Tube le long d'une courbe : points = [(x, y, z) ou (x, y, z, rayon)]."""
    cu = bpy.data.curves.new(nom + "_c", "CURVE")
    cu.dimensions = "3D"
    cu.bevel_depth = 1.0
    cu.bevel_resolution = max(2, resolution // 4)
    cu.use_fill_caps = bouts
    cu.resolution_u = 8
    sp = cu.splines.new("NURBS" if lisse_courbe else "POLY")
    sp.points.add(len(points) - 1)
    for p, q in zip(sp.points, points):
        p.co = (q[0], q[1], q[2], 1.0)
        p.radius = q[3] if len(q) > 3 else rayon_defaut
    if lisse_courbe:
        sp.use_endpoint_u = True
        sp.order_u = min(4, len(points))
    tmp = bpy.data.objects.new(nom + "_tmp", cu)
    col().objects.link(tmp)
    ob = appliquer(tmp, nom)
    if materiau:
        ob.data.materials.append(materiau)
    lisse(ob.data)
    return ob


def peau(nom, sommets, aretes, rayons, materiau=None, niveaux=2, racine=0):
    """Forme organique : squelette de sommets + rayons, modificateur Skin puis Subdivision."""
    me = bpy.data.meshes.new(nom + "_s")
    me.from_pydata([tuple(s) for s in sommets], aretes, [])
    tmp = bpy.data.objects.new(nom + "_tmp", me)
    col().objects.link(tmp)
    tmp.modifiers.new("skin", "SKIN")
    for i, r in enumerate(rayons):
        rx, ry = (r, r) if isinstance(r, (int, float)) else r
        d = me.skin_vertices[0].data[i]
        d.radius = (rx, ry)
        d.use_root = i == racine
    sub = tmp.modifiers.new("sub", "SUBSURF")
    sub.levels = sub.render_levels = niveaux
    ob = appliquer(tmp, nom)
    if materiau:
        ob.data.materials.append(materiau)
    lisse(ob.data)
    return ob


def subdiviser(ob, niveaux=2):
    m = ob.modifiers.new("sub", "SUBSURF")
    m.levels = m.render_levels = niveaux
    return appliquer(ob, ob.name)


def appliquer(tmp, nom):
    """Remplace l'objet par un maillage simple (modificateurs appliqués)."""
    dg = bpy.context.evaluated_depsgraph_get()
    me = bpy.data.meshes.new_from_object(tmp.evaluated_get(dg))
    mats = [m for m in getattr(tmp.data, "materials", []) if m]
    mw = tmp.matrix_world.copy()
    bpy.data.objects.remove(tmp, do_unlink=True)
    ob = bpy.data.objects.new(nom, me)
    col().objects.link(ob)
    ob.matrix_world = mw
    me.materials.clear()
    for m in mats:
        me.materials.append(m)
    return ob


def sphere(nom, rayon=1.0, u=48, v=24, materiau=None):
    me = bpy.data.meshes.new(nom)
    bm = bmesh.new()
    bmesh.ops.create_uvsphere(bm, u_segments=u, v_segments=v, radius=rayon)
    bm.to_mesh(me)
    bm.free()
    lisse(me)
    return objet(nom, me, materiau)


def deformer_sommets(ob, f):
    """f(co) -> Vector : déplace chaque sommet (repère local)."""
    for v in ob.data.vertices:
        v.co = f(v.co.copy())
    ob.data.update()


def figer(ob):
    """Applique la position / rotation / échelle de l'objet dans son maillage."""
    ob.data.transform(ob.matrix_basis)
    ob.matrix_basis = Matrix.Identity(4)


def fusionner(nom, objets):
    """Réunit plusieurs pièces en un seul maillage (couleurs et matériaux conservés)."""
    base = objets[0]
    for o in col().objects:
        o.select_set(False)
    for o in objets:
        o.select_set(True)
    bpy.context.view_layer.objects.active = base
    with bpy.context.temp_override(active_object=base, selected_editable_objects=objets, selected_objects=objets):
        bpy.ops.object.join()
    base.name = nom
    base.data.name = nom
    figer(base)
    return base


# ─── motifs posés sur une surface (yeux, spirales…) ──────────────────────────
class Surface:
    """Surface d'un objet (repère du monde) pour y poser des motifs : find_nearest -> point, normale."""

    def __init__(self, ob):
        from mathutils.bvhtree import BVHTree
        figer(ob)
        self.bvh = BVHTree.FromPolygons([v.co.copy() for v in ob.data.vertices], [list(p.vertices) for p in ob.data.polygons])

    def plaquer(self, p, ecart):
        co, n, _, _ = self.bvh.find_nearest(Vector(p))
        return co + n * ecart, n

    def repere(self, centre, haut=(0, 0, 1)):
        c, n = self.plaquer(centre, 0)
        u = Vector(haut).cross(n)
        if u.length < 1e-4:
            u = Vector((1, 0, 0))
        u.normalize()
        v = n.cross(u).normalized()
        return c, n, u, v


def decal(nom, surf, centre, rx, ry, couleur, materiau, ecart=0.01, bombe=0.0, rotation=0.0, segs=40, anneaux=10,
          haut=(0, 0, 1)):
    """Motif plat posé sur la surface (œil, tache) : ellipse rx × ry ; couleur(rho 0..1, angle) -> tuple.
    `bombe` : relief au centre (lentille). `rotation` : angle de l'ellipse (radians)."""
    import bmesh as _bm
    c, n, u, v = surf.repere(centre, haut)
    cr, sr = math.cos(rotation), math.sin(rotation)
    u, v = u * cr + v * sr, v * cr - u * sr
    me = bpy.data.meshes.new(nom)
    bm = _bm.new()
    lignes = []
    for i in range(anneaux + 1):
        rho = i / anneaux
        ligne = []
        for k in range(segs if i else 1):
            a = 2 * math.pi * k / segs
            p = c + u * (math.cos(a) * rx * rho) + v * (math.sin(a) * ry * rho)
            q, nn = surf.plaquer(p, ecart + bombe * (1 - rho * rho))
            ligne.append(bm.verts.new(q))
        lignes.append(ligne)
    for k in range(segs):
        bm.faces.new((lignes[0][0], lignes[1][k], lignes[1][(k + 1) % segs]))
    for i in range(1, anneaux):
        for k in range(segs):
            bm.faces.new((lignes[i][k], lignes[i + 1][k], lignes[i + 1][(k + 1) % segs], lignes[i][(k + 1) % segs]))
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    lisse(me)
    ob = objet(nom, me, materiau)
    # normales vers l'extérieur
    if sum((pp.normal.dot(n)) for pp in me.polygons) < 0:
        me.flip_normals()
    peindre(ob, lambda co, nn: couleur(*_rho(co, c, u, v, rx, ry)))
    return ob


def _rho(co, c, u, v, rx, ry):
    """Coordonnées polaires normalisées d'un point du motif : (rho 0..1, angle)."""
    d = co - c
    x, y = d.dot(u) / rx, d.dot(v) / ry
    return min(1.0, math.hypot(x, y)), math.atan2(y, x)


def spirale(nom, surf, centre, rayon, tours, epaisseur, couleur, materiau, ecart=0.012, sens=1, rotation=0.0,
            haut=(0, 0, 1), aplati=1.0):
    """Spirale (tube) posée sur la surface, qui s'enroule vers son centre."""
    c, n, u, v = surf.repere(centre, haut)
    pts = []
    m = int(28 * tours)
    for i in range(m + 1):
        t = i / m
        a = rotation + sens * 2 * math.pi * tours * t
        r = rayon * (1 - 0.88 * t)
        p = c + u * (math.cos(a) * r) + v * (math.sin(a) * r * aplati)
        q, _ = surf.plaquer(p, ecart)
        pts.append((*q, epaisseur * (1 - 0.35 * t)))
    ob = tube(nom, pts, materiau, resolution=8)
    peindre(ob, couleur)
    return ob


def bande(nom, surf, centres, largeurs, couleur, materiau, ecart=0.012, haut=(0, 0, 1)):
    """Bande plate posée sur la surface le long d'une ligne (centres) ; largeurs = demi-largeur en chaque point."""
    import bmesh as _bm
    me = bpy.data.meshes.new(nom)
    bm = _bm.new()
    rangs = []
    for i, (p, w) in enumerate(zip(centres, largeurs)):
        c, n = surf.plaquer(p, 0)
        suivant = centres[min(i + 1, len(centres) - 1)]
        prec = centres[max(i - 1, 0)]
        t = (Vector(suivant) - Vector(prec)).normalized()
        cote = n.cross(t).normalized()
        rang = []
        for k in (-1, -0.5, 0, 0.5, 1):
            q, _ = surf.plaquer(c + cote * (w * k), ecart)
            rang.append(bm.verts.new(q))
        rangs.append(rang)
    for i in range(len(rangs) - 1):
        for k in range(4):
            bm.faces.new((rangs[i][k], rangs[i][k + 1], rangs[i + 1][k + 1], rangs[i + 1][k]))
    bm.normal_update()
    bm.to_mesh(me)
    bm.free()
    lisse(me)
    if sum(pp.normal.dot(surf.plaquer(pp.center, 0)[1]) for pp in me.polygons) < 0:
        me.flip_normals()
    ob = objet(nom, me, materiau)
    peindre(ob, couleur)
    return ob


# ─── squelette ────────────────────────────────────────────────────────────────
class Squelette:
    def __init__(self, nom):
        self.donnees = bpy.data.armatures.new(nom)
        self.ob = bpy.data.objects.new(nom, self.donnees)
        col().objects.link(self.ob)
        self.os = {}
        bpy.context.view_layer.objects.active = self.ob
        self.ob.select_set(True)
        bpy.ops.object.mode_set(mode="EDIT")

    def os_(self, nom, tete, queue, parent=None, roulis=0.0):
        b = self.donnees.edit_bones.new(nom)
        b.head, b.tail, b.roll = Vector(tete), Vector(queue), roulis
        if parent:
            b.parent = self.donnees.edit_bones[parent]
        self.os[nom] = (Vector(tete), Vector(queue))
        return nom

    def finir(self):
        bpy.ops.object.mode_set(mode="OBJECT")
        for pb in self.ob.pose.bones:
            pb.rotation_mode = "QUATERNION"
        bpy.context.view_layer.update()

    def attacher(self, ob, nom_os):
        """Pièce rigide : suit l'os `nom_os` (garde sa place actuelle)."""
        mw = ob.matrix_world.copy()
        ob.parent = self.ob
        ob.parent_type = "BONE"
        ob.parent_bone = nom_os
        bpy.context.view_layer.update()
        ob.matrix_world = mw

    def peser(self, ob, poids):
        """Pièce souple : `poids(co_monde)` -> {os: poids}. Ajoute le modificateur Armature."""
        figer(ob)
        groupes = {}
        for v in ob.data.vertices:
            for nom, w in poids(v.co.copy()).items():
                if w <= 1e-4:
                    continue
                if nom not in groupes:
                    groupes[nom] = ob.vertex_groups.new(name=nom)
                groupes[nom].add([v.index], w, "REPLACE")
        ob.parent = self.ob
        m = ob.modifiers.new("Armature", "ARMATURE")
        m.object = self.ob

    def poids_segments(self, co, noms, puissance=6):
        """Poids d'un sommet entre plusieurs os, selon la distance à chaque os (segment tête-queue)."""
        d = {}
        for nom in noms:
            a, b = self.os[nom]
            ab = b - a
            t = max(0.0, min(1.0, (co - a).dot(ab) / max(1e-9, ab.dot(ab))))
            d[nom] = 1.0 / max(1e-4, (co - (a + ab * t)).length) ** puissance
        tot = sum(d.values())
        return {k: v / tot for k, v in d.items()}

    def _rot(self, nom, axe_monde, angle):
        """Rotation exprimée dans le repère du monde, convertie dans celui de l'os au repos."""
        repos = self.donnees.bones[nom].matrix_local.to_3x3()
        r = Matrix.Rotation(angle, 3, Vector(axe_monde).normalized())
        return (repos.inverted() @ r @ repos).to_quaternion()

    def action(self, nom, duree, cles, boucle=False):
        """cles = {os: [(image, {'rot': [(axe, angle), …], 'ech': (x, y, z), 'pos': (x, y, z)}), …]}.
        Les positions sont dans le repère de l'os. Ajoute une piste NLA nommée `nom`."""
        ad = self.ob.animation_data or self.ob.animation_data_create()
        act = bpy.data.actions.new(nom)
        act.use_fake_user = True
        ad.action = act
        for pb in self.ob.pose.bones:
            pb.rotation_quaternion = Quaternion()
            pb.scale = (1, 1, 1)
            pb.location = (0, 0, 0)
        derniere = max([1] + [f for liste in cles.values() for f, _ in liste])
        for pb in self.ob.pose.bones:
            if pb.name not in cles:
                for image in (1, derniere):
                    pb.keyframe_insert("rotation_quaternion", frame=image)
                    pb.keyframe_insert("scale", frame=image)
                    pb.keyframe_insert("location", frame=image)
        for nom_os, liste in cles.items():
            pb = self.ob.pose.bones[nom_os]
            for image, val in liste:
                q = Quaternion()
                for axe, ang in val.get("rot", []):
                    q = self._rot(nom_os, axe, ang) @ q
                pb.rotation_quaternion = q
                pb.scale = val.get("ech", (1, 1, 1))
                pb.location = val.get("pos", (0, 0, 0))
                pb.keyframe_insert("rotation_quaternion", frame=image)
                pb.keyframe_insert("scale", frame=image)
                pb.keyframe_insert("location", frame=image)
        tr = ad.nla_tracks.new()
        tr.name = nom
        tr.strips.new(nom, 1, act)
        ad.action = None
        for pb in self.ob.pose.bones:
            pb.rotation_quaternion = Quaternion()
            pb.scale = (1, 1, 1)
            pb.location = (0, 0, 0)
        return act


def boucle_sin(n_images, periode, fonction, pas=4):
    """Clés régulières pour une boucle : fonction(phase 0..2π) -> valeur de clé."""
    cles = []
    for f in range(1, n_images + 2, pas):
        ph = 2 * math.pi * (f - 1) / periode
        cles.append((f, fonction(ph)))
    return cles


# ─── export ───────────────────────────────────────────────────────────────────
def exporter(nom):
    """assets/3d/compagnons/<nom>.glb + <nom>.glb.js (base64, pour le double-clic sur index.html)."""
    os.makedirs(SORTIE, exist_ok=True)
    dest = os.path.join(SORTIE, nom + ".glb")
    for o in col().objects:
        o.select_set(o.type in ("MESH", "ARMATURE"))
    bpy.ops.export_scene.gltf(filepath=dest, export_format="GLB", use_selection=True, export_apply=True,
                              export_yup=True, export_animations=True, export_animation_mode="NLA_TRACKS",
                              export_vertex_color="ACTIVE", export_normals=True, export_materials="EXPORT")
    with open(dest, "rb") as f:
        donnees = f.read()
    with open(dest + ".js", "w", encoding="utf-8") as f:
        f.write(f"// généré par _outils/compagnons/{nom}.py — ne pas éditer\nwindow.COMPAGNON_{nom.upper()}='"
                + base64.b64encode(donnees).decode() + "';\n")
    l = struct.unpack("<I", donnees[12:16])[0]
    j = json.loads(donnees[20:20 + l])
    print(f"GLB {dest} : {len(donnees) // 1024} Ko, {len(j.get('meshes', []))} maillages, "
          f"animations {[a['name'] for a in j.get('animations', [])]}")
    return dest


def rendu_face(nom, azimut_deg=0.0, cadre=4.0, centre=(0, 0, 0), taille=640):
    """Rendu Workbench orthographique de face, fond transparent -> calques/<nom>_face.png."""
    sc = bpy.context.scene
    sc.render.engine = "BLENDER_WORKBENCH"
    sc.display.shading.light = "FLAT"
    sc.display.shading.color_type = "VERTEX"
    sc.render.film_transparent = True
    sc.render.resolution_x = sc.render.resolution_y = taille
    sc.view_settings.view_transform = "Standard"
    cam = bpy.data.objects.new("cam_calque", bpy.data.cameras.new("cam_calque"))
    col().objects.link(cam)
    cam.data.type = "ORTHO"
    cam.data.ortho_scale = cadre
    a = math.radians(azimut_deg)
    d = 20
    c = Vector(centre)
    cam.location = c + Vector((math.sin(a) * d, -math.cos(a) * d, 0))
    cam.rotation_euler = (c - cam.location).to_track_quat("-Z", "Y").to_euler()
    sc.camera = cam
    os.makedirs(os.path.join(ICI, "calques"), exist_ok=True)
    sc.render.filepath = os.path.join(ICI, "calques", f"{nom}_face.png")
    bpy.ops.render.render(write_still=True)
    bpy.data.objects.remove(cam, do_unlink=True)
