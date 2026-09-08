"""Contact sheets: one tall image per page and viewport, every section stacked
with its index and flags, so a page can be reviewed in one look."""
import json, os, sys, glob
from PIL import Image, ImageDraw
S=os.path.dirname(os.path.abspath(__file__))
site=sys.argv[1]; vws=[int(v) for v in sys.argv[2].split(",")] if len(sys.argv)>2 else [1440,834,390]
data=json.load(open(f"{S}/{site}/audit.json"))
os.makedirs(f"{S}/sheets/{site}", exist_ok=True)
def slug(url):
    from urllib.parse import urlparse
    p=urlparse(url).path.replace("/","_").strip("_"); return p or "home"
made=[]
for page in data:
    d=f"{S}/{site}/{slug(page['url'])}"
    for vw in vws:
        secs=page["viewports"].get(str(vw))
        if not isinstance(secs,list): continue
        W=min(vw, 900) if vw>=800 else vw
        tiles=[]
        for s in secs:
            f=f"{d}/{vw}-{s['idx']:02d}.png"
            if not os.path.exists(f): continue
            im=Image.open(f).convert("RGB")
            scale=W/im.width; h=int(im.height*scale)
            if h>1600: h=1600  # cap very tall sections; top part is what matters
            im=im.resize((W,int(im.height*scale)))
            if im.height>1600: im=im.crop((0,0,W,1600))
            label=f"#{s['idx']} {s['tag'].lower()} {s['heading'][:60]}  [{s['w']}x{s['h']}] " + ("; ".join(x for x in s['flags'] if not ('under 12px' in x or 'tap targets' in x)))
            tiles.append((im,label))
        if not tiles: continue
        H=sum(t[0].height+26 for t in tiles)+10
        sheet=Image.new("RGB",(W,H),(255,0,255))
        y=0; dr=ImageDraw.Draw(sheet)
        for im,label in tiles:
            dr.rectangle([0,y,W,y+24],fill=(30,30,30)); dr.text((6,y+6),label[:150],fill=(255,220,120)); y+=26
            sheet.paste(im,(0,y)); y+=im.height
        PART=2600 if W<600 else 4000
        if sheet.height<=PART:
            out=f"{S}/sheets/{site}/{slug(page['url'])}-{vw}.png"; sheet.save(out, optimize=True); made.append(out)
        else:
            n=0
            for y0 in range(0, sheet.height, PART):
                part=sheet.crop((0,y0,W,min(sheet.height,y0+PART))); n+=1
                out=f"{S}/sheets/{site}/{slug(page['url'])}-{vw}-p{n}.png"; part.save(out, optimize=True); made.append(out)
print(site, len(made), "sheets")
