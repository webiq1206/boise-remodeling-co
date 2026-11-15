/**
 * Build guard: the retired personal street must not appear in tracked files.
 * The public address is Meridian, ID 83646 only. The needles are assembled
 * here so this script does not contain the address.
 *
 * Run: npm run verify:no-street-address (runs in prebuild)
 */
import { execFileSync } from "node:child_process";

const pattern = ["wap", "oot"].join("") + "|" + ["40", "31"].join("") + " W";

try {
  const out = execFileSync("git", ["grep", "-n", "-i", "-I", "-E", pattern], {
    encoding: "utf8",
  });
  console.error("verify:no-street-address FAILED. Public address is Meridian, ID 83646 only.");
  console.error(out.trim());
  process.exit(1);
} catch (error) {
  const failed = error as { status?: number; stdout?: string; stderr?: string };
  if (failed.status === 1 && !String(failed.stdout ?? "").trim()) {
    console.log("verify:no-street-address passed: 0 hits.");
    process.exit(0);
  }
  console.error(failed.stderr || error);
  process.exit(failed.status || 1);
}
