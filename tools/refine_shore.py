import bpy, bmesh, math, random
from mathutils import Vector
random.seed(916)
sc=bpy.context.scene
def ground(x,z):
 d=math.hypot(x+1.25,z-4.05);basin=max(0,min(1,1-d/(2.65*1.45)))
 bowl=-basin**1.35*1.5
 bump=(math.sin(x*.31)*math.cos(z*.27)*.26+math.sin(x*.83+z*.6)*.11+math.sin(x*1.9+z*1.4)*.055+math.sin(x*4.7+z*3.1)*.022+math.sin(x*9.3-z*7.7)*.011)*(1-basin*.8)
 mound=math.exp(-(x*x+z*z)/55)*1.35*(1-basin)
 return bowl+bump+mound
mat=bpy.data.materials.new('Glade_Riverstone');mat.use_nodes=True
nt=mat.node_tree;bs=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.86
vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
spec=[(-3.48,3.60,.78),(-3.0,2.52,.70),(-2.02,1.71,.85),(-1.0,1.64,.47),(-.15,2.01,.37),(-3.90,4.67,.58),(-3.10,5.75,.53),(-2.40,6.19,.38)]
for i in range(36):
 a=random.uniform(.5,5.9);r=random.uniform(2.0,2.65)
 spec.append((-1.25+math.cos(a)*r,4.05+math.sin(a)*r,random.uniform(.065,.24)))
vs=[];fs=[];cols=[]
for i,(x,z,s) in enumerate(spec):
 bm=bmesh.new();bmesh.ops.create_icosphere(bm,subdivisions=3 if i<8 else 2,radius=1);bm.verts.ensure_lookup_table()
 off=len(vs);rot=random.random()*math.tau;stretch=random.uniform(1.0,1.4);y=ground(x,z)+s*.29
 for v in bm.verts:
  p=v.co;k=.95+.07*math.sin(p.x*5+p.z*3+i)+.04*math.sin(p.y*9+i)
  px=p.x*s*k*stretch;py=p.y*s*k*.75
  vx=x+math.cos(rot)*px-math.sin(rot)*py;vz=z+math.sin(rot)*px+math.cos(rot)*py
  vy=y+p.z*s*k*.60
  vs.append((vx,-vz,vy))
  top=max(0,p.z-.08);moss=top*.56*(.65+.35*math.sin(p.x*7+i)**2)
  band=.89+.09*math.sin(p.z*22+p.x*4+i)
  stone=(.33*band,.37*band,.32*band);green=(.22,.32,.10)
  cols.append(tuple(stone[j]*(1-moss)+green[j]*moss for j in range(3))+(1,))
 fs.extend(tuple(off+v.index for v in f.verts) for f in bm.faces);bm.free()
mesh=bpy.data.meshes.new('ShoreRocks');mesh.from_pydata(vs,[],fs);mesh.materials.append(mat);mesh.update()
o=bpy.data.objects.new('Mossy_Shore_Rocks',mesh);sc.collection.objects.link(o)
attr=mesh.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
for i,c in enumerate(cols):attr.data[i].color=c
for p in mesh.polygons:p.use_smooth=True
# Layered fern fronds beside the stones, merged into one material draw.
vs=[];fs=[];cols=[]
for x,z,s in spec[:8]:
 for frond in range(6):
  angle=frond*math.tau/6+random.random()*.3;length=random.uniform(.35,.65)
  for j in range(1,10):
   t=j/10
   center=Vector((x+math.cos(angle)*length*t,-z-math.sin(angle)*length*t,ground(x,z)+.12+math.sin(t*2.3)*length*.55))
   side=Vector((-math.sin(angle),-math.cos(angle),.12))
   forward=Vector((math.cos(angle),-math.sin(angle),.05))
   for sign in [-1,1]:
    wid=length*.21*math.sin(t*math.pi)
    tip=center+side*sign*wid+forward*.03
    off=len(vs)
    vs.extend([tuple(center-forward*.026),tuple(tip),tuple(center+forward*.04),tuple(center+Vector((0,0,.013)))])
    fs.extend([(off,off+1,off+3),(off+3,off+1,off+2)])
    cols.extend([(.16+t*.10,.31+t*.15,.09+t*.08,1)]*4)
fernmat=bpy.data.materials.new('Glade_Fern');fernmat.use_nodes=True
nt=fernmat.node_tree;bs=next(n for n in nt.nodes if n.type=='BSDF_PRINCIPLED');bs.inputs['Roughness'].default_value=.86
vc=nt.nodes.new('ShaderNodeVertexColor');vc.layer_name='Color';nt.links.new(vc.outputs['Color'],bs.inputs['Base Color'])
d=bpy.data.meshes.new('FernFronds');d.from_pydata(vs,[],fs);d.materials.append(fernmat);d.update()
f=bpy.data.objects.new('Shore_Ferns',d);sc.collection.objects.link(f)
a=d.color_attributes.new(name='Color',type='FLOAT_COLOR',domain='POINT')
for i,c in enumerate(cols):a.data[i].color=c
for ob in sc.objects:ob.select_set(False)
o.select_set(True);f.select_set(True)
bpy.ops.export_scene.gltf(filepath=r'G:\Projects\alex-shvachko.github.io\assets\models\glade-shore.glb',export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True,export_draco_mesh_compression_level=6)
bpy.ops.wm.save_as_mainfile(filepath=r'E:\ChatGPT\ArtChatGPT_v1\blender\glade-refinement\glade-first-scene.blend')
print('SHORE',len(mesh.polygons),len(d.polygons))

