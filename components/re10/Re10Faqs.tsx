"use client";

import { useState } from "react";
import { RegistrationText } from "@/components/RegistrationLink";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Section } from "@/components/marketing/Section";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { Button } from "@/components/ui/button";
import { RE10_FAQS } from "@/shared/content/re10Content";

/**
 * The RE-10 FAQ.
 *
 * Only the collapse behavior is client-side. Every question and answer is
 * rendered server-side inside the accordion, so an AI crawler that does not
 * execute JavaScript still reads all seventeen answers in the raw HTML - which
 * is the whole point of writing them to stand alone. The same array feeds the
 * FAQPage JSON-LD on the page, so the schema cannot drift from what is visible.
 */
const INITIAL_COUNT = 8;

export function Re10Faqs() {
  const [showAll, setShowAll] = useState(false);

  return (
    <Section id="faq" divider>
      <div className="container px-4">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Common questions"
            size="display"
            title={
              <>
                What agents ask before sending us the{" "}
                <em className="brc-accent">first one</em>
              </>
            }
            className="mb-10"
          />
          <Accordion type="single" collapsible className="w-full">
            {RE10_FAQS.map((faq, i) => (
              <AccordionItem
                key={faq.question}
                value={`re10-faq-${i}`}
                className={
                  "border-0 border-t border-border" +
                  // Hidden with CSS rather than unmounted, so the answers stay
                  // in the server-rendered HTML for crawlers and for search.
                  (!showAll && i >= INITIAL_COUNT ? " hidden" : "")
                }
              >
                <AccordionTrigger className="text-left text-base font-normal text-foreground hover:no-underline py-5">
                  {faq.question}
                </AccordionTrigger>
                <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-5">
                  <RegistrationText text={faq.answer} />
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>

          {!showAll && RE10_FAQS.length > INITIAL_COUNT && (
            <div className="mt-8 text-center">
              <Button
                variant="brandOutline"
                onClick={() => setShowAll(true)}
                data-testid="button-re10-more-faqs"
              >
                Show all {RE10_FAQS.length} questions
              </Button>
            </div>
          )}
        </div>
      </div>
    </Section>
  );
}
