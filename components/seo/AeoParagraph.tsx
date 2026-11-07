import Link from 'next/link';

/** Plain answer under an H1. No card, no extra heading. */
export function AeoParagraph({ text, tone = 'plain' }: { text: string; tone?: 'plain' | 'inverse' }) {
  const toneClass =
    tone === 'inverse'
      ? 'text-inverse-foreground/90'
      : 'text-foreground';
  return (
    <p className={`aeo-paragraph mt-6 mb-6 max-w-2xl text-base md:text-lg leading-relaxed ${toneClass}`} data-aeo="answer">
      {text}
    </p>
  );
}

/** Hub pages point the shared head term at the homepage with this exact anchor. */
export function ContractorHubLink({ tone = 'plain' }: { tone?: 'plain' | 'inverse' }) {
  const toneClass = tone === 'inverse' ? 'text-inverse-foreground/90' : 'text-foreground';
  return (
    <p className={`mt-4 mb-2 max-w-2xl text-base leading-relaxed ${toneClass}`}>
      <Link href="/" className="underline underline-offset-2">
        Boise remodeling contractors
      </Link>
      {' '}plan kitchens, baths and whole-home remodels with a written scope before any price.
    </p>
  );
}
