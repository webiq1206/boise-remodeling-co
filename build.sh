#!/bin/bash
set -euo pipefail

npm install
# Pre-publish safety net: auto-convert any stray em-dashes to hyphens so the
# verify:no-em-dash build guard (run by `npm run build`'s prebuild) never fails.
npx tsx scripts/fix-em-dash.ts
npm run build
cp -r .next/static .next/standalone/.next/static
cp -r public .next/standalone/public
