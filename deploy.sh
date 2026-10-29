#!/bin/bash
# Package, sign, install and launch the Home launcher on a Samsung TV.
# Settings come from tv.env (copy tv.env.example). While this runs, the TV's Developer Mode
# Host PC IP must be this computer's address.
set -e
SRC="$(cd "$(dirname "$0")" && pwd)"
[ -f "$SRC/tv.env" ] || { echo "Missing tv.env: copy tv.env.example to tv.env and set TV_IP." >&2; exit 1; }
. "$SRC/tv.env"

TV="$TV_IP:26101"
APP_ID=MinLaunch1.Home
TIZEN_HOME="${TIZEN_HOME:-$HOME/tizen-studio}"
TIZEN="$TIZEN_HOME/tools/ide/bin/tizen"
SDB="$TIZEN_HOME/tools/sdb"
BUILD="$(mktemp -d)"
trap 'rm -rf "$BUILD"' EXIT

# A restarted TV often leaves sdb holding a dead connection; restart it once if needed
"$SDB" connect "$TV" | grep -q "connected to" || { "$SDB" kill-server >/dev/null 2>&1; "$SDB" connect "$TV" >/dev/null; }

rsync -a --exclude deploy.sh --exclude tools --exclude logs --exclude docs --exclude 'tv.env*' \
    --exclude '*.md' --exclude 'config.local.example.js' --exclude '.*' "$SRC"/ "$BUILD"/
"$TIZEN" package -t wgt -s "${CERT_PROFILE:-tvlauncher}" -- "$BUILD" >/dev/null
mv "$BUILD"/*.wgt "$BUILD/app.wgt"
"$TIZEN" install -s "$TV" -n app.wgt -- "$BUILD" | tail -1
"$TIZEN" run -s "$TV" -p "$APP_ID" | tail -1
