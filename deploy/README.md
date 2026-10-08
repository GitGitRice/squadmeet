# Deploy (SCRUM-20)

The app runs on one AWS EC2 host with Docker Compose ([ADR-0002](../docs/adr/0002-one-ec2-host-with-docker-compose.md)).
The same files work on the NAS later.

```
browser ──HTTPS──▶ web (Caddy: built React app + /api/* → backend) ──▶ backend (FastAPI) ──▶ db (PostGIS)
```

| File | What |
|------|------|
| [setup-aws.sh](setup-aws.sh) | Wizard for the first setup. You run it on your laptop; it uses the AWS CLI |
| [compose.yml](compose.yml) | The production stack. It pulls the images from GHCR; nothing is built on the host |
| [host-deploy.sh](host-deploy.sh) | Runs on the host: writes `.env`, logs in to GHCR, pulls the images, restarts the stack |
| [ec2-user-data.sh](ec2-user-data.sh) | First boot of the EC2 host: Docker, Compose plugin, 2 GB swap file |
| [../frontend/Caddyfile](../frontend/Caddyfile) | Caddy: HTTPS certificate, the static files, the proxy to the API |

## First setup on AWS

You need the AWS CLI v2, `gh` (logged in), `jq` and `dig`, and the frontend image with Caddy in
GHCR (on `dev`). Then, in the repo root:

```sh
./deploy/setup-aws.sh
```

The wizard has 9 stages. You can stop it at any time and run it again; it finds what it made
before (by the name `squadmeet`) and keeps the values in `.env.aws` (not in git).

1. **AWS login** (`aws login`) and the region (`eu-central-1`).
2. **Budget alarm** `squadmeet-monthly`: an email at 50 % of the limit used and at 100 % forecast.
   It counts costs before credits.
3. **DuckDNS:** you make the subdomain and copy the token.
4. **Secrets** in SSM Parameter Store: `/squadmeet/ghcr-token` (a classic GitHub token with only
   `read:packages`), `/squadmeet/ghcr-user`, `/squadmeet/postgres-password` (random, made once).
5. **Firewall** `squadmeet-web` (only TCP 80, TCP 443 and UDP 443) and the **IAM role**
   `squadmeet-ec2` (SSM may run commands; the host may read `/squadmeet/*`).
6. **EC2** `t3.micro`, Amazon Linux 2023, 20 GB, CPU credits "standard", and an **Elastic IP**.
7. **DuckDNS** points the subdomain to the Elastic IP.
8. **Deploy** through SSM: copies `compose.yml` and `host-deploy.sh` to `/opt/squadmeet` and runs it.
9. **Check** `https://<subdomain>.duckdns.org/api/health`, and set the GitHub variables
   `AWS_REGION`, `EC2_INSTANCE_ID` and `APP_DOMAIN` for the automatic deploy (`SCRUM-23`).

There is no SSH. For a shell on the host, use AWS SSM (needs the
[Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)):

```sh
aws ssm start-session --target <instance-id>
sudo -i && cd /opt/squadmeet
```

## Deploy a new version by hand

Until `SCRUM-23` (automatic deploy) is done: merge into `dev` (CI pushes the images with the tag
`dev`), then in a shell on the host:

```sh
bash /opt/squadmeet/host-deploy.sh <subdomain>.duckdns.org dev
```

## Troubleshooting

In a shell on the host, in `/opt/squadmeet`:

| Question | Command |
|----------|---------|
| Do all three containers run? | `docker compose ps` |
| Why does the API not start? | `docker compose logs backend` |
| No certificate? (DNS must point to the host, port 80 must be open) | `docker compose logs web` |
| Did the first boot finish? | `cloud-init status` and `/var/log/cloud-init-output.log` |
| Memory? | `free -h` (the swap file must show 2 GB) |

## Move to the NAS later

The NAS needs Docker with Compose and ports 80 and 443 forwarded from the router.

1. Copy `compose.yml` and `host-deploy.sh` to a folder on the NAS.
2. Write the `.env` by hand (same keys as in `host-deploy.sh`), and run `docker login ghcr.io` with
   a `read:packages` token. The NAS has no Parameter Store.
3. Move the data: `docker compose exec db pg_dump -U squadmeet squadmeet > dump.sql` on EC2,
   then `psql` on the NAS.
4. Point the DuckDNS subdomain to the home IP (a DuckDNS update job if the IP changes), then
   `docker compose up -d`.
5. Stop the EC2 instance and release the Elastic IP, so they cost nothing more.
