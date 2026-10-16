#!/usr/bin/env bash
# Generate one VAPID key pair and store it in AWS Parameter Store (SCRUM-44).
# The private key is captured directly and never printed or written into the repo.
# Replacing an existing pair invalidates browser subscriptions, so this asks first.
#
# Usage: deploy/setup-push.sh   (AWS_REGION must be set; run from the repository root)
# Needs: aws (CLI v2, logged in), Docker Compose.
set -euo pipefail

: "${AWS_REGION:?Set AWS_REGION, for example eu-central-1}"
export AWS_REGION AWS_DEFAULT_REGION="$AWS_REGION"
NAME="squadmeet"

if aws ssm get-parameter --name "/$NAME/vapid-private-key" >/dev/null 2>&1; then
  read -r -p "VAPID keys already exist. Replace them and invalidate existing Push subscriptions? [y/N] " answer
  [[ "$answer" =~ ^[Yy]$ ]] || { echo "Kept existing VAPID keys."; exit 0; }
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

[[ -n "$private_key" && -n "$public_key" && "$private_key" != "$public_key" ]] \
  || { echo "Could not generate VAPID keys." >&2; exit 1; }
aws ssm put-parameter --name "/$NAME/vapid-private-key" --type SecureString \
  --value "$private_key" --overwrite >/dev/null
aws ssm put-parameter --name "/$NAME/vapid-public-key" --type String \
  --value "$public_key" --overwrite >/dev/null
unset key_output private_key public_key

echo "✓ VAPID public key and private secret stored in Parameter Store."
echo "Deploy again; then users can turn on Push in Konto → Push-Benachrichtigungen."
