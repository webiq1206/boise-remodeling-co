import Image from 'next/image';

interface BlogHeroBannerProps {src:string;alt:string;priority?:boolean}

export function BlogHeroBanner({src,alt,priority=false}:BlogHeroBannerProps){
  return <figure className="interior-article-image"><Image src={src} alt={alt} fill priority={priority} sizes="(max-width:700px) 88vw, 1260px" className="object-cover"/></figure>;
}

export function HubHeroBanner({src,alt}:Omit<BlogHeroBannerProps,'priority'>){
  return <BlogHeroBanner src={src} alt={alt} priority/>;
}
