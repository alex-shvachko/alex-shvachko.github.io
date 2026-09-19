import bpy, math, random
from mathutils import Vector, Matrix
random.seed(90219)
sc=bpy.context.scene
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

def w(p): return (p[0],-p[2],p[1])
def wood_tube(points,radii,steps=9,sides=12):
 return tube_data([w(p) for p in points],radii,steps,sides)
bark=mat('Glade_Warm_Oak',(.23,.155,.082),.94)
moss=mat('Glade_Sage_Moss',(.29,.38,.12),1)
leafmat=mat('Glade_Leaf',(.64,.75,.37),.87)
# Color variation is authored in geometry and survives glTF export.
nt=leafmat.node_tree; bs=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED')
vc=nt.nodes.new('ShaderNodeVertexColor'); vc.layer_name='Color'
nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
branches=[
 ([(1.15,.05,2.90),(1.22,1.35,2.87),(1.22,2.7,3.12),(1.05,4.15,2.95),(.8,5.8,2.55)],[.96,.78,.68,.54,.20]),
 ([(.52,.06,4.35),(.49,1.05,3.92),(.48,2.10,3.87),(.63,2.97,3.58),(1.10,3.65,3.03)],[.39,.31,.26,.34,.49]),
 ([(2.30,.08,4.25),(2.01,1.1,4.03),(2.05,2.24,3.82),(1.87,3.10,3.48),(1.16,3.85,3.02)],[.48,.32,.32,.41,.48]),
 ([(1.15,3.1,3.00),(.0,3.90,2.9),(-1.38,4.7,2.3),(-2.70,5.20,2.15)],[.46,.36,.19,.045]),
 ([(1.05,3.5,2.88),(2.53,4.35,2.67),(3.80,4.95,2.24),(4.7,5.35,1.95)],[.45,.32,.16,.04]),
 ([(1.01,4.42,2.78),(.43,5.29,1.57),(-.10,6.25,1.35)],[.37,.22,.045]),
 ([(1.11,4.00,2.96),(1.38,4.76,4.08),(2.10,5.47,4.49)],[.30,.18,.04]),
 ([(.42,3.95,2.93),(-.85,4.55,4.15),(-2.1,4.99,4.27)],[.28,.16,.035]),
]
roots=[
 ([(1.3,.9,3.1),(.52,.37,3.74),(-.13,.11,4.50),(-1.30,-.34,4.8)],[.40,.29,.16,.025]),
 ([(1.65,.94,3.35),(1.94,.95,4.07),(1.59,.76,4.60),(1.03,.49,4.80),(.17,-.19,5.2)],[.27,.19,.13,.09,.01]),
 ([(.52,1.61,3.84),(.70,1.21,4.16),(1.10,1.08,4.31),(1.57,1.04,4.23),(2.0,.34,4.5)],[.14,.12,.105,.10,.024]),
 ([(1.75,.47,3.2),(2.47,.23,4.26),(2.76,.01,5.23),(3.52,-.1,5.8)],[.34,.25,.14,.022]),
 ([(1.01,.65,2.9),(-.05,.19,3.32),(-1.08,.18,3.7),(-2.04,-.18,4.2)],[.37,.26,.15,.02]),
 ([(1.60,.47,2.85),(2.62,.40,2.51),(3.75,.15,2.90),(4.24,.05,3.6)],[.41,.24,.13,.02]),
 ([(.95,.53,2.8),(.25,.25,2.02),(-.83,.25,1.50),(-1.7,.07,1.24)],[.38,.22,.12,.025]),
]
oak=combine('Trunk',[wood_tube(p,r) for p,r in branches+roots],bark)
# Shallow bark flutes follow the growth direction; no noisy photo tiling.
grooves=[]
for side in [-1,1]:
 for i in range(6):
  x=1.28+side*(.58+i*.027)
  grooves.append(wood_tube([(x,.35,4.10+i*.02),(x,1.25,4.16),(x+side*.10,2.35,3.97),(1.3+side*.44,3.18,3.6)],[.027,.019,.019,.008],9,5))
flutes=combine('Growth_Ridges',grooves,bark)
# Rounded clusters of individually folded leaves, with outward blended normals.
clusters=[(-2.65,5.24,2.05,1.22),(-1.60,5.56,2.45,1.37),(-.40,5.8,2.4,1.4),
 (.70,6.35,2.5,1.42),(1.8,6.05,2.7,1.35),(3.0,5.65,2.3,1.25),(4.25,5.3,2.0,1.18),
 (-2.0,5.12,4.10,1.0),(-.72,5.45,3.83,1.18),(.40,5.84,4.15,1.13),(2.15,5.53,4.30,1.20),
 (3.25,5.30,3.7,1.12),(-1.60,5.65,.80,1.17),(.1,6.05,.85,1.22),(2.05,5.85,.55,1.3),
 (3.54,5.38,.6,1.15)]
vs=[]; fs=[]; colors=[]; normals=[]
palette=[(.28,.43,.18,1),(.42,.57,.26,1),(.57,.67,.34,1),(.66,.72,.40,1),(.36,.51,.28,1)]
for cx,cy,cz,r in clusters:
 for j in range(320):
  d=Vector((random.uniform(-1,1),random.uniform(-1,1),random.uniform(-1,1))).normalized()
  rad=r*random.uniform(.35,1)**.33
  pos=Vector((cx,-cz,cy))+Vector((d.x*rad,d.y*rad*.86,d.z*rad*.81))
  n=(d+Vector((0,0,.62))).normalized()
  u=n.cross(Vector((0,1,0))).normalized(); v=n.cross(u).normalized()
  theta=random.random()*math.tau; a=u*math.cos(theta)+v*math.sin(theta); b=n.cross(a)
  length=random.uniform(.10,.19); width=length*random.uniform(.35,.50)
  leaf=[-a*length*.50,-a*length*.13+b*width,-a*length*.13-b*width,a*length*.21+b*width*.82,a*length*.21-b*width*.82,a*length*.66, n*.025]
  off=len(vs); vs.extend(tuple(pos+p) for p in leaf)
  fs.extend(tuple(off+k for k in f) for f in [(0,2,6),(0,6,1),(1,6,3),(3,6,5),(5,6,4),(4,6,2)])
  color=random.choice(palette); colors.extend([color]*7); normals.extend([tuple(n)]*7)
canopy=mesh('Canopy',vs,fs,leafmat)
attr=canopy.data.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
for i,c in enumerate(colors): attr.data[i].color=c
canopy.data.normals_split_custom_set_from_vertices(normals)
# Fine moss along the root shoulders, using the same folded-leaf geometry language.
patches=[]
for j in range(110):
 t=random.random(); x=.42+random.random()*1.9; y=.30+random.random()*.25; z=3.2+random.random()*1.3
 patches.append(wood_tube([(x,y,z),(x+.035,y+.04,z+.04)],[random.uniform(.04,.10),.018],1,6))
moss_obj=combine('Root_Moss',patches,moss)
oak_objects=[oak,flutes,canopy,moss_obj]
# Preserve imported assets in the blend, excluded from the new scene.
for name in ['Cube','Icosphere','Canopy','Trunk']:
 o=bpy.data.objects.get(name)
 if o and o not in oak_objects: o.hide_render=True; o.hide_set(True)
# The imported names already existed; use exact names for exported nodes.
oak.name='Glade_Trunk'; canopy.name='Glade_Canopy'
for o in sc.objects:o.select_set(False)
for o in oak_objects:o.select_set(True)
bpy.context.view_layer.objects.active=oak
bpy.ops.export_scene.gltf(filepath=r'G:\Projects\alex-shvachko.github.io\assets\models\glade-oak.glb',export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
rig=bpy.data.objects['RobotRig']; rig.location=w((1.28,.30,3.95)); rig.rotation_euler.z=-.34
bpy.ops.wm.save_as_mainfile(filepath=r'E:\ChatGPT\ArtChatGPT_v1\blender\glade-refinement\glade-first-scene.blend')
print('OAK_EXPORTED',sum(len(o.data.polygons) for o in oak_objects),'polygons')

