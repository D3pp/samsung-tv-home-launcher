#!/bin/bash
# One-time setup, no sudo: installs Samsung's Tizen command-line tools (sdb + tizen CLI, with
# their bundled Java) into ~/tizen-studio, then makes a signing certificate and profile.
#
#   tools/setup-tizen.sh [profile-name]      (default profile name: tvlauncher)
#
# macOS and Linux. Downloads about 270 MB from download.tizen.org.
set -e
PROFILE="${1:-tvlauncher}"
VERSION=6.1
TIZEN_HOME="${TIZEN_HOME:-$HOME/tizen-studio}"
DATA="$HOME/tizen-studio-data"

case "$(uname)" in
    Darwin) BIN="web-cli_Tizen_Studio_${VERSION}_macos-64.bin" ;;
    Linux)  BIN="web-cli_Tizen_Studio_${VERSION}_ubuntu-64.bin" ;;
    *) echo "Unsupported system: $(uname). Install Tizen Studio by hand from developer.tizen.org." >&2; exit 1 ;;
esac

md5_of() {
    if command -v md5 >/dev/null; then md5 -q; else md5sum | awk '{print $1}'; fi
}

# ---- 1. Tools ----

if [ -x "$TIZEN_HOME/tools/sdb" ]; then
    echo "Tizen tools already in $TIZEN_HOME"
else
    WORK="$(mktemp -d)"
    trap 'rm -rf "$WORK"' EXIT
    echo "Downloading $BIN ..."
    curl -fL --progress-bar -o "$WORK/$BIN" "https://download.tizen.org/sdk/Installer/tizen-studio_${VERSION}/$BIN"

    # The installer is a shell header plus a tar.gz; its header records the payload's checksum.
    # We unpack the payload ourselves instead of running the interactive installer.
    SUM="$(sed -n 's/^ORI_FILE_md5sum="\(.*\)"/\1/p' "$WORK/$BIN" | head -1)"
    LEN="$(sed -n 's/^ORI_FILE_LEN="\(.*\)"/\1/p' "$WORK/$BIN" | head -1)"
    [ -n "$SUM" ] && [ -n "$LEN" ] || { echo "Unexpected installer format." >&2; exit 1; }
    [ "$(tail -n +"$LEN" "$WORK/$BIN" | md5_of)" = "$SUM" ] || { echo "Download is corrupted, try again." >&2; exit 1; }

    mkdir -p "$WORK/payload"
    tail -n +"$LEN" "$WORK/$BIN" | tar xz -C "$WORK/payload"
    echo "Unpacking into $TIZEN_HOME ..."
    mkdir -p "$TIZEN_HOME"
    unzip -qq -o "$WORK/payload/tizen-sdk.zip" -d "$TIZEN_HOME"
    chmod +x "$TIZEN_HOME/tools/sdb" "$TIZEN_HOME"/tools/ide/bin/* "$TIZEN_HOME"/jdk/Contents/Home/bin/* "$TIZEN_HOME"/jdk/bin/* 2>/dev/null || true
fi

# The installer normally writes this; the tizen CLI reads it to find its Java and data folder
cat > "$TIZEN_HOME/sdk.info" <<EOF
TIZEN_SDK_INSTALLED_PATH=$TIZEN_HOME
TIZEN_SDK_DATA_PATH=$DATA
JDK_PATH=$TIZEN_HOME/jdk
EOF
mkdir -p "$DATA"

if [ "$(uname)" = Darwin ] && [ "$(uname -m)" = arm64 ] && [ ! -f /Library/Apple/usr/share/rosetta/rosetta ]; then
    echo "Note: sdb is an Intel binary. On Apple silicon, install Rosetta: softwareupdate --install-rosetta" >&2
fi

TIZEN="$TIZEN_HOME/tools/ide/bin/tizen"
"$TIZEN_HOME/tools/sdb" version
"$TIZEN" version

# ---- 2. Signing certificate ----

# A local Tizen author certificate. Samsung TVs in Developer Mode accept it, so no Samsung
# account is needed. Its random password is kept in a file only you can read.
KEYS="$DATA/keystore/author"
if "$TIZEN" security-profiles list 2>/dev/null | grep -q "^$PROFILE "; then
    echo "Signing profile '$PROFILE' already exists"
else
    mkdir -p "$KEYS"
    (umask 077; openssl rand -hex 12 > "$KEYS/$PROFILE.pwd")
    PW="$(cat "$KEYS/$PROFILE.pwd")"
    "$TIZEN" certificate -a "$PROFILE" -p "$PW" -n "TV Launcher Dev" -f "$PROFILE" -- "$KEYS" >/dev/null
    "$TIZEN" security-profiles add -n "$PROFILE" -a "$KEYS/$PROFILE.p12" -p "$PW" >/dev/null
    echo "Created signing profile '$PROFILE' (password in $KEYS/$PROFILE.pwd)"
fi
"$TIZEN" cli-config "profiles.path=$DATA/profile/profiles.xml" >/dev/null

echo
echo "Done. Next: copy tv.env.example to tv.env, set TV_IP (and CERT_PROFILE=$PROFILE), then ./deploy.sh"
