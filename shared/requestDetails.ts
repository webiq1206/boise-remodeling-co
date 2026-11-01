/**
 * Step 2 of the short request: "Help us prepare (optional)", offered on the success screen.
 * Client and server read the same option lists, so a value the panel can send is a value the
 * details endpoint accepts.
 */

/** Stored and forwarded as these labels; each one is a key p5IntakeBridge already maps for HubSpot. */
export const DETAIL_PROJECT_TYPES = [
  { value: "Kitchen remodel", label: "Kitchen" },
  { value: "Bathroom remodel", label: "Bathroom" },
  { value: "Whole-home remodel", label: "Whole home" },
  { value: "Basement finishing", label: "Basement" },
  { value: "Home addition", label: "Addition" },
  { value: "Something else", label: "Something else" },
] as const;

export const DETAIL_TIMINGS = ["Soon", "1 to 3 months", "3 to 6 months", "Just planning"] as const;

export type DetailProjectType = (typeof DETAIL_PROJECT_TYPES)[number]["value"];
export type DetailTiming = (typeof DETAIL_TIMINGS)[number];

/** What step 1 files a short request under before step 2 can say more. */
export const SHORT_REQUEST_PROJECT_TYPE = "Home repair or remodel";
export const CALLBACK_PROJECT_TYPE = "Callback request";
/** What the p5 intake gets for a short request until step 2 names the project. */
export const UNSPECIFIED_PROJECT_TYPE = "Not sure";

/** Placeholders a step 2 project type may replace. Anything else came from the visitor. */
export const REPLACEABLE_PROJECT_TYPES = new Set<string>([
  "",
  SHORT_REQUEST_PROJECT_TYPE,
  CALLBACK_PROJECT_TYPE,
  UNSPECIFIED_PROJECT_TYPE,
]);

export interface RequestDetailsFields {
  projectType?: string;
  /** Street address, or just a ZIP code. */
  address?: string;
  timing?: string;
  /** Only asked when step 1 had none. */
  email?: string;
}

export interface RequestFileRecord {
  key: string;
  name: string;
  url: string;
  contentType: string;
  size: number;
}

/** Pulls a 5-digit ZIP out of whatever was typed in the address field. */
export function zipFrom(value: string): string {
  return value.match(/\b(\d{5})(?:-\d{4})?\b(?!.*\b\d{5}\b)/)?.[1] ?? "";
}
