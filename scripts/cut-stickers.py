# Cuts Nora's sticker sheets (assets/stickers/sheets, 3 x 4 stickers each) into one file per sticker.
# Stickers that touch are pulled apart by shrinking the shapes until there are 12, then every pixel goes
# back to the nearest sticker. Run from the repo root: python3 scripts/cut-stickers.py
from PIL import Image
import numpy as np
from scipy import ndimage
NAMES=['love','kiss','wink','hi','yay','aww','ok','cry','wow','angry','sleepy','party']
OUT='assets/stickers/'
for pack in ['pichi','onigiri','ramen']:
    a=np.array(Image.open(f'{OUT}sheets/{pack}.webp').convert('RGBA'))
    mask=a[...,3]>8
    H,W=mask.shape
    for k in range(2,30,2):
        er=ndimage.binary_erosion(mask,iterations=k)
        lab,n=ndimage.label(er)
        sizes=ndimage.sum(er,lab,range(1,n+1))
        bodies=[i+1 for i,s in enumerate(sizes) if s>8000]
        if len(bodies)==12: break
    assert len(bodies)==12,(pack,len(bodies))
    body=np.isin(lab,bodies)*lab
    # every visible pixel goes to the nearest body
    _,(iy,ix)=ndimage.distance_transform_edt(body==0,return_indices=True)
    owner=body[iy,ix]*mask
    cents=[(ndimage.center_of_mass(body==b),b) for b in bodies]
    # order by row (4 rows) then column
    cents.sort(key=lambda t:(round(t[0][0]/(H/4)-.5),t[0][1]))
    for idx,(_,b) in enumerate(cents):
        m=owner==b
        ys,xs=np.where(m); y0,y1,x0,x1=ys.min(),ys.max()+1,xs.min(),xs.max()+1
        crop=a[y0:y1,x0:x1].copy(); crop[~m[y0:y1,x0:x1]]=0
        s=Image.fromarray(crop); side=max(s.size)+8
        sq=Image.new('RGBA',(side,side),(0,0,0,0)); sq.paste(s,((side-s.width)//2,(side-s.height)//2))
        sq.resize((320,320),Image.LANCZOS).save(f'{OUT}{pack}/{NAMES[idx]}.webp',quality=90,method=6)
    print(pack,'ok, erosion',k)
