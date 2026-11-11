#!/usr/bin/env bash
# Makes Chromium launchable on a Debian/Ubuntu CI host that lacks some of its system libraries and
# where we have no sudo (`playwright install-deps` needs it). The libraries are fetched as .deb files,
# which `apt-get download` does without root, unpacked into a temporary directory and exposed through
# LD_LIBRARY_PATH (written to $GITHUB_ENV in a workflow, printed otherwise). Nothing is installed
# system-wide. Does nothing when the host already has everything.
#
# Run it AFTER `npx playwright install chromium`: it asks `ldd` which libraries the downloaded browser
# binaries cannot find (the same check Playwright makes before launching), installs the packages that
# provide them, and repeats until nothing is missing or three rounds have passed. Without a downloaded
# browser it falls back to a fixed list of the libraries a bare Ubuntu host usually lacks.
#
#   FORCE=1                 download the fixed list even if the host has it (to test the script)
#   CHROMIUM_LIBS_DIR=dir   where to unpack (default: $RUNNER_TEMP/chromium-libs, or /tmp/chromium-libs)
#   PLAYWRIGHT_BROWSERS_PATH  where Playwright keeps its browsers (default: ~/.cache/ms-playwright)
set -euo pipefail

# soname -> packages to try, in order. Ubuntu 24.04+ renames some with a t64 suffix.
declare -A KNOWN=(
  [libnspr4.so]="libnspr4"
  [libnss3.so]="libnss3"
  [libnssutil3.so]="libnss3"
  [libatk-1.0.so.0]="libatk1.0-0t64 libatk1.0-0"
  [libatk-bridge-2.0.so.0]="libatk-bridge2.0-0t64 libatk-bridge2.0-0"
  [libatspi.so.0]="libatspi2.0-0t64 libatspi2.0-0"
  [libXdamage.so.1]="libxdamage1"
  [libasound.so.2]="libasound2t64 libasound2"
  [libXRes.so.1]="libxres1"
)
MAX_ROUNDS=3
OLD_LD_LIBRARY_PATH="${LD_LIBRARY_PATH:-}"

dir="${CHROMIUM_LIBS_DIR:-${RUNNER_TEMP:-/tmp}/chromium-libs}"
browsers="${PLAYWRIGHT_BROWSERS_PATH:-$HOME/.cache/ms-playwright}"
[ "$browsers" = "0" ] && browsers=""

browser_files() {
  [ -n "$browsers" ] && [ -d "$browsers" ] || return 0
  find "$browsers" -maxdepth 1 -type d \( -name 'chromium-*' -o -name 'chromium_headless_shell-*' \) -print0 2>/dev/null |
    xargs -0 -r -I{} find {} -type f \( -name '*.so' -o -name '*.so.*' -o -perm -u+x \) 2>/dev/null
}

# Sonames the downloaded browser binaries cannot resolve with the current environment.
not_found() {
  local file
  while IFS= read -r file; do
    { ldd "$file" 2>/dev/null || true; } | sed -n 's/^[[:space:]]*\([^[:space:]]*\) => not found.*/\1/p'
  done < <(browser_files) | sort -u
}

# Fixed list: the ones in KNOWN that the host's linker cache does not list.
seed_missing() {
  local cache soname
  cache="$(/sbin/ldconfig -p 2>/dev/null || true)"
  for soname in "${!KNOWN[@]}"; do
    if [ "${FORCE:-}" = "1" ] || ! grep -q "$soname" <<<"$cache"; then echo "$soname"; fi
  done | sort -u
}

detect_browser() {
  have_browser=0
  if [ -n "$(browser_files | sed -n '1p')" ]; then have_browser=1; fi
}
detect_browser

collect_missing() {
  if [ "${FORCE:-}" = "1" ] || [ "$have_browser" -eq 0 ]; then
    seed_missing
    if [ "$have_browser" -eq 1 ]; then not_found; fi
  else
    not_found
  fi
}

export_path() {
  local triplet path
  triplet="$(gcc -dumpmachine 2>/dev/null || dpkg-architecture -qDEB_HOST_MULTIARCH 2>/dev/null || echo x86_64-linux-gnu)"
  path="$dir/root/usr/lib/$triplet:$dir/root/usr/lib/$triplet/nss:$dir/root/usr/lib"
  export LD_LIBRARY_PATH="$path${OLD_LD_LIBRARY_PATH:+:$OLD_LD_LIBRARY_PATH}"
  LIB_PATH="$path"
}

missing="$(collect_missing | sort -u)"
if [ -z "$missing" ]; then
  echo "Chromium system libraries are already present; nothing to do."
  exit 0
fi

rm -rf "$dir"
mkdir -p "$dir/apt/lists/partial" "$dir/apt/cache/archives/partial" "$dir/debs" "$dir/root"
apt_opts=(
  -o "Dir::State::Lists=$dir/apt/lists"
  -o "Dir::Cache=$dir/apt/cache"
  -o "Dir::State::status=/var/lib/dpkg/status"
  -o "Debug::NoLocking=1"
  -o "APT::Sandbox::User=root"
)
apt_updated=0
declare -A DONE=()
LIB_PATH=""

# Packages that could provide a soname: the table above, else any lib package whose name, with only
# letters and digits kept, equals the soname's (libXRes.so.1 -> libxres1), with or without t64.
candidates() {
  local soname="$1" base abi="" want
  if [ -n "${KNOWN[$soname]:-}" ]; then echo "${KNOWN[$soname]}"; return; fi
  base="${soname%%.so*}"
  case "$soname" in *.so.*) abi="${soname#*.so.}" ;; esac
  want="$(printf '%s%s' "$base" "$abi" | tr 'A-Z' 'a-z' | tr -cd 'a-z0-9')"
  apt-cache "${apt_opts[@]}" pkgnames lib 2>/dev/null |
    awk -v want="$want" '{ n = tolower($0); gsub(/[^a-z0-9]/, "", n); if (n == want || n == want "t64") print $0 }' |
    tr '\n' ' '
}

install_soname() {
  local soname="$1" names name
  names="$(candidates "$soname")"
  if [ -z "${names// /}" ]; then
    echo "No package found for $soname; install it on the runner (sudo apt-get install) or extend KNOWN." >&2
    return 1
  fi
  for name in $names; do
    if [ -n "${DONE[$name]:-}" ]; then return 0; fi
    if (cd "$dir/debs" && apt-get "${apt_opts[@]}" download -qq "$name" 2>/dev/null); then
      DONE[$name]=1
      echo "downloaded $name (for $soname)"
      return 0
    fi
  done
  echo "Could not download any of: $names (for $soname)" >&2
  return 1
}

for round in $(seq 1 "$MAX_ROUNDS"); do
  echo "Round $round, missing: $(echo $missing)"
  if [ "$apt_updated" -eq 0 ]; then
    apt-get "${apt_opts[@]}" update -qq
    apt_updated=1
  fi
  failed=0
  for soname in $missing; do install_soname "$soname" || failed=1; done
  [ "$failed" -eq 0 ] || exit 1
  for deb in "$dir"/debs/*.deb; do dpkg -x "$deb" "$dir/root"; done
  export_path
  # Look again with the new libraries on the path: they may need others. Without a browser to ldd
  # there is nothing to check against, so the fixed list is all we can do.
  detect_browser
  if [ "$have_browser" -eq 0 ]; then missing=""; break; fi
  missing="$(FORCE= not_found)"
  if [ -z "$missing" ]; then break; fi
done

if [ -n "$missing" ]; then
  echo "Still missing after $MAX_ROUNDS rounds: $(echo $missing)" >&2
  exit 1
fi

if [ -n "${GITHUB_ENV:-}" ]; then
  echo "LD_LIBRARY_PATH=$LIB_PATH${OLD_LD_LIBRARY_PATH:+:$OLD_LD_LIBRARY_PATH}" >>"$GITHUB_ENV"
  echo "LD_LIBRARY_PATH exported through GITHUB_ENV."
else
  echo "export LD_LIBRARY_PATH=\"$LIB_PATH\${LD_LIBRARY_PATH:+:\$LD_LIBRARY_PATH}\""
fi
