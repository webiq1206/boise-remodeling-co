import { GALLERY_IMAGES } from "./siteImages";

export interface GalleryProject {
  serviceType: string;
  city: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  title: string;
  description: string;
}

// Representative generated design assets. Only the first kitchen has a reviewed
// same-camera finish comparison. These are not completed customer projects.
export const GALLERY_PROJECTS: GalleryProject[] = [
  {
    serviceType: "kitchen-remodel",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.kitchen.before,
    afterImageUrl: GALLERY_IMAGES.kitchen.after,
    title: "A Kitchen Refresh Within the Existing Layout",
    description:
      "Compare warm oak cabinetry with a white shaker finish, quartz work surfaces, updated appliances and oak flooring. The window, doorway and working layout stay in place.",
  },
  {
    serviceType: "bathroom-remodel",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.bathroom.before,
    afterImageUrl: GALLERY_IMAGES.bathroom.after,
    title: "Primary Bathroom Renovation",
    description:
      "Bathroom design inspiration exploring tile, fixtures, storage, and a comfortable daily routine.",
  },
  {
    serviceType: "whole-home-remodel",
    city: "eagle",
    beforeImageUrl: GALLERY_IMAGES.wholeHome.before,
    afterImageUrl: GALLERY_IMAGES.wholeHome.after,
    title: "Whole-Home Remodel",
    description:
      "Whole-home design inspiration exploring coordinated finishes and connected living spaces.",
  },
  {
    serviceType: "room-addition",
    city: "nampa",
    beforeImageUrl: GALLERY_IMAGES.addition.before,
    afterImageUrl: GALLERY_IMAGES.addition.after,
    title: "Master Suite Addition",
    description:
      "Addition design inspiration. A buildable layout depends on the existing home, site, and engineering.",
  },
  {
    serviceType: "basement-finish",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.basement.before,
    afterImageUrl: GALLERY_IMAGES.basement.after,
    title: "Basement Finish",
    description:
      "Basement design inspiration exploring comfortable living space, finishes, and lighting.",
  },
  {
    serviceType: "outdoor-living",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.outdoor.before,
    afterImageUrl: GALLERY_IMAGES.outdoor.after,
    title: "Outdoor Living Transformation",
    description:
      "Outdoor living inspiration exploring seating, shelter, and materials for time outside.",
  },
  {
    serviceType: "adu",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.aduBoise.before,
    afterImageUrl: GALLERY_IMAGES.aduBoise.after,
    title: "Detached ADU Build",
    description:
      "Representative remodeling design inspiration, tailored to your home during design.",
  },
  {
    serviceType: "aging-in-place",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.agingBoise.before,
    afterImageUrl: GALLERY_IMAGES.agingBoise.after,
    title: "Accessible Primary Bath",
    description:
      "Accessible-home design inspiration. Clearances and safety features require a property-specific assessment.",
  },
  {
    serviceType: "kitchen-remodel",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.kitchenMeridian.before,
    afterImageUrl: GALLERY_IMAGES.kitchenMeridian.after,
    title: "Meridian Kitchen Refresh",
    description:
      "Kitchen design inspiration exploring cabinetry, work surfaces, storage, and lighting.",
  },
  {
    serviceType: "kitchen-remodel",
    city: "eagle",
    beforeImageUrl: GALLERY_IMAGES.kitchenEagle.before,
    afterImageUrl: GALLERY_IMAGES.kitchenEagle.after,
    title: "Eagle Foothills Kitchen",
    description:
      "Kitchen design inspiration exploring cabinetry, work surfaces, storage, and lighting.",
  },
  {
    serviceType: "bathroom-remodel",
    city: "boise",
    beforeImageUrl: GALLERY_IMAGES.hallBathBoise.before,
    afterImageUrl: GALLERY_IMAGES.hallBathBoise.after,
    title: "Hall Bath Shower Conversion",
    description:
      "Bathroom design inspiration exploring tile, fixtures, storage, and a comfortable daily routine.",
  },
  {
    serviceType: "bathroom-remodel",
    city: "nampa",
    beforeImageUrl: GALLERY_IMAGES.bathroomNampa.before,
    afterImageUrl: GALLERY_IMAGES.bathroomNampa.after,
    title: "Nampa Primary Bath Remodel",
    description:
      "Bathroom design inspiration exploring tile, fixtures, storage, and a comfortable daily routine.",
  },
  {
    serviceType: "whole-home-remodel",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.wholeHomeMeridian.before,
    afterImageUrl: GALLERY_IMAGES.wholeHomeMeridian.after,
    title: "Meridian Open Main Floor",
    description:
      "Whole-home design inspiration exploring coordinated finishes and connected living spaces.",
  },
  {
    serviceType: "room-addition",
    city: "eagle",
    beforeImageUrl: GALLERY_IMAGES.additionEagle.before,
    afterImageUrl: GALLERY_IMAGES.additionEagle.after,
    title: "Eagle Rear Addition",
    description:
      "Addition design inspiration. A buildable layout depends on the existing home, site, and engineering.",
  },
  {
    serviceType: "room-addition",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.additionMeridian.before,
    afterImageUrl: GALLERY_IMAGES.additionMeridian.after,
    title: "Meridian Sunroom Bump-Out",
    description:
      "Addition design inspiration. A buildable layout depends on the existing home, site, and engineering.",
  },
  {
    serviceType: "basement-finish",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.basementMeridian.before,
    afterImageUrl: GALLERY_IMAGES.basementMeridian.after,
    title: "Meridian Basement Media Room",
    description:
      "Basement design inspiration exploring comfortable living space, finishes, and lighting.",
  },
  {
    serviceType: "basement-finish",
    city: "nampa",
    beforeImageUrl: GALLERY_IMAGES.basementNampa.before,
    afterImageUrl: GALLERY_IMAGES.basementNampa.after,
    title: "Nampa Basement Finish",
    description:
      "Basement design inspiration exploring comfortable living space, finishes, and lighting.",
  },
  {
    serviceType: "outdoor-living",
    city: "eagle",
    beforeImageUrl: GALLERY_IMAGES.outdoorEagle.before,
    afterImageUrl: GALLERY_IMAGES.outdoorEagle.after,
    title: "Eagle Covered Patio",
    description:
      "Outdoor living inspiration exploring seating, shelter, and materials for time outside.",
  },
  {
    serviceType: "outdoor-living",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.outdoorMeridian.before,
    afterImageUrl: GALLERY_IMAGES.outdoorMeridian.after,
    title: "Meridian Outdoor Kitchen",
    description:
      "Outdoor living inspiration exploring seating, shelter, and materials for time outside.",
  },
  {
    serviceType: "aging-in-place",
    city: "meridian",
    beforeImageUrl: GALLERY_IMAGES.agingMeridian.before,
    afterImageUrl: GALLERY_IMAGES.agingMeridian.after,
    title: "Meridian Zero-Threshold Bath",
    description:
      "Accessible-home design inspiration. Clearances and safety features require a property-specific assessment.",
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
  return GALLERY_PROJECTS.filter(
    (p) => p.serviceType === serviceSlug && p.city === citySlug,
  );
}

/** Return all gallery projects for a city (any service). Used on area pages. */
export function getGalleryProjectsForCity(citySlug: string): GalleryProject[] {
  return GALLERY_PROJECTS.filter((p) => p.city === citySlug);
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
