#!/usr/bin/env bash
# Publish the Expo web build (dist/) as a new release and switch to it instantly.
#   On the VPS:     cd ~/budget-pro-app && npm run build:web && bash ~/deploy/scripts/3-deploy-web.sh
#   From your PC:   rsync -az --delete dist/ budgetpro@SERVER:/tmp/budget-dist/ && ssh budgetpro@SERVER 'DIST=/tmp/budget-dist bash ~/deploy/scripts/3-deploy-web.sh'
set -euo pipefail
WEB_ROOT="${WEB_ROOT:-/var/www/budget-pro}"
DIST="${DIST:-$(pwd)/dist}"
[ -f "$DIST/index.html" ] || { echo "✖ $DIST/index.html not found — run: npm run build:web"; exit 1; }
REL="$WEB_ROOT/releases/$(date +%Y%m%d-%H%M%S)"
mkdir -p "$REL"
rsync -a --delete "$DIST/" "$REL/"
ln -sfn "$REL" "$WEB_ROOT/current.tmp" && mv -Tf "$WEB_ROOT/current.tmp" "$WEB_ROOT/current"
# keep the last 5 releases (rollback: ln -sfn <older release> /var/www/budget-pro/current)
ls -1dt "$WEB_ROOT"/releases/* | tail -n +6 | xargs -r rm -rf
echo "✔ Live: $(cat "$REL/version.json" 2>/dev/null || echo "$REL")"
