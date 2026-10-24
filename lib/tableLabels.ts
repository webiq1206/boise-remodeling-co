/**
 * Phone tables: give every body cell a `data-label` taken from its column
 * header, so tables can stack into label/value rows on narrow screens
 * (see `.article-table-scroll` in app/design-refresh.css). The table markup
 * itself is unchanged, so rich results and the desktop layout keep working.
 *
 * Shared verbatim by the four Boise sites.
 */
const stripTags = (s: string) =>
  s
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

const escapeAttr = (s: string) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;');

export function labelTableCells(html: string): string {
  return html.replace(/<table\b[\s\S]*?<\/table>/gi, (table) => {
    const rows = table.match(/<tr\b[\s\S]*?<\/tr>/gi);
    if (!rows || rows.length < 2) return table;
    const headerRow = rows.find((r) => /<th\b/i.test(r));
    if (!headerRow) return table;
    const labels = (headerRow.match(/<th\b[\s\S]*?<\/th>/gi) || []).map(stripTags);
    if (labels.length < 2) return table;
    let out = table.replace(/<table\b/i, '<table data-stack="true"');
    for (const row of rows) {
      if (row === headerRow) continue;
      let col = 0;
      const labelled = row.replace(/<(td|th)\b([^>]*)>/gi, (tag, name: string, attrs: string) => {
        const label = labels[col++];
        if (!label || /\bdata-label=/i.test(attrs)) return tag;
        return `<${name}${attrs} data-label="${escapeAttr(label)}">`;
      });
      out = out.replace(row, labelled);
    }
    return out;
  });
}
