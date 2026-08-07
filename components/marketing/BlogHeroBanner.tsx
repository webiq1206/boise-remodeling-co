import Image from "next/image";
import { GRAIN_URL } from "@/lib/grain";

interface BlogHeroBannerProps {
  src: string;
  alt: string;
  priority?: boolean;
}

export function BlogHeroBanner({ src, alt, priority = false }: BlogHeroBannerProps) {
  return (
    <div className="relative h-56 md:h-72 overflow-hidden bg-inverse">
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        sizes="100vw"
        className="object-cover opacity-[0.82] img-brand-grade"
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-inverse/80 via-inverse/40 to-transparent" />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-r from-inverse/50 via-inverse/10 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-24 pointer-events-none bg-gradient-to-t from-background via-background/40 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRAIN_URL, backgroundRepeat: "repeat", opacity: 0.03 }}
      />
    </div>
  );
}

interface HubHeroBannerProps {
  src: string;
  alt: string;
}

export function HubHeroBanner({ src, alt }: HubHeroBannerProps) {
  return (
    <div className="relative h-48 md:h-64 overflow-hidden bg-inverse mb-10 rounded-sm">
      <Image
        src={src}
        alt={alt}
        fill
        loading="lazy"
        sizes="(max-width: 768px) 100vw, 896px"
        className="object-cover opacity-[0.82] img-brand-grade"
      />
      <div className="absolute inset-0 pointer-events-none bg-gradient-to-t from-inverse/80 via-inverse/30 to-transparent" />
      <div className="absolute inset-x-0 bottom-0 h-16 pointer-events-none bg-gradient-to-t from-background via-background/50 to-transparent" />
      <div
        className="absolute inset-0 pointer-events-none"
        style={{ backgroundImage: GRAIN_URL, backgroundRepeat: "repeat", opacity: 0.03 }}
      />
    </div>
  );
}
