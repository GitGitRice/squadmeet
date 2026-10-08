#!/usr/bin/env bash
# Deploys one image tag to the EC2 host through AWS SSM, then runs the smoke test (SCRUM-23).
# CI runs it after a merge into main; the setup wizard runs it for the first deploy.
# A rollback is the same command with an older commit SHA (its images are still in GHCR).
#
# Usage: deploy/deploy.sh <image-tag>      (a full commit SHA, or "main" / "dev")
# Needs: aws (CLI v2, logged in), jq, curl, and the env variables
#   AWS_REGION, EC2_INSTANCE_ID, APP_DOMAIN (GitHub variables of the same names).
set -euo pipefail

TAG="${1:?Usage: deploy/deploy.sh <image-tag>}"
: "${AWS_REGION:?}" "${EC2_INSTANCE_ID:?}" "${APP_DOMAIN:?}"
export AWS_REGION
cd "$(dirname "$0")"

# Send the current compose.yml and host-deploy.sh with the command, so a change to them
# ships with the same deploy. cloud-init: on the first boot Docker may not be ready yet.
params=$(jq -n \
  --arg compose "$(base64 < compose.yml | tr -d '\n')" \
  --arg script "$(base64 < host-deploy.sh | tr -d '\n')" \
  --arg domain "$APP_DOMAIN" --arg tag "$TAG" '{
  commands: [
    "cloud-init status --wait > /dev/null || true",
    "mkdir -p /opt/squadmeet",
    "echo \($compose) | base64 -d > /opt/squadmeet/compose.yml",
    "echo \($script) | base64 -d > /opt/squadmeet/host-deploy.sh",
    "bash /opt/squadmeet/host-deploy.sh \($domain) \($tag)"],
  executionTimeout: ["1800"]}')

echo "Deploying $TAG to $EC2_INSTANCE_ID ($APP_DOMAIN) …"
command_id=$(aws ssm send-command --instance-ids "$EC2_INSTANCE_ID" \
  --document-name AWS-RunShellScript --comment "squadmeet deploy ${TAG:0:40}" \
  --parameters "$params" --query Command.CommandId --output text)

status=Pending
while [[ "$status" =~ ^(Pending|InProgress|Delayed)$ ]]; do
  sleep 10
  status=$(aws ssm get-command-invocation --command-id "$command_id" \
    --instance-id "$EC2_INSTANCE_ID" --query Status --output text 2>/dev/null || echo Pending)
  echo "  … $status"
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
