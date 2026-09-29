import cv2
import numpy as np
import csv
from pathlib import Path

root = Path(__file__).parent
cap = cv2.VideoCapture(str(root / 'rejected.mp4'))
fps = cap.get(cv2.CAP_PROP_FPS)
keys = np.array([[3,330,250],[4.25,345,260],[4.5,300,310],[5,250,278],[5.5,225,225],[5.8,222,205],[6,213,208],[7,219,271],[8,240,345],[9,310,400],[10,360,468]])
rows=[]
thumbs=[]
i=0
while True:
    ok, im=cap.read()
    if not ok: break
    t=i/fps
    if t>=3:
        ex=np.interp(t,keys[:,0],keys[:,1]); ey=np.interp(t,keys[:,0],keys[:,2])
        b,g,r=im.astype(float).transpose(2,0,1)
        mask=((b-g>18)&(b-r>45)&(b>100)).astype('uint8')
        yy,xx=np.indices(mask.shape)
        mask[(abs(xx-ex)>90)|(abs(yy-ey)>75)]=0
        n,l,stats,cents=cv2.connectedComponentsWithStats(mask)
        candidates=[(stats[j,4],cents[j]) for j in range(1,n) if stats[j,4]>=1]
        if candidates:
            best=sorted(candidates,key=lambda a: np.linalg.norm(a[1]-[ex,ey])-min(a[0],30)*.1)[:2]
            # Near-camera eyes form two separated components; distant eyes merge.
            if t<4.5:
                pts=np.argwhere(mask>0)
                x=float(np.median(pts[:,1])); y=float(np.median(pts[:,0]))
            else: x,y=best[0][1]
        else: x,y=ex,ey
        rows.append([i,t,x,y])
        if i%6==0:
            cv2.circle(im,(round(x),round(y)),12,(0,0,255),2)
            cv2.putText(im,f'{t:.2f}  front {x:.0f},{y:.0f}',(10,25),cv2.FONT_HERSHEY_SIMPLEX,.6,(255,255,255),2)
            thumbs.append(cv2.resize(im,(432,248)))
    i+=1
with open(root/'nose-track.csv','w',newline='') as f:
    w=csv.writer(f);w.writerow(['frame','time','x','y']);w.writerows(rows)
for page in range((len(thumbs)+11)//12):
    group=thumbs[page*12:(page+1)*12]
    while len(group)<12: group.append(np.zeros_like(group[0]))
    sheet=np.vstack([np.hstack(group[j:j+4]) for j in range(0,12,4)])
    cv2.imwrite(str(root/f'track-{page}.jpg'),sheet)
print('Frames:',i,'fps:',fps,'tracked:',len(rows))
