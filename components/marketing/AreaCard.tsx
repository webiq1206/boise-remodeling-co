import Image from "next/image";
import Link from "next/link";
import { MarketingCard } from "./MarketingCard";
import { TextLink } from "./TextLink";
import { Chip } from "./Chip";
import type { CityData } from "@/shared/contentData";
import { getCountyLabel } from "@/shared/contentData";
import { areaPath } from "@/lib/seo-routes";

export interface AreaCardProps {
  city: CityData;
  imageSrc: string;
}

export function AreaCard({ city, imageSrc }: AreaCardProps) {
  const href = areaPath(city.slug);
  const countyLabel = getCountyLabel(city.county);
  const title = `${city.name}, Idaho`;
  const description = `Design-build remodeling in ${city.name} and ${countyLabel}.`;

  return (
    <MarketingCard className="h-full flex flex-col p-0 overflow-hidden hover-elevate group relative">
      <Link href={href} className="absolute inset-0 z-0" aria-label={`View ${city.name} remodeling services`} />
      <div className="relative aspect-[4/3] overflow-hidden">
        <Image
          src={imageSrc}
          alt={`Remodeling in ${city.name}, Idaho`}
          fill
          sizes="(max-width: 640px) 100vw, 50vw"
          className="object-cover img-brand-grade transition-transform duration-300 ease-out group-hover:scale-[1.02]"
        />
      </div>
      <div className="p-6 md:p-8 flex flex-col flex-1">
        <div className="mb-3">
          <Chip>{countyLabel}</Chip>
        </div>
        <h2 className="text-lg font-serif tracking-tight text-foreground line-clamp-2 mb-2">
          {title}
        </h2>
        <p className="text-sm text-muted-foreground line-clamp-2 flex-1 leading-relaxed">
          {description}
        </p>
        <TextLink href={href} className="mt-4 relative z-10" showArrow>
          View {city.name} services
        </TextLink>
      </div>
    </MarketingCard>
  );
}
