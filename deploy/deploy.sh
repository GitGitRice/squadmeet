#!/usr/bin/env bash
# Deploys one image tag to the EC2 host through AWS SSM, then runs the smoke test (SCRUM-23).
# CI runs it after a merge into main; the setup wizard runs it for the first deploy.
# A rollback is the same command with an older commit SHA (its images are still in GHCR).
# Only SHAs from SCRUM-47 on have the squadmeet-deploy image, so a rollback cannot go back
# further (see deploy/README.md).
#
# Usage: deploy/deploy.sh <image-tag>      (a full commit SHA, or "main" / "dev")
# Needs: aws (CLI v2, logged in), jq, curl, and the env variables
#   AWS_REGION, EC2_INSTANCE_ID, APP_DOMAIN (GitHub variables of the same names).
set -euo pipefail

TAG="${1:?Usage: deploy/deploy.sh <image-tag>}"
: "${AWS_REGION:?}" "${EC2_INSTANCE_ID:?}" "${APP_DOMAIN:?}"
export AWS_REGION

# The same pattern as in the SSM document; checked here too for a clear error message.
[[ "$TAG" =~ ^([0-9a-f]{40}|main|dev)$ ]] \
  || { echo "✗ The tag must be a full commit SHA, or main / dev: $TAG" >&2; exit 1; }

# The SSM document squadmeet-deploy (deploy/setup-deploy-document.sh) takes the
# compose.yml and host-deploy.sh of this tag from the image squadmeet-deploy and runs them.
# The deploy role may send only this document (SCRUM-47).
echo "Deploying $TAG to $EC2_INSTANCE_ID ($APP_DOMAIN) …"
command_id=$(aws ssm send-command --instance-ids "$EC2_INSTANCE_ID" \
  --document-name squadmeet-deploy --comment "squadmeet deploy $TAG" \
  --parameters "tag=$TAG" --query Command.CommandId --output text)

# Wait at most 35 minutes (the host command itself stops after 30, executionTimeout).
# Right after send-command the invocation may not exist yet, so a few errors are normal;
# 6 errors in a row (1 minute) mean a real problem, e.g. a missing permission.
status=Pending
errors=0
for _ in $(seq 1 210); do
  sleep 10
  if status=$(aws ssm get-command-invocation --command-id "$command_id" \
      --instance-id "$EC2_INSTANCE_ID" --query Status --output text 2>&1); then
    errors=0
  else
    errors=$((errors + 1))
    if (( errors >= 6 )); then
      echo "✗ get-command-invocation failed 6 times in a row: $status" >&2
      exit 1
    fi
    status=Pending
  fi
  echo "  … $status"
  [[ "$status" =~ ^(Pending|InProgress|Delayed)$ ]] || break
done
aws ssm get-command-invocation --command-id "$command_id" --instance-id "$EC2_INSTANCE_ID" \
  --query '[StandardOutputContent,StandardErrorContent]' --output text | tail -n 25
[[ "$status" == Success ]] || { echo "✗ The deploy on the host ended with '$status'." >&2; exit 1; }

# Smoke test over HTTPS (curl checks the certificate). A full SHA must answer as the
# version, so the old container cannot pass; for "main"/"dev" any healthy answer counts.
echo "Smoke test: https://$APP_DOMAIN/api/health …"
for _ in $(seq 1 18); do
  health=$(curl -fsS --max-time 10 "https://$APP_DOMAIN/api/health" 2>/dev/null || echo '{}')
  if [[ "$(jq -r .status <<<"$health" 2>/dev/null)" == ok ]]; then
    version=$(jq -r '.version // empty' <<<"$health")
    if [[ ! "$TAG" =~ ^[0-9a-f]{40}$ || "$version" == "$TAG" ]]; then
      echo "✓ https://$APP_DOMAIN answers: $health"
      exit 0
    fi
  fi
  sleep 10
done
echo "✗ https://$APP_DOMAIN/api/health did not answer with version $TAG within 3 minutes." >&2
echo "  Last answer: $health. See deploy/README.md → Troubleshooting." >&2
exit 1
