"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { useMutation } from "@tanstack/react-query";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { Check, CheckCircle2, ArrowRight, Phone, Plus, X, ChevronDown } from "lucide-react";
import type { StoredEstimate } from "@/shared/estimateEngine";
import { FINISH_LABELS, PROJECT_LABELS, formatPlanningCurrency } from "@/shared/estimateEngine";
import { DisplayNum } from "@/components/marketing";
import { AddressAutocomplete } from "@/components/AddressAutocomplete";
import { EstimateCTA } from "@/components/modals/EstimateCTA";
import { CTA_FORM_SEND } from "@/shared/ctaCopy";
import { CONSULT_BULLETS } from "@/shared/siteContent";
import { SITE_CONFIG } from "@/shared/siteConfig";
import { BusinessPhoneContact } from "@/components/BusinessPhoneContact";
import { trackEvent, trackMetaEvent } from "@/lib/analytics";
import { readStoredPrefill, PREFILL_UPDATED_EVENT, hasPassedGate } from "@/lib/leadPrefill";
import type { PropertyProfile } from "@/shared/propertyProfile";
import {
  HOUSE_NUMBER_REGEX,
  HOUSE_NUMBER_ERROR_MESSAGE,
  buildCleanAddress,
  extractZip,
} from "@/shared/addressValidation";

const formSchema = z.object({
  name: z.string().min(2, "Please enter your full name"),
  phone: z.string().min(10, "Please enter a valid phone number"),
  email: z.string().email("Please enter a valid email"),
  address: z
    .string()
    .min(5, "Please enter your property address")
    .refine((v) => HOUSE_NUMBER_REGEX.test(v.trim()), HOUSE_NUMBER_ERROR_MESSAGE),
  projectType: z.string().min(1, "Please select a project type"),
  message: z.string().optional(),
});

type FormData = z.infer<typeof formSchema>;

const PROJECT_OPTIONS = [
  { value: "kitchen", label: "Kitchen Remodel" },
  { value: "bathroom", label: "Bathroom Remodel" },
  { value: "whole-home", label: "Whole-Home Remodel" },
  { value: "addition", label: "Room Addition" },
  { value: "adu", label: "ADU / Guest House" },
  { value: "basement", label: "Basement Finishing" },
  { value: "other", label: "Other / Not sure yet" },
];

const labelClass = "text-xs tracking-wide font-normal uppercase text-muted-foreground";

function RequiredMark() {
  return (
    <span className="text-destructive" aria-hidden="true">
      {" "}*
    </span>
  );
}

interface ConsultationFormProps {
  onRevise?: () => void;
  /** Compact trust bullets above the form (used in the modal variant). */
  showTrust?: boolean;
}

export function ConsultationForm({ onRevise, showTrust = false }: ConsultationFormProps = {}) {
  const [estimate, setEstimate] = useState<StoredEstimate | null>(null);
  const [estimateChecked, setEstimateChecked] = useState(false);
  // The carried-over range is attached by default (no yes/no gate); the user
  // can detach it with one tap and re-attach just as easily.
  const [attached, setAttached] = useState(true);
  const [success, setSuccess] = useState(false);
  const [submitted, setSubmitted] = useState<FormData | null>(null);
  const [propertyProfile, setPropertyProfile] = useState<PropertyProfile | null>(null);
  const [addressInput, setAddressInput] = useState("");
  const [showNote, setShowNote] = useState(false);
  const [showAddrInfo, setShowAddrInfo] = useState(false);
  const lastKeyRef = useRef<string | null>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);

  const form = useForm<FormData>({
    resolver: zodResolver(formSchema),
    // Validate each field on blur (and re-validate on change once touched) so
    // users get inline feedback instead of every error at once on submit.
    mode: "onTouched",
    defaultValues: {
      name: "",
      phone: "",
      email: "",
      address: "",
      projectType: "",
      message: "",
    },
  });

  function handleProfileResolved(profile: PropertyProfile | null) {
    setPropertyProfile(profile);
    if (profile) {
      const clean = buildCleanAddress(profile);
      if (clean) {
        setAddressInput(clean);
        form.setValue("address", clean, { shouldValidate: true });
      }
    }
  }

  // ZIP is no longer a manual field; derive it from the resolved property
  // profile, falling back to a 5-digit ZIP parsed from the address text.
  const deriveZip = (addr: string) =>
    propertyProfile?.zip?.slice(0, 5) || extractZip(addr) || "";

  // Prefill contact fields so a visitor never re-types name / phone / email.
  // Two sources feed this: a Meta lead-form click that arrived with the info in
  // the URL, and the estimate gate on this same page (which writes the info it
  // just captured and dispatches PREFILL_UPDATED_EVENT). We fill only fields the
  // visitor hasn't touched, so an event never clobbers something they edited.
  // Address prefills too now that the estimate gate captures a validated street
  // address through the same autocomplete; a visitor who came through the gate
  // should never be asked for their address a second time.
  useEffect(() => {
    function applyPrefill() {
      const pf = readStoredPrefill();
      const fillIfEmpty = (field: "name" | "phone" | "email", value?: string) => {
        if (value && !form.getValues(field)) {
          form.setValue(field, value, { shouldValidate: false });
        }
      };
      fillIfEmpty("name", pf.name);
      fillIfEmpty("phone", pf.phone);
      fillIfEmpty("email", pf.email);
      if (pf.address && !form.getValues("address")) {
        setAddressInput(pf.address);
        form.setValue("address", pf.address, { shouldValidate: false });
      }
    }
    applyPrefill();

    /* A wizard dead-end (an RE-10 where nothing was priceable) hands its
       context here so the visitor does not retype what the upload already
       said. Prefills the note - visible and editable, never hidden. */
    try {
      const ctx = sessionStorage.getItem("brc_consult_context");
      if (ctx && !form.getValues("message")) {
        form.setValue("message", ctx.slice(0, 2000), { shouldValidate: false });
        setShowNote(true);
      }
    } catch {
      /* storage unavailable - nothing to prefill */
    }

    window.addEventListener(PREFILL_UPDATED_EVENT, applyPrefill);
    return () => window.removeEventListener(PREFILL_UPDATED_EVENT, applyPrefill);
  }, [form]);

  useEffect(() => {
    function loadEstimate() {
      setEstimateChecked(true);
      try {
        const raw = sessionStorage.getItem("brc_estimate");
        if (!raw) {
          lastKeyRef.current = null;
          setEstimate(null);
          return;
        }
        const parsed: StoredEstimate = JSON.parse(raw);
        // Defensive: never surface a range the user did not finish building.
        if (!parsed.project || !parsed.finish || !parsed.sqft || !parsed.priceLow) return;
        const key = `${parsed.project}|${parsed.finish}|${parsed.sqft}|${parsed.priceLow}|${parsed.priceHigh}|${parsed.confidenceLabel}`;
        if (key === lastKeyRef.current) return;
        lastKeyRef.current = key;
        setEstimate(parsed);
        setAttached(true);
        form.setValue("projectType", parsed.project, { shouldValidate: false });
      } catch {}
    }
    loadEstimate();
    window.addEventListener("brc_estimate_updated", loadEstimate);
    return () => window.removeEventListener("brc_estimate_updated", loadEstimate);
  }, [form]);

  useEffect(() => {
    if (!success) return;
    // Open the confirmation at the top, whether the form lives in the scrolling
    // dialog body (modal) or inline on the page.
    const el = successHeadingRef.current;
    if (el && el.offsetParent !== null) {
      let ancestor: HTMLElement | null = el.parentElement;
      let scrolledContainer = false;
      while (ancestor && ancestor !== document.body && ancestor !== document.documentElement) {
        const overflowY = getComputedStyle(ancestor).overflowY;
        if (
          (overflowY === "auto" || overflowY === "scroll") &&
          ancestor.scrollHeight > ancestor.clientHeight
        ) {
          ancestor.scrollTo({ top: 0, behavior: "auto" });
          scrolledContainer = true;
          break;
        }
        ancestor = ancestor.parentElement;
      }
      if (!scrolledContainer) {
        const top = el.getBoundingClientRect().top + window.scrollY - 80;
        window.scrollTo({ top: Math.max(0, top), behavior: "auto" });
      }
    }
    el?.focus({ preventScroll: true });
  }, [success]);

  function handleRevise() {
    if (onRevise) {
      onRevise();
    } else {
      document.getElementById("calculator")?.scrollIntoView({ behavior: "smooth" });
    }
  }

  const mutation = useMutation({
    mutationFn: async (data: FormData) => {
      const payload = {
        ...data,
        zip: deriveZip(data.address),
        propertyProfile,
        /* When the visitor already submitted the estimate gate, both the admin
           and customer confirmation emails were already sent by /api/estimate-lead.
           Sending them again from /api/consultation would be a duplicate. */
        skipEmail: hasPassedGate() ? true : undefined,
        estimate: estimate && attached
          ? {
              project: estimate.project,
              finish: estimate.finish,
              priceLow: estimate.priceLow,
              priceHigh: estimate.priceHigh,
              roi: estimate.roi,
              confidence: estimate.confidenceLabel,
              sqft: estimate.sqft,
              refinements: estimate.refinements,
              // Forwarded verbatim from the estimator so the emails can restate
              // the layout card and upgrade chips the visitor actually chose,
              // not just the derived refinements.
              layoutLabel: estimate.layoutLabel,
              upgradeLabels: estimate.upgradeLabels,
            }
          : null,
      };
      const res = await fetch("/api/consultation", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || "Something went wrong");
      }
      return res.json();
    },
    onSuccess: (_data, variables) => {
      setSuccess(true);
      sessionStorage.removeItem("brc_estimate");
        sessionStorage.removeItem("brc_consult_context");
      // Conversion event: a submitted consultation request is the PRIMARY lead
      // (estimate on the site, then submit). GA generate_lead + Meta Lead. The
      // Meta Lead carries the visitor's email + phone, which the server-side
      // Conversions API hashes for high match quality (best cost-per-result).
      trackEvent("generate_lead", {
        form: "consultation",
        project_type: variables.projectType,
        has_estimate: !!estimate && attached,
      });
      trackMetaEvent(
        "Lead",
        { content_name: variables.projectType, content_category: "consultation_request" },
        { email: variables.email, phone: variables.phone },
      );
    },
  });

  if (success) {
    const submittedProject = submitted
      ? PROJECT_OPTIONS.find((o) => o.value === submitted.projectType)?.label ??
        submitted.projectType
      : null;

    return (
      <div className="flex flex-col items-start py-2 space-y-4" data-testid="consultation-success">
        {/* Stacked emblem confirms the brand on the request-received state */}
        <img
          src="/brand/svg/icon/boise-remodeling-co-icon-bone.svg"
          alt="Boise Remodeling Co emblem"
          width={48}
          height={48}
          className="h-12 w-12"
        />
        <div>
          <h3
            ref={successHeadingRef}
            tabIndex={-1}
            className="font-sans font-light text-2xl text-foreground outline-none"
          >
            Request received{submitted ? `, ${submitted.name.split(" ")[0]}` : ""}.
          </h3>
          {submittedProject && (
            <p className="text-sm text-muted-foreground mt-1">
              {submittedProject}
              {submitted?.address ? ` · ${submitted.address}` : ""}
            </p>
          )}
        </div>

        <ol className="space-y-2.5 text-sm text-muted-foreground">
          <li className="flex gap-3">
            <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full border border-border text-label font-normal text-foreground">
              1
            </span>
            <span className="pt-0.5">We review your request and any planning range you attached.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full border border-border text-label font-normal text-foreground">
              2
            </span>
            <span className="pt-0.5">We reach out within one business day to find a time that works.</span>
          </li>
          <li className="flex gap-3">
            <span className="flex-shrink-0 flex items-center justify-center h-6 w-6 rounded-full border border-border text-label font-normal text-foreground">
              3
            </span>
            <span className="pt-0.5">
              Your free 60 to 90 minute in-home visit: planning guidance, design direction, no obligation.
            </span>
          </li>
        </ol>

        <div className="flex flex-col gap-1">
          <p className="text-sm text-muted-foreground">
            Need us sooner?{" "}
            <BusinessPhoneContact
              inline
              showPhoneIcon
              phoneClassName="inline-flex items-center gap-1.5 font-normal text-foreground underline-offset-2 hover:underline"
              saveClassName="text-sm text-muted-foreground hover:text-foreground transition-colors"
              phoneTestId="link-consult-success-phone"
            />
          </p>
          <p className="text-xs text-muted-foreground">
            A confirmation email is on its way to your inbox.
          </p>
        </div>
      </div>
    );
  }

  const projectLabel = estimate?.project ? PROJECT_LABELS[estimate.project]?.label : null;
  const finishLabel = estimate?.finish ? FINISH_LABELS[estimate.finish]?.label : null;
  const showProjectSelect = !estimate || !attached;

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit((data) => {
          setSubmitted(data);
          mutation.mutate(data);
        })}
        className="space-y-4"
      >
        {showTrust && (
          <ul className="grid grid-cols-1 sm:grid-cols-2 gap-x-4 gap-y-1.5" data-testid="consult-trust-bullets">
            {CONSULT_BULLETS.map((item) => (
              <li key={item} className="flex items-center gap-2 text-xs text-muted-foreground">
                <Check className="h-3.5 w-3.5 flex-shrink-0 text-foreground/60" />
                {item}
              </li>
            ))}
          </ul>
        )}

        {/* No estimate yet: a soft nudge to build one (it auto-carries over). */}
        {estimateChecked && !estimate && (
          <div
            className="rounded-sm p-3 text-sm bg-accent/5 border border-accent/20 flex flex-wrap items-center justify-between gap-2"
            data-testid="estimate-cta-card"
          >
            <span className="text-muted-foreground">
              Want a ballpark range first? We&apos;ll carry it over automatically.
            </span>
            {onRevise ? (
              <Button
                type="button"
                size="sm"
                variant="brandOutline"
                onClick={onRevise}
                data-testid="button-start-estimate"
              >
                Get your planning range <ArrowRight className="h-4 w-4" />
              </Button>
            ) : (
              <EstimateCTA size="sm" variant="brandOutline" data-testid="button-start-estimate">
                Get your planning range <ArrowRight className="h-4 w-4" />
              </EstimateCTA>
            )}
          </div>
        )}

        {/* Estimate attached: a compact, removable chip (no yes/no gate). */}
        {estimate && attached && (
          <div className="rounded-sm p-3 text-sm bg-accent/5 border border-accent/20">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 mb-1">
                  <CheckCircle2 className="h-4 w-4 flex-shrink-0 text-accent-legible" />
                  <span className="font-normal text-foreground">Planning range attached</span>
                </div>
                <p className="text-muted-foreground text-xs" data-testid="text-estimate-summary">
                  {projectLabel}
                  {finishLabel ? ` · ${finishLabel}` : ""}
                  {estimate.sqft ? (
                    <>
                      {" · "}
                      <DisplayNum>{estimate.sqft.toLocaleString()}</DisplayNum> sqft
                    </>
                  ) : null}
                </p>
                <p className="mt-0.5 text-foreground" data-testid="text-estimate-range">
                  <DisplayNum className="font-normal">
                    {formatPlanningCurrency(estimate.priceLow)} to {formatPlanningCurrency(estimate.priceHigh)}
                  </DisplayNum>
                </p>
              </div>
              <div className="flex flex-col items-end gap-1 flex-shrink-0">
                <button
                  type="button"
                  onClick={() => setAttached(false)}
                  className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground"
                  data-testid="button-drop-estimate"
                >
                  <X className="h-3.5 w-3.5" />
                  Remove
                </button>
                <button
                  type="button"
                  onClick={handleRevise}
                  className="text-xs text-muted-foreground hover:text-foreground underline underline-offset-2"
                  data-testid="button-revise-estimate"
                >
                  Revise
                </button>
              </div>
            </div>
          </div>
        )}

        {estimate && !attached && (
          <div className="rounded-sm p-3 text-sm bg-muted/40 border border-border flex flex-wrap items-center justify-between gap-2">
            <span className="text-muted-foreground" data-testid="status-estimate-dropped">
              Submitting without a planning range.
            </span>
            <button
              type="button"
              onClick={() => setAttached(true)}
              className="inline-flex items-center gap-1 text-xs font-normal text-foreground hover:underline underline-offset-2"
              data-testid="button-reattach-estimate"
            >
              <Plus className="h-3.5 w-3.5" />
              Attach it
            </button>
          </div>
        )}

        {mutation.isError && (
          <div role="alert" className="rounded-sm p-3 text-sm bg-destructive/5 border border-destructive/20 text-destructive">
            {(mutation.error as Error).message || "Something went wrong. Please try again."}
          </div>
        )}

        {showProjectSelect && (
          <FormField
            control={form.control}
            name="projectType"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>
                  What are you planning to remodel?
                  <RequiredMark />
                </FormLabel>
                <Select onValueChange={field.onChange} value={field.value}>
                  <FormControl>
                    <SelectTrigger data-testid="select-project-type" aria-required="true">
                      <SelectValue placeholder="Select a project type" />
                    </SelectTrigger>
                  </FormControl>
                  <SelectContent>
                    {PROJECT_OPTIONS.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                <FormMessage />
              </FormItem>
            )}
          />
        )}

        <div className="grid sm:grid-cols-2 gap-4">
          <FormField
            control={form.control}
            name="name"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>
                  Full name
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    placeholder="Jane Smith"
                    autoComplete="name"
                    aria-required="true"
                    data-testid="input-name"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          <FormField
            control={form.control}
            name="phone"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>
                  Phone
                  <RequiredMark />
                </FormLabel>
                <FormControl>
                  <Input
                    type="tel"
                    placeholder="(208) 555-0000"
                    autoComplete="tel"
                    aria-required="true"
                    data-testid="input-phone"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        </div>

        <FormField
          control={form.control}
          name="email"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>
                Email
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <Input
                  type="email"
                  placeholder="jane@example.com"
                  autoComplete="email"
                  aria-required="true"
                  data-testid="input-email"
                  {...field}
                />
              </FormControl>
              <FormMessage />
            </FormItem>
          )}
        />

        <FormField
          control={form.control}
          name="address"
          render={({ field }) => (
            <FormItem>
              <FormLabel className={labelClass}>
                Property address
                <RequiredMark />
              </FormLabel>
              <FormControl>
                <AddressAutocomplete
                  value={addressInput || field.value}
                  onChange={(v) => {
                    setAddressInput(v);
                    field.onChange(v);
                  }}
                  onProfileResolved={handleProfileResolved}
                  data-testid="input-address"
                />
              </FormControl>
              <button
                type="button"
                onClick={() => setShowAddrInfo((v) => !v)}
                aria-expanded={showAddrInfo}
                aria-controls="address-info"
                className="inline-flex items-center gap-1 text-xs text-muted-foreground hover:text-foreground mt-1"
                data-testid="button-address-info"
              >
                Why we ask for your address
                <ChevronDown className={cn("h-3 w-3 transition-transform", showAddrInfo && "rotate-180")} />
              </button>
              {showAddrInfo && (
                <FormDescription id="address-info" className="text-xs text-muted-foreground mt-1">
                  We use county property records to prepare for your visit. Your information is never
                  shared or sold -{" "}
                  <Link href="/privacy-policy" className="underline underline-offset-2 hover:text-foreground">
                    privacy policy
                  </Link>
                  .
                </FormDescription>
              )}
              <FormMessage />
            </FormItem>
          )}
        />

        {/* Optional note is progressive-disclosed so the form fits the viewport. */}
        {showNote ? (
          <FormField
            control={form.control}
            name="message"
            render={({ field }) => (
              <FormItem>
                <FormLabel className={labelClass}>
                  Anything else we should know?{" "}
                  <span className="normal-case text-muted-foreground">(optional)</span>
                </FormLabel>
                <FormControl>
                  <Textarea
                    placeholder="Your home, your vision, or your timeline..."
                    rows={3}
                    autoFocus
                    data-testid="textarea-message"
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
        ) : (
          <button
            type="button"
            onClick={() => setShowNote(true)}
            className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-foreground"
            data-testid="button-add-note"
          >
            <Plus className="h-3.5 w-3.5" />
            Add a note <span className="text-muted-foreground">(optional)</span>
          </button>
        )}

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 pt-1">
          <Button
            type="submit"
            variant="brand"
            disabled={mutation.isPending}
            data-testid="button-submit-consultation"
          >
            {mutation.isPending ? "Sending…" : CTA_FORM_SEND}
            {!mutation.isPending && <ArrowRight className="h-4 w-4" />}
          </Button>
          <p className="text-xs text-muted-foreground">
            No spam. We respond within one business day.
          </p>
        </div>
      </form>
    </Form>
  );
}
