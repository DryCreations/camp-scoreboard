#!/bin/bash
# Camp Scoreboard: double-click to install, update and run everything (macOS).
#
# The first run downloads the app into ~/CampScoreboard, plus a private copy of
# Node.js if this Mac doesn't have one. Every run after that pulls the latest
# code, starts OBS and starts the scoreboard. The real work happens in
# scripts/launch.mjs inside the app folder.
#
# Tip: install this on the Desktop by pasting into Terminal:
#   curl -fsSL https://raw.githubusercontent.com/DryCreations/camp-scoreboard/main/launchers/CampScoreboard.command -o ~/Desktop/CampScoreboard.command && chmod +x ~/Desktop/CampScoreboard.command

set -u
REPO_SLUG="DryCreations/camp-scoreboard"
BRANCH="${CAMP_BRANCH:-main}"
NODE_MAJOR="${CAMP_NODE_MAJOR:-22}"
CAMP_HOME="${CAMP_HOME:-$HOME/CampScoreboard}"
export PATH="/opt/homebrew/bin:/usr/local/bin:$PATH"

fail() {
	echo
	echo "ERROR: $*"
	echo
	read -r -p "Press Return to close this window..." _
	exit 1
}

# When this file is inside a copy of the repo (launchers/), run that copy.
SELF_DIR="$(cd "$(dirname "$0")" && pwd)"
if [ -f "$SELF_DIR/../scripts/launch.mjs" ]; then
	APP_DIR="$(cd "$SELF_DIR/.." && pwd)"
else
	APP_DIR="$CAMP_HOME/camp-scoreboard"
fi

# /usr/bin/git on a Mac is only a stub until the Xcode command line tools are
# installed, and calling it pops up an install dialog, so check for that first.
have_git() {
	local g
	g="$(command -v git 2>/dev/null)" || return 1
	[ "$g" != /usr/bin/git ] && return 0
	[ "$(uname)" != Darwin ] || xcode-select -p >/dev/null 2>&1
}

# ---- 1. Get the app (first run only) ----
if [ ! -f "$APP_DIR/package.json" ]; then
	echo "First run: downloading Camp Scoreboard into $APP_DIR"
	mkdir -p "$(dirname "$APP_DIR")"
	if have_git; then
		git clone --branch "$BRANCH" "https://github.com/$REPO_SLUG.git" "$APP_DIR" \
			|| fail "Could not download the app. Check the internet connection and try again."
	else
		tmp="$(mktemp -d)"
		curl -fL --retry 3 -o "$tmp/src.tar.gz" "https://codeload.github.com/$REPO_SLUG/tar.gz/refs/heads/$BRANCH" \
			|| fail "Could not download the app. Check the internet connection and try again."
		mkdir -p "$APP_DIR"
		tar -xzf "$tmp/src.tar.gz" -C "$APP_DIR" --strip-components=1 || fail "Could not unpack the app."
		rm -rf "$tmp"
	fi
fi

# ---- 2. Find Node.js 20+, or download a private copy ----
node_ok() { [ -x "$1" ] && "$1" -e 'process.exit(+process.versions.node.split(".")[0] >= 20 ? 0 : 1)' >/dev/null 2>&1; }

NODE=""
if node_ok "$CAMP_HOME/node/bin/node"; then
	NODE="$CAMP_HOME/node/bin/node"
elif command -v node >/dev/null 2>&1 && node_ok "$(command -v node)"; then
	NODE="$(command -v node)"
else
	echo "Downloading Node.js $NODE_MAJOR (one time only)..."
	case "$(uname -s)" in Darwin) os=darwin ;; *) os=linux ;; esac
	case "$(uname -m)" in arm64 | aarch64) arch=arm64 ;; *) arch=x64 ;; esac
	base="https://nodejs.org/dist/latest-v${NODE_MAJOR}.x"
	tmp="$(mktemp -d)"
	curl -fsSL -o "$tmp/SHASUMS256.txt" "$base/SHASUMS256.txt" || fail "Could not download Node.js. Check the internet connection."
	file="$(grep -E " node-v[0-9.]+-$os-$arch\.tar\.gz$" "$tmp/SHASUMS256.txt" | awk '{print $2}' | head -n 1)"
	[ -n "$file" ] || fail "Could not find a Node.js download for $os-$arch."
	curl -fL --retry 3 -o "$tmp/$file" "$base/$file" || fail "Could not download Node.js."
	(cd "$tmp" && grep " $file\$" SHASUMS256.txt | shasum -a 256 -c - >/dev/null) || fail "Node.js download was corrupted; try again."
	rm -rf "$CAMP_HOME/node" && mkdir -p "$CAMP_HOME/node"
	tar -xzf "$tmp/$file" -C "$CAMP_HOME/node" --strip-components=1 || fail "Could not unpack Node.js."
	rm -rf "$tmp"
	NODE="$CAMP_HOME/node/bin/node"
fi
export PATH="$(dirname "$NODE"):$PATH"

# ---- 3. Hand off to the shared launcher ----
cd "$APP_DIR" || fail "Could not open $APP_DIR"
# Copies installed before the launcher existed need one pull to get it.
if [ ! -f scripts/launch.mjs ] && [ -d .git ] && have_git; then git pull --ff-only; fi
[ -f scripts/launch.mjs ] || fail "$APP_DIR is missing scripts/launch.mjs. Delete that folder and run this again."

"$NODE" scripts/launch.mjs "$@"
status=$?
if [ $status -ne 0 ]; then
	echo
	read -r -p "Something went wrong (see above). Press Return to close this window..." _
fi
exit $status
