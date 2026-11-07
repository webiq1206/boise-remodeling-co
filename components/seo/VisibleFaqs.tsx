import { Section } from '@/components/marketing/Section';
import type { VisibilityFaq } from '@/shared/content/p5Visibility';
import { FaqAnswer } from './FaqAnswer';

/** Open questions, so the visible answer text is the same string as FAQPage JSON-LD. */
export function VisibleFaqs({ faqs, heading }: { faqs: VisibilityFaq[]; heading: string }) {
  return (
    <Section surface="bone" spacing="xl" edge>
      <div className="ed-shell">
        <h2 className="ed-h2 ed-statement mb-8">{heading}</h2>
        <div className="max-w-3xl border-t" style={{ borderColor: 'var(--ed-line)' }}>
          {faqs.map((faq) => (
            <div key={faq.question} className="border-b py-6" style={{ borderColor: 'var(--ed-line)' }}>
              <h3 className="ed-h4 text-left">{faq.question}</h3>
              <p className="ed-body mt-3 text-[0.9375rem]">
                <FaqAnswer text={faq.answer} />
              </p>
            </div>
          ))}
        </div>
      </div>
    </Section>
  );
}
