import bpy, math, random
from mathutils import Vector, Matrix
random.seed(190926)
sc = bpy.context.scene
# Preserve the imported first-scene assets before refinement.
bpy.ops.wm.save_as_mainfile(filepath=r'E:\ChatGPT\ArtChatGPT_v1\blender\glade-refinement\imported-first-scene.blend', copy=True)
def mat(name, color, rough=0.8, metal=0):
 m=bpy.data.materials.new(name); m.use_nodes=True
 b=next(n for n in m.node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 b.inputs['Base Color'].default_value=(*color,1); b.inputs['Roughness'].default_value=rough; b.inputs['Metallic'].default_value=metal
 m.diffuse_color=(*color,1)
 return m
def mesh(name, vs, fs, material, smooth=True):
 d=bpy.data.meshes.new(name); d.from_pydata(vs,[],fs); d.materials.append(material); d.update()
 o=bpy.data.objects.new(name,d); sc.collection.objects.link(o)
 for p in d.polygons: p.use_smooth=smooth
 return o
def tube_data(points, radii, steps=10, sides=10):
 pts=[Vector(p) for p in points]; out=[]; faces=[]
 for seg in range(len(pts)-1):
  p0=pts[max(seg-1,0)]; p1=pts[seg]; p2=pts[seg+1]; p3=pts[min(seg+2,len(pts)-1)]
  for j in range(steps+1 if seg==len(pts)-2 else steps):
   t=j/steps
   p=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
   tangent=(p2-p1).normalized(); ref=Vector((0,1,0)) if abs(tangent.y)<.9 else Vector((1,0,0))
   u=tangent.cross(ref).normalized(); v=tangent.cross(u).normalized()
   r=radii[seg]*(1-t)+radii[seg+1]*t
   for k in range(sides):
    a=k*math.tau/sides; ridge=1+.075*math.sin(a*5+seg*.45)
    out.append(tuple(p+r*ridge*(math.cos(a)*u+math.sin(a)*v)))
 n=len(out)//sides
 for j in range(n-1):
  for k in range(sides):
   a=j*sides+k; b=j*sides+(k+1)%sides; faces.append((a,b,b+sides,a+sides))
 faces.append(tuple(reversed(range(sides)))); faces.append(tuple((n-1)*sides+k for k in range(sides)))
 return out,faces
def combine(name, chunks, material, smooth=True):
 vs=[]; fs=[]
 for v,f in chunks:
  off=len(vs); vs.extend(v); fs.extend(tuple(i+off for i in face) for face in f)
 return mesh(name,vs,fs,material,smooth)
def ring(center, radius, minor, axis='Y', count=32, sides=6):
 c=Vector(center); vs=[]; fs=[]
 for i in range(count):
  a=i*math.tau/count
  for j in range(sides):
   b=j*math.tau/sides; r=radius+minor*math.cos(b)
   v=Vector((r*math.cos(a),minor*math.sin(b),r*math.sin(a))) if axis=='Y' else Vector((r*math.cos(a),r*math.sin(a),minor*math.sin(b)))
   vs.append(tuple(c+v))
 for i in range(count):
  for j in range(sides): fs.append((i*sides+j,((i+1)%count)*sides+j,((i+1)%count)*sides+(j+1)%sides,i*sides+(j+1)%sides))
 return vs,fs
rig=bpy.data.objects['RobotRig']; body=bpy.data.objects['RobotPostman']
head_metal=mat('RP_Service_Satin_Titanium',(.34,.38,.39),.38,.7)
head_dark=mat('RP_Service_Graphite',(.025,.031,.030),.65,.22)
head_white=bpy.data.materials['RP_Matte_White_Polymer']
metal_parts=[ring((0,.22,2.105),.195,.026),ring((0,.248,2.105),.162,.010)]
dark_parts=[tube_data([(0,.196,2.105),(0,.212,2.105)],[.171,.171],1,40)]
for i in range(12):
 a=i*math.tau/12
 c=(.194*math.cos(a),.253,2.105+.194*math.sin(a))
 metal_parts.append(tube_data([c,(c[0],c[1]+.008,c[2])],[.011,.011],1,6))
for i in range(6):
 x=(i-2.5)*.043
 path=[(x,.237,2.135),(x*1.35,.34,2.05),(x*1.1,.30,1.93),(x*.85,.18,1.84)]
 dark_parts.append(tube_data(path,[.017,.020,.018,.015],8,7))
 for j in range(9):
  z=1.96+j*.017
  dark_parts.append(ring((x*1.2,.315,z),.021,.004,'Z',10,4))
 for z in [1.95,2.075]:
  metal_parts.append(ring((x*1.2,.315,z),.022,.006,'Z',12,5))
# Rear neck actuators, with small collars and inset pistons.
for x in [-.115,.115]:
 metal_parts.append(tube_data([(x,.11,1.73),(x,.205,1.93)],[.023,.018],1,10))
 dark_parts.append(tube_data([(x,.10,1.69),(x,.165,1.82)],[.030,.030],1,10))
details=[combine('Rear_Service_Titanium',metal_parts,head_metal),combine('Rear_Service_Cables',dark_parts,head_dark)]
for o in details:
 world=o.matrix_world.copy(); o.parent=rig; o.parent_type='BONE'; o.parent_bone='Head'; o.matrix_world=world
for name in ['RP_Chrome_Steel','RP_Light_Gray_Satin_Metal']:
 b=next(n for n in bpy.data.materials[name].node_tree.nodes if n.type=='BSDF_PRINCIPLED')
 b.inputs['Roughness'].default_value=.39
 b.inputs['Metallic'].default_value=.64
# Export the refined rig independently, preserving its current seated bind pose.
for o in sc.objects: o.select_set(False)
for o in [rig,body]+details: o.select_set(True)
bpy.context.view_layer.objects.active=rig
bpy.ops.export_scene.gltf(filepath=r'G:\Projects\alex-shvachko.github.io\assets\models\robot-postman-refined.glb',export_format='GLB',use_selection=True,export_rest_position_armature=False,export_animations=False,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
print('ROBOT_REFINED', len(metal_parts),len(dark_parts))

