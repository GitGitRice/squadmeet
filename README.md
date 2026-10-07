# SquadMeet (working name)

A map of free public activity places, such as table tennis tables and basketball courts. Adults
announce a Meetup at a Place, and other people join it.

Final project of the Syntax course, Modul 4 (Fullstack, Backend & DevOps). Team of 3.
Presentation with live demo: **Wed 21.10.2026**.

> **State:** planning done, no code yet. The walking skeleton is due Fri 09.10.

## Team

| Person | Area |
|--------|------|
| Steven Tanu | DevOps (Docker, CI/CD, AWS, HTTPS), login, notifications |
| Stefan Kallinich | Product owner, frontend PWA (map, Meetup screens, ratings) |
| David Ludwig-Erbs | Backend API, database, OSM import, Place confirmations |

## Stack

| Part | Tool | Why |
|------|------|-----|
| Client | React + Vite as a PWA, Leaflet map | One code base for phone and laptop ([ADR-0001](docs/adr/0001-pwa-not-native-app.md)) |
| API | FastAPI + SQLModel | Course stack; the team knows it |
| Database | PostgreSQL + PostGIS | Radius queries ("Places near me") |
| Hosting | One AWS EC2 host, Docker Compose, Caddy (HTTPS) | Cheap and simple ([ADR-0002](docs/adr/0002-one-ec2-host-with-docker-compose.md)); push and location need HTTPS |
| CI/CD | GitHub Actions → GHCR → EC2 (OIDC + SSM) | No stored AWS keys, no open SSH port |

## Documentation

| File | What it holds |
|------|---------------|
| [HANDOFF.md](HANDOFF.md) | What is in flight now, decisions, next steps. Read it first. |
| [TICKETS.md](TICKETS.md) | Jira tickets per person, in start order |
| [DIARY.md](DIARY.md) | What each person did each day |
| [CONTEXT.md](CONTEXT.md) | Glossary: the domain terms we use |
| [docs/adr/](docs/adr/) | Architecture decisions |
| [BRIEF.md](BRIEF.md) | The original course brief |

Tasks are in Jira (project `SCRUM`, https://socmediaapp.atlassian.net).

## How we work

- **Branches (Gitflow):** `feature/SCRUM-<n>-<short-name>` → `dev` → `main`.
- **Commits** start with the Jira key: `SCRUM-22 add login endpoint`.
- **Done** means merged and the pipeline is green.
- **Every day:** add your line to [DIARY.md](DIARY.md).

## Run locally

_Comes with `SCRUM-16` (local skeleton)._
