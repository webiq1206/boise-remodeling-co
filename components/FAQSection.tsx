"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Section } from "@/components/marketing/Section";
import { Button } from "@/components/ui/button";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/shared/ctaCopy";
import { HOMEPAGE_FAQS } from "@/shared/homepageFaqs";

export { HOMEPAGE_FAQS };

const INITIAL_FAQ_COUNT = 8;

/**
 * Common questions.
 *
 * WAS a centred heading over a single 768px accordion with 14px sans-serif
 * questions - a footnote where the page needs its last, best reassurance.
 *
 * NOW the parent site's FAQ arrangement: heading and intro in the left column,
 * the accordion in the right. Questions are set in the serif at h4 scale so
 * they read as questions a person asked, not as menu items, and the answer
 * opens beneath in body type. The accordion itself is unchanged - it already
 * handles keyboard and screen-reader behaviour correctly and there was no
 * reason to rebuild that.
 */
export function FAQSection() {
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? HOMEPAGE_FAQS : HOMEPAGE_FAQS.slice(0, INITIAL_FAQ_COUNT);

  return (
    <Section id="faq" surface="bone" spacing="xl" edge>
      <div className="ed-shell">
        <div className="ed-split ed-split-narrow">
          <div className="lg:sticky lg:top-28 lg:self-start">
            <p className="ed-eyebrow">Common questions</p>
            <h2 className="ed-h2 ed-statement">
              Straight answers to the questions that{" "}
              <em className="not-italic" style={{ color: "var(--ed-accent)" }}>
                matter
              </em>
            </h2>
            <div className="mt-10 flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:gap-4">
              <EstimateCTA variant="brand" className="w-full sm:w-auto">{CTA_PRIMARY}</EstimateCTA>
              <ConsultCTA variant="brandOutline" className="w-full sm:w-auto">{CTA_SECONDARY}</ConsultCTA>
            </div>
          </div>

          <div>
            <Accordion
              type="single"
              collapsible
              className="w-full border-t"
              style={{ borderColor: "var(--ed-line)" }}
            >
              {visibleFaqs.map((faq, i) => (
                <AccordionItem
                  key={i}
                  value={`faq-${i}`}
                  className="border-0 border-b"
                  style={{ borderColor: "var(--ed-line)" }}
                >
                  <AccordionTrigger className="ed-h4 py-6 text-left hover:no-underline [&[data-state=open]]:[color:var(--ed-accent)]">
                    {faq.q}
                  </AccordionTrigger>
                  <AccordionContent className="ed-body pb-7 text-[0.9375rem]">
                    {faq.a}
                  </AccordionContent>
                </AccordionItem>
              ))}
            </Accordion>
            {!showAll && HOMEPAGE_FAQS.length > INITIAL_FAQ_COUNT && (
              <div className="mt-8">
                <Button variant="brandOutline" type="button" onClick={() => setShowAll(true)}>
                  Show all {HOMEPAGE_FAQS.length} questions
                </Button>
              </div>
            )}
          </div>
        </div>
      </div>
    </Section>
  );
}
