import bpy, os, sys, mathutils
from mathutils import Vector

SC = os.path.dirname(os.path.abspath(__file__))
FBX = os.path.join(SC, 'tree', 'source', 'SKTCHFB_tree.fbx')
TEX = os.path.join(SC, 'tree', 'out')
OUT = r"G:\Projects\alex-shvachko.github.io\assets\models\oak-tree.glb"

bpy.ops.wm.read_factory_settings(use_empty=True)
bpy.ops.import_scene.fbx(filepath=FBX)

for m in list(bpy.data.materials):
    bpy.data.materials.remove(m)


def tex(nt, fname, colorspace='sRGB'):
    n = nt.nodes.new('ShaderNodeTexImage')
    n.image = bpy.data.images.load(os.path.join(TEX, fname))
    n.image.colorspace_settings.name = colorspace
    return n


def make(name):
    m = bpy.data.materials.new(name)
    m.use_nodes = True
    nt = m.node_tree
    for n in list(nt.nodes):
        nt.nodes.remove(n)
    out = nt.nodes.new('ShaderNodeOutputMaterial')
    bsdf = nt.nodes.new('ShaderNodeBsdfPrincipled')
    nt.links.new(bsdf.outputs['BSDF'], out.inputs['Surface'])
    return m, nt, bsdf


# ---------------------------------------------------------------- trunk
trunk, nt, bsdf = make('Trunk')
c = tex(nt, 'trunk_basecolor.jpg')
nt.links.new(c.outputs['Color'], bsdf.inputs['Base Color'])
nm = tex(nt, 'trunk_normal.jpg', 'Non-Color')
nmap = nt.nodes.new('ShaderNodeNormalMap')
nmap.inputs['Strength'].default_value = 1.0
nt.links.new(nm.outputs['Color'], nmap.inputs['Color'])
nt.links.new(nmap.outputs['Normal'], bsdf.inputs['Normal'])
orm = tex(nt, 'trunk_orm.jpg', 'Non-Color')
sep = nt.nodes.new('ShaderNodeSeparateColor')
nt.links.new(orm.outputs['Color'], sep.inputs['Color'])
nt.links.new(sep.outputs['Green'], bsdf.inputs['Roughness'])
bsdf.inputs['Metallic'].default_value = 0.0

# ---------------------------------------------------------------- leaves
leaf, nt, bsdf = make('Leaf')
lc = tex(nt, 'leaf_basecolor.png')
nt.links.new(lc.outputs['Color'], bsdf.inputs['Base Color'])
nt.links.new(lc.outputs['Alpha'], bsdf.inputs['Alpha'])
ln = tex(nt, 'leaf_normal.jpg', 'Non-Color')
lnmap = nt.nodes.new('ShaderNodeNormalMap')
nt.links.new(ln.outputs['Color'], lnmap.inputs['Color'])
nt.links.new(lnmap.outputs['Normal'], bsdf.inputs['Normal'])
bsdf.inputs['Roughness'].default_value = 0.72
bsdf.inputs['Metallic'].default_value = 0.0
leaf.blend_method = 'CLIP' if hasattr(leaf, 'blend_method') else leaf.blend_method
try:
    leaf.alpha_threshold = 0.5
except Exception:
    pass
leaf.use_backface_culling = False

for o in bpy.data.objects:
    if o.type != 'MESH':
        continue
    o.data.materials.clear()
    o.data.materials.append(leaf if o.name.lower().startswith('canopy') else trunk)

# ------------------------------------------------- centre on the trunk base
bpy.ops.object.select_all(action='SELECT')
for o in bpy.data.objects:
    if o.type == 'MESH':
        bpy.context.view_layer.objects.active = o
bpy.ops.object.transform_apply(location=True, rotation=True, scale=True)

trunk_obj = bpy.data.objects['Trunk']
bb = [trunk_obj.matrix_world @ Vector(c) for c in trunk_obj.bound_box]
base_z = min(v.z for v in bb)
cx = sum(v.x for v in bb) / 8
cy = sum(v.y for v in bb) / 8
for o in bpy.data.objects:
    if o.type == 'MESH':
        o.location -= Vector((cx, cy, base_z))
bpy.context.view_layer.update()

for o in bpy.data.objects:
    if o.type == 'MESH':
        bb = [o.matrix_world @ Vector(c) for c in o.bound_box]
        print('BOUNDS', o.name,
              [round(min(v[i] for v in bb), 2) for i in range(3)],
              [round(max(v[i] for v in bb), 2) for i in range(3)])

os.makedirs(os.path.dirname(OUT), exist_ok=True)
bpy.ops.export_scene.gltf(
    filepath=OUT, export_format='GLB', export_yup=True,
    use_selection=False, export_apply=True,
    export_cameras=False, export_lights=False,
    export_draco_mesh_compression_enable=True,
    export_draco_mesh_compression_level=6,
)
print('EXPORTED', os.path.getsize(OUT))
