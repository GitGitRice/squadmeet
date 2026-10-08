# Abschlussprojekt — Handoff

A living handoff for the team (3 people) and their coding agents. Read it at the start of a
session. Update it at the end of a session. It answers one question: **what is in flight
right now, why, and what comes next?**

**Last update:** 2026-10-08 · Stefan · `SCRUM-17` (Meetup prototype) and `SCRUM-18` (Reasons) committed on local feature branches, not pushed yet

---

## How to use this file

Rules. Keep them short so everybody follows them.

1. **Read first.** A new session (human or agent) reads this file, then the Jira board.
2. **Update last.** Before you stop work, update *Now*, *In flight* and *Next*, then add one
   line to the *Log*. Change the "Last update" line at the top.
3. **Jira is the source of truth for tasks.** Do not copy issue text into this file. Write
   the issue key and a few words: `SCRUM-12 (login form)`. Jira holds the detail.
4. **Reference, do not copy.** Specs, decisions, commits and PRs go here as a path, a key or
   a URL. The detail stays in one place, so it does not drift.
5. **Write facts only when they are checked.** "Deploy works" means somebody saw it work.
   If you only think so, write "probably" or "not checked". The next person trusts this file.
6. **No secrets.** No API keys, passwords, tokens, `.env` contents or personal data.
7. **Explain every code the first time.** A Jira key, a commit hash or a decision number
   gets a few words of meaning next to it.
8. **Delete what is done.** Finished work leaves *In flight*. The *Log* keeps the history.
   This file stays short.

---

## Project in three lines

- **What:** Syntax Modul 4 final project (Fullstack, Backend & DevOps). Original brief:
  [BRIEF.md](BRIEF.md). Timeline and must-haves: [NOTES.md](NOTES.md).
- **Must-haves:** cloud deployment, Docker, CI/CD (test → build → deploy), one complete
  business workflow, tests, docs, one debugging case.
- **Deadline:** presentation on **Wed 21.10.2026** (15–20 min, live demo).
- **Repo:** https://github.com/GitGitRice/squadmeet (private). Who starts with which ticket:
  [TICKETS.md](TICKETS.md).

---

## Team

| Person | Role / area | Jira name |
|--------|-------------|-----------|
| Steven | DevOps (Docker, CI/CD, AWS, HTTPS) + login + push notifications | Steven Tanu |
| Stefan | Product owner (his idea) + frontend PWA (map, meetup screens, ratings) | Stefan Kallinich |
| David  | Backend API, database, OSM import, place confirmations; native Android app after the project | David Ludwig-Erbs |

---

## Jira

- **Site:** `https://socmediaapp.atlassian.net`
- **Project:** Squadmeet, key `SCRUM` (renamed from "Freizeitapp" on 2026-10-07; the key did not
  change, so all ticket keys stay). Team-managed software project.
- **Issue types:** Epic, Story, Task, Subtask, Feature, Bug
- **Board:** _tbd_ (URL not checked yet)
- **Examples in this file** use the key `SCRUM` but are not real issues.

### Epics (created 2026-10-07, all To Do)

| Key | Epic | Owner (**bold** = Jira assignee) | Blocked by |
|-----|------|-------|-----------|
| `SCRUM-6` | Infrastruktur & Pipeline | **Steven** | — |
| `SCRUM-2` | Anmeldung und Registrierung | **Steven** | `SCRUM-6` |
| `SCRUM-7` | Plätze & Karte | **David** + Stefan | `SCRUM-6` |
| `SCRUM-8` | Treffen (main demo workflow) | **Stefan** + David | `SCRUM-2`, `SCRUM-7` |
| `SCRUM-9` | Platzvorschläge & Bestätigungen | **David** + Stefan | `SCRUM-2`, `SCRUM-7` |
| `SCRUM-10` | Bewertungen & Fotos | **Stefan** + David | `SCRUM-2`, `SCRUM-7` |
| `SCRUM-11` | Kontakte & Blockieren | **Stefan** + David | `SCRUM-2` |
| `SCRUM-12` | Benachrichtigungen | **Steven** + David | `SCRUM-8` |
| `SCRUM-13` | Admin & Moderation | **David** | `SCRUM-7`, `SCRUM-10` |
| `SCRUM-14` | Datenschutz & Konto | **Steven** | `SCRUM-2` |
| `SCRUM-15` | Präsentation & Doku | **Stefan** (product owner) + all | — |

### Sprints

- **Sprint 1** ("SCRUM Sprint 1", sprint ID 1) — Wed 07.10. – Fri 09.10.: walking skeleton, `SCRUM-16` – `SCRUM-25`.
- **Sprint 2** — Mon 12.10. – Fri 16.10. (feature freeze): `SCRUM-26` – `SCRUM-45`. Tickets not yet
  moved into the sprint (sprint ID unknown; drag one ticket in, then an agent can move the rest).
- Sprints must be created in the Jira UI (the agent's Jira tools cannot create sprints). An agent
  reads a sprint ID from the `customfield_10020` (Sprint) field of an issue in that sprint.

### Walking skeleton tickets (Sprint 1)

`SCRUM-16` skeleton locally (Steven, blocks 19–22) → `SCRUM-19` CI + `SCRUM-20` AWS host with HTTPS
(Steven) → `SCRUM-23` automatic deploy (Steven). `SCRUM-21` Leipzig Places (David) → `SCRUM-24`
filter + detail (Stefan), `SCRUM-25` other cities (David). `SCRUM-22` register/login (Steven).
No blockers: `SCRUM-17` Meetup prototype, `SCRUM-18` list of Reasons (Stefan).

### Sprint 2 tickets

Must: `SCRUM-26` MFA, `SCRUM-27` captcha + rate limit, `SCRUM-33` password reset, `SCRUM-28` privacy +
delete account (Steven); main workflow `SCRUM-29` Now-meetup (Stefan, start Mon morning) → `SCRUM-34`
Join/Leave (David) → `SCRUM-37` Host Cancel/handover/Closed (David) and `SCRUM-35` later Meetup
(Stefan) → `SCRUM-38` Series (David); `SCRUM-30` suggest Place → `SCRUM-36` confirm (David);
`SCRUM-31` Ratings (Stefan); `SCRUM-39` Admin lock/delete (David).
Should: `SCRUM-40` in-app Notifications, `SCRUM-41` Favorites (Steven); `SCRUM-42` Photos,
`SCRUM-32` Contacts + Block (Stefan). Could: `SCRUM-43` Contact notifications (Stefan), `SCRUM-44`
web push, `SCRUM-45` Home area (Steven). Each ticket's "Blocked by" is a Jira link.

"Blocked by" on `SCRUM-6` means only the walking skeleton, not the whole Epic. Stories come
next; each owner writes them (for example with `/mattpocock-skills:to-tickets`).

### Issue hierarchy

| Level | Meaning | Example |
|-------|---------|---------|
| **Epic** | A large goal, often one per must-have or feature area | `SCRUM-1 (CI/CD pipeline)` |
| **Story** | A result a user or the team can see, fits in a few days | `SCRUM-5 (pipeline deploys to cloud on merge)` |
| **Task** | One concrete piece of work, fits in one day or less | `SCRUM-9 (write GitHub Actions build job)` |

### Conventions (proposal — confirm as a team)

- **Branch name:** `<KEY>-<short-name>`, for example `SCRUM-9-build-job`. Jira links the
  branch to the issue.
- **Commit message:** start with the key: `SCRUM-9 add build job`.
- **Done means:** merged, and the pipeline is green. Not "works on my laptop".
- **Status flow:** To Do → In Progress → In Review → Done.
- **Language for the team:** pull request title and description, and [DIARY.md](DIARY.md), are in
  German, so everybody in the team understands them. Code, commit messages and the other docs stay
  in English.

### Agent access

The Atlassian MCP server is set up in [.mcp.json](.mcp.json) (official remote server,
`https://mcp.atlassian.com/v1/mcp`). Each person logs in once with their own Atlassian
account: start `claude` in this folder, approve the server, then run `/mcp` → `atlassian` →
authenticate. There are no shared credentials.

---

## Now

**Topic chosen (2026-10-07):** Stefan's idea, a map of free public activity places (table tennis,
basketball, …) where adults announce Meetups and others join them. Glossary: [CONTEXT.md](CONTEXT.md).
Decisions: [docs/adr/](docs/adr/). Grilling session (design interview) finished and confirmed
by Steven; only the app name is open. The local skeleton (`SCRUM-16`) runs: `docker compose up`
shows one example Place on the map (how to run: [README.md](README.md) → *Run locally*). The docs are on GitHub
(https://github.com/GitGitRice/squadmeet, private, branches `main` and `dev`). Jira has Epics `SCRUM-2`,
`SCRUM-6`–`SCRUM-15` and Stories/Tasks `SCRUM-16`–`SCRUM-45`; start order per person in
[TICKETS.md](TICKETS.md). Agent skills are set up to use Jira
([docs/agents/issue-tracker.md](docs/agents/issue-tracker.md)).

## In flight

| Who | What | Jira | State |
|-----|------|------|-------|
| Stefan | Reasons per Activity type in [backend/app/reasons.py](backend/app/reasons.py), with pytest; each negative Reason says whether it changes the Condition (`broken` = yes, `bad` = no) | `SCRUM-18` (Reasons) | Committed on local branch `feature/SCRUM-18-reasons` (from `dev`). Tests green locally (without DB). **Not pushed, no PR, Jira not updated** (Atlassian MCP was not logged in). The team should read the list once before `SCRUM-31` (Ratings) uses it |
| Stefan | Clickable Meetup prototype, layout "map + bottom sheet" (Stefan's pick on 2026-10-08), test data in memory, `cd frontend && npm run prototype` (also opens on a phone in the same Wi-Fi) | `SCRUM-17` (Meetup prototype) | Committed on local branch `feature/SCRUM-17-meetup-prototype` (from `dev`). Lint, build and a click-through in jsdom passed; Stefan opened it in the browser. Not pushed, Jira not updated. Open: Steven and David look at it and agree (acceptance criterion); note the decision on `SCRUM-17`. `SCRUM-29` (Now-meetup, Stefan), `SCRUM-34`/`SCRUM-37` (Join/Leave, Host; David) and `SCRUM-35` (later Meetup, Stefan) build these screens for real |
| Steven | GitHub Actions: pytest (with a PostgreSQL+PostGIS service) + Vitest + Docker image build on every PR; push images to GHCR on merge into `dev` | `SCRUM-19` (CI) | In Review: [PR #6](https://github.com/GitGitRice/squadmeet/pull/6) into `dev`, all 5 checks green on GitHub. Needs one approval (Stefan or David). **Not checked yet:** the GHCR push, because it runs only after the merge into `dev`. After the merge, look at the run on `dev` and at the packages under github.com/GitGitRice → Packages |

## Next

0. Stefan: show the prototype to Steven and David (`npm run prototype`), and write the agreed
   screens on `SCRUM-17`. Push both branches and open the PRs into `dev`, then set
   `SCRUM-17` and `SCRUM-18` in Jira.
   Stefan or David: review and approve [PR #6](https://github.com/GitGitRice/squadmeet/pull/6) (`SCRUM-19`, CI). Steven: merge it,
   check the GHCR push, set `SCRUM-19` to Done. Then `SCRUM-20` (AWS host). David can start `SCRUM-21`
   (Leipzig Places). `SCRUM-26` (MFA), `SCRUM-27` (captcha), `SCRUM-28` (privacy) and `SCRUM-32`
   (contacts, Stefan) are no longer blocked.
1. Create the two Jira sprints (see *Jira → Sprints*), then approve the second ticket batch.
2. Confirm the role split and the Epic assignees as a team (tables above).
3. Write the Stories for each Epic, with "Blocks" links. Walking skeleton first (by Fri 09.10.):
   Steven repo + Compose + CI/CD + EC2 + HTTPS; David data model + OSM import for one city;
   Stefan clickable screens with test data + the list of Reasons.
4. Steven: invite Stefan and David as collaborators on the GitHub repo (needs their GitHub
   usernames). Stefan and David: fill in your Day 1 line in [DIARY.md](DIARY.md).
5. Choose the stack. Every tool needs a reason you can say out loud (brief: "Understand
   what you build").
6. Deploy a "hello world" in the first days. Deploy problems take longer than planned.

## Open questions

- Final app name. Working name: **SquadMeet** (2026-10-07; quick web search found no app with this name, but similar "Squadsheet" and "squadSet" exist; no brand or domain check yet). "Meetup" rejected: Meetup.com brand, and it is our glossary term.
- Demo data and demo devices (decided later, `SCRUM-15`).
- Set an AWS budget alarm (Free Tier + 15 $ credit).

## Decisions

Short entries. Put the reason next to the decision. Longer reasoning goes to a separate file
(for example `docs/decisions/`), and this list links to it.

| Date | Decision | Why | Where |
|------|----------|-----|-------|
| 2026-10-07 | Use Jira with Epics, Stories and Tasks | Team of 3 needs one shared task list | this file → Jira |
| 2026-10-07 | Atlassian MCP at project scope | Same agent setup for all three, no secrets in the repo | [.mcp.json](.mcp.json) |
| 2026-10-07 | Topic: Stefan's activity-place map with Meetups; main demo workflow = Meetup, second = Place suggestion with 3 Confirmations | Real use case, two workflows with states | [CONTEXT.md](CONTEXT.md) |
| 2026-10-07 | Client is a React PWA, not native | One code base for phone + laptop, team knows React | [ADR-0001](docs/adr/0001-pwa-not-native-app.md) |
| 2026-10-07 | One EC2 host with Docker Compose; NAS after the project | Cheapest, same Compose file runs on the NAS | [ADR-0002](docs/adr/0002-one-ec2-host-with-docker-compose.md) |
| 2026-10-07 | Radius Notifications use a Home area, not live location | PWA has no background location; privacy | [ADR-0003](docs/adr/0003-home-area-not-live-location.md) |
| 2026-10-07 | No chat; nicknames + predefined avatars; predefined rating Reasons | Safety between strangers, no moderation capacity | [ADR-0004](docs/adr/0004-no-chat-between-users.md) |
| 2026-10-07 | Stack: React/Vite PWA, Leaflet, FastAPI + SQLModel, PostgreSQL + PostGIS, Caddy + free subdomain (HTTPS) | Course stack; PostGIS for radius queries; HTTPS needed for push/location | this file |
| 2026-10-07 | Own login; MFA = authenticator app (TOTP) + recovery codes, optional for users, required for Admins; captcha = Cloudflare Turnstile (register, reset, login after 3 failures) + login rate limit; 18+ checkbox | Steven built FastAPI auth in MediDoc; Turnstile free and DSGVO-friendly | this file |
| 2026-10-07 | No email address; login with Nickname; reset with recovery code or MFA code | No email sending wanted; less personal data | [ADR-0005](docs/adr/0005-no-email-address.md) |
| 2026-10-07 | A Meetup has one Host; Host can Cancel or Leave; role passes to the earliest Join; no users left = Closed | Meetups survive when the creator drops out | [CONTEXT.md](CONTEXT.md) |
| 2026-10-07 | Meetups are visible to all users (except blocked ones); no "contacts only" | Meeting new people is the purpose of the app | [CONTEXT.md](CONTEXT.md) |
| 2026-10-07 | CI/CD: GitHub Actions → GHCR → EC2 via OIDC + SSM; Gitflow (`feature/*` → `dev` → `main`) | No stored AWS keys, no open SSH port | this file |
| 2026-10-07 | Walking skeleton live by Fri 09.10.; feature freeze Fri 16.10. evening; Mon–Tue 19–20.10. only fixes, tests, docs, presentation | Deploy risk first; brief's week 3 | this file |
| 2026-10-07 | Minimum tests: pytest for the business rules, a few Vitest tests, API smoke test after each deploy | Brief asks for basic tests; rules carry the most risk | this file |
| 2026-10-07 | Daily [DIARY.md](DIARY.md): one short line per person per day | Course wants daily progress shown; detail stays in Jira | [DIARY.md](DIARY.md) |
| 2026-10-07 | `dev` is the GitHub default branch | GitHub's "closes #12" works only for merges into the default branch | GitHub settings |
| 2026-10-07 | Ruleset on `main` and `dev`: pull request with 1 approval, no force push, no delete | Nobody breaks the shared branches; every change gets a second look | GitHub → Settings → Rules |
| 2026-10-07 | Frontend in TypeScript | Type checks catch API shape errors | `frontend/` |
| 2026-10-07 | Database schema with Alembic migrations, not `create_all` | The EC2 database keeps its data when the schema changes | `backend/alembic/` |
| 2026-10-07 | Own DB image: official `postgres:17` + Debian PostGIS package | `postgis/postgis` has no arm64 build (Apple Silicon, Graviton EC2) | [db/Dockerfile](db/Dockerfile) |
| 2026-10-07 | Login token = random session token, stored only as SHA-256 hash in `login_session`, sent as `Authorization: Bearer`; 30 days valid | Logout and Admin lock can end a session at once (a JWT cannot); Bearer also works for the later Android app | [backend/app/auth.py](backend/app/auth.py) |
| 2026-10-07 | Passwords: Argon2 (`pwdlib`). Recovery codes (10 × 16 characters) and tokens: SHA-256 | People choose weak passwords, so the hash must be slow; random codes are too long to guess | [backend/app/auth.py](backend/app/auth.py) |
| 2026-10-07 | Nickname: 3–20 of `A–Z a–z 0–9 _ -`, unique without case; the map stays public without login | No look-alike Nicknames ("Steven"/"steven"); people can look before they register | [backend/app/auth.py](backend/app/auth.py) |
| 2026-10-07 | PR title/description and `DIARY.md` in German; code, commits and other docs in English | Stefan and David read German more easily | this file → *Conventions* |
| 2026-10-07 | CI starts the database with `docker compose up --wait db` (our own PostGIS image), not a `postgis/postgis` service container; CI also builds and pushes the `db` image | CI tests against the same database image as local and EC2; the EC2 deploy can pull all three images | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| 2026-10-07 | Images in GHCR: `ghcr.io/gitgitrice/squadmeet-{backend,frontend,db}`, tags = commit SHA + `dev`; pushed only after both test jobs are green | Deploy (`SCRUM-23`) picks an exact commit; no image from a red build | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| 2026-10-07 | Ruleset "protect main and dev" requires the 5 CI checks (backend tests, frontend tests, 3 Docker images) | A red pipeline blocks the merge ("Done" means the pipeline is green) | GitHub → Settings → Rules |
| 2026-10-08 | Reasons live as code in [backend/app/reasons.py](backend/app/reasons.py): a stable key (stored in the DB) + a German label; general Reasons + Reasons per Activity type | One list for API validation and UI; a label can change without a migration | `SCRUM-18` |
| 2026-10-08 | Meetup screens: map + bottom sheet (Place → "Ich bin jetzt hier" → Meetup detail), not a list or an assistant. Red pin with people count = someone is there now. The prototype covers only the `SCRUM-17` flow; later Meetups, Series, ending early and Host handover are left to their own tickets | The map is the core of the app; one tap from Place to Meetup. Team still has to agree | `SCRUM-17`, commit `627dc81` |
| 2026-10-08 | The Meetup prototype is a separate dev-only page (`frontend/prototype.html`), not part of the app | Not in the production build, so test data and fake screens never ship | `SCRUM-17` |
| 2026-10-08 | EC2 host: t3.micro (x86, because the CI images are amd64 only) + 2 GB swap file + Elastic IP, Amazon Linux 2023, region `eu-central-1`; free subdomain from DuckDNS | Free Tier; the IP stays the same after a stop and start; DuckDNS is free and works with Let's Encrypt | `SCRUM-20`, [deploy/](deploy/) |
| 2026-10-08 | Caddy is in the production frontend image (built files + reverse proxy to the backend); only ports 80 and 443 are open; no SSH, access through AWS SSM | One image less; no open SSH port (same path as the automatic deploy, `SCRUM-23`) | `SCRUM-20`, [frontend/Dockerfile](frontend/Dockerfile) |
| 2026-10-08 | The AWS setup is a script ([deploy/setup-aws.sh](deploy/setup-aws.sh)) that uses the AWS CLI, not console clicks | Repeatable, and written down for the later move to the NAS (ADR-0002) | `SCRUM-20` |
| 2026-10-08 | EC2 pulls the private GHCR images with a classic GitHub token (only `read:packages`). The token and the DB password are in AWS SSM Parameter Store (`/squadmeet/*`, SecureString), not in GitHub and not in the command history | Packages stay private; the host reads its secrets with its own IAM role | `SCRUM-20`, [deploy/host-deploy.sh](deploy/host-deploy.sh) |
| 2026-10-07 | Jira is the only issue tracker; dependencies as Jira "Blocks" links | One source of truth; shows who is blocked | [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) |

## Debugging case (presentation item)

The brief asks for at least one interesting debugging case. Write it down **when it
happens**. Afterwards the details are gone.

Format: symptom → wrong guesses → real cause → fix → lesson. Link the Jira issue.

- **Map marker does not show** (`SCRUM-16`, 2026-10-07). Symptom: the map loads, the API sends
  the Place, the marker element is in the page, no console error, but no pin is visible.
  Wrong guess: the common fix `L.Icon.Default.mergeOptions({ iconUrl: … })` with the Vite image
  imports. Real cause: Leaflet's default icon puts its own detected image path in front of the
  URL, so the browser loads `…/images//node_modules/leaflet/…` (404). Found by reading `img.src`
  and `naturalWidth` (0) of the marker in the browser. Fix: an explicit `L.icon({...})` on each
  Marker ([frontend/src/App.tsx](frontend/src/App.tsx)). Lesson: when an image does not show,
  look at the real URL the browser requests before you copy a fix.

---

## Suggested skills for agents

| When | Skill |
|------|-------|
| Stress-test a plan or the topic choice | `/mattpocock-skills:grilling` |
| Fix the glossary (domain terms) for the chosen topic | `/mattpocock-skills:domain-modeling` |
| Try a UI or a state model before the real build | `/mattpocock-skills:prototype` |
| Build features test-first | `/mattpocock-skills:tdd` |
| A bug that does not go away (also: debugging case) | `/mattpocock-skills:diagnosing-bugs` |
| Review a branch before the merge | `/mattpocock-skills:code-review` |
| Merge conflict | `/mattpocock-skills:resolving-merge-conflicts` |
| Look up docs or API facts | `/mattpocock-skills:research` |

---

## Log

Newest first. One line per session: date · who · what changed.

- 2026-10-08 · Stefan · `SCRUM-18`: Reasons per Activity type ([backend/app/reasons.py](backend/app/reasons.py) + tests). `SCRUM-17`: clickable Meetup prototype with 3 layouts (`frontend/src/prototype/`). Both on local feature branches, not pushed. Later the same day: Stefan picked layout A (map + bottom sheet), design reworked; Jira connected; SCRUM-18 now marks which negative Reasons change the Condition (acceptance criterion). Old empty branches `scrum-17`/`scrum-18` deleted. Then trimmed both to their tickets' acceptance criteria only (no work of other tickets).

- 2026-10-07 · Steven · `SCRUM-19`: CI workflow [.github/workflows/ci.yml](.github/workflows/ci.yml) (pytest with the Compose DB, oxlint + build + Vitest, Docker images for backend/frontend/db, GHCR push on `dev`, actions pinned to SHAs). [PR #6](https://github.com/GitGitRice/squadmeet/pull/6) green; Jira In Review. Ruleset now requires the 5 CI checks.

- 2026-10-07 · Steven · [PR #5](https://github.com/GitGitRice/squadmeet/pull/5) (`SCRUM-22`) merged, Jira Done. Started `SCRUM-19` (In Progress). New rule: PR text and `DIARY.md` in German. `DIARY.md` translated; `TICKETS.md` shows ✓ done / ● in progress / ▶ start now.

- 2026-10-07 · Steven · `SCRUM-16` merged (PR #4) and set to Done. `SCRUM-22`: register/login/logout (backend `app/auth.py`, migration 0002, frontend login dialog + Recovery code screen), 9 new pytest tests with rollback per test, 5 new Vitest tests. Checked in the browser.

- 2026-10-07 · Steven · `SCRUM-16`: local skeleton (Compose: PostGIS DB, FastAPI + Alembic, React/TS + Leaflet). One example Place on the map, pytest + Vitest green. README has the run steps. Debugging case "map marker" written down.

- 2026-10-07 · Steven · Renamed the Jira project to "Squadmeet" (key still `SCRUM`). Made `dev` the default branch. Added a GitHub ruleset that protects `main` and `dev`.

- 2026-10-07 · Steven · Created `dev` branch. Added `README.md` and `DIARY.md` (daily log per person); `CLAUDE.md` now tells agents to fill the diary. Added `AGENTS.md` (points other agents to `CLAUDE.md`). Merged `dev` into `main` (docs only, fast-forward).

- 2026-10-07 · Steven · Created private GitHub repo `GitGitRice/squadmeet` and pushed the docs to `main`. Added `TICKETS.md` (tickets per person in start order) and `.gitignore`.

- 2026-10-07 · Steven · Grilling of Stefan's idea (rounds 1–9, confirmed). Tickets `SCRUM-16`–`SCRUM-45` created, assigned and linked; Sprint 1 filled. Working name SquadMeet. Topic chosen. Added `CONTEXT.md`, ADR-0001–0005, Epics `SCRUM-6`–`SCRUM-15` with Blocks links, agent-skills setup (`docs/agents/`, `CLAUDE.md` section). Team roles filled in.
- 2026-10-07 · Steven · Checked Jira access via MCP. Added site, project key `SCRUM` and the current issue (`SCRUM-2`) to this file. Changed the example key from `ABP` to `SCRUM`.
- 2026-10-07 · Steven · Created this file and `CLAUDE.md` (tells agents to read and update this file). Added the Atlassian MCP server (`.mcp.json`).
