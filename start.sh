#!/bin/bash
# THE SERVER STARTS FIRST. INDEXNOW RUNS BEHIND IT.
#
# This used to be the other way round:
#
#   node scripts/submit-indexnow.mjs
#   HOSTNAME=0.0.0.0 node .next/standalone/server.js
#
# which made a third-party network call a precondition for the site booting.
# submit-indexnow.mjs performs six-plus SEQUENTIAL fetches - three HEAD checks,
# a recursive walk of the live sitemap index, then POSTs to api.indexnow.org
# and yandex.com - and not one of them sets a timeout. Meanwhile the deploy
# healthcheck hits / immediately, finds nothing listening on the port, and the
# Promote step fails with "built successfully but failed to start".
#
# That is exactly what the failed deploys showed: "connection refused" on the
# healthcheck, then [IndexNow] log lines, then the instance terminated. It cost
# two failed publishes on 2026-08-21. Nothing about pinging a search engine
# should be able to stop the site from serving.
#
# Backgrounded, and its failure swallowed, so it can neither delay nor fail the
# boot. `exec` hands the container's PID 1 straight to node so SIGTERM reaches
# the server rather than this shell.
( node scripts/submit-indexnow.mjs || true ) &

HOSTNAME=0.0.0.0 exec node .next/standalone/server.js
