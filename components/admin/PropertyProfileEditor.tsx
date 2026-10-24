"use client";

import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import type { PropertyProfile } from "@/shared/propertyProfile";
import {
  getPropertyProfileSummary,
  resolvePropertyProfile,
} from "@/shared/propertyProfile";

interface PropertyProfileEditorProps {
  profile: PropertyProfile | null | undefined;
  onSave: (profile: PropertyProfile) => void;
  saving?: boolean;
}

export function PropertyProfileEditor({
  profile,
  onSave,
  saving,
}: PropertyProfileEditorProps) {
  const resolved = resolvePropertyProfile(profile ?? undefined);
  const [draft, setDraft] = useState<Partial<PropertyProfile>>({});

  if (!profile || !resolved) {
    return (
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Property data</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
            No property profile on file. It is added when the customer selects an
            address on the estimate request form.
          </p>
        </CardContent>
      </Card>
    );
  }

  const display = { ...resolved, ...draft };
  const summary = getPropertyProfileSummary(display);

  function field<K extends keyof PropertyProfile>(
    key: K,
    label: string,
    type: "text" | "number" = "text"
  ) {
    const baseVal = resolved![key];
    const overrideVal = draft[key];
    const val = overrideVal !== undefined ? overrideVal : baseVal;
    return (
      <div className="space-y-1">
        <Label className="text-xs">{label}</Label>
        <Input
          type={type}
          value={val != null ? String(val) : ""}
          onChange={(e) => {
            const v =
              type === "number"
                ? e.target.value === ""
                  ? undefined
                  : Number(e.target.value)
                : e.target.value;
            setDraft((d) => ({ ...d, [key]: v }));
          }}
        />
      </div>
    );
  }

  function handleSave() {
    const base = resolved!;
    const adminOverrides = {
      ...(base.adminOverrides ?? {}),
      ...draft,
    };
    onSave({
      ...base,
      adminOverrides,
    });
  }

  return (
    <Card data-testid="property-profile-editor" data-clarity-mask="true">
      <CardHeader>
        <CardTitle className="text-base">Property data</CardTitle>
        <p className="text-xs text-muted-foreground">
          Auto-populated from address lookup. Edit any field to override for this record.
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        {summary.length > 0 && (
          <p className="text-sm text-muted-foreground">{summary.join(" · ")}</p>
        )}
        <div className="grid gap-3 sm:grid-cols-2">
          {field("formattedAddress", "Full address")}
          {field("city", "City")}
          {field("zip", "ZIP")}
          {field("parcelId", "Parcel ID")}
          {field("squareFootage", "Square footage", "number")}
          {field("lotSizeSqFt", "Lot size (sq ft)", "number")}
          {field("yearBuilt", "Year built", "number")}
          {field("bedrooms", "Bedrooms", "number")}
          {field("bathrooms", "Bathrooms", "number")}
          {field("assessedValue", "Assessed value", "number")}
          {field("ownerName", "Owner name")}
          {field("permittingAuthority", "Permitting authority")}
        </div>
        <div className="space-y-1">
          <Label className="text-xs">Jurisdiction</Label>
          <Textarea
            rows={2}
            value={
              draft.jurisdiction !== undefined
                ? String(draft.jurisdiction ?? "")
                : resolved!.jurisdiction ?? ""
            }
            onChange={(e) => setDraft((d) => ({ ...d, jurisdiction: e.target.value }))}
          />
        </div>
        <Button type="button" onClick={handleSave} disabled={saving}>
          {saving ? "Saving…" : "Save property overrides"}
        </Button>
      </CardContent>
    </Card>
  );
}
