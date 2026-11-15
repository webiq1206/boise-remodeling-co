/**
 * Stored preliminary ranges for Boise Remodeling Co estimator mail.
 * The numbers are inputs. Rendering must not recompute them.
 */
export type EmailFixture = {
  id: string;
  draftId: string;
  service: string;
  label: string;
  low: number | null;
  high: number | null;
  name: string;
  phone: string;
  uploads: { name: string; url?: string }[];
};

export const EMAIL_FIXTURES: EmailFixture[] = [
  {
    id: "remodeling-re10-small",
    draftId: "11111111-1111-4111-8111-111111111111",
    service: "re10",
    label: "small",
    low: 3800,
    high: 4200,
    name: "Ada Small",
    phone: "(208) 555-0101",
    uploads: [],
  },
  {
    id: "remodeling-kitchen-mid",
    draftId: "22222222-2222-4222-8222-222222222222",
    service: "kitchen",
    label: "mid",
    low: 18000,
    high: 42000,
    name: "Bea Kitchen",
    phone: "",
    uploads: [],
  },
  {
    id: "remodeling-addition-major",
    draftId: "33333333-3333-4333-8333-333333333333",
    service: "addition",
    label: "major",
    low: 120000,
    high: 165000,
    name: "Cam Addition",
    phone: "(208) 555-0103",
    uploads: [],
  },
  {
    id: "remodeling-bathroom-uploads",
    draftId: "44444444-4444-4444-8444-444444444444",
    service: "bathroom",
    label: "uploads",
    low: 22000,
    high: 48000,
    name: "Dee Bathroom",
    phone: "(208) 555-0104",
    uploads: [
      { name: "bath-plan.pdf", url: "https://boiseremodeling.co/admin/p5-estimators" },
      { name: "photo.jpg", url: "https://boiseremodeling.co/admin/p5-estimators" },
    ],
  },
  {
    id: "remodeling-whole-home-withheld",
    draftId: "55555555-5555-4555-8555-555555555555",
    service: "whole-home",
    label: "withheld",
    low: null,
    high: null,
    name: "<script>alert(1)</script> Home",
    phone: "(208) 555-0105",
    uploads: [],
  },
];

const money = (amount: number) =>
  new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(Math.round(amount));

export function storedAmount(fixture: EmailFixture): string | null {
  if (fixture.low == null || fixture.high == null) return null;
  return fixture.low === fixture.high ? money(fixture.low) : `${money(fixture.low)} to ${money(fixture.high)}`;
}

export function estimateRecord(fixture: EmailFixture) {
  const range = fixture.low == null || fixture.high == null ? null : { low: fixture.low, high: fixture.high };
  const uploads = fixture.uploads.map((file) => ({ name: file.name, url: file.url }));
  return {
    contact: { name: fixture.name, email: "ada@example.com", phone: fixture.phone },
    scope: {
      text: `${fixture.service} scope`,
      answers: { service: fixture.service, location: "100 Example Ave, Boise, ID 83702" },
      uploads,
    },
    uploads,
    customer: {
      range,
      categoryRanges: range ? [{ category: "General", low: range.low, high: range.high }] : [],
      lineItems: range
        ? [{ id: "stored", category: "General", description: "Stored scope", quantity: 1, unit: "LS", low: range.low, high: range.high }]
        : [],
      assumptions: [],
      exclusions: [],
      allowances: [],
      factors: [],
      summary: "Stored preliminary range.",
      message: "",
      nextStep: "",
      disclaimer: "",
      issue: { service: fixture.service },
    },
  };
}
