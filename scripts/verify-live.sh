#!/usr/bin/env bash
# Checks the live site the way Stripe and search engines see it: from a server,
# with no JavaScript. Fails the deploy if Cloudflare serves its "Just a
# moment..." challenge instead of Buzzyfly, or if a key page is missing.
# Retries for a minute so a fresh deploy has time to reach every edge.
set -uo pipefail

BASE="${SITE_URL:-https://buzzyfly.com}"
# path  expected-status (the webhook only accepts POST, so any non-blocked status is fine)
CHECKS=(
	"/store 200"
	"/drop/manifest.webmanifest 200"
	"/drop/ 402"
	"/api/webhook any"
)

challenged() { grep -qiE "Just a moment|cf-chl|challenge-platform" <<<"$1"; }

failures=()
for attempt in $(seq 1 "${VERIFY_ATTEMPTS:-6}"); do
	failures=()
	for check in "${CHECKS[@]}"; do
		read -r path want <<<"$check"
		body=$(curl -sS -m 20 -A "Buzzyfly-deploy-check" -w $'\n%{http_code}' "$BASE$path" 2>&1) || true
		status="${body##*$'\n'}"
		body="${body%$'\n'*}"
		if challenged "$body"; then
			failures+=("$path: Cloudflare challenge page (\"Just a moment...\") instead of the site")
		elif [[ "$path" == "/api/webhook" && "$status" =~ ^(403|429|503)$ ]]; then
			failures+=("$path: blocked with HTTP $status, so Stripe cannot deliver orders")
		elif [[ "$path" != "/api/webhook" && "$status" != "$want" ]]; then
			failures+=("$path: HTTP $status, expected $want")
		fi
	done
	[[ ${#failures[@]} -eq 0 ]] && break
	if [[ $attempt -lt ${VERIFY_ATTEMPTS:-6} ]]; then
		echo "verify-live: attempt $attempt found ${#failures[@]} problem(s); retrying in 10s"
		sleep 10
	fi
done

if [[ ${#failures[@]} -gt 0 ]]; then
	for f in "${failures[@]}"; do echo "::error::$f"; done
	echo "::error::The live site is not reachable the way Stripe and search engines see it. See the cloudflare-guard step above for the setting that is still on."
	exit 1
fi
echo "verify-live: $BASE serves Buzzyfly to servers (no challenge), and Stripe can reach /api/webhook."
