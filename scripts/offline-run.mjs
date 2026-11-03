#!/usr/bin/env node

import { access, readdir } from "node:fs/promises";
import { constants } from "node:fs";
import { spawn } from "node:child_process";
import { isIP } from "node:net";
import { fileURLToPath } from "node:url";
import path from "node:path";

const projectRoot = process.cwd();
const scriptDirectory = path.dirname(fileURLToPath(import.meta.url));
const guardPath = path.join(scriptDirectory, "offline-network-guard.cjs");

function usage() {
  return [
    "Safe offline verification runner",
    "",
    "Usage:",
    "  node scripts/offline-run.mjs test [node --test arguments]",
    "  node scripts/offline-run.mjs build [next build arguments]",
    "  node scripts/offline-run.mjs dev [next dev arguments]",
    "  node scripts/offline-run.mjs e2e [playwright test arguments]",
  ].join("\n");
}

function copyIfPresent(target, key) {
  if (process.env[key] !== undefined) target[key] = process.env[key];
}

function safeChildEnvironment() {
  const env = {};

  for (const key of [
    "PATH",
    "HOME",
    "TMPDIR",
    "SHELL",
    "LANG",
    "LANGUAGE",
    "LC_ALL",
    "LC_CTYPE",
    "LC_MESSAGES",
    "LC_COLLATE",
    "LC_MONETARY",
    "LC_NUMERIC",
    "LC_TIME",
    "LC_PAPER",
    "LC_NAME",
    "LC_ADDRESS",
    "LC_TELEPHONE",
    "LC_MEASUREMENT",
    "LC_IDENTIFICATION",
  ]) {
    copyIfPresent(env, key);
  }

  if (process.env.NODE_ENV !== undefined) {
    const allowedNodeEnvironments = new Set(["development", "production", "test"]);
    if (!allowedNodeEnvironments.has(process.env.NODE_ENV)) {
      throw new Error("NODE_ENV must be development, production, or test");
    }
    env.NODE_ENV = process.env.NODE_ENV;
  }

  if (process.env.E2E_NO_WEBSERVER !== undefined) {
    if (!["1", "true"].includes(process.env.E2E_NO_WEBSERVER.toLowerCase())) {
      throw new Error("E2E_NO_WEBSERVER may only be 1 or true");
    }
    env.E2E_NO_WEBSERVER = process.env.E2E_NO_WEBSERVER;
  }

  if (process.env.E2E_BASE_URL !== undefined) {
    const baseUrl = new URL(process.env.E2E_BASE_URL);
    let host = baseUrl.hostname.toLowerCase();
    if (host.startsWith("[") && host.endsWith("]")) {
      host = host.slice(1, -1);
    }
    const loopback =
      host === "localhost" ||
      host === "::1" ||
      (isIP(host) === 4 && host.split(".")[0] === "127") ||
      (isIP(host) === 6 && host.startsWith("::ffff:127."));
    if (
      !loopback ||
      !["http:", "https:"].includes(baseUrl.protocol) ||
      baseUrl.username ||
      baseUrl.password
    ) {
      throw new Error("E2E_BASE_URL must be an HTTP(S) loopback URL without credentials");
    }
    env.E2E_BASE_URL = baseUrl.href;
  }

  for (const key of [
    "PLAYWRIGHT_CHROMIUM_PATH",
    "PLAYWRIGHT_BROWSERS_PATH",
    "PLAYWRIGHT_SKIP_BROWSER_DOWNLOAD",
  ]) {
    copyIfPresent(env, key);
  }

  env.NEXT_TELEMETRY_DISABLED = "1";
  env.NODE_OPTIONS = `--require=${JSON.stringify(guardPath)}`;
  return env;
}

async function refuseDotenvFiles() {
  const entries = await readdir(projectRoot, { withFileTypes: true });
  const dotenvFiles = entries
    .filter(
      (entry) =>
        entry.name.startsWith(".env") &&
        entry.name !== ".env.example",
    )
    .map((entry) => entry.name);

  if (dotenvFiles.length > 0) {
    throw new Error(
      "Offline verification refuses to run while a real dotenv file exists",
    );
  }
}

async function localTool(tool) {
  const executable = path.join(
    projectRoot,
    "node_modules",
    ".bin",
    process.platform === "win32" ? `${tool}.cmd` : tool,
  );
  await access(executable, constants.X_OK);
  return executable;
}

async function commandFor(name, args) {
  switch (name) {
    case "test":
      return { executable: process.execPath, args: ["--test", ...args] };
    case "build":
      return { executable: await localTool("next"), args: ["build", ...args] };
    case "dev":
      return { executable: await localTool("next"), args: ["dev", ...args] };
    case "e2e":
      return {
        executable: await localTool("playwright"),
        args: ["test", ...args],
      };
    default:
      throw new Error(usage());
  }
}

async function main() {
  const [name, ...args] = process.argv.slice(2);
  if (!name || name === "--help" || name === "-h") {
    console.log(usage());
    return;
  }

  await refuseDotenvFiles();
  const command = await commandFor(name, args);
  const child = spawn(command.executable, command.args, {
    cwd: projectRoot,
    env: safeChildEnvironment(),
    stdio: "inherit",
  });

  for (const signal of ["SIGINT", "SIGTERM"]) {
    process.on(signal, () => child.kill(signal));
  }

  const result = await new Promise((resolve, reject) => {
    child.once("error", reject);
    child.once("exit", (code, signal) => resolve({ code, signal }));
  });

  if (result.signal) {
    process.kill(process.pid, result.signal);
  } else {
    process.exitCode = result.code ?? 1;
  }
}

main().catch((error) => {
  // All deliberate errors are static and never contain environment values,
  // request details, credentials, or customer data.
  console.error(`offline-run: ${error.message}`);
  process.exitCode = 1;
});
