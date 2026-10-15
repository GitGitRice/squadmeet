#!/usr/bin/env bash
# Creates (or updates) the SSM document squadmeet-deploy (SCRUM-47). It is the only command
# that the deploy role may send to the host. It takes one parameter, the image tag (a full
# commit SHA, or "main" / "dev"). On the host it:
#   1. logs in to GHCR with the token from Parameter Store,
#   2. pulls ghcr.io/<owner>/squadmeet-deploy:<tag> (deploy/Dockerfile),
#   3. copies compose.yml and host-deploy.sh out of it to /opt/squadmeet,
#   4. runs host-deploy.sh <domain> <tag> <owner>.
# The domain, the image owner and the region are fixed in the document. Run this again only
# when they or the steps above change; a change to compose.yml or host-deploy.sh ships with
# the image.
# Safe to run again. The setup wizard (setup-aws.sh, stage 8) runs it.
#
# Usage: deploy/setup-deploy-document.sh <domain> <image-owner>   (AWS_REGION must be set)
#   image-owner: the GHCR account of the images, lowercase (the repo's owner, SCRUM-48).
# Needs: aws (CLI v2, logged in), jq.
set -euo pipefail

DOMAIN="${1:?Usage: deploy/setup-deploy-document.sh <domain> <image-owner>}"
OWNER="${2:?Usage: deploy/setup-deploy-document.sh <domain> <image-owner>}"
: "${AWS_REGION:?}"
export AWS_REGION
DOCUMENT="squadmeet-deploy"

# The domain goes into a shell command on the host, so allow only a plain host name.
[[ "$DOMAIN" =~ ^[a-z0-9.-]+$ ]] || { echo "✗ Not a plain domain: $DOMAIN" >&2; exit 1; }
# The same for the owner; GHCR names are lowercase.
[[ "$OWNER" =~ ^[a-z0-9-]+$ ]] || { echo "✗ Not a lowercase GHCR owner: $OWNER" >&2; exit 1; }

# SSM checks allowedPattern before it puts {{ tag }} into the commands, so the tag cannot
# carry shell code. cloud-init: on the first boot Docker may not be ready yet.
content=$(jq -n --arg domain "$DOMAIN" --arg owner "$OWNER" --arg region "$AWS_REGION" '{
  schemaVersion: "2.2",
  description: "Deploys one image tag of Squadmeet (SCRUM-47)",
  parameters: {
    tag: {
      type: "String",
      description: "Image tag: a full commit SHA, or main / dev",
      allowedPattern: "^([0-9a-f]{40}|main|dev)$"}},
  mainSteps: [{
    action: "aws:runShellScript",
    name: "deploy",
    inputs: {
      timeoutSeconds: "1800",
      runCommand: [
        "set -eu",
        "cloud-init status --wait > /dev/null || true",
        "export AWS_DEFAULT_REGION=\($region)",
        "user=$(aws ssm get-parameter --name /squadmeet/ghcr-user --with-decryption --query Parameter.Value --output text)",
        "token=$(aws ssm get-parameter --name /squadmeet/ghcr-token --with-decryption --query Parameter.Value --output text)",
        "echo \"$token\" | docker login ghcr.io -u \"$user\" --password-stdin",
        "image=ghcr.io/\($owner)/squadmeet-deploy:{{ tag }}",
        "docker pull --quiet \"$image\"",
        "mkdir -p /opt/squadmeet",
        "container=$(docker create \"$image\" none)",
        "docker cp \"$container:/compose.yml\" /opt/squadmeet/compose.yml",
        "docker cp \"$container:/host-deploy.sh\" /opt/squadmeet/host-deploy.sh",
        "docker rm \"$container\" > /dev/null",
        "bash /opt/squadmeet/host-deploy.sh \($domain) {{ tag }} \($owner)"]}}]}')

if aws ssm describe-document --name "$DOCUMENT" >/dev/null 2>&1; then
  # update-document fails when the content did not change; that is fine.
  # shellcheck disable=SC2016  # $LATEST is an SSM keyword, not a shell variable
  if version=$(aws ssm update-document --name "$DOCUMENT" --content "$content" \
      --document-format JSON --document-version '$LATEST' \
      --query DocumentDescription.DocumentVersion --output text 2>&1); then
    aws ssm update-document-default-version --name "$DOCUMENT" --document-version "$version" >/dev/null
    echo "✓ SSM document $DOCUMENT updated (version $version)"
  elif [[ "$version" == *DuplicateDocumentContent* ]]; then
    echo "✓ SSM document $DOCUMENT exists, no change"
  else
    echo "✗ $version" >&2
    exit 1
  fi
else
  aws ssm create-document --name "$DOCUMENT" --document-type Command --document-format JSON \
    --content "$content" >/dev/null
  echo "✓ SSM document $DOCUMENT created"
fi
