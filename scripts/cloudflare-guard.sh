#!/usr/bin/env bash
# Keeps Cloudflare from putting a "Just a moment..." challenge in front of
# Buzzyfly. Runs after every production deploy (.github/workflows/deploy.yml).
#
# A challenge page stops Stripe from delivering checkout webhooks to
# /api/webhook (so paid orders are never fulfilled) and hides the site from
# search engines. This script:
#   1. turns "I'm Under Attack" mode back down to medium,
#   2. turns Bot Fight Mode off (it challenges Stripe and cannot be bypassed),
#   3. adds a WAF skip rule so custom challenge rules never apply to
#      /api/webhook, and lists any other challenge rules in the log.
# It never deletes or disables a rule the owner wrote.
#
# Needs CLOUDFLARE_API_TOKEN with Zone Settings: Edit, Zone WAF: Edit and
# Bot Management: Edit on the zone. A missing permission is reported and that
# step is skipped; it does not stop the others.
set -euo pipefail

API="${CF_API:-https://api.cloudflare.com/client/v4}"
ZONE_NAME="${CF_ZONE_NAME:-buzzyfly.com}"
WEBHOOK_PATH="/api/webhook"
SKIP_REF="buzzyfly_webhook_skip"
: "${CLOUDFLARE_API_TOKEN:?CLOUDFLARE_API_TOKEN is not set}"

warn() { echo "::warning::$*"; }
note() { echo "cloudflare-guard: $*"; }

# cf METHOD PATH [JSON_BODY] -> prints the response body; returns 1 unless .success is true.
cf() {
	local method="$1" path="$2" body="${3:-}" out
	if [[ -n "$body" ]]; then
		out=$(curl -sS -X "$method" "$API$path" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN" -H "Content-Type: application/json" --data "$body")
	else
		out=$(curl -sS -X "$method" "$API$path" -H "Authorization: Bearer $CLOUDFLARE_API_TOKEN")
	fi
	echo "$out"
	[[ "$(jq -r '.success // false' <<<"$out" 2>/dev/null)" == "true" ]]
}
errors() { jq -r '[.errors[]?.message] | join("; ")' <<<"$1" 2>/dev/null || echo "$1"; }

zone_out=$(cf GET "/zones?name=$ZONE_NAME") || { echo "::error::Could not look up zone $ZONE_NAME: $(errors "$zone_out")"; exit 1; }
ZONE=$(jq -r '.result[0].id // empty' <<<"$zone_out")
[[ -n "$ZONE" ]] || { echo "::error::The token cannot see the zone $ZONE_NAME. Give it access to that zone."; exit 1; }
note "zone $ZONE_NAME ($ZONE)"

# 1. Security level: "under_attack" challenges every visitor.
if level_out=$(cf GET "/zones/$ZONE/settings/security_level"); then
	level=$(jq -r '.result.value' <<<"$level_out")
	if [[ "$level" == "under_attack" ]]; then
		if fix_out=$(cf PATCH "/zones/$ZONE/settings/security_level" '{"value":"medium"}'); then
			note "I'm Under Attack mode was on. Set security level to medium."
		else
			warn "I'm Under Attack mode is on and could not be turned off: $(errors "$fix_out")"
		fi
	else
		note "security level is $level (ok)"
	fi
else
	warn "Could not read the security level (token needs Zone Settings: Edit): $(errors "$level_out")"
fi

# 2. Bot Fight Mode challenges automated clients like Stripe's webhook sender.
if bot_out=$(cf GET "/zones/$ZONE/bot_management"); then
	if [[ "$(jq -r '.result.fight_mode // false' <<<"$bot_out")" == "true" ]]; then
		if fix_out=$(cf PUT "/zones/$ZONE/bot_management" '{"fight_mode":false}'); then
			note "Bot Fight Mode was on. Turned it off so Stripe can reach $WEBHOOK_PATH."
		else
			warn "Bot Fight Mode is on and could not be turned off: $(errors "$fix_out")"
		fi
	else
		note "Bot Fight Mode is off (ok)"
	fi
else
	warn "Could not read Bot Fight Mode (token needs Bot Management: Edit): $(errors "$bot_out")"
fi

# 3. WAF custom rules: keep the webhook path out of every challenge rule.
if rs_out=$(cf GET "/zones/$ZONE/rulesets/phases/http_request_firewall_custom/entrypoint"); then
	RULESET=$(jq -r '.result.id' <<<"$rs_out")
	challenges=$(jq -r '[.result.rules[]? | select(.enabled != false and (.action == "managed_challenge" or .action == "challenge" or .action == "js_challenge"))] | length' <<<"$rs_out")
	if [[ "$challenges" -gt 0 ]]; then
		jq -r '.result.rules[]? | select(.enabled != false and (.action == "managed_challenge" or .action == "challenge" or .action == "js_challenge")) | "  - \(.description // "(no description)") [\(.action)]: \(.expression)"' <<<"$rs_out" |
			while IFS= read -r line; do warn "WAF challenge rule:$line"; done
		if jq -e --arg ref "$SKIP_REF" '.result.rules[]? | select(.ref == $ref)' <<<"$rs_out" >/dev/null; then
			note "webhook skip rule already in place"
		else
			rule=$(jq -nc --arg ref "$SKIP_REF" --arg path "$WEBHOOK_PATH" '{
				ref: $ref,
				description: "Let Stripe reach the Buzzyfly payment webhook (added by cloudflare-guard)",
				expression: ("(http.request.uri.path eq \"" + $path + "\")"),
				action: "skip",
				action_parameters: { ruleset: "current" },
				logging: { enabled: true },
				position: { index: 1 }
			}')
			if fix_out=$(cf POST "/zones/$ZONE/rulesets/$RULESET/rules" "$rule"); then
				note "Added a WAF skip rule so challenge rules never apply to $WEBHOOK_PATH."
			else
				warn "Could not add the webhook skip rule (token needs Zone WAF: Edit): $(errors "$fix_out")"
			fi
		fi
	else
		note "no WAF challenge rules (ok)"
	fi
elif [[ "$(jq -r '[.errors[]?.code] | any(. == 10003)' <<<"$rs_out" 2>/dev/null)" == "true" ]] || grep -qi "could not find entrypoint" <<<"$rs_out"; then
	note "no WAF custom rules (ok)"
else
	warn "Could not read WAF custom rules (token needs Zone WAF: Edit): $(errors "$rs_out")"
fi
