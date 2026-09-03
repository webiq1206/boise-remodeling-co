import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";

export interface ArticleFaqItem {
  question: string;
  answer: string;
}

/**
 * The end-of-article FAQ accordion shared by blog posts and guides. Was
 * previously copy-pasted between BlogPostLayout and GuidePageLayout; one
 * source keeps question/answer styling identical everywhere.
 *
 * Answers render in full foreground at reading size (not text-sm muted) -
 * they are content a reader came for, not supporting chrome.
 */
export function ArticleFaqs({
  faqs,
  testId = "article-faqs",
}: {
  faqs: ArticleFaqItem[];
  testId?: string;
}) {
  if (faqs.length === 0) return null;
  return (
    <section className="mt-12 pt-8 border-t border-border" data-testid={testId}>
      <p className="text-xs font-normal uppercase tracking-wider text-muted-foreground mb-3">
        Common questions
      </p>
      <h2 className="text-xl md:text-2xl font-serif tracking-tight text-foreground mb-6">
        Frequently asked questions
      </h2>
      <Accordion type="single" collapsible className="w-full">
        {faqs.map((faq, i) => (
          <AccordionItem
            key={faq.question}
            value={`faq-${i}`}
            className="border-0 border-t border-border"
          >
            <AccordionTrigger className="text-left py-5 hover:no-underline font-sans font-normal text-body text-foreground">
              {faq.question}
            </AccordionTrigger>
            <AccordionContent className="text-body leading-relaxed pb-6 text-foreground/90">
              {faq.answer}
            </AccordionContent>
          </AccordionItem>
        ))}
      </Accordion>
    </section>
  );
}
