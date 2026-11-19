import Image from '@/components/VersionedImage';
import { sourceWidthCap } from '@/shared/smallSourceImages';

interface BlogHeroBannerProps {src:string;alt:string;priority?:boolean}

export function BlogHeroBanner({src,alt,priority=false}:BlogHeroBannerProps){
  // A photograph narrower than the banner keeps its own width, so it is never stretched.
  const cap = sourceWidthCap(src);
  return <figure className={cap ? 'interior-article-image lx-source-cap' : 'interior-article-image'} style={cap ? { maxWidth: cap } : undefined}><Image src={src} alt={alt} fill priority={priority} sizes={cap ? `(max-width:700px) 100vw, ${cap}px` : '(max-width:700px) 100vw, 1260px'} className="object-cover"/></figure>;
}

export function HubHeroBanner({src,alt}:Omit<BlogHeroBannerProps,'priority'>){
  return <BlogHeroBanner src={src} alt={alt} priority/>;
}
