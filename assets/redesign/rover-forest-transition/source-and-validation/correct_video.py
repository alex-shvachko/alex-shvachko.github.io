import cv2
import numpy as np
import subprocess
import csv
from pathlib import Path
from scipy.interpolate import PchipInterpolator, UnivariateSpline

ROOT=Path(__file__).parent
FPS=24
W,H=864,496
OW,OH=864,486
track=np.genfromtxt(ROOT/'nose-track.csv',delimiter=',',skip_header=1)
good=track[:,1]>=4.5
tx=UnivariateSpline(track[good,1],track[good,2],s=60)
ty=UnivariateSpline(track[good,1],track[good,3],s=60)
raw=cv2.imread(str(ROOT/'rover-layer.png'),cv2.IMREAD_UNCHANGED)
alpha=raw[:,:,3]
ys,xs=np.where(alpha>128)
sprite=raw[ys.min():ys.max()+1,xs.min():xs.max()+1].astype(np.float32)/255
sh,sw=sprite.shape[:2]
# Generated sprite: eyes/front are at 79.5% of the trimmed height.
anchor=np.array([sw*.50,sh*.80])

path_t=np.array([4.9,5,5.25,5.5,5.75,6,7,8,9,10])
path_x=np.array([258,248,235,229,224,228,246,268,285,298])
path_y=np.array([295,302,316,331,346,360,380,402,423,445])
px=PchipInterpolator(path_t,path_x)
py=PchipInterpolator(path_t,path_y)
width=PchipInterpolator([4.65,4.8,5,5.25,5.5,6,10],[78,65,52,40,34,29,29])
zoom=PchipInterpolator([0,3.75,4.1,4.5,5.5,6.5,7.5,8.5,9.5,10],[1,1,1.2,1.68,1.72,1.65,1.48,1.25,1.06,1])
screen_y=PchipInterpolator([3.75,4.25,4.5,4.65,5,6,7,8,9,10],[207,212,220,228,246,291,334,376,417,445])

def smoothstep(x):
    x=np.clip(x,0,1);return x*x*(3-2*x)

def compose_sprite(im,x,y,target_width,angle):
    scale=target_width/sw
    angle=float(np.clip(angle,-30,30))
    # Down points along the local trail tangent. Positive dx rotates clockwise.
    a=np.deg2rad(angle);R=np.array([[np.cos(a),-np.sin(a)],[np.sin(a),np.cos(a)]])*scale
    # With image coordinates, a negative angle turns down towards right.
    R=np.array([[np.cos(-a),-np.sin(-a)],[np.sin(-a),np.cos(-a)]])*scale
    M=np.c_[R,np.array([x,y])-R@anchor]
    rgba=cv2.warpAffine(sprite,M,(W,H),flags=cv2.INTER_AREA,borderMode=cv2.BORDER_CONSTANT)
    a=rgba[:,:,3:4]
    shadow=cv2.GaussianBlur(a[:,:,0],(0,0),max(1,target_width*.07))
    shadow=np.roll(np.roll(shadow,2,axis=0),1,axis=1)[:,:,None]*.25
    base=im.astype(np.float32)/255*(1-shadow)
    return (np.clip(rgba[:,:,:3]*a+base*(1-a),0,1)*255).astype(np.uint8)

cap=cv2.VideoCapture(str(ROOT/'rejected.mp4'))
plate=cv2.imread(str(ROOT/'forest-plate.png'))
cmd=['ffmpeg','-y','-loglevel','error','-f','rawvideo','-pix_fmt','bgr24','-s',f'{OW}x{OH}','-r',str(FPS),'-i','-','-an','-c:v','libx264','-crf','17','-preset','medium','-pix_fmt','yuv420p','-movflags','+faststart',str(ROOT/'rover-forward-down-10s.mp4')]
enc=subprocess.Popen(cmd,stdin=subprocess.PIPE)
checks=[]
thumbs=[]
for i in range(240):
    ok,im=cap.read()
    if not ok:raise RuntimeError(f'Missing source frame {i}')
    t=i/FPS
    nose_x=np.interp(t,track[:,1],track[:,2]);nose_y=np.interp(t,track[:,1],track[:,3])
    if t>=4.9:
        ox,oy=float(tx(t)),float(ty(t))
        old_w=float(np.interp(t,[4.65,4.8,5,5.25,5.5,6,10],[88,77,62,44,37,32,32]))
        mask=np.zeros((H,W),np.uint8)
        cv2.rectangle(mask,(round(ox-old_w*.72),round(oy-old_w*1.1)),(round(ox+old_w*.72),round(oy+old_w*.42)),255,-1)
        clean=cv2.inpaint(im,mask,5,cv2.INPAINT_TELEA)
        plate_blend=smoothstep((t-5.65)/.35)
        clean=cv2.addWeighted(clean,1-plate_blend,plate,plate_blend,0)
        nose_x,nose_y=float(px(t)),float(py(t))
        # Trail heading after the camera settles; the front always points down.
        heading=float(np.interp(t,[4.9,5.25,6,7,8,9,10],[10,-5,12,35,40,38,28]))
        layer=compose_sprite(clean,nose_x,nose_y,float(width(t)),heading)
        blend=smoothstep((t-4.9)/.12)
        im=cv2.addWeighted(im,1-blend,layer,blend,0)
    z=float(zoom(t))
    if t>=3.75:
        desired=float(screen_y(t))
        cy=np.clip(nose_y-desired/z,0,H-H/z)
        cx=np.clip(nose_x*(1-1/z),0,W-W/z)
    else:cx=cy=0
    M=np.array([[z,0,-cx*z],[0,z,-cy*z]],np.float32)
    out=cv2.warpAffine(im,M,(W,H),flags=cv2.INTER_CUBIC,borderMode=cv2.BORDER_REPLICATE)
    out=cv2.resize(out,(OW,OH),interpolation=cv2.INTER_AREA)
    enc.stdin.write(out.tobytes())
    actual_y=(nose_y-cy)*z*OH/H
    if t>=4.65:checks.append([round(t,4),round(nose_x,2),round(nose_y,2),round(actual_y,2),round(z,3)])
    if i%12==0 and t>=4:
        thumb=cv2.resize(out,(432,243));cv2.putText(thumb,f'{t:.1f}s',(8,22),cv2.FONT_HERSHEY_SIMPLEX,.6,(255,255,255),2);thumbs.append(thumb)
    if i in [108,120,144,168,192,216,239]:cv2.imwrite(str(ROOT/f'corrected-{i:03}.jpg'),out)
enc.stdin.close()
if enc.wait()!=0:raise RuntimeError('Encoder failed')
with open(ROOT/'verified-motion.csv','w',newline='') as f:
    wr=csv.writer(f);wr.writerow(['seconds','source_nose_x','source_nose_y','screen_nose_y','zoom']);wr.writerows(checks)
sheet=np.vstack([np.hstack(thumbs[j:j+4]) for j in range(0,12,4)])
cv2.imwrite(str(ROOT/'corrected-contact.jpg'),sheet)
print('Rendered 240 frames / 24 fps = 10 seconds')
print('Minimum frame-to-frame downward displacement:',np.diff(np.array(checks)[:,3]).min())
