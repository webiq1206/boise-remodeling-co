import { addEnhancedConversionSuppression } from "../server/services/enhancedConversionSuppression";

function flag(name: string): string {
  const index = process.argv.indexOf(name);
  return index >= 0 ? (process.argv[index + 1] ?? "") : "";
}

const email = flag("--email");
const phone = flag("--phone");

if (!email && !phone) {
  console.error("Usage: npx tsx scripts/suppress-enhanced-conversion.ts --email you@example.com");
  console.error("       npx tsx scripts/suppress-enhanced-conversion.ts --phone 2085550100");
  process.exit(1);
}

async function main(): Promise<void> {
  const stored = await addEnhancedConversionSuppression({ email, phone });
  if (!stored.length) {
    console.error("That value could not be normalized. Nothing was stored.");
    process.exit(1);
  }
  for (const record of stored) console.log(`stored ${record.kind} ${record.valueHash}`);
}

main().catch((error: unknown) => {
  console.error(error instanceof Error ? error.message : "The suppression could not be saved.");
  process.exit(1);
});
