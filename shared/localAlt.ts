/**
 * Local search wording for image descriptions (owner, 19 November 2026: every
 * image on every page carries an alt that names the work and the place).
 *
 * The form is "<work> in <city>, Idaho: <what the picture shows>". The part
 * after the colon stays a plain account of what is in the frame, for screen
 * readers. Owner direction, same day: no qualifier such as "idea", "concept"
 * or "representative" in or beside an image description.
 */

export interface LocalAltContext {
  /** The work the page is about: "kitchen remodel", "bathroom remodel". Defaults to "remodeling". */
  subject?: string;
  /** City name without the state. Defaults to Boise, the primary city. */
  city?: string;
}

const CITY_NAMES = ['Boise', 'Meridian', 'Eagle', 'Garden City', 'Nampa', 'Kuna', 'Star', 'Middleton', 'Caldwell'];

const SUBJECT_BY_SLUG: Record<string, string> = {
  'kitchen-remodel': 'kitchen remodel',
  'bathroom-remodel': 'bathroom remodel',
  'whole-home-remodel': 'whole-home remodel',
  'room-addition': 'room addition',
  adu: 'ADU and guest house',
  'basement-remodel': 'basement remodel',
  'outdoor-living': 'outdoor living',
  'aging-in-place': 'aging-in-place remodel',
};

/** "kitchen-remodel" to "kitchen remodel"; anything else is returned as given. */
export function subjectForService(slugOrNoun: string | undefined): string | undefined {
  if (!slugOrNoun) return undefined;
  return SUBJECT_BY_SLUG[slugOrNoun] ?? slugOrNoun;
}

function capitalise(text: string): string {
  return text.charAt(0).toUpperCase() + text.slice(1);
}

/** Lower the first letter unless the description opens with a name or an acronym. */
function lowerFirst(text: string): string {
  const first = text.split(/\s+/)[0] ?? '';
  if (/^[A-Z]{2,}/.test(first) || CITY_NAMES.includes(first.replace(/[^A-Za-z]/g, '')) || /^(P5|Idaho|Treasure|Ada|Canyon|North|Harris)\b/.test(text)) return text;
  return text.charAt(0).toLowerCase() + text.slice(1);
}

export function localAlt(description: string, context: LocalAltContext = {}): string {
  const text = description.trim().replace(/\.$/, '');
  if (!text) return '';
  if (/\bIdaho\b/.test(text)) return text;
  const subject = capitalise((context.subject ?? 'home remodeling').trim());
  const city = (context.city ?? 'Boise').replace(/,\s*Idaho$/i, '').trim();
  return `${subject} in ${city}, Idaho: ${lowerFirst(text)}`;
}

/** The city a tag list names, if any ("kuna" to "Kuna"). */
export function cityFromTags(tags: readonly string[] | undefined): string | undefined {
  if (!tags) return undefined;
  for (const tag of tags) {
    const match = CITY_NAMES.find((name) => name.toLowerCase() === tag.toLowerCase());
    if (match) return match;
  }
  return undefined;
}

const SUBJECT_BY_TAG: Record<string, string> = {
  kitchen: 'kitchen remodel',
  bathroom: 'bathroom remodel',
  bath: 'bathroom remodel',
  basement: 'basement remodel',
  adu: 'ADU and guest house',
  addition: 'room addition',
  additions: 'room addition',
  outdoor: 'outdoor living',
  patio: 'outdoor living',
  'whole-home': 'whole-home remodel',
  'aging-in-place': 'aging-in-place remodel',
  accessibility: 'aging-in-place remodel',
};

export function subjectFromTags(tags: readonly string[] | undefined): string | undefined {
  if (!tags) return undefined;
  for (const tag of tags) {
    const subject = SUBJECT_BY_TAG[tag.toLowerCase()];
    if (subject) return subject;
  }
  return undefined;
}
