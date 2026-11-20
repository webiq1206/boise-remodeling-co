/** Reusable HTML snippets for Treasure Valley long-form content */

export const CITIES_LIST =
  'Boise, Meridian, Eagle, Garden City, Nampa, Kuna, Star, Middleton, and Caldwell';

export const PILLAR_COST = '/guides/boise-remodeling-cost-guide';
export const PILLAR_TV = '/guides/treasure-valley-remodeling-guide';
export const PILLAR_BOISE = '/guides/boise-remodeling-guide';

export function svc(path: string, label?: string): string {
  return `<a href="${path}">${label ?? path.split('/').pop()?.replace(/-/g, ' ') ?? path}</a>`;
}

export interface ContentSubAnswer {
  /** Rendered as an H4 sub-answer heading so answer engines can lift the passage. */
  h4: string;
  text: string;
}

export interface ContentSubsection {
  /** Rendered as an H3 under the section H2. */
  h3: string;
  paragraphs?: string[];
  list?: string[];
  /** Optional H4 sub-answers nested under the H3. */
  subAnswers?: ContentSubAnswer[];
}

export interface ContentSection {
  h2: string;
  paragraphs: string[];
  list?: string[];
  table?: { headers: string[]; rows: string[][]; className?: string };
  /** Deeper H3/H4 subheads for AEO sub-answer chunking. */
  subsections?: ContentSubsection[];
}

export function buildSectionsHtml(sections: ContentSection[]): string {
  return sections
    .map((s) => {
      let block = `<h2>${s.h2}</h2>`;
      for (const p of s.paragraphs) {
        block += `<p>${p}</p>`;
      }
      if (s.list?.length) {
        // A list of bare links is a link list: it gets 44px rows on touch widths (SEO audit REM-T9).
        const linkList = s.list.every((li) => /^<a\s[^>]*>[^<]*<\/a>$/.test(li.trim()));
        block += `<ul${linkList ? ' class="lx-link-list"' : ''}>${s.list.map((li) => `<li>${li}</li>`).join('')}</ul>`;
      }
      if (s.table) {
        const cls = s.table.className ?? 'cost-table';
        block += `<table class="${cls}"><thead><tr>${s.table.headers
          .map((h) => `<th>${h}</th>`)
          .join('')}</tr></thead><tbody>${s.table.rows
          .map(
            (row) =>
              `<tr>${row.map((cell) => `<td>${cell}</td>`).join('')}</tr>`,
          )
          .join('')}</tbody></table>`;
      }
      if (s.subsections?.length) {
        for (const sub of s.subsections) {
          block += `<h3>${sub.h3}</h3>`;
          for (const p of sub.paragraphs ?? []) {
            block += `<p>${p}</p>`;
          }
          if (sub.list?.length) {
            block += `<ul>${sub.list.map((li) => `<li>${li}</li>`).join('')}</ul>`;
          }
          for (const sa of sub.subAnswers ?? []) {
            block += `<h4>${sa.h4}</h4><p>${sa.text}</p>`;
          }
        }
      }
      return block;
    })
    .join('\n');
}
