"""Run once from before-reference-match.blend; coordinates match the browser scene."""
import bpy, bmesh, math, random
from mathutils import Vector
random.seed(190919)
sc = bpy.context.scene

def world(p):
    return Vector((p[0], -p[2], p[1]))

def material(name, color, rough=.85):
    m = bpy.data.materials.new(name)
    m.diffuse_color = (*color, 1)
    m.use_nodes = True
    bs = m.node_tree.nodes.get('Principled BSDF')
    bs.inputs['Base Color'].default_value = (*color, 1)
    bs.inputs['Roughness'].default_value = rough
    return m

def mesh(name, vertices, faces, mat, colors=None, smooth=False):
    data = bpy.data.meshes.new(name)
    data.from_pydata(vertices, [], faces)
    data.materials.append(mat)
    data.update()
    obj = bpy.data.objects.new(name, data)
    sc.collection.objects.link(obj)
    for f in data.polygons:
        f.use_smooth = smooth
    if colors:
        attr = data.color_attributes.new(name='Color', type='FLOAT_COLOR', domain='POINT')
        for i, c in enumerate(colors):
            attr.data[i].color = (*c, 1)
    return obj

def vertex_material(name, rough=.9):
    m = material(name, (1, 1, 1), rough)
    vc = m.node_tree.nodes.new('ShaderNodeVertexColor')
    vc.layer_name = 'Color'
    m.node_tree.links.new(vc.outputs['Color'], m.node_tree.nodes.get('Principled BSDF').inputs['Base Color'])
    return m

def tube(points, radii, vertices, faces, steps=8, sides=9):
    pts = [world(p) for p in points]
    start = len(vertices)
    for seg in range(len(pts)-1):
        p0, p1, p2, p3 = pts[max(0,seg-1)], pts[seg], pts[seg+1], pts[min(len(pts)-1,seg+2)]
        tangent = (p2-p1).normalized()
        u = tangent.cross(Vector((0,0,1)) if abs(tangent.z)<.9 else Vector((1,0,0))).normalized()
        v = tangent.cross(u).normalized()
        for j in range(steps+1 if seg==len(pts)-2 else steps):
            t=j/steps
            p=.5*((2*p1)+(-p0+p2)*t+(2*p0-5*p1+4*p2-p3)*t*t+(-p0+3*p1-3*p2+p3)*t*t*t)
            r=radii[seg]*(1-t)+radii[seg+1]*t
            for k in range(sides):
                a=k*math.tau/sides
                vertices.append(tuple(p+r*(1+.065*math.sin(a*5))*(math.cos(a)*u+math.sin(a)*v)))
    count=(len(vertices)-start)//sides
    for j in range(count-1):
        for k in range(sides):
            a=start+j*sides+k; b=start+j*sides+(k+1)%sides
            faces.append((a,b,b+sides,a+sides))
    faces.append(tuple(reversed(range(start,start+sides))))
    faces.append(tuple(start+(count-1)*sides+k for k in range(sides)))

def ground(x,z):
    d=math.hypot(x+1.25,z-4.05); basin=max(0,min(1,1-d/(2.65*1.45)))
    bump=(math.sin(x*.31)*math.cos(z*.27)*.26+math.sin(x*.83+z*.6)*.11+math.sin(x*1.9+z*1.4)*.055+math.sin(x*4.7+z*3.1)*.022+math.sin(x*9.3-z*7.7)*.011)*(1-basin*.8)
    return -basin**1.35*1.5+bump+math.exp(-(x*x+z*z)/55)*1.35*(1-basin)

objects=[]
bark=bpy.data.materials['Glade_Warm_Oak']
vs=[]; fs=[]
for points,radii in [
    ([(.48,2.18,3.78),(.73,1.82,4.18),(1.08,1.57,4.31),(1.68,1.39,4.28),(2.07,1.08,3.95)],[.20,.17,.15,.16,.26]),
    ([(.50,.70,3.94),(.73,1.02,4.52),(1.18,1.08,4.63),(1.66,.83,4.46),(2.10,.40,4.17)],[.25,.19,.18,.17,.30]),
    ([(2.07,1.57,3.93),(1.96,.93,4.50),(1.62,.40,4.85),(1.56,-.24,5.05)],[.29,.25,.16,.055]),
]: tube(points,radii,vs,fs,12,12)
objects.append(mesh('Embracing_Roots',vs,fs,bark,smooth=True))
# Bury the first attachment inside the hollow rim rather than leaving a cut end.
for i,v in enumerate(objects[-1].data.vertices):
    ring=i//12
    if ring>12: break
    fade=(1-ring/12)**2
    v.co+=Vector((-.06,.38,.12))*fade
attr=objects[-1].data.color_attributes.new(name='BarkColor',type='FLOAT_COLOR',domain='POINT')
for i,v in enumerate(objects[-1].data.vertices):
    k=.85+.12*math.sin(v.co.z*8+v.co.x*5)+.07*math.sin(v.co.y*18)
    attr.data[i].color=(.29*k,.16*k,.065*k,1)
for name in ['Glade_Trunk','Growth_Ridges']:
    for c in bpy.data.objects[name].data.color_attributes['BarkColor'].data:
        r,g,b,a=c.color
        c.color=(r*1.40,g*1.12,b*.9,a)

# Faceted river boulders form the cascade's actual stepped substrate.
rocks=[(-3.45,1.25,1.75,1.26,.92,1.03),(-2.68,.85,2.38,1.02,.75,.86),
       (-2.10,.32,3.24,.78,.64,.78),(-3.85,.5,3.3,.90,.72,.80),
       (-3.55,.08,5.6,1.07,.70,.88),(-2.28,-.12,6.85,1.0,.65,.85),
       (-.8,-.26,7.15,.88,.50,.70),(2.80,.12,5.62,.86,.73,.88),
       (3.33,.75,3.10,.82,1.02,.77),(3.70,.70,1.5,1.20,1.14,.98),
       (-4.50,1.0,.4,1.40,1.42,1.12)]
vs=[];fs=[];cols=[]
for ri,(x,y,z,sx,sy,sz) in enumerate(rocks):
    bm=bmesh.new(); bmesh.ops.create_icosphere(bm,subdivisions=3,radius=1)
    bm.verts.ensure_lookup_table(); off=len(vs)
    for vert in bm.verts:
        p=vert.co
        wobble=.95+.055*math.sin(p.x*6+p.z*3+ri)+.035*math.sin(p.y*11-ri)
        vs.append(tuple(world((x+p.x*sx*wobble,y+p.z*sy*wobble,z+p.y*sz*wobble))))
        moss=max(0,min(1,(p.z+.14)*1.8+.18*math.sin(p.x*12+p.y*8)))
        grain=.88+random.random()*.20
        stone=(.25,.28,.24); green=(.26,.35,.045)
        cols.append(tuple((stone[j]*(1-moss)+green[j]*moss)*grain for j in range(3)))
    fs.extend(tuple(off+v.index for v in f.verts) for f in bm.faces)
    bm.free()
objects.append(mesh('Cascade_Moss_Boulders',vs,fs,vertex_material('Reference_Moss_Stone'),cols))

# Folded, lobed ivy blades; geometry reads from both the front and side.
lv=[];lf=[];lc=[]; stems=[]; stemfaces=[]
palette=[(.25,.36,.055),(.36,.45,.085),(.46,.53,.14),(.19,.30,.07),(.54,.57,.19)]
def ivy_leaf(pos,size,angle=0,tilt=0):
    center=world(pos)
    u=Vector((math.cos(angle),0,math.sin(angle)))
    v=Vector((-math.sin(angle),tilt,-math.cos(angle))).normalized()
    normal=u.cross(v).normalized()
    outline=[(0,-.20),(-.42,-.43),(-.78,-.12),(-.56,.20),(-.62,.49),(-.28,.53),(0,1),(.28,.53),(.62,.49),(.56,.20),(.78,-.12),(.42,-.43)]
    off=len(lv)
    lv.append(tuple(center+normal*size*.15))
    lv.extend(tuple(center+u*a*size+v*b*size) for a,b in outline)
    for j in range(len(outline)):lf.append((off,off+1+j,off+1+(j+1)%len(outline)))
    color=random.choice(palette); lc.extend([color]*(len(outline)+1))

# Hanging strands frame the subject without covering the face or working arm.
for x,top,z,length in [(-3.0,5.2,2.8,2.8),(-2.15,4.9,3.35,1.9),(-1.3,5.15,3.15,2.3),
    (-.45,4.8,3.3,1.45),(.25,4.25,3.72,1.55),(2.40,4.7,3.55,2.2),
    (3.1,5.0,3.25,2.65),(4.1,4.9,2.6,2.4),(1.05,5.65,3.2,1.7)]:
    path=[]
    for j in range(7):
        t=j/6
        path.append((x+math.sin(t*8+x)*.09,top-t*length,z+math.sin(t*5)*.08))
    tube(path,[.014*(1-j/9) for j in range(7)],stems,stemfaces,3,5)
    for j in range(int(length/.095)):
        t=j*.095; sign=(-1)**j
        ivy_leaf((x+math.sin(t/length*8+x)*.09+sign*.045,top-t,z+.045),random.uniform(.08,.135),sign*.5,.22)

# Ivy trails rooted into the visible ellipsoid surfaces of each boulder.
for x,y,z,sx,sy,sz in rocks:
    for trail in range(10):
        az=random.uniform(-2.7,2.7)
        for j in range(random.randint(5,10)):
            theta=.18+j*.135
            xx=x+math.sin(theta)*math.sin(az)*sx*1.01
            yy=y+math.cos(theta)*sy*.98
            zz=z+math.sin(theta)*math.cos(az)*sz*1.02
            ivy_leaf((xx,yy+.015,zz+.018),random.uniform(.075,.12),random.uniform(-1,1),-.5)
objects.append(mesh('Hanging_And_Rock_Ivy',lv,lf,vertex_material('Reference_Leaf_Ivy'),lc))
objects.append(mesh('Ivy_Stems',stems,stemfaces,material('Reference_Vine',(.13,.19,.045))))

# Ferns and daisies occupy planted pockets, not the open water.
fv=[];ff=[];fc=[];pv=[];pf=[];pc=[];sv=[];sf=[]
patches=[(-3.6,4.5),(-3.25,2.9),(-2.8,1.15),(-1.3,1.35),(-.1,2.0),
         (2.55,3.1),(2.80,4.9),(3.2,6.0),(-2.0,6.7),(-3.7,6.2),(.6,6.3),(3.5,1.8)]
for x,z in patches:
    y=ground(x,z)+.06
    for frond in range(9):
        angle=frond*math.tau/9+random.random()*.3; length=random.uniform(.50,.95)
        for j in range(1,13):
            t=j/13
            center=world((x+math.cos(angle)*length*t,y+math.sin(t*2.5)*length*.65,z+math.sin(angle)*length*t))
            side=Vector((-math.sin(angle),-math.cos(angle),.08)); forward=Vector((math.cos(angle),-math.sin(angle),.16))
            for sign in [-1,1]:
                tip=center+side*sign*length*.25*math.sin(t*math.pi)+forward*.055
                off=len(fv);fv.extend([tuple(center-forward*.02),tuple(tip),tuple(center+forward*.035),tuple(center+Vector((0,0,.025)))])
                ff.extend([(off,off+1,off+3),(off+3,off+1,off+2)])
                fc.extend([(.18+t*.13,.30+t*.14,.035+t*.035)]*4)
    for flower in range(9):
        xx=x+random.uniform(-.5,.5); zz=z+random.uniform(-.4,.4); yy=ground(xx,zz)
        h=random.uniform(.22,.52)
        tube([(xx,yy,zz),(xx+.025,yy+h,zz)],[.009,.004],sv,sf,1,5)
        c=world((xx+.025,yy+h,zz)); off=len(pv)
        pv.append(tuple(c+Vector((0,0,.012))))
        for k in range(8):
            a=k*math.tau/8
            pv.append(tuple(c+Vector((math.cos(a)*.028,math.sin(a)*.028,0))))
            pf.append((off,off+1+k,off+1+(k+1)%8))
        pc.extend([(.73,.40,.03)]*9)
        for petal in range(9):
            a=petal*math.tau/9
            d=Vector((math.cos(a),math.sin(a),.13)); side=Vector((-math.sin(a),math.cos(a),0))
            off=len(pv)
            pv.extend([tuple(c+d*.022),tuple(c+d*.065+side*.018),tuple(c+d*.095),tuple(c+d*.065-side*.018)])
            pf.append((off,off+1,off+2,off+3));pc.extend([(.88,.87,.69)]*4)
objects.append(mesh('Reference_Ferns',fv,ff,vertex_material('Reference_Fern'),fc))
objects.append(mesh('Wild_Daisies',pv,pf,vertex_material('Reference_Daisy'),pc))
objects.append(mesh('Wildflower_Stems',sv,sf,material('Reference_Stem',(.12,.22,.04))))

# Sculpt a recessed seat out of the existing trunk, preserving its outer form.
trunk=bpy.data.objects['Glade_Trunk']
bpy.ops.mesh.primitive_uv_sphere_add(segments=32,ring_count=24,location=world((1.28,1.53,4.06)))
cutter=bpy.context.object; cutter.scale=(.57,.65,1.10)
bpy.context.view_layer.objects.active=trunk
modifier=trunk.modifiers.new('Seated hollow','BOOLEAN'); modifier.operation='DIFFERENCE'; modifier.object=cutter
bpy.ops.object.modifier_apply(modifier=modifier.name)
bpy.data.objects.remove(cutter,do_unlink=True)

for obj in sc.objects: obj.select_set(False)
for obj in objects: obj.select_set(True)
bpy.context.view_layer.objects.active=objects[0]
bpy.ops.export_scene.gltf(filepath=r'G:\Projects\alex-shvachko.github.io\assets\models\glade-garden.glb',export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True)
for obj in sc.objects: obj.select_set(False)
for name in ['Glade_Trunk','Growth_Ridges','Glade_Canopy','Glade_Canopy_Core','Root_Moss']:
    bpy.data.objects[name].select_set(True)
bpy.context.view_layer.objects.active=trunk
bpy.ops.export_scene.gltf(filepath=r'G:\Projects\alex-shvachko.github.io\assets\models\glade-oak.glb',export_format='GLB',use_selection=True,export_animations=False,export_cameras=False,export_lights=False,export_draco_mesh_compression_enable=True)
bpy.ops.wm.save_as_mainfile(filepath=r'E:\ChatGPT\ArtChatGPT_v1\blender\glade-refinement\reference-glade.blend')
print('REFERENCE_GARDEN',len(objects),sum(len(o.data.polygons) for o in objects),'faces')
