#!/bin/bash
# Patch a TizenBrew .wgt (see patch-tizenbrew.py for what and why), re-sign it with your
# certificate, and optionally install it.
#
#   tools/patch-tizenbrew.sh ~/Downloads/TizenBrewStandalone.wgt           -> writes TizenBrew-patched.wgt
#   tools/patch-tizenbrew.sh ~/Downloads/TizenBrewStandalone.wgt --install -> and installs it on the TV
set -e
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
WGT="$1"
[ -f "$WGT" ] || { echo "Usage: $0 <TizenBrew .wgt> [--install]" >&2; exit 1; }
[ -f "$ROOT/tv.env" ] && . "$ROOT/tv.env"
TIZEN_HOME="${TIZEN_HOME:-$HOME/tizen-studio}"
TIZEN="$TIZEN_HOME/tools/ide/bin/tizen"
WORK="$(mktemp -d)"
trap 'rm -rf "$WORK"' EXIT

mkdir -p "$WORK/src" "$WORK/out"
unzip -qq "$WGT" -d "$WORK/src"
# The original author's signature must go before signing it with yours
rm -f "$WORK/src/author-signature.xml" "$WORK"/src/signature*.xml
python3 -I "$ROOT/tools/patch-tizenbrew.py" "$WORK/src"
"$TIZEN" package -t wgt -s "${CERT_PROFILE:-tvlauncher}" -o "$WORK/out" -- "$WORK/src" >/dev/null
mv "$WORK"/out/*.wgt "$ROOT/TizenBrew-patched.wgt"
echo "Wrote $ROOT/TizenBrew-patched.wgt"

if [ "$2" = "--install" ]; then
    [ -n "$TV_IP" ] || { echo "Set TV_IP in tv.env to install." >&2; exit 1; }
    "$TIZEN_HOME/tools/sdb" connect "$TV_IP:26101" >/dev/null
    "$TIZEN" install -s "$TV_IP:26101" -n TizenBrew-patched.wgt -- "$ROOT" | tail -1
fi
