"use client";

import { useState } from "react";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Section } from "@/components/marketing/Section";
import { SectionHeader } from "@/components/marketing/SectionHeader";
import { Button } from "@/components/ui/button";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { ConsultCTA } from "@/components/modals/ConsultCTA";
import { CTA_PRIMARY, CTA_SECONDARY } from "@/shared/ctaCopy";
import { HOMEPAGE_FAQS } from "@/shared/homepageFaqs";

export { HOMEPAGE_FAQS };

const INITIAL_FAQ_COUNT = 8;

export function FAQSection() {
  const [showAll, setShowAll] = useState(false);
  const visibleFaqs = showAll ? HOMEPAGE_FAQS : HOMEPAGE_FAQS.slice(0, INITIAL_FAQ_COUNT);

  return (
    <Section id="faq" divider>
      <div className="container px-4">
        <div className="max-w-3xl mx-auto">
          <SectionHeader
            eyebrow="Common questions"
            size="display"
            title={
              <>
                Straight answers to the questions that{" "}
                <em className="brc-accent">matter</em>
              </>
            }
            className="mb-10"
          />
          <Accordion type="single" collapsible className="w-full">
            {visibleFaqs.map((faq, i) => (
              <AccordionItem
                key={i}
                value={`faq-${i}`}
                className="border-0 border-t border-border"
              >
                <AccordionTrigger className="text-left py-5 hover:no-underline font-sans font-normal text-sm text-foreground">
                  {faq.q}
                </AccordionTrigger>
                <AccordionContent className="text-sm leading-relaxed pb-6 text-muted-foreground">
                  {faq.a}
                </AccordionContent>
              </AccordionItem>
            ))}
          </Accordion>
          {!showAll && HOMEPAGE_FAQS.length > INITIAL_FAQ_COUNT && (
            <div className="mt-6 text-center">
              <Button
                variant="brandOutline"
                type="button"
                onClick={() => setShowAll(true)}
              >
                Show all {HOMEPAGE_FAQS.length} questions
              </Button>
            </div>
          )}
          <div className="mt-10 flex flex-wrap gap-3 justify-center">
            <EstimateCTA variant="brand">{CTA_PRIMARY}</EstimateCTA>
            <ConsultCTA variant="brandOutline">{CTA_SECONDARY}</ConsultCTA>
          </div>
        </div>
      </div>
    </Section>
  );
}
