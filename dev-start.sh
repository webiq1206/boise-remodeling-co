#!/bin/bash
# Deploy start.sh pings IndexNow. Local dev does not block on that network call.
( node --import tsx scripts/submit-indexnow.mjs --changed || true ) &
npm run dev
