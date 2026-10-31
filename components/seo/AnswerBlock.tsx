import { Section } from '@/components/marketing';

/**
 * A 40 to 60 word direct answer, placed right after a page's hero so the
 * question the page exists for is answered before any preamble (phase 4,
 * answer-engine extraction). Server rendered; the paragraph carries
 * data-speakable for the Speakable schema.
 */
export function AnswerBlock({ question, answer, id = 'short-answer' }: { question: string; answer: string; id?: string }) {
  return (
    <Section surface="bone" spacing="lg" edge>
      <div className="ed-shell">
        <div className="ed-split ed-split-narrow">
          <div>
            <p className="ed-eyebrow">The short answer</p>
            <h2 id={id} className="ed-h2-sm ed-statement">{question}</h2>
          </div>
          <p className="ed-lede" data-speakable="answer">{answer}</p>
        </div>
      </div>
    </Section>
  );
}
