import type { ReactNode } from 'react';

/** Keep the last two words of a heading on one line so a phone does not leave a single word. */
export function NoOrphan({ text }: { text: string }): ReactNode {
  const words = text.trim().split(/\s+/);
  if (words.length < 3) return text;
  const last = words.pop() as string;
  const prev = words.pop() as string;
  return (
    <>
      {words.join(' ')} <span className="m-keep">{prev} {last}</span>
    </>
  );
}

/** Same idea for a heading that is already an HTML string. */
export function glueHeadingHtml(html: string): string {
  return html.replace(/(<h[1-6][^>]*>)([\s\S]*?)(<\/h[1-6]>)/gi, (_match, open: string, inner: string, close: string) => {
    if (/<[^>]+>/.test(inner)) return open + inner + close;
    const words = inner.trim().split(/\s+/);
    if (words.length < 3) return open + inner + close;
    const last = words.pop();
    const prev = words.pop();
    return `${open}${words.join(' ')} <span class="m-keep">${prev} ${last}</span>${close}`;
  });
}
