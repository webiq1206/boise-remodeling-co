/**
 * Sentence case for headings that are stored in title case (blog and guide
 * titles, hub names, service names inside city H1s). The house style is
 * sentence case; the stored titles stay as they are because they also feed
 * <title>, schema and cards, so only the rendered H1 is converted. The words
 * themselves never change, only their capitals.
 *
 * Kept as written: proper nouns (places, the business name), acronyms (ADU,
 * ROI) and the first word of the heading and of each clause after a colon,
 * question mark or exclamation mark.
 */

/** Multi-word proper nouns, longest first so "Boise Bench" wins over "Boise". */
const PROPER_PHRASES = [
  'Boise Remodeling Co',
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
  'Ada', 'Canyon', 'I',
]);

function isAcronym(word: string): boolean {
  const letters = word.replace(/[^A-Za-z]/g, '');
  return letters.length >= 2 && letters === letters.toUpperCase();
}

function lowerWord(word: string): string {
  if (PROPER_WORDS.has(word.replace(/[^A-Za-z]/g, '')) || isAcronym(word)) return word;
  // Hyphenated words lower each part unless that part is proper or an acronym.
  return word
    .split('-')
    .map((part) => (PROPER_WORDS.has(part.replace(/[^A-Za-z]/g, '')) || isAcronym(part) ? part : part.toLowerCase()))
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
    // A clause ends at ":", "?" or "!" (not at "vs." or "St.").
    startOfClause = /[:?!]["')\]]*$/.test(token);
    return result;
  });
  return out
    .join('')
    .replace(/\u0000(\d+)\u0000/g, (_, n: string) => kept[Number(n)]);
}
