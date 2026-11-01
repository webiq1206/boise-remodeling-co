/**
 * Sentence case for headings that are stored in title case (blog and guide
 * titles, hub names, service names, project titles). The house style is
 * sentence case for every heading on the site (owner decision C, 1 November
 * 2026); the stored titles stay as they are because they also feed <title>,
 * schema and link text, so only the rendered heading is converted. The words
 * themselves never change, only their capitals.
 *
 * Kept as written: proper nouns (places, the business name), acronyms (ADU,
 * ROI) and the first word of the heading and of each clause after a colon,
 * question mark or exclamation mark.
 */

/** Multi-word proper nouns, longest first so "Boise Bench" wins over "Boise". */
const PROPER_PHRASES = [
  'Boise Remodeling Co',
  'Boise Construction Co',
  'Boise Cabinet Co',
  'Boise Handyman Co',
  'Nick Perkins',
  'Warm Springs',
  'Garden City',
  'Treasure Valley',
  'Canyon County',
  'Ada County',
  'North End',
  'Harris Ranch',
  'East Boise',
  'Hidden Springs',
  'Boise Bench',
  'Eagle Foothills',
  'P5 Home Co',
].sort((a, b) => b.length - a.length);

const PROPER_WORDS = new Set([
  'Boise', 'Idaho', 'Meridian', 'Eagle', 'Nampa', 'Kuna', 'Star', 'Middleton', 'Caldwell',
  'Ada', 'Canyon', 'I', 'Medicare', 'Medicaid',
]);

/** Letters of a word for the proper-noun check, without a possessive ("Idaho's"). */
function letters(word: string): string {
  return word.replace(/['’]s$/i, '').replace(/[^A-Za-z]/g, '');
}

function isAcronym(word: string): boolean {
  // "ADU", "ROI", and plurals such as "ADUs".
  return /^[A-Z]{2,}s?$/.test(word.replace(/[^A-Za-z]/g, ''));
}

function lowerWord(word: string): string {
  if (PROPER_WORDS.has(letters(word)) || isAcronym(word)) return word;
  // Hyphenated words lower each part unless that part is proper, an acronym or
  // a single shape letter ("L-shaped", "U-shaped").
  const parts = word.split('-');
  return parts
    .map((part, i) => {
      const bare = letters(part);
      if (PROPER_WORDS.has(bare) || isAcronym(part)) return part;
      if (bare.length === 1 && i < parts.length - 1 && part === part.toUpperCase()) return part;
      return part.toLowerCase();
    })
    .join('-');
}

function capitalise(word: string): string {
  const i = word.search(/[A-Za-z]/);
  return i < 0 ? word : word.slice(0, i) + word[i].toUpperCase() + word.slice(i + 1);
}

export function toSentenceCase(text: string): string {
  // Protect proper phrases with placeholders so their inner words keep capitals.
  const kept: string[] = [];
  let working = text;
  for (const phrase of PROPER_PHRASES) {
    const index = kept.push(phrase) - 1;
    // Whole words only: "Boise Remodeling Co" must not match "Boise Remodeling Cost".
    working = working.replace(new RegExp(`\\b${phrase}\\b`, 'g'), `\u0000${index}\u0000`);
  }
  const tokens = working.split(/(\s+)/);
  let startOfClause = true;
  const out = tokens.map((token) => {
    if (/^\s+$/.test(token) || token === '') return token;
    let result: string;
    if (token.includes('\u0000')) {
      result = token;
    } else if (startOfClause) {
      result = capitalise(lowerWord(token));
    } else {
      result = lowerWord(token);
    }
    // A clause ends at ":", "?" or "!" (not at "vs." or "St."). A list number
    // ("2.", "3)") does not start the clause, so "2. Build" keeps its capital B.
    startOfClause = /[:?!]["')\]]*$/.test(token) || (startOfClause && /^\d+[.)]$/.test(token));
    return result;
  });
  return out
    .join('')
    .replace(/\u0000(\d+)\u0000/g, (_, n: string) => kept[Number(n)]);
}
