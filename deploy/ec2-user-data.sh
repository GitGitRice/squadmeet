#!/bin/bash
# EC2 user data (Amazon Linux 2023): runs once at the first boot.
# Installs Docker with the Compose plugin and adds a 2 GB swap file (t3.micro has 1 GB RAM).
set -euxo pipefail

# A fixed Compose version with its checksum, so every new host (also the NAS) gets the same one.
COMPOSE_VERSION=v5.5.1
COMPOSE_SHA256=db1889184726840f75c4f9c001048430d4f25b3be3cb084d3ddd762bc0aed576

dnf install -y docker
mkdir -p /usr/local/lib/docker/cli-plugins
curl -fsSL "https://github.com/docker/compose/releases/download/$COMPOSE_VERSION/docker-compose-linux-x86_64" \
  -o /usr/local/lib/docker/cli-plugins/docker-compose
echo "$COMPOSE_SHA256  /usr/local/lib/docker/cli-plugins/docker-compose" | sha256sum -c -
chmod +x /usr/local/lib/docker/cli-plugins/docker-compose
systemctl enable --now docker

if [ ! -f /swapfile ]; then
  dd if=/dev/zero of=/swapfile bs=1M count=2048
  chmod 600 /swapfile
  mkswap /swapfile
  swapon /swapfile
  echo '/swapfile none swap sw 0 0' >> /etc/fstab
fi

mkdir -p /opt/squadmeet
