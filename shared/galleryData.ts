import { CITY_SERVICE_IMAGES } from "./cityServiceImages";
import { GALLERY_IMAGES } from "./siteImages";

export interface GalleryProject {
  serviceType: string;
  city: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  title: string;
  description: string;
}

const THIN_CITY_PROOF_SERVICES: { service: string; serviceType: string; label: string }[] = [
  { service: "kitchen-remodel", serviceType: "kitchen-remodel", label: "Kitchen" },
  { service: "bathroom-remodel", serviceType: "bathroom-remodel", label: "Bathroom" },
  { service: "whole-home-remodel", serviceType: "whole-home-remodel", label: "Whole-home" },
];

const CITY_DISPLAY: Record<string, string> = {
  kuna: "Kuna",
  star: "Star",
  middleton: "Middleton",
  caldwell: "Caldwell",
};

// Gallery photographs. Titles and descriptions are plain subject labels (owner,
// 19 November 2026: no qualifier wording in or beside a photograph). They must not
// claim a photograph is a completed customer job either.
export const GALLERY_PROJECTS: GalleryProject[] = [
  {
    serviceType: "kitchen-remodel",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.kitchen.before,
    afterImageUrl: GALLERY_IMAGES.kitchen.after,
    title: "A Kitchen Refresh Within the Existing Layout",
    description:
      "Compare warm oak cabinetry with a white shaker finish, quartz work surfaces, updated appliances and wood flooring. The window, doorway and working layout stay in place.",
  },
  {
    serviceType: "bathroom-remodel",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.bathroom.before,
    afterImageUrl: GALLERY_IMAGES.bathroom.after,
    title: "Primary Bathroom Renovation",
    description:
      "Tile, fixtures, storage, and a comfortable daily routine.",
  },
  {
    serviceType: "whole-home-remodel",
    city: "eagle",
    beforeImageUrl: GALLERY_IMAGES.wholeHome.before,
    afterImageUrl: GALLERY_IMAGES.wholeHome.after,
    title: "Whole-Home Remodel",
    description:
      "Coordinated finishes and connected living spaces.",
  },
  {
    serviceType: "room-addition",
    city: "nampa",
    beforeImageUrl: GALLERY_IMAGES.addition.before,
    afterImageUrl: GALLERY_IMAGES.addition.after,
    title: "Master Suite Addition",
    description:
      "A buildable layout depends on the existing home, site, and engineering.",
  },
  {
    serviceType: "basement-finish",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.basement.before,
    afterImageUrl: GALLERY_IMAGES.basement.after,
    title: "Basement Finish",
    description:
      "Comfortable living space, finishes, and lighting.",
  },
  {
    serviceType: "outdoor-living",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.outdoor.before,
    afterImageUrl: GALLERY_IMAGES.outdoor.after,
    title: "Outdoor Living Transformation",
    description:
      "Seating, shelter, and materials for time outside.",
  },
  {
    serviceType: "adu",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.aduBoise.before,
    afterImageUrl: GALLERY_IMAGES.aduBoise.after,
    title: "Detached ADU Build",
    description:
      "Detached living-space layouts and finishes.",
  },
  {
    serviceType: "aging-in-place",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.agingBoise.before,
    afterImageUrl: GALLERY_IMAGES.agingBoise.after,
    title: "Accessible Primary Bath",
    description:
      "Clearances and safety features require a property-specific assessment.",
  },
  {
    serviceType: "kitchen-remodel",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.kitchenMeridian.before,
    afterImageUrl: GALLERY_IMAGES.kitchenMeridian.after,
    title: "Meridian Kitchen Refresh",
    description:
      "Cabinetry, work surfaces, storage, and lighting.",
  },
  {
    serviceType: "kitchen-remodel",
    city: "eagle",
    beforeImageUrl: GALLERY_IMAGES.kitchenEagle.before,
    afterImageUrl: GALLERY_IMAGES.kitchenEagle.after,
    title: "Eagle Kitchen",
    description:
      "Cabinetry, work surfaces, storage, and lighting.",
  },
  {
    serviceType: "bathroom-remodel",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.hallBathBoise.before,
    afterImageUrl: GALLERY_IMAGES.hallBathBoise.after,
    title: "Hall Bath Shower Conversion",
    description:
      "Tile, fixtures, storage, and a comfortable daily routine.",
  },
  {
    serviceType: "bathroom-remodel",
    city: "nampa",
    beforeImageUrl: GALLERY_IMAGES.bathroomNampa.before,
    afterImageUrl: GALLERY_IMAGES.bathroomNampa.after,
    title: "Nampa Primary Bath Remodel",
    description:
      "Tile, fixtures, storage, and a comfortable daily routine.",
  },
  {
    serviceType: "whole-home-remodel",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.wholeHomeMeridian.before,
    afterImageUrl: GALLERY_IMAGES.wholeHomeMeridian.after,
    title: "Meridian Open Main Floor",
    description:
      "Coordinated finishes and connected living spaces.",
  },
  {
    serviceType: "room-addition",
    city: "eagle",
    beforeImageUrl: GALLERY_IMAGES.additionEagle.before,
    afterImageUrl: GALLERY_IMAGES.additionEagle.after,
    title: "Eagle Rear Addition",
    description:
      "A buildable layout depends on the existing home, site, and engineering.",
  },
  {
    serviceType: "room-addition",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.additionMeridian.before,
    afterImageUrl: GALLERY_IMAGES.additionMeridian.after,
    title: "Meridian Sunroom Bump-Out",
    description:
      "A buildable layout depends on the existing home, site, and engineering.",
  },
  {
    serviceType: "basement-finish",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.basementMeridian.before,
    afterImageUrl: GALLERY_IMAGES.basementMeridian.after,
    title: "Meridian Basement Media Room",
    description:
      "Comfortable living space, finishes, and lighting.",
  },
  {
    serviceType: "basement-finish",
    city: "nampa",
    beforeImageUrl: GALLERY_IMAGES.basementNampa.before,
    afterImageUrl: GALLERY_IMAGES.basementNampa.after,
    title: "Nampa Basement Finish",
    description:
      "Comfortable living space, finishes, and lighting.",
  },
  {
    serviceType: "outdoor-living",
    city: "eagle",
    beforeImageUrl: GALLERY_IMAGES.outdoorEagle.before,
    afterImageUrl: GALLERY_IMAGES.outdoorEagle.after,
    title: "Eagle Covered Patio",
    description:
      "Seating, shelter, and materials for time outside.",
  },
  {
    serviceType: "outdoor-living",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.outdoorMeridian.before,
    afterImageUrl: GALLERY_IMAGES.outdoorMeridian.after,
    title: "Meridian Outdoor Kitchen",
    description:
      "Seating, shelter, and materials for time outside.",
  },
  {
    serviceType: "aging-in-place",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.agingMeridian.before,
    afterImageUrl: GALLERY_IMAGES.agingMeridian.after,
    title: "Meridian Zero-Threshold Bath",
    description:
      "Clearances and safety features require a property-specific assessment.",
  },
];

/**
 * Return gallery projects that match a specific service + city, used to embed
 * local before/after proof on city x service landing pages.
 */
export function getGalleryProjectsFor(
  serviceSlug: string,
  citySlug: string,
): GalleryProject[] {
  const matched = GALLERY_PROJECTS.filter(
    (p) => p.serviceType === serviceSlug && p.city === citySlug,
  );
  if (matched.length > 0) return matched;

  const cityName = CITY_DISPLAY[citySlug];
  const proofService = THIN_CITY_PROOF_SERVICES.find(
    (entry) => entry.service === serviceSlug || entry.serviceType === serviceSlug,
  );
  if (!cityName || !proofService) return matched;

  const src = CITY_SERVICE_IMAGES[`${proofService.service}/${citySlug}`];
  if (!src) return matched;

  return [
    {
      serviceType: proofService.serviceType,
      city: citySlug,
      beforeImageUrl: src,
      afterImageUrl: src,
      title: `${cityName} ${proofService.label}`,
      description: `${proofService.label} layout and finish options for ${cityName} homes.`,
    },
  ];
}

/** Return all gallery projects for a city (any service). Used on area pages. */
export function getGalleryProjectsForCity(citySlug: string): GalleryProject[] {
  const matched = GALLERY_PROJECTS.filter((p) => p.city === citySlug);
  if (matched.length > 0) return matched;

  // Thin cities without dedicated before/after pairs still get city-service
  // stills so area pages are not text-only after the hero/breather/process.
  const cityName = CITY_DISPLAY[citySlug];
  if (!cityName) return matched;

  return THIN_CITY_PROOF_SERVICES.flatMap(({ service, serviceType, label }) => {
    const src = CITY_SERVICE_IMAGES[`${service}/${citySlug}`];
    if (!src) return [];
    return [
      {
        serviceType,
        city: citySlug,
        beforeImageUrl: src,
        afterImageUrl: src,
        title: `${cityName} ${label}`,
        description: `${label} layout and finish options for ${cityName} homes.`,
      },
    ];
  });
}

/** Map service hub slugs to gallery serviceType values. */
const SERVICE_GALLERY_SLUG: Record<string, string> = {
  "kitchen-remodel": "kitchen-remodel",
  "bathroom-remodel": "bathroom-remodel",
  "whole-home-remodel": "whole-home-remodel",
  "room-addition": "room-addition",
  "basement-remodel": "basement-finish",
  "outdoor-living": "outdoor-living",
  adu: "adu",
  "aging-in-place": "aging-in-place",
};

/** Primary gallery project for a service hub page, if one exists. */
export function getFeaturedGalleryProject(serviceSlug: string): GalleryProject | undefined {
  const galleryType = SERVICE_GALLERY_SLUG[serviceSlug];
  if (!galleryType) return undefined;
  return (
    GALLERY_PROJECTS.find((p) => p.serviceType === galleryType) ??
    GALLERY_PROJECTS.find((p) => p.serviceType === serviceSlug)
  );
}
