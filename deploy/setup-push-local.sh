#!/usr/bin/env bash
# Configure a local VAPID key pair in the ignored root .env (SCRUM-44).
# Existing non-Push settings are preserved; existing complete Push keys are kept.
# Usage: deploy/setup-push-local.sh   (run from the repository root)
set -euo pipefail

[[ -f docker-compose.yml ]] || { echo "Run this from the repository root." >&2; exit 1; }
if [[ -f .env ]] \
  && grep -Eq '^VAPID_PRIVATE_KEY=.+$' .env \
  && grep -Eq '^VAPID_PUBLIC_KEY=.+$' .env; then
  echo "✓ Local VAPID keys already exist in .env."
  exit 0
fi

key_output=$(docker compose run --rm --no-deps backend python -m app.vapid_keys)
private_key=""
public_key=""
while IFS='=' read -r name value; do
  case "$name" in
    VAPID_PRIVATE_KEY) private_key=$value ;;
    VAPID_PUBLIC_KEY) public_key=$value ;;
  esac
done <<< "$key_output"
[[ -n "$private_key" && -n "$public_key" ]] \
  || { echo "Could not generate VAPID keys." >&2; exit 1; }

target=.env
temporary=$(mktemp "${TMPDIR:-/tmp}/squadmeet-push.XXXXXX")
trap 'rm -f "$temporary"' EXIT
if [[ -f "$target" ]]; then
  awk '!/^VAPID_(PRIVATE_KEY|PUBLIC_KEY|SUBJECT)=/' "$target" > "$temporary"
fi
{
  printf '\nVAPID_PRIVATE_KEY=%s\n' "$private_key"
  printf 'VAPID_PUBLIC_KEY=%s\n' "$public_key"
  printf 'VAPID_SUBJECT=mailto:admin@squadmeet.duckdns.org\n'
} >> "$temporary"
mv "$temporary" "$target"
chmod 600 "$target"
trap - EXIT
unset key_output private_key public_key

echo "✓ Local VAPID keys written to the ignored .env."
echo "Run: docker compose up -d --force-recreate backend"
