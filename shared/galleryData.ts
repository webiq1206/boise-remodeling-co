import { CITY_SERVICE_IMAGES } from "./cityServiceImages";
import { GALLERY_IMAGES } from "./siteImages";
import { isSameImage } from "./imageIdentity";
import { contentImageAlt, imageDescription } from "./contentImageAlt";
import { SUBJECT_ALTERNATES } from "./landingImages";
import { subjectForService } from "./localAlt";

export interface GalleryProject {
  serviceType: string;
  city: string;
  beforeImageUrl: string;
  afterImageUrl: string;
  title: string;
  description: string;
  /** Alt for a single photograph shown in place of a pair; gallery projects derive theirs from the title. */
  imageAlt?: string;
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

/** Gallery photographs never featured on a service hub: this one still shows a bowl and a plant. */
const NOT_FEATURED = new Set(["/images/gallery/gallery-kitchen-eagle-after.webp"]);

/**
 * Gallery project for a service hub page, if one exists. `avoid` holds the pictures
 * the page already shows (its hero and room photographs): the first project of the
 * service whose pictures are not among them is featured, so the "closer look" never
 * repeats the hero. Until 20 November 2026 every hub featured its first project,
 * whose picture was the hero's own render on all eight pages.
 */
export function getFeaturedGalleryProject(
  serviceSlug: string,
  avoid: readonly (string | undefined)[] = [],
): GalleryProject | undefined {
  const galleryType = SERVICE_GALLERY_SLUG[serviceSlug];
  if (!galleryType) return undefined;
  const taken = (src: string) => avoid.some((a) => isSameImage(a, src));
  const project = GALLERY_PROJECTS.filter((p) => p.serviceType === galleryType || p.serviceType === serviceSlug).find(
    (p) => !NOT_FEATURED.has(p.afterImageUrl) && ![p.afterImageUrl, p.beforeImageUrl].some(taken),
  );
  if (project) return project;
  // Every gallery picture of this service is already on the page (the gallery
  // renders are the hero's own render on all eight hubs). Show one other real
  // photograph of the work instead, labelled by subject and described by what it
  // shows: never as a before and after, and never as a customer's finished job.
  const photo = [
    ...CITY_SLUGS_IN_ORDER.map((city) => CITY_SERVICE_IMAGES[`${serviceSlug}/${city}`]),
    ...(SUBJECT_ALTERNATES[serviceSlug] ?? []),
  ].find((src): src is string => Boolean(src)
    && !NOT_FEATURED.has(src)
    && !/-before\.webp$/.test(src)
    && imageDescription(src, "") !== ""
    && !taken(src));
  if (!photo) return undefined;
  const subject = subjectForService(serviceSlug);
  return {
    serviceType: galleryType,
    city: "boise",
    beforeImageUrl: "",
    afterImageUrl: photo,
    title: subject ? subject.charAt(0).toUpperCase() + subject.slice(1) : "Home remodeling",
    description: `${imageDescription(photo)}.`,
    imageAlt: contentImageAlt(photo, undefined, { subject }),
  };
}

const CITY_SLUGS_IN_ORDER = ["boise", "meridian", "eagle", "nampa", "kuna", "star", "middleton", "caldwell"] as const;
