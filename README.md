# SquadMeet (working name)

A map of free public activity places, such as table tennis tables and basketball courts. Adults
announce a Meetup at a Place, and other people join it.

Final project of the Syntax course, Modul 4 (Fullstack, Backend & DevOps). Team of 2 (since 2026-10-08).
Presentation with live demo: **Wed 21.10.2026**.

> **State:** live at https://squadmeet.duckdns.org (`SCRUM-20`, AWS host). A merge into `main`
> deploys automatically (`SCRUM-23`); the first automatic run comes with the next release into `main`.

## Team

| Person | Area |
|--------|------|
| Steven Tanu | DevOps (Docker, CI/CD, AWS, HTTPS), login, notifications |
| Stefan Kallinich | Product owner, frontend PWA (map, Meetup screens, ratings) |

David Ludwig-Erbs left the project on 2026-10-08. His tickets are split between Steven and
Stefan (`SCRUM-46`); who does what is in [TICKETS.md](TICKETS.md).

## Stack

| Part | Tool | Why |
|------|------|-----|
| Client | React + TypeScript + Vite as a PWA, Leaflet map | One code base for phone and laptop ([ADR-0001](docs/adr/0001-pwa-not-native-app.md)) |
| API | FastAPI + SQLModel, Alembic migrations | Course stack; the team knows it. Alembic keeps the EC2 data on schema changes |
| Database | PostgreSQL + PostGIS | Radius queries ("Places near me") |
| Hosting | One AWS EC2 host, Docker Compose, Caddy (HTTPS) | Cheap and simple ([ADR-0002](docs/adr/0002-one-ec2-host-with-docker-compose.md)); push and location need HTTPS |
| CI/CD | GitHub Actions → GHCR → EC2 (OIDC + SSM) | No stored AWS keys, no open SSH port |

## Documentation

| File | What it holds |
|------|---------------|
| [HANDOFF.md](HANDOFF.md) | Shared handoff: rules, team, Jira, decisions, debugging case. Read it first. Your own progress goes in `HANDOFF.local.md` (not in git). |
| [TICKETS.md](TICKETS.md) | Jira tickets per person, in start order |
| [DIARY.md](DIARY.md) | What each person did each day |
| [CONTEXT.md](CONTEXT.md) | Glossary: the domain terms we use |
| [docs/adr/](docs/adr/) | Architecture decisions |
| [deploy/README.md](deploy/README.md) | How the app runs on AWS, the setup wizard, the move to the NAS |
| [BRIEF.md](BRIEF.md) | The original course brief |

Tasks are in Jira (project `SCRUM`, https://socmediaapp.atlassian.net).

## How we work

- **Branches (Gitflow):** `feature/SCRUM-<n>-<short-name>` → `dev` → `main`.
- **Release:** a PR from `dev` into `main`. Merge it with **Create a merge commit**, not with
  squash. A squash commit is not in `dev`, so the next release PR shows the old commits again.
  A merge into `main` deploys to AWS.
- **Commits** start with the Jira key: `SCRUM-22 add login endpoint`.
- **Done** means merged and the pipeline is green.
- **Every day:** add your line to [DIARY.md](DIARY.md).

## Run locally

You need Docker Desktop. Then, in the repo root:

```sh
docker compose up --build
```

| What | URL |
|------|-----|
| Map (frontend) | http://localhost:5173 |
| API health | http://localhost:8000/api/health |
| API docs | http://localhost:8000/docs |
| Database | `localhost:5432`, user, password and DB `squadmeet` (change with `.env`, see `.env.example`) |

On start, the backend runs the Alembic migrations and loads the Places from
`backend/data/osm/*.json` (OpenStreetMap snapshots). Code changes in `backend/` and `frontend/`
reload without a rebuild. After a change to
`requirements*.txt` or `package.json`, run `docker compose up --build` again.
`docker compose down -v` also deletes the database.

### Places from OpenStreetMap

The Places come from a snapshot file per city in `backend/data/osm/` (Leipzig, Erfurt, Hannover,
Stuttgart, Potsdam), so a start never needs the (often busy) public Overpass servers. To refresh
a city or add one, fetch it and commit the file:

```sh
docker compose exec backend python -m app.osm_import fetch Leipzig
```

Each start (`app.seed`) loads the snapshots again: new Places are added, known ones (same OSM
id and Activity type) get the new name and location and keep their database id, and no Place is
ever deleted, because it may already have Ratings or Meetups. The log says how many were new,
refreshed and kept. A city name must match exactly one German municipality.

Private, paid and indoor places are skipped ([backend/app/osm_import.py](backend/app/osm_import.py)).
Map data © OpenStreetMap contributors (ODbL); the map shows the attribution.

### Tests

```sh
docker compose exec backend pytest        # backend (pytest)
cd frontend && npm install && npm test    # frontend (Vitest)
```

The backend tests need the running, migrated database. Each test runs in one transaction that
is rolled back at the end, so the tests leave no data behind
([backend/tests/conftest.py](backend/tests/conftest.py)).

### Database schema changes (Alembic)

Change the models in `backend/app/models.py`, then let Alembic write the migration and check it:

```sh
docker compose exec backend alembic revision --autogenerate -m "add meetup"
docker compose exec backend alembic upgrade head
```

### Folders

| Folder | What |
|--------|------|
| `backend/` | FastAPI + SQLModel API, Alembic migrations, pytest tests, OSM snapshots in `data/osm/` |
| `frontend/` | React + TypeScript + Vite, Leaflet map, Vitest tests |
| `db/` | PostgreSQL image with PostGIS (also runs on arm64) |
| `deploy/` | Production stack on AWS EC2 (Caddy + HTTPS) and the setup wizard. See [deploy/README.md](deploy/README.md) |
