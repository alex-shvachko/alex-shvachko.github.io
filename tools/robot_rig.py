import bpy, math, mathutils, json, os, re
from mathutils import Vector, Matrix
from math import radians as R

OUT = r"G:\Projects\alex-shvachko.github.io\assets\models\robot-postman.glb"

# ------------------------------------------------------------------ cleanup
keep = {o.name for o in bpy.data.objects
        if any(c.name.startswith('RP_') for c in o.users_collection)}
for o in list(bpy.data.objects):
    if o.name not in keep:
        bpy.data.objects.remove(o, do_unlink=True)
bpy.ops.object.select_all(action='DESELECT')
for o in list(bpy.data.objects):
    if o.type == 'CURVE':
        o.select_set(True)
        bpy.context.view_layer.objects.active = o
        bpy.ops.object.convert(target='MESH')
        o.select_set(False)

# ------------------------------------------------------------------ skeleton
# (bone, parent, head, tail). Blender Z-up; the robot faces -Y.
BONES = [
    ('Pelvis',     None,         (0, 0, 1.10),        (0, 0, 1.32)),
    ('Torso',      'Pelvis',     (0, 0, 1.32),        (0, 0, 1.78)),
    ('Neck',       'Torso',      (0, 0, 1.78),        (0, 0, 1.95)),
    ('Head',       'Neck',       (0, 0, 1.95),        (0, 0, 2.30)),
    ('Shoulder_L', 'Torso',      (0.189, 0, 1.644),   (0.465, 0, 1.644)),
    ('Elbow_L',    'Shoulder_L', (0.465, 0, 1.644),   (0.7755, 0, 1.644)),
    ('Wrist_L',    'Elbow_L',    (0.7755, 0, 1.644),  (0.95, 0, 1.644)),
    ('Shoulder_R', 'Torso',      (-0.189, 0, 1.644),  (-0.465, 0, 1.644)),
    ('Elbow_R',    'Shoulder_R', (-0.465, 0, 1.644),  (-0.7755, 0, 1.644)),
    ('Wrist_R',    'Elbow_R',    (-0.7755, 0, 1.644), (-0.95, 0, 1.644)),
    ('Hip_L',      'Pelvis',     (0.09, 0, 1.104),    (0.09, 0, 0.717)),
    ('Knee_L',     'Hip_L',      (0.09, 0, 0.717),    (0.09, 0, 0.159)),
    ('Ankle_L',    'Knee_L',     (0.09, 0, 0.159),    (0.09, -0.12, 0.03)),
    ('Hip_R',      'Pelvis',     (-0.09, 0, 1.104),   (-0.09, 0, 0.717)),
    ('Knee_R',     'Hip_R',      (-0.09, 0, 0.717),   (-0.09, 0, 0.159)),
    ('Ankle_R',    'Knee_R',     (-0.09, 0, 0.159),   (-0.09, -0.12, 0.03)),
]
arm_data = bpy.data.armatures.new('RobotRig')
rig = bpy.data.objects.new('RobotRig', arm_data)
bpy.context.scene.collection.objects.link(rig)
bpy.context.view_layer.objects.active = rig
bpy.ops.object.mode_set(mode='EDIT')
for name, parent, head, tail in BONES:
    b = arm_data.edit_bones.new(name)
    b.head, b.tail = Vector(head), Vector(tail)
    b.use_connect = False
    if parent:
        b.parent = arm_data.edit_bones[parent]
bpy.ops.object.mode_set(mode='OBJECT')

SEG = {n: (Vector(h), Vector(t)) for n, p, h, t in BONES}


def dist_to_bone(p, name):
    a, b = SEG[name]
    ab = b - a
    t = max(0.0, min(1.0, (p - a).dot(ab) / ab.length_squared))
    return (p - (a + ab * t)).length


# ------------------------------------------------------------------ buckets
BUCKET_BONE = {
    'torso': 'Torso', 'neck': 'Neck', 'head': 'Head',
    'uarm_L': 'Shoulder_L', 'forearm_L': 'Elbow_L', 'hand_L': 'Wrist_L',
    'uarm_R': 'Shoulder_R', 'forearm_R': 'Elbow_R', 'hand_R': 'Wrist_R',
    'thigh_L': 'Hip_L', 'shin_L': 'Knee_L', 'foot_L': 'Ankle_L',
    'thigh_R': 'Hip_R', 'shin_R': 'Knee_R', 'foot_R': 'Ankle_R',
}


def centre(o):
    bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
    return Vector((sum(v.x for v in bb) / 8, sum(v.y for v in bb) / 8, sum(v.z for v in bb) / 8))


def bucket(o):
    c = REST_CENTRE[o.name]
    x, z = c.x, c.z
    n = o.name
    if 'Mailbag' in n or 'Bag' in n:
        return 'torso'
    if 'RP_Head_and_Cap' in {col.name for col in o.users_collection} or z >= 1.90:
        return 'head'
    if z >= 1.75:
        return 'neck'
    if z > 1.30:
        if x <= -0.7755:
            return 'hand_R'
        if x <= -0.465:
            return 'forearm_R'
        if x <= -0.20:
            return 'uarm_R'
        if x >= 0.7755:
            return 'hand_L'
        if x >= 0.465:
            return 'forearm_L'
        if x >= 0.20:
            return 'uarm_L'
        return 'torso'
    if z < 1.10 and abs(x) > 0.02:
        s = 'R' if x < 0 else 'L'
        if z < 0.159:
            return 'foot_' + s
        if z < 0.717:
            return 'shin_' + s
        return 'thigh_' + s
    return 'torso'


# Flexible parts and the ordered parent -> child bone chain they run along, so
# nothing tears at a joint. Anything not listed stays rigid on a single bone.
def flex_chain(o):
    n = o.name
    if 'Socket' in n or 'Fitting' in n:
        return None                      # rigid end caps stay crisp
    if REST_CENTRE[o.name].z >= 1.90:
        return None                      # hat / head trim rides the head rigidly
    if 'Bag_' in n or 'Mailbag_Flap' in n or 'Mailbag_Clasp' in n:
        return None                      # the satchel itself is a rigid body
    s = 'L' if (n.endswith('_L') or '_L_' in n) else ('R' if (n.endswith('_R') or '_R_' in n) else None)
    if 'Neck_Hose' in n or re.search(r'Neck_Collar_\d+$', n):
        return ['Torso', 'Neck', 'Head']
    if 'Service_Wire' in n:
        return ['Neck', 'Head']
    if s and 'Shoulder_Hose' in n:
        return ['Torso', 'Shoulder_' + s, 'Elbow_' + s]
    if s and 'Forearm_Hose' in n:
        return ['Shoulder_' + s, 'Elbow_' + s, 'Wrist_' + s]
    if s and 'Thigh_Hose' in n:
        return ['Pelvis', 'Hip_' + s, 'Knee_' + s]
    if s and 'Shin_Hose' in n:
        return ['Hip_' + s, 'Knee_' + s, 'Ankle_' + s]
    if s and 'Waist_Hose' in n:
        return ['Pelvis', 'Torso']
    if 'Strap' in n or 'Stitch' in n:
        return ['Pelvis', 'Torso']       # the strap rests on the body, not the arm
    return None


BAND = 0.10   # metres of blend either side of a joint pivot


def chain_weights(p, chain):
    """Blend across the joint the vertex actually sits on, so anchored ends
    stay welded to their rigid sockets and only the span across a pivot bends."""
    idx = 0
    for i in range(1, len(chain)):
        head, tail = SEG[chain[i]]
        d = (tail - head).normalized()
        if (p - head).dot(d) > 0:
            idx = i
    if idx == 0:
        return {chain[0]: 1.0}
    head, tail = SEG[chain[idx]]
    d = (tail - head).normalized()
    s = (p - head).dot(d)
    t = max(0.0, min(1.0, s / BAND))
    t = t * t * (3 - 2 * t)              # smoothstep
    if t >= 0.999:
        return {chain[idx]: 1.0}
    return {chain[idx]: t, chain[idx - 1]: 1.0 - t}


meshes = [o for o in bpy.data.objects if o.type == 'MESH']

# Rest centres from undeformed vertex data, captured before anything is bound.
# object.bound_box reflects evaluated geometry once modifiers exist, so it can
# not be used to classify parts.
REST_CENTRE = {}
for o in meshes:
    vs = o.data.vertices
    acc = Vector((0, 0, 0))
    for v in vs:
        acc += o.matrix_world @ v.co
    REST_CENTRE[o.name] = acc / max(len(vs), 1)

flexnames = []
bindlog = {}
for o in meshes:
    for vg in list(o.vertex_groups):
        o.vertex_groups.remove(vg)
    fb = flex_chain(o)
    if fb:
        fb = [b for b in fb if b in SEG]
    if fb and len(fb) > 1:
        groups = {b: o.vertex_groups.new(name=b) for b in fb}
        for v in o.data.vertices:
            for bn, wi in chain_weights(o.matrix_world @ v.co, fb).items():
                groups[bn].add([v.index], wi, 'REPLACE')
        flexnames.append(o.name)
        bindlog[o.name] = '+'.join(fb)
    else:
        bone = BUCKET_BONE[bucket(o)]
        bindlog[o.name] = bone
        g = o.vertex_groups.new(name=bone)
        g.add([v.index for v in o.data.vertices], 1.0, 'REPLACE')
    # Reparent without moving anything: many parts (fingers, knuckles, thumbs)
    # are already parented to their hand, so a bare parent assignment would drop
    # that transform and fling them across the scene.
    world = o.matrix_world.copy()
    o.parent = rig
    o.matrix_world = world
    mod = o.modifiers.new('Armature', 'ARMATURE')
    mod.object = rig

print("FLEX_MESHES", len(flexnames), "TOTAL_MESHES", len(meshes))
print("FLEX_LIST", json.dumps(sorted(flexnames)))



# ------------------------------------------------------------------ pose
def set_world_rot(bone_name, rots):
    """rots: list of (axis, degrees) applied about rest-space world axes."""
    pb = rig.pose.bones[bone_name]
    M3 = pb.bone.matrix_local.to_3x3()
    Rw = Matrix.Identity(3)
    for axis, deg in rots:
        Rw = Matrix.Rotation(R(deg), 3, axis) @ Rw
    pb.rotation_mode = 'QUATERNION'
    pb.matrix_basis = (M3.inverted() @ Rw @ M3).to_4x4()


POSE = {
    'Torso':      [('X', 14)],            # leaning back into the trunk
    'Neck':       [('X', -6)],
    'Head':       [('X', -12)],           # chin up, watching the butterfly
    'Hip_L':      [('Z', -7), ('X', -78)],
    'Hip_R':      [('Z', 10), ('X', -82)],
    'Knee_L':     [('X', 52)],
    'Knee_R':     [('X', 44)],
    'Ankle_L':    [('X', 18)],
    'Ankle_R':    [('X', 22)],
    'Shoulder_L': [('Y', 72)],            # trapped arm, down at his side
    'Elbow_L':    [('Y', 18)],
}
for bone, rots in POSE.items():
    set_world_rot(bone, rots)
bpy.context.view_layer.update()

# ------------------------------------------------------------------ materials
for m in bpy.data.materials:
    if not m.use_nodes:
        continue
    b = next((n for n in m.node_tree.nodes if n.type == 'BSDF_PRINCIPLED'), None)
    if not b:
        continue
    if m.name == 'RP_Cyan_Display':
        b.inputs['Emission Color'].default_value = (0.30, 0.88, 1.0, 1)
        b.inputs['Emission Strength'].default_value = 5.0
    elif m.name == 'RP_Sensor_Red':
        b.inputs['Emission Color'].default_value = (1.0, 0.16, 0.10, 1)
        b.inputs['Emission Strength'].default_value = 2.5

# ------------------------------------------------------------------ tear check
# Measured on real evaluated vertices: bound_box is updated post-deform and
# cannot be used as a rest baseline.
deps = bpy.context.evaluated_depsgraph_get()
posed, restc = {}, {}
for o in meshes:
    restc[o.name] = REST_CENTRE[o.name]
    ev = o.evaluated_get(deps)
    me = ev.to_mesh()
    if len(me.vertices):
        acc = Vector((0, 0, 0))
        for v in me.vertices:
            acc += ev.matrix_world @ v.co
        posed[o.name] = acc / len(me.vertices)
    else:
        posed[o.name] = restc[o.name]
    ev.to_mesh_clear()

names = list(posed)
torn = []
for n in names:
    near = sorted(((restc[m] - restc[n]).length, m) for m in names if m != n)[:6]
    grew = max((posed[m] - posed[n]).length - d for d, m in near)
    if grew > 0.04:
        torn.append((round(grew, 3), n))
torn.sort(reverse=True)
print("TORN", len(torn), json.dumps(torn[:16]))
print("HAND_BINDINGS", json.dumps({k: bindlog[k] for k in sorted(bindlog)
      if abs(REST_CENTRE[k].x) > 0.75 and REST_CENTRE[k].z > 1.3}))
for nm in ['Forearm_L', 'Hand_L', 'Finger_0_Distal_L', 'Forearm_R', 'Hand_R', 'Finger_0_Distal_R']:
    if nm in posed:
        print('POSED', nm, [round(v, 3) for v in posed[nm]], 'rest', [round(v, 3) for v in restc[nm]])

# ------------------------------------------------------------------ proof renders
PROOF = os.environ.get('PROOF_DIR')
if PROOF:
    scn = bpy.context.scene
    scn.render.engine = 'BLENDER_EEVEE'
    scn.render.resolution_x, scn.render.resolution_y = 900, 1100
    scn.render.film_transparent = False
    world = bpy.data.worlds.new('W')
    world.use_nodes = True
    world.node_tree.nodes['Background'].inputs[0].default_value = (.05, .06, .07, 1)
    world.node_tree.nodes['Background'].inputs[1].default_value = 1.0
    scn.world = world
    hl, hr = posed.get('Hand_L'), posed.get('Hand_R')
    for nm, loc, rot in [
        ('pose_side',  (-4.2, -2.6, 1.55), (82, 0, -58)),
        ('joint_hips', (-1.9, -1.5, 1.35), (80, 0, -52)),
        ('joint_arms', (-1.5, -1.8, 2.00), (78, 0, -40)),
        ('hand_L', (hl.x + 0.15, hl.y - 0.85, hl.z + 0.25), (75, 0, 10)),
        ('hand_R', (hr.x + 0.30, hr.y - 0.80, hr.z + 0.20), (78, 0, 20)),
    ]:
        cam_d = bpy.data.cameras.new(nm)
        cam_d.lens = 70 if nm != 'pose_side' else 50
        cam = bpy.data.objects.new(nm, cam_d)
        bpy.context.scene.collection.objects.link(cam)
        cam.location = loc
        cam.rotation_euler = (R(rot[0]), R(rot[1]), R(rot[2]))
        scn.camera = cam
        for i, (lloc, energy) in enumerate([((-3, -3, 4), 900), ((3, -1, 2), 250), ((0, 3, 3), 400)]):
            ld = bpy.data.lights.new(f'L{nm}{i}', 'POINT')
            ld.energy = energy
            lo = bpy.data.objects.new(f'L{nm}{i}', ld)
            bpy.context.scene.collection.objects.link(lo)
            lo.location = lloc
        scn.render.filepath = os.path.join(PROOF, nm + '.png')
        bpy.ops.render.render(write_still=True)
        print('PROOF', scn.render.filepath)

# ------------------------------------------------------------------ save
# Keep an editable Blender project of the rigged, posed robot. This is saved
# BEFORE the meshes are joined, so the rig stays workable: separate parts,
# named bones, and the weighting intact. The original file is never touched.
PROJECT = os.path.join(os.path.dirname(bpy.data.filepath) or os.getcwd(),
                       'robot_postman_rigged.blend')
bpy.ops.wm.save_as_mainfile(filepath=PROJECT, copy=True)
print('SAVED_PROJECT', PROJECT)

# ------------------------------------------------------------------ merge
# 489 separate meshes means 489 draw calls in the browser. Joining them into a
# single skinned mesh collapses that to one call per material (14). Vertex
# groups union by name, so the binding above survives the join intact.
bpy.ops.object.mode_set(mode='OBJECT')
bpy.ops.object.select_all(action='DESELECT')
for o in meshes:
    o.select_set(True)
bpy.context.view_layer.objects.active = meshes[0]
bpy.ops.object.join()
merged = bpy.context.view_layer.objects.active
merged.name = 'RobotPostman'
print('MERGED into', merged.name,
      'slots', len(merged.data.materials),
      'verts', len(merged.data.vertices),
      'groups', len(merged.vertex_groups))

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_yup=True,
    use_selection=False, export_apply=False, export_skins=True,
    export_cameras=False, export_lights=False,
    # The exporter writes the armature's REST position by default, which would
    # throw away the seated pose entirely. Ship the posed armature instead.
    export_rest_position_armature=False,
    export_animations=False,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
)
print("EXPORTED", os.path.getsize(OUT))
