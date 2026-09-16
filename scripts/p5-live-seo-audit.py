import os,json,time,concurrent.futures,urllib.request,urllib.parse,xml.etree.ElementTree as ET
from html.parser import HTMLParser
from pathlib import Path
SITES={'construction':'boiseconstruction.co','remodeling':'boiseremodeling.co','cabinet':'boisecabinet.co','handyman':'boisehandyman.co','p5':'p5homeco.com'}
key=os.environ.get('P5_QA_SITE','construction');host=SITES[key];base='https://'+host
out=Path('p5-live-finalization')/key;out.mkdir(parents=True,exist_ok=True)
def get(url):
 for attempt in range(2):
  try:
   req=urllib.request.Request(url,headers={'User-Agent':'Mozilla/5.0 (compatible; P5OwnedSiteQA/1.0)','Accept':'text/html,application/xml;q=0.9,*/*;q=0.5'})
   with urllib.request.urlopen(req,timeout=30) as r:return r.status,r.geturl(),r.read().decode('utf-8','replace')
  except Exception as e:
   if attempt: return 0,url,str(e)
   time.sleep(1)
class Page(HTMLParser):
 def __init__(self):super().__init__();self.meta={};self.links={};self.titles=[];self.h1=[];self.text=[];self.images=[];self._title=False;self._h1=False;self._skip=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag=='title':self._title=True;self.titles.append('')
  if tag=='h1':self._h1=True;self.h1.append('')
  if tag in ('script','style'):self._skip+=1
  if tag=='meta':self.meta.setdefault(a.get('name') or a.get('property') or '',[]).append(a.get('content',''))
  if tag=='link':self.links.setdefault(a.get('rel',''),[]).append(a.get('href',''))
  if tag=='img' and a.get('src'):self.images.append({k:a.get(k) for k in ('src','alt','width','height')})
 def handle_endtag(self,tag):
  if tag=='title':self._title=False
  if tag=='h1':self._h1=False
  if tag in ('script','style'):self._skip=max(0,self._skip-1)
 def handle_data(self,data):
  if self._title and self.titles:self.titles[-1]+=data
  if self._h1 and self.h1:self.h1[-1]+=data
  if not self._skip and data.strip():self.text.append(data.strip())
seen=set()
def sitemap(url):
 if url in seen:return []
 seen.add(url);status,_,body=get(url)
 if status!=200:return []
 try:root=ET.fromstring(body)
 except Exception:return []
 urls=[e.text for e in root.iter() if e.tag.endswith('}loc') or e.tag=='loc']
 if root.tag.endswith('sitemapindex'):
  return [v for child in urls if urllib.parse.urlparse(child).hostname==host for v in sitemap(child)]
 return urls
urls=sorted(set([base+'/']+sitemap(base+'/sitemap.xml')))
urls=[u for u in urls if urllib.parse.urlparse(u).hostname==host and not any(x in urllib.parse.urlparse(u).path for x in ['/admin','/api/','/portal','/estimate/p5-preview'])]
def audit(url):
 status,final,body=get(url);p=Page();p.feed(body)
 return {'url':url,'finalUrl':final,'status':status,'title':' '.join(p.titles),'titleCount':len(p.titles),'description':p.meta.get('description',[]),'canonical':p.links.get('canonical',[]),'robots':p.meta.get('robots',[]),'ogImages':p.meta.get('og:image',[]),'ogTitle':p.meta.get('og:title',[]),'ogDescription':p.meta.get('og:description',[]),'twitterImages':p.meta.get('twitter:image',[]),'icons':p.links.get('icon',[]),'h1':p.h1,'images':p.images[:12],'textSample':' '.join(p.text)[:5500]}
with concurrent.futures.ThreadPoolExecutor(max_workers=3) as pool:pages=list(pool.map(audit,urls))
public=[p for p in pages if p['status']==200 and not any('noindex' in r for r in p['robots']) and (not p['canonical'] or p['canonical'][0].rstrip('/')==p['finalUrl'].rstrip('/'))]
def duplicates(field):
 groups={}
 for p in public:
  v=p[field];v=' '.join(v) if isinstance(v,list) else v
  if v:groups.setdefault(v,[]).append(p['url'])
 return {v:u for v,u in groups.items() if len(u)>1}
result={'site':key,'sitemapUrls':len(urls),'indexableCanonicalPages':len(public),'duplicateTitles':duplicates('title'),'duplicateDescriptions':duplicates('description'),'missingTitle':[p['url'] for p in public if not p['title']],'missingDescription':[p['url'] for p in public if not p['description']],'missingImage':[p['url'] for p in public if not p['ogImages']],'pages':pages}
(out/'seo.json').write_text(json.dumps(result,indent=2))
print(json.dumps({k:v for k,v in result.items() if k!='pages'}))
