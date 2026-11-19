'use client';

/**
 * Secondary paragraphs behind "Read more" on phones. A native <details>, so
 * every word stays in the HTML for search and assistive technology. From
 * tablet up it is always open and the summary is hidden, so wider screens read
 * exactly as before.
 */
import { useEffect, useRef, type ReactNode } from 'react';

const WIDE = '(min-width: 701px)';

export function ReadMore({ children, label = 'Read more' }: { children: ReactNode; label?: string }) {
  const ref = useRef<HTMLDetailsElement>(null);

  useEffect(() => {
    const details = ref.current;
    if (!details || typeof window.matchMedia !== 'function') return;
    const query = window.matchMedia(WIDE);
    const sync = () => {
      if (query.matches) details.open = true;
    };
    sync();
    query.addEventListener('change', sync);
    return () => query.removeEventListener('change', sync);
  }, []);

  return (
    <details ref={ref} className="lx-more">
      <summary>{label}</summary>
      {children}
    </details>
  );
}
