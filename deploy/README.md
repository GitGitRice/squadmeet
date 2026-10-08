# Deploy (SCRUM-20, SCRUM-23)

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
| [deploy.sh](deploy.sh) | Runs on your laptop or in CI: sends `compose.yml` + `host-deploy.sh` through SSM, runs them with one image tag, then the smoke test |
| [setup-github-deploy.sh](setup-github-deploy.sh) | Creates the GitHub OIDC provider and the IAM role `squadmeet-github-deploy` for the automatic deploy |
| [ec2-user-data.sh](ec2-user-data.sh) | First boot of the EC2 host: Docker, Compose plugin (fixed version, checksum checked), 2 GB swap file |
| [../frontend/Caddyfile](../frontend/Caddyfile) | Caddy: HTTPS certificate, the static files, the proxy to the API |

## First setup on AWS

You need the AWS CLI v2, `gh` (logged in), `jq` and `dig`, and the frontend image with Caddy in
GHCR (on `dev`). Then, in the repo root:

```sh
./deploy/setup-aws.sh
```

The wizard has 10 stages. You can stop it at any time and run it again; it finds what it made
before (by the name `squadmeet`) and keeps the values in `.env.aws` (not in git).

1. **AWS login** (`aws login`) and the region (`eu-central-1`).
2. **Budget alarm** `squadmeet-monthly`: an email at 50 % of the limit used and at 100 % forecast.
   It counts costs before credits.
3. **DuckDNS:** you make the subdomain and copy the token.
4. **Secrets** in SSM Parameter Store: `/squadmeet/ghcr-token` (a classic GitHub token with only
   `read:packages`), `/squadmeet/ghcr-user`, `/squadmeet/postgres-password` (random, made once).
5. **Firewall** `squadmeet-web` (only TCP 80, TCP 443 and UDP 443) and the **IAM role**
   `squadmeet-ec2` (SSM may run commands; the host may read `/squadmeet/*`).
6. **EC2** `t2.micro` (Free Tier eligible; `t3.micro` is not in this account), Amazon Linux 2023, 20 GB, CPU credits "standard", and an **Elastic IP**.
7. **DuckDNS** points the subdomain to the Elastic IP.
8. **Deploy** with `deploy.sh` (tag `main`; before the first merge into `main`, run the wizard
   with `DEPLOY_TAG=dev`).
9. **Check** `https://<subdomain>.duckdns.org/api/health` and the map.
10. **Automatic deploy:** `setup-github-deploy.sh` creates the OIDC provider and the deploy role,
    then sets the GitHub variables `AWS_DEPLOY_ROLE_ARN`, `AWS_REGION`, `EC2_INSTANCE_ID`, `APP_DOMAIN`.

There is no SSH. For a shell on the host, use AWS SSM (needs the
[Session Manager plugin](https://docs.aws.amazon.com/systems-manager/latest/userguide/session-manager-working-with-install-plugin.html)):

```sh
aws ssm start-session --target <instance-id>
sudo -i && cd /opt/squadmeet
```

## Automatic deploy (SCRUM-23)

A merge into `main` runs the CI workflow ([../.github/workflows/ci.yml](../.github/workflows/ci.yml)):
tests → images with the tags `<commit SHA>` and `main` → job **Deploy to AWS + smoke test**.

```
GitHub Actions ──OIDC──▶ AWS role squadmeet-github-deploy ──SSM──▶ EC2: host-deploy.sh <domain> <SHA>
       └── smoke test: https://<domain>/api/health must answer with "version": "<SHA>"
```

- No AWS keys and no SSH keys in GitHub. The role trusts only runs on `main` of
  `GitGitRice/squadmeet`. It may only send `AWS-RunShellScript` to our one instance.
- A merge into `dev` builds and pushes images (tags `<SHA>` and `dev`), but does not deploy.
- `/api/health` shows the running commit: `curl https://squadmeet.duckdns.org/api/health`.

## Deploy by hand and roll back

On your laptop, logged in to AWS, in the repo root:

```sh
export AWS_REGION=eu-central-1 EC2_INSTANCE_ID=<instance-id> APP_DOMAIN=<subdomain>.duckdns.org
deploy/deploy.sh <commit SHA>      # a rollback: the SHA of an older commit on main
deploy/deploy.sh dev               # try the newest dev images on the server
```

The values are in the GitHub variables (`gh variable list`). The images of every pushed commit
stay in GHCR, so you can deploy each older SHA again. Database migrations do not go back by
themselves: a rollback over a migration needs `alembic downgrade` first.

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
