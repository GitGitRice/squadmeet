#!/usr/bin/env bash
# Runs on the EC2 host as root (sent through AWS SSM). Writes the .env, logs in to GHCR,
# pulls the images and (re)starts the stack in /opt/squadmeet.
# The secrets come from SSM Parameter Store (/squadmeet/*); the host's IAM role may read them.
#
# Usage: host-deploy.sh <domain> <image-tag>   (a commit SHA, or "main" / "dev")
set -euo pipefail

DOMAIN="$1"
IMAGE_TAG="${2:?Usage: host-deploy.sh <domain> <image-tag>}"
cd /opt/squadmeet

# The AWS CLI on the host needs the region; the instance metadata (IMDSv2) knows it.
imds_token=$(curl -fsS -X PUT http://169.254.169.254/latest/api/token \
  -H "X-aws-ec2-metadata-token-ttl-seconds: 60")
AWS_DEFAULT_REGION=$(curl -fsS -H "X-aws-ec2-metadata-token: $imds_token" \
  http://169.254.169.254/latest/meta-data/placement/region)
export AWS_DEFAULT_REGION

param() {
  aws ssm get-parameter --name "$1" --with-decryption --query Parameter.Value --output text
}

umask 077
cat > .env <<EOF
DOMAIN=$DOMAIN
IMAGE_TAG=$IMAGE_TAG
POSTGRES_USER=squadmeet
POSTGRES_DB=squadmeet
POSTGRES_PASSWORD=$(param /squadmeet/postgres-password)
TURNSTILE_SITE_KEY=$(param /squadmeet/turnstile-site-key)
TURNSTILE_SECRET_KEY=$(param /squadmeet/turnstile-secret-key)
EOF

param /squadmeet/ghcr-token | docker login ghcr.io -u "$(param /squadmeet/ghcr-user)" --password-stdin

docker compose pull
docker compose up -d --remove-orphans
docker image prune -f
docker compose ps
