#!/usr/bin/env bash
# Makes Chromium launchable on a Debian/Ubuntu CI host that lacks its system libraries and where we
# have no sudo (`playwright install-deps` needs it). The libraries are fetched as .deb files, which
# `apt-get download` does without root, unpacked into a temporary directory and exposed through
# LD_LIBRARY_PATH (written to $GITHUB_ENV in a workflow, printed otherwise). Nothing is installed
# system-wide. Does nothing when the host already has every library.
#
#   FORCE=1                force the download even if the libraries are present (to test the script)
#   CHROMIUM_LIBS_DIR=dir  where to unpack (default: $RUNNER_TEMP/chromium-libs, or /tmp/chromium-libs)
set -euo pipefail

# The libraries Playwright reports as missing on a bare Ubuntu host.
LIBRARIES=(libnspr4.so libnss3.so libnssutil3.so libatk-1.0.so.0 libatk-bridge-2.0.so.0 libatspi.so.0 libXdamage.so.1 libasound.so.2)
# Package names; Ubuntu 24.04 and later rename some with a t64 suffix, so each tries both spellings.
PACKAGES=("libnspr4" "libnss3" "libatk1.0-0t64 libatk1.0-0" "libatk-bridge2.0-0t64 libatk-bridge2.0-0" "libatspi2.0-0t64 libatspi2.0-0" "libxdamage1" "libasound2t64 libasound2")

dir="${CHROMIUM_LIBS_DIR:-${RUNNER_TEMP:-/tmp}/chromium-libs}"

missing=()
if [ "${FORCE:-}" = "1" ]; then
  missing=("${LIBRARIES[@]}")
else
  cache="$(/sbin/ldconfig -p 2>/dev/null || true)"
  for library in "${LIBRARIES[@]}"; do
    grep -q "$library" <<<"$cache" || missing+=("$library")
  done
fi

if [ "${#missing[@]}" -eq 0 ]; then
  echo "Chromium system libraries are already present; nothing to do."
  exit 0
fi
echo "Missing on this host: ${missing[*]}"

rm -rf "$dir"
mkdir -p "$dir/apt/lists/partial" "$dir/apt/cache/archives/partial" "$dir/debs" "$dir/root"
apt=(apt-get
  -o "Dir::State::Lists=$dir/apt/lists"
  -o "Dir::Cache=$dir/apt/cache"
  -o "Dir::State::status=/var/lib/dpkg/status"
  -o "Debug::NoLocking=1"
  -o "APT::Sandbox::User=root")

"${apt[@]}" update -qq
(
  cd "$dir/debs"
  for names in "${PACKAGES[@]}"; do
    fetched=0
    for name in $names; do
      if "${apt[@]}" download -qq "$name" 2>/dev/null; then fetched=1; echo "downloaded $name"; break; fi
    done
    if [ "$fetched" -ne 1 ]; then echo "could not download any of: $names" >&2; exit 1; fi
  done
)
for deb in "$dir"/debs/*.deb; do dpkg -x "$deb" "$dir/root"; done

# Debian multiarch directory for this machine (x86_64-linux-gnu, aarch64-linux-gnu, ...).
triplet="$(gcc -dumpmachine 2>/dev/null || dpkg-architecture -qDEB_HOST_MULTIARCH 2>/dev/null || echo x86_64-linux-gnu)"
path="$dir/root/usr/lib/$triplet:$dir/root/usr/lib/$triplet/nss:$dir/root/usr/lib"
if [ -n "${GITHUB_ENV:-}" ]; then
  echo "LD_LIBRARY_PATH=$path${LD_LIBRARY_PATH:+:$LD_LIBRARY_PATH}" >>"$GITHUB_ENV"
  echo "LD_LIBRARY_PATH exported through GITHUB_ENV."
else
  echo "export LD_LIBRARY_PATH=\"$path\${LD_LIBRARY_PATH:+:\$LD_LIBRARY_PATH}\""
fi
