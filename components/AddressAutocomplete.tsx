"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Loader2, MapPin, CheckCircle2, AlertCircle, Search } from "lucide-react";
import { cn } from "@/lib/utils";
import type { PropertyProfile, PropertyProfileInput } from "@/shared/propertyProfile";
import { getPropertyProfileSummary } from "@/shared/propertyProfile";
import { buildCleanAddress } from "@/shared/addressValidation";
import {
  getConfidenceLabel,
  getMeasurementSummary,
} from "@/shared/measurementBundle";

interface AddressSuggestion {
  placeId: string;
  description: string;
  mainText?: string;
  secondaryText?: string;
  resolved?: PropertyProfileInput;
}

interface AddressAutocompleteProps {
  value: string;
  onChange: (value: string) => void;
  onProfileResolved: (profile: PropertyProfile | null) => void;
  disabled?: boolean;
  className?: string;
  id?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: React.AriaAttributes["aria-invalid"];
  "aria-label"?: string;
  "data-testid"?: string;
  variant?: "default" | "inverse";
}

export function AddressAutocomplete({
  value,
  onChange,
  onProfileResolved,
  disabled,
  className,
  id,
  "aria-describedby": ariaDescribedBy,
  "aria-invalid": ariaInvalid,
  "aria-label": ariaLabel = "Property address",
  "data-testid": testId = "input-address",
  variant = "default",
}: AddressAutocompleteProps) {
  const [suggestions, setSuggestions] = useState<AddressSuggestion[]>([]);
  const [open, setOpen] = useState(false);
  const [activeIndex, setActiveIndex] = useState(-1);
  const [loadingSuggestions, setLoadingSuggestions] = useState(false);
  const [enriching, setEnriching] = useState(false);
  const [profile, setProfile] = useState<PropertyProfile | null>(null);
  const [error, setError] = useState<string | null>(null);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const inputFocusedRef = useRef(false);
  const suggestionsDismissedRef = useRef(false);

  const listboxId = `${testId}-listbox`;
  const errorId = `${testId}-error`;
  const optionId = (index: number) => `${testId}-option-${index}`;

  const enrich = useCallback(
    async (opts: {
      placeId?: string;
      formattedAddress?: string;
      input?: PropertyProfileInput;
    }) => {
      setEnriching(true);
      setError(null);
      try {
        const res = await fetch("/api/property/enrich", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(opts),
        });
        const json = await res.json();
        if (!res.ok) {
          throw new Error(json.message || "Could not load property data");
        }
        setProfile(json.profile);
        onProfileResolved(json.profile);
        if (json.profile) {
          const clean = buildCleanAddress(json.profile);
          if (clean) onChange(clean);
        }
      } catch (e) {
        setProfile(null);
        onProfileResolved(null);
        setError(e instanceof Error ? e.message : "Property lookup failed");
      } finally {
        setEnriching(false);
      }
    },
    [onChange, onProfileResolved]
  );

  useEffect(() => {
    if (debounceRef.current) clearTimeout(debounceRef.current);
    const trimmed = value.trim();
    const controller = new AbortController();
    let active = true;
    if (trimmed.length < 3) {
      setOpen(false);
      setLoadingSuggestions(false);
      setSuggestions([]);
      setActiveIndex(-1);
      return;
    }

    debounceRef.current = setTimeout(async () => {
      setLoadingSuggestions(true);
      try {
        const res = await fetch(
          `/api/address/autocomplete?input=${encodeURIComponent(trimmed)}`,
          { signal: controller.signal }
        );
        const json = await res.json();
        if (!active) return;
        const next: AddressSuggestion[] = json.suggestions ?? [];
        setSuggestions(next);
        setActiveIndex(-1);
        setOpen(inputFocusedRef.current && !suggestionsDismissedRef.current && next.length > 0);
      } catch {
        if (!active) return;
        setSuggestions([]);
        setActiveIndex(-1);
      } finally {
        if (active) setLoadingSuggestions(false);
      }
    }, 300);

    return () => {
      active = false;
      controller.abort();
      if (debounceRef.current) clearTimeout(debounceRef.current);
    };
  }, [value]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  async function selectSuggestion(s: AddressSuggestion) {
    setOpen(false);
    setActiveIndex(-1);
    // Optimistically show a clean value (never the verbose "3024, West ..."
    // description that would trip the house-number validator) until enrich
    // resolves the canonical address.
    const preview = s.resolved
      ? buildCleanAddress(s.resolved)
      : s.mainText || s.description;
    onChange(preview || s.description);
    // Prefer the address data already resolved by the provider (Nominatim) to
    // avoid a flaky second place-id round-trip. Fall back to place id (Google).
    if (s.resolved) {
      await enrich({ input: s.resolved });
    } else {
      await enrich({ placeId: s.placeId, formattedAddress: s.description });
    }
  }

  async function useTypedAddress() {
    const trimmed = value.trim();
    if (trimmed.length < 5) {
      setError("Enter a complete street address with city");
      return;
    }
    setOpen(false);
    await enrich({ formattedAddress: trimmed });
  }

  function handleKeyDown(e: React.KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Escape" || e.key === "Tab") suggestionsDismissedRef.current = true;
    if (!open || suggestions.length === 0) {
      if (e.key === "ArrowDown" && suggestions.length > 0) {
        setOpen(true);
        setActiveIndex(0);
        e.preventDefault();
      }
      return;
    }

    switch (e.key) {
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((prev) => (prev + 1) % suggestions.length);
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((prev) => (prev <= 0 ? suggestions.length - 1 : prev - 1));
        break;
      case "Enter":
        if (activeIndex >= 0 && activeIndex < suggestions.length) {
          e.preventDefault();
          void selectSuggestion(suggestions[activeIndex]);
        }
        break;
      case "Escape":
        e.preventDefault();
        setOpen(false);
        setActiveIndex(-1);
        break;
      case "Tab":
        setOpen(false);
        setActiveIndex(-1);
        break;
    }
  }

  const confidence = profile ? getConfidenceLabel(profile.confidence) : null;
  const summaryLines = profile ? getPropertyProfileSummary(profile) : [];
  const measurementLines = profile?.measurementBundle
    ? getMeasurementSummary(profile.measurementBundle)
    : [];

  const describedBy =
    [ariaDescribedBy, error ? errorId : null].filter(Boolean).join(" ") || undefined;

  return (
    <div ref={containerRef} className={cn("space-y-3", className)}>
      <div className="relative">
        <Input
          id={id}
          value={value}
          onChange={(e) => {
            suggestionsDismissedRef.current = false;
            onChange(e.target.value);
            setProfile(null);
            onProfileResolved(null);
            setError(null);
          }}
          onFocus={() => { inputFocusedRef.current = true; suggestionsDismissedRef.current = false; if (suggestions.length) setOpen(true); }}
          onBlur={() => {
            inputFocusedRef.current = false;
            setOpen(false);
            // Auto-enrich an address the user typed but didn't pick from the
            // list, so the property lookup isn't lost behind a manual button.
            // Suggestions use onMouseDown preventDefault, so clicking one does
            // not blur the input; the profile guard covers keyboard selection.
            const looksLikeAddress = value.trim().length >= 8 && /\d/.test(value);
            if (!enriching && !profile && looksLikeAddress) {
              void useTypedAddress();
            }
          }}
          onKeyDown={handleKeyDown}
          placeholder="Start typing your street address…"
          disabled={disabled || enriching}
          autoComplete="street-address"
          role="combobox"
          aria-label={ariaLabel}
          aria-expanded={open && suggestions.length > 0}
          aria-controls={listboxId}
          aria-autocomplete="list"
          aria-activedescendant={
            open && activeIndex >= 0 ? optionId(activeIndex) : undefined
          }
          aria-describedby={describedBy}
          aria-invalid={ariaInvalid ?? (error ? true : undefined)}
          data-testid={testId}
          className={
            variant === "inverse"
              ? "bg-inverse-foreground/[0.10] border-inverse-foreground/30 text-inverse-foreground placeholder:text-inverse-muted/90 focus-visible:border-inverse-foreground/60 focus-visible:ring-inverse-foreground/20"
              : undefined
          }
        />
        {(loadingSuggestions || enriching) && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 h-4 w-4 animate-spin text-muted-foreground" />
        )}

        {open && suggestions.length > 0 && (
          <ul
            id={listboxId}
            className="absolute z-50 mt-1 w-full rounded-sm border border-border bg-background shadow-md max-h-56 overflow-auto"
            role="listbox"
            aria-label="Address suggestions"
            data-testid="address-suggestions"
          >
            {suggestions.map((s, i) => (
              <li
                key={s.placeId}
                id={optionId(i)}
                role="option"
                aria-selected={i === activeIndex}
                onMouseDown={(e) => e.preventDefault()}
                onMouseEnter={() => setActiveIndex(i)}
                onClick={() => void selectSuggestion(s)}
                className={cn(
                  "w-full cursor-pointer text-left px-3 py-2.5 text-sm flex gap-2 items-start",
                  i === activeIndex && "bg-muted/60"
                )}
                data-testid={`address-suggestion-${s.placeId}`}
              >
                <MapPin className="h-4 w-4 shrink-0 mt-0.5 text-muted-foreground" />
                <span>
                  {s.mainText ? (
                    <>
                      <span className="font-normal text-foreground">{s.mainText}</span>
                      {s.secondaryText && (
                        <span className="block text-xs text-muted-foreground">
                          {s.secondaryText}
                        </span>
                      )}
                    </>
                  ) : (
                    s.description
                  )}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {!profile && value.trim().length >= 5 && (
        <button
          type="button"
          className="mt-1 inline-flex items-center gap-2 rounded-sm border border-border px-3 min-h-11 text-sm text-foreground hover-elevate disabled:opacity-50"
          onClick={useTypedAddress}
          disabled={disabled || enriching}
          data-testid="button-use-typed-address"
        >
          <Search className="h-4 w-4" />
          Look up property data for this address
        </button>
      )}

      {error && (
        <p
          id={errorId}
          role="alert"
          className="text-xs text-destructive flex items-center gap-1"
          data-testid="address-error"
        >
          <AlertCircle className="h-3.5 w-3.5" />
          {error}
        </p>
      )}

      {profile && (
        <div
          className={cn(
            "rounded-sm p-4 text-sm space-y-2",
            variant === "inverse"
              ? "bg-white/10 border border-white/20"
              : "bg-muted/30 border border-border"
          )}
          data-testid="property-profile-summary"
        >
          <div className="flex items-start gap-2">
            <CheckCircle2 className="h-4 w-4 text-accent shrink-0 mt-0.5" />
            <div>
              <p className={cn("font-normal", variant === "inverse" ? "text-white" : "text-foreground")}>
                Property located
              </p>
              <p className={cn("text-xs mt-0.5", variant === "inverse" ? "text-white/60" : "text-muted-foreground")}>
                {buildCleanAddress(profile) || profile.formattedAddress}
              </p>
              {confidence && (
                <span
                  className={cn(
                    "inline-block mt-1 text-xs px-2 py-0.5 rounded-sm",
                    confidence.color === "green" && "bg-success/10 text-success",
                    confidence.color === "yellow" && "bg-warning-soft/15 text-warning",
                    confidence.color === "gray" && (
                      variant === "inverse" ? "bg-white/10 text-white/60" : "bg-muted text-muted-foreground"
                    )
                  )}
                >
                  {confidence.label}
                </span>
              )}
            </div>
          </div>
          {(summaryLines.length > 0 || measurementLines.length > 0) && (
            <ul className={cn("text-xs list-disc pl-5 space-y-0.5", variant === "inverse" ? "text-white/60" : "text-muted-foreground")}>
              {[...summaryLines, ...measurementLines].map((line) => (
                <li key={line}>{line}</li>
              ))}
            </ul>
          )}
        </div>
      )}
    </div>
  );
}
