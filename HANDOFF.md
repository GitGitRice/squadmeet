# Abschlussprojekt — Handoff (shared)

The shared handoff for the team (2 people) and their coding agents. It is in git. It holds
what both people need: rules, project, team, Jira, open questions, decisions and the
debugging case.

Each person's own progress (*Now*, *In flight*, *Next*, *Log*) is in **`HANDOFF.local.md`**.
That file is not in git (`.gitignore`), because each person's progress differs.

**Last update:** 2026-10-09 · Steven · `SCRUM-47` deploy role decision

---

## How to use these files

Rules. Keep them short so everybody follows them.

1. **Read first.** A new session (human or agent) reads this file, then `HANDOFF.local.md`,
   then the Jira board. If `HANDOFF.local.md` does not exist, create it with the four
   sections *Now*, *In flight*, *Next* and *Log*.
2. **Update last.** Before you stop work, update *Now*, *In flight* and *Next* in
   `HANDOFF.local.md`, then add one line to its *Log*. Change its "Last update" line.
3. **Shared things go here, at once.** A decision, a debugging case, an open question, or a
   change to the team, Jira or the conventions goes into this file when it happens. Commit
   it on your branch, so the other person gets it with the next merge.
4. **Jira is the source of truth for tasks.** Do not copy issue text into these files. Write
   the issue key and a few words: `SCRUM-12 (login form)`. Jira holds the detail.
5. **Reference, do not copy.** Specs, decisions, commits and PRs go here as a path, a key or
   a URL. The detail stays in one place, so it does not drift.
6. **Write facts only when they are checked.** "Deploy works" means somebody saw it work.
   If you only think so, write "probably" or "not checked". The next person trusts this file.
7. **No secrets.** No API keys, passwords, tokens, `.env` contents or personal data.
8. **Explain every code the first time.** A Jira key, a commit hash or a decision number
   gets a few words of meaning next to it.
9. **Delete what is done.** Finished work leaves *In flight*. The *Log* keeps the history.
   Both files stay short.
---

## Project in three lines

- **What:** Syntax Modul 4 final project (Fullstack, Backend & DevOps). Original brief:
  [BRIEF.md](BRIEF.md). Timeline and must-haves: [NOTES.md](NOTES.md).
- **Must-haves:** cloud deployment, Docker, CI/CD (test → build → deploy), one complete
  business workflow, tests, docs, one debugging case.
- **Deadline:** presentation on **Wed 21.10.2026** (15–20 min, live demo).
- **Live:** https://squadmeet.duckdns.org (since 2026-10-08, `SCRUM-20`). It runs on one EC2 host in the Syntax course AWS account (SSO role "Student", region `eu-central-1`). Setup, shell access and troubleshooting: [deploy/README.md](deploy/README.md).
- **Repo:** https://github.com/GitGitRice/squadmeet (private). Who starts with which ticket:
  [TICKETS.md](TICKETS.md).

---

## Team

| Person | Role / area | Jira name |
|--------|-------------|-----------|
| Steven | DevOps (Docker, CI/CD, AWS, HTTPS) + login + push notifications | Steven Tanu |
| Stefan | Product owner (his idea) + frontend PWA (map, meetup screens, ratings) | Stefan Kallinich |
| ~~David~~ | Left the project on 2026-10-08. His tickets are split in `SCRUM-46` | David Ludwig-Erbs |

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
| `SCRUM-7` | Plätze & Karte | **Stefan** | `SCRUM-6` |
| `SCRUM-8` | Treffen (main demo workflow) | **Stefan** | `SCRUM-2`, `SCRUM-7` |
| `SCRUM-9` | Platzvorschläge & Bestätigungen | **Steven** | `SCRUM-2`, `SCRUM-7` |
| `SCRUM-10` | Bewertungen & Fotos | **Stefan** | `SCRUM-2`, `SCRUM-7` |
| `SCRUM-11` | Kontakte & Blockieren | **Stefan** | `SCRUM-2` |
| `SCRUM-12` | Benachrichtigungen | **Steven** | `SCRUM-8` |
| `SCRUM-13` | Admin & Moderation | **Steven** | `SCRUM-7`, `SCRUM-10` |
| `SCRUM-14` | Datenschutz & Konto | **Steven** | `SCRUM-2` |
| `SCRUM-15` | Präsentation & Doku | **Stefan** (product owner) + all | — |

### Sprints

- **Sprint 1** ("SCRUM Sprint 1", sprint ID 1) — Wed 07.10. – Fri 09.10.: walking skeleton, `SCRUM-16` – `SCRUM-25`.
  **Done on 2026-10-08:** all tickets Done, the app deploys automatically from `main`. Sprint completed in Jira.
- **Sprint 2** ("SCRUM Sprint 2", sprint ID 34) — created 2026-10-08 (Sprint 1 finished early), ends
  Fri 16.10. (feature freeze). 21 tickets: `SCRUM-26` – `SCRUM-45` and `SCRUM-47`. An agent moves a
  ticket in with `customfield_10020: 34`.
- Sprints must be created in the Jira UI (the agent's Jira tools cannot create sprints). An agent
  reads a sprint ID from the `customfield_10020` (Sprint) field of an issue in that sprint.

### Walking skeleton tickets (Sprint 1)

`SCRUM-16` skeleton locally (Steven, blocks 19–22) → `SCRUM-19` CI + `SCRUM-20` AWS host with HTTPS
(Steven) → `SCRUM-23` automatic deploy (Steven). `SCRUM-21` Leipzig Places (Stefan) → `SCRUM-24`
filter + detail (Stefan), `SCRUM-25` other cities (Stefan). `SCRUM-22` register/login (Steven).
No blockers: `SCRUM-17` Meetup prototype, `SCRUM-18` list of Reasons (Stefan).

### Sprint 2 tickets

Must: `SCRUM-26` MFA, `SCRUM-27` captcha + rate limit, `SCRUM-33` password reset, `SCRUM-28` privacy +
delete account (Steven); main workflow `SCRUM-29` Now-meetup (Stefan, start Mon morning) → `SCRUM-34`
Join/Leave (Stefan) → `SCRUM-37` Host Cancel/handover/Closed (Stefan) and `SCRUM-35` later Meetup
(Stefan); `SCRUM-31` Ratings (Stefan); `SCRUM-39` Admin lock/unlock/delete (Steven).
Should since 2026-10-08 (`SCRUM-46`): `SCRUM-38` Series (Stefan); `SCRUM-30` suggest Place →
`SCRUM-36` confirm (Steven).
Should: `SCRUM-40` in-app Notifications, `SCRUM-41` Favorites (Steven); `SCRUM-42` Photos,
`SCRUM-32` Contacts + Block (Stefan). Could: `SCRUM-43` Contact notifications (Stefan), `SCRUM-44`
web push, `SCRUM-45` Home area (Steven). Each ticket's "Blocked by" is a Jira link.
In Jira (since 2026-10-08), each ticket has the label `must`, `should` or `could` and the priority
High, Medium or Low to match. Change both when a ticket changes category. `SCRUM-47` (deploy role
permissions) is a Must.
`SCRUM-48` (handover: Stefan hosts and owns the repo, server, domain and Cloudflare) is the **last
Must**: after the presentation on 21.10., blocked by all other Musts. It is in no sprint yet.

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
- **Manual tests go to `SCRUM-50`** (manual test of the whole app, Thu 15.10. / Fri 16.10.).
  A feature ticket needs automated tests and a green pipeline, not a browser or phone check.
  The PR lists what to test by hand, and the same list goes as a comment on `SCRUM-50`.
- **Status flow:** To Do → In Progress → In Review → Done.
- **Language:** [DIARY.md](DIARY.md) is in German. Everything else (code, commits, pull requests,
  docs) is in English.

### Agent access

The Atlassian MCP server is set up in [.mcp.json](.mcp.json) (official remote server,
`https://mcp.atlassian.com/v1/mcp`). Each person logs in once with their own Atlassian
account: start `claude` in this folder, approve the server, then run `/mcp` → `atlassian` →
authenticate. There are no shared credentials.

---

## Open questions

- Final app name. Working name: **SquadMeet** (2026-10-07; quick web search found no app with this name, but similar "Squadsheet" and "squadSet" exist; no brand or domain check yet). "Meetup" rejected: Meetup.com brand, and it is our glossary term.
- Demo data and demo devices (decided later, `SCRUM-15`).

## Decisions

Short entries. Put the reason next to the decision. Longer reasoning goes to a separate file
(for example `docs/decisions/`), and this list links to it.

| Date | Decision | Why | Where |
|------|----------|-----|-------|
| 2026-10-09 | All manual tests (browser, phone, live site) move to `SCRUM-50`. A feature ticket is done with automated tests and a green pipeline. Each PR lists its manual checks; they go as a comment on `SCRUM-50` | Steven: browser checks cost time in every ticket and break on tool problems (a Chrome extension blocked the `SCRUM-33` check). One test round on the live site before the feature freeze tests the real setup once | this file → *Conventions*, `SCRUM-50` |
| 2026-10-09 | Password reset (`POST /api/auth/password-reset`): Nickname + Recovery code (or the current MFA code, **only when MFA is on**) + new password + Turnstile on every try, 10 tries per hour per IP. It ends **all** old sessions and answers with a **new** session, so the user is logged in at once. Unknown Nickname and wrong code get the same 400 "Nickname oder Code falsch" | The ticket; ADR-0005 (no email). A new session saves a second MFA code: the one used for the reset works only once, so a login right after it would fail for up to 30 s. A set-up but unconfirmed MFA secret must not count | `SCRUM-33`, [backend/app/auth.py](backend/app/auth.py) |
| 2026-10-09 | New Recovery codes (`POST /api/auth/recovery-codes`, logged in): need the password again, plus a code when MFA is on; 5 tries per 15 min per user. The old set is deleted, used or not. The button is in the "Zwei-Faktor" dialog for now; after `SCRUM-28` (privacy + delete account) is merged, it moves into its "Konto" dialog | A stolen session token alone must not get codes that reset the password or turn MFA off (same rule as turning MFA off). `SCRUM-28`'s branch is not in `dev` yet | `SCRUM-33`, [frontend/src/auth/RecoveryCodesDialog.tsx](frontend/src/auth/RecoveryCodesDialog.tsx) |
| 2026-10-09 | An issue (a `condition_issue` Reason in a Rating) counts for 2 months (`RECENT_DAYS` = 60) after the last Rating that names it. Then it stays, marked "seit über 2 Monaten nicht bestätigt", and the Place detail asks logged-in users "Ist das noch so?". 3 different users "Ja, noch so" → it counts 2 more months. "Nein, behoben" can be said at any time, also in the first 2 months; 3 of them end the issue until a Rating names it again. Votes count from the last report or confirmation on; one vote per user per round, a later one replaces it. Condition `unknown` = no issue and no Rating or vote in 2 months. Average stars and the top 3 Reasons count all Ratings | Stefan (product owner): a Mangel should not vanish just because nobody rated for a while, and a repair should not wait 2 months; users who are there know best. Votes are only stored; the check state is worked out from Ratings and votes each time, so no race and no job | `SCRUM-31`, [backend/app/ratings.py](backend/app/ratings.py) (`issue_state`) |
| 2026-10-09 | A Rating is saved with `PUT /api/places/{id}/ratings/mine`, one `INSERT … ON CONFLICT DO UPDATE` on (place, user). The Reasons are a `text[]` column, checked against the Place's Activity type | One Rating per user per Place without a race; a few Ratings per Place are counted in Python, so no extra table | `SCRUM-31` |
| 2026-10-09 | Captcha = Cloudflare Turnstile. Registration always needs a valid token. Login needs one from the 3rd failed login of a Nickname on (counter `app_user.failed_logins`; wrong passwords **and** wrong MFA codes count; a login resets it). Without a valid token, login answers 401 `captcha_required`, before the password check | The ticket's rules; Stefan's review of `SCRUM-26` (a guesser who knows the password must not try MFA codes freely). The counter is in the database, so a restart does not reset it. The answer shows that the Nickname exists, but Nicknames are public anyway | `SCRUM-27`, [backend/app/auth.py](backend/app/auth.py) |
| 2026-10-09 | Rate limits in the backend's memory: login 10 requests per minute per IP address; turning MFA off 5 tries per 15 min per user. Answer 429 with `Retry-After`. The client IP comes from Caddy's `X-Forwarded-For` (uvicorn `--forwarded-allow-ips '*'`) | One backend process on one host (ADR-0002, one EC2 host with Docker Compose), so no Redis is needed. 10/min is enough for a room of people behind one router | `SCRUM-27`, [backend/app/rate_limit.py](backend/app/rate_limit.py) |
| 2026-10-09 | Turnstile keys: production reads both from SSM (`/squadmeet/turnstile-site-key`, `/squadmeet/turnstile-secret-key`); local and CI use Cloudflare's public test keys. The frontend gets the site key from `GET /api/auth/captcha`, not at build time. The Turnstile script loads only when a form shows the widget. Without an answer from Cloudflare, the check fails | One frontend image for test and real keys; a map visit sends nothing to Cloudflare (privacy); no unchecked path when Cloudflare is down | `SCRUM-27`, [backend/app/turnstile.py](backend/app/turnstile.py), [deploy/README.md](deploy/README.md) |
| 2026-10-09 | Turning MFA on logs out all other devices of the user. Turning MFA off needs the password again, plus a code from the app or a Recovery code. A code is used up by a conditional `UPDATE` in the database, not by read-check-write | Stefan's review of PR #29: an old device must not stay logged in without a code; a stolen session token alone must not turn MFA off; two requests with the same code at the same moment must not both pass | `SCRUM-26`, [backend/app/auth.py](backend/app/auth.py) |
| 2026-10-08 | MFA login uses one endpoint: `POST /api/auth/login` takes an optional `code`. With MFA on and no valid code, the answer is 401 with `detail` = `mfa_required`; the dialog then asks for the code and sends the password again with it. The `code` can be a 6-digit TOTP code or a Recovery code (used up) | No ticket table and no second endpoint. The password stays only in the dialog's memory | `SCRUM-26`, [backend/app/auth.py](backend/app/auth.py) |
| 2026-10-08 | Admin = column `app_user.is_admin`. Only a command sets it: `docker compose exec backend python -m app.admin grant <Nickname>`. Admin routes need `is_admin` **and** MFA on, else 403 | No Admin UI needed for a 2-person team. A command checks the Nickname, so no typo in hand-written SQL | `SCRUM-26`, `SCRUM-39` (Admin functions) |
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
| 2026-10-07 | PR title/description and `DIARY.md` in German; code, commits and other docs in English | Stefan and David read German more easily. **Replaced 2026-10-08** for PRs (see below) | this file → *Conventions* |
| 2026-10-07 | CI starts the database with `docker compose up --wait db` (our own PostGIS image), not a `postgis/postgis` service container; CI also builds and pushes the `db` image | CI tests against the same database image as local and EC2; the EC2 deploy can pull all three images | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| 2026-10-07 | Images in GHCR: `ghcr.io/gitgitrice/squadmeet-{backend,frontend,db}`, tags = commit SHA + `dev`; pushed only after both test jobs are green | Deploy (`SCRUM-23`) picks an exact commit; no image from a red build | [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| 2026-10-07 | Ruleset "protect main and dev" requires the 5 CI checks (backend tests, frontend tests, 3 Docker images) | A red pipeline blocks the merge ("Done" means the pipeline is green) | GitHub → Settings → Rules |
| 2026-10-08 | Reasons live as code in [backend/app/reasons.py](backend/app/reasons.py): a stable key (stored in the DB) + a German label; general Reasons + Reasons per Activity type | One list for API validation and UI; a label can change without a migration | `SCRUM-18` |
| 2026-10-08 | Condition: only negative Reasons that the city or the operator must fix change it (`condition_issue` in code); "Oft überfüllt", "Schwer zu finden", "Zeitweise nicht zugänglich" do not. No Reason for bad lighting. "Oft abgeschlossen" renamed so it does not clash with Locked place | Stefan (product owner) after Steven's review; a Condition should say what needs a repair | [CONTEXT.md](CONTEXT.md), `SCRUM-18`, [PR #11](https://github.com/GitGitRice/squadmeet/pull/11) |
| 2026-10-08 | Meetup screens: map + bottom sheet (Place → "Ich bin jetzt hier" → Meetup detail), not a list or an assistant. Red pin with people count = someone is there now. The prototype covers only the `SCRUM-17` flow, plus Host Leave (Stefan after Steven's review, [PR #10](https://github.com/GitGitRice/squadmeet/pull/10)): the Host can Leave when others have joined, the earliest Join becomes Host. Later Meetups, Series, ending early and Closed are left to their own tickets | The map is the core of the app; one tap from Place to Meetup. Team still has to agree | `SCRUM-17`, commits `627dc81`, `825a44a` |
| 2026-10-08 | The Meetup prototype is a separate dev-only page (`frontend/prototype.html`), not part of the app | Not in the production build, so test data and fake screens never ship | `SCRUM-17` |
| 2026-10-08 | PR title and description may be English; `DIARY.md` stays German | Team decision after David left; replaces the 2026-10-07 "PR in German" rule | this file → *Conventions* |
| 2026-10-08 | Places come from an OSM snapshot file per city (`backend/data/osm/<city>.json`, made by `python -m app.osm_import fetch <City>`, committed); `python -m app.seed` loads it into an empty database (`docker compose up` runs it) | Public Overpass servers were busy or out of date while we tested (504, old data); deploy and demo must not depend on them | `SCRUM-21`, [backend/app/osm_import.py](backend/app/osm_import.py) |
| 2026-10-08 | The OSM import is an upsert on (OSM id, Activity type): a second run adds no duplicates, refreshes name and location, keeps the database id; it never deletes a Place. Every start runs it (`app.seed`) | Ratings and Meetups will point to Places; a Place that left OSM must not take them with it (`SCRUM-25` acceptance criteria) | `SCRUM-25`, [backend/app/osm_import.py](backend/app/osm_import.py) |
| 2026-10-08 | A city name must match exactly one municipality, counted by its official key (`de:regionalschluessel`), not by OSM areas | Stuttgart is mapped twice in OSM (Stadtkreis and Gemeinde) with the same key; two different towns of the same name still fail | `SCRUM-25` |
| 2026-10-08 | A Meetup is active while `starts_at <= now < ends_at`; no job deletes ended Meetups. "Ich bin jetzt hier" sets `starts_at = now`, `ends_at = now + 1–4 h`; ending early sets `ends_at = now`. The Host's Party size is a column on `meetup` (Joins of others come with `SCRUM-34`) | The map and the Place detail need no background job; the history stays for later | `SCRUM-29`, [backend/app/meetups.py](backend/app/meetups.py) |
| 2026-10-08 | `GET /api/places` sends `people_now` per Place (sum of active Party sizes); the marker turns red with that number, as in the prototype. The map and the open Place detail ask again every 60 s | One request for the map; an ended Meetup leaves the map within a minute without a reload | `SCRUM-29` |
| 2026-10-08 | Activity types live in one place, `app.activities.ActivityType`; the database checks `place.activity_type` against the list (migration 0003). One OSM pitch for two sports gives two Places (unique per OSM id + Activity type) | A typo is caught at once; answers point 5 of Steven's `SCRUM-18` review (the Activity types were plain strings in several files, and the DB accepted any string) | [backend/app/activities.py](backend/app/activities.py) |
| 2026-10-08 | `GET /api/places?bbox=west,south,east,north` is required and returns at most 2000 Places; the map asks again after each pan or zoom | A whole city has ~700 Places; the phone should only load what it shows | `SCRUM-21`, [backend/app/main.py](backend/app/main.py) |
| 2026-10-08 | Places on the same spot (a pitch for several sports): one marker shows the number of different Activity types; a tap shows the choice of its Places | Stefan after Steven's review of `SCRUM-21` (point 3): otherwise the top marker hides the others | `SCRUM-21`, [frontend/src/places/spots.ts](frontend/src/places/spots.ts) |
| 2026-10-08 | The map cannot zoom out beyond level 11; the API sets `X-Places-Truncated: true` when an area has more than 2000 Places, and the map then asks to zoom in | Stefan after Steven's review of `SCRUM-21` (point 6): no Places go missing without a sign | `SCRUM-21`, [backend/app/main.py](backend/app/main.py) |
| 2026-10-08 | Place detail URL is `/platz/<id>` (own small `usePath` hook, no router library); the detail is a panel over the map (bottom on a phone, left card on a laptop) and loads the Place with `GET /api/places/<id>` | A shared link or a reload works even outside the visible area; one page, no extra dependency; panel layout as agreed in `SCRUM-17` (the Meetup prototype: map + bottom sheet, not a list or an assistant) | `SCRUM-24`, [frontend/src/places/](frontend/src/places/) |
| 2026-10-08 | Activity filter works in the browser on the loaded Places (all types on at start); each Activity type has its own `divIcon` marker (emoji in a coloured ring) | The map updates at once without a new request; a `divIcon` needs no image file, so the SCRUM-16 marker-image bug cannot return | `SCRUM-24`, [frontend/src/places/markers.ts](frontend/src/places/markers.ts) |
| 2026-10-08 | The open Place always stays on the map, even when the filter switches its Activity type off; Activity types the frontend does not know are never filtered out | Stefan after Steven's review of `SCRUM-24` (point 3): the detail panel must not point to an invisible marker | `SCRUM-24`, [frontend/src/places/filter.ts](frontend/src/places/filter.ts) |
| 2026-10-08 | HANDOFF split: shared parts stay in `HANDOFF.md` (in git); each person's *Now*/*In flight*/*Next*/*Log* go to `HANDOFF.local.md` (`.gitignore`) | Each person's progress differs; removing `HANDOFF.md` from git would delete the other person's copy on `git pull` | this file → *How to use these files* |
| 2026-10-08 | David left. Split his tickets by area: Stefan = Meetup workflow + Places data (21, 25, 34, 37, 38); Steven = Place suggestions + Admin (30, 36, 39) | 21 unblocks Stefan's own 24/29/31; one person owns the whole demo workflow; Admin needs MFA (Steven) | `SCRUM-46` |
| 2026-10-08 | EC2 host: t2.micro (x86, because the CI images are amd64 only) + 2 GB swap file + Elastic IP, Amazon Linux 2023, region `eu-central-1`; free subdomain from DuckDNS. Changed from t3.micro on the same day | The course account has the older Free Tier: only t2.micro is free (`aws ec2 describe-instance-types` → `FreeTierEligible`), t3.micro costs about 0.012 USD an hour; the IP stays the same after a stop and start; DuckDNS is free and works with Let's Encrypt | `SCRUM-20`, [deploy/](deploy/) |
| 2026-10-08 | Caddy is in the production frontend image (built files + reverse proxy to the backend); only ports 80 and 443 are open; no SSH, access through AWS SSM | One image less; no open SSH port (same path as the automatic deploy, `SCRUM-23`) | `SCRUM-20`, [frontend/Dockerfile](frontend/Dockerfile) |
| 2026-10-08 | The AWS setup is a script ([deploy/setup-aws.sh](deploy/setup-aws.sh)) that uses the AWS CLI, not console clicks | Repeatable, and written down for the later move to the NAS (ADR-0002) | `SCRUM-20` |
| 2026-10-08 | EC2 pulls the private GHCR images with a classic GitHub token (only `read:packages`). The token and the DB password are in AWS SSM Parameter Store (`/squadmeet/*`, SecureString), not in GitHub and not in the command history | Packages stay private; the host reads its secrets with its own IAM role | `SCRUM-20`, [deploy/host-deploy.sh](deploy/host-deploy.sh) |
| 2026-10-08 | AWS runs `main`, not `dev`. The first manual deploy (`SCRUM-20`) uses the `dev` images, because `main` has no images yet. From `SCRUM-23` on, a merge into `main` deploys the exact commit SHA. There is no separate server for `dev` | One server is the graded demo; a merge into `dev` must not break it. A SHA shows what runs and makes a rollback easy. A second server costs credit | `SCRUM-20`, `SCRUM-23` |
| 2026-10-08 | A push to `main` builds the images again (with the build cache) and tags them `<SHA>` + `main`; it does not re-tag the tested `dev` image | A PR merge into `main` makes a new commit SHA, and a newer push can cancel a `dev` run, so a `dev` image for the exact code may not exist. CI runs the tests on `main` again too. Changes the plan in the `SCRUM-23` comment | `SCRUM-23`, [.github/workflows/ci.yml](.github/workflows/ci.yml) |
| 2026-10-08 | Automatic deploy: the CI job assumes the IAM role `squadmeet-github-deploy` with GitHub OIDC. Only runs on `main` of this repo may assume it. It may only send `AWS-RunShellScript` to our one instance. The role ARN is a GitHub variable, not a secret | No AWS keys or SSH keys in GitHub (`SCRUM-23` acceptance criterion). A custom SSM document would limit the commands more, but then a change to `compose.yml` needs a manual document update; anybody who can push to `main` can change the workflow anyway. **Steven (2026-10-08): good enough for now; before v1 the role gets stricter rules** (only the commands the deploy needs) **Replaced on 2026-10-09 by `SCRUM-47`** (row below: SSM document `squadmeet-deploy`) | `SCRUM-23`, [deploy/setup-github-deploy.sh](deploy/setup-github-deploy.sh) |
| 2026-10-08 | `/api/health` returns `version` = the commit SHA of the backend image. The smoke test waits until the new SHA answers | Otherwise the old container passes the smoke test while the new one has not started. It also shows on the public URL which commit runs | `SCRUM-23`, [deploy/deploy.sh](deploy/deploy.sh) |
| 2026-10-08 | One deploy path: [deploy/deploy.sh](deploy/deploy.sh) `<tag>`, used by CI, by the setup wizard and by hand. A rollback = deploy an older SHA | The wizard and CI cannot drift apart; a rollback needs no new code | `SCRUM-23`, [deploy/README.md](deploy/README.md) |
| 2026-10-07 | Jira is the only issue tracker; dependencies as Jira "Blocks" links | One source of truth; shows who is blocked | [docs/agents/issue-tracker.md](docs/agents/issue-tracker.md) |
| 2026-10-09 | The deploy role may send only the SSM document `squadmeet-deploy`, not `AWS-RunShellScript`. The document has one parameter `tag` (SSM accepts only a full commit SHA, `main` or `dev`); domain and region are fixed in it. On the host it pulls the image `squadmeet-deploy:<tag>` (only `compose.yml` + `host-deploy.sh`, `FROM scratch`), copies the two files out and runs `host-deploy.sh`. CI builds this image as a 4th matrix image | The role can no longer run any command on the host. A change to `compose.yml` or `host-deploy.sh` still ships with the deploy (same commit, same tag), and a rollback takes the old files too. Only a change to the document's own steps needs a manual `setup-deploy-document.sh` run. Limit: a rollback works only to commits from `SCRUM-47` on (older ones have no deploy image) | `SCRUM-47`, [deploy/setup-deploy-document.sh](deploy/setup-deploy-document.sh) |

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
- **First automatic deploy cannot log in to AWS** (`SCRUM-23`, 2026-10-08). Symptom: after the
  merge of PR #21 (dev → main), the job "Deploy to AWS + smoke test" fails 12 times with
  `Could not assume role with OIDC: Not authorized to perform sts:AssumeRoleWithWebIdentity`.
  Wrong guess: an expired local AWS login. A new `aws login` changed nothing, because CI does
  not use local credentials. Real cause: the repo uses GitHub's immutable OIDC subject, so the
  token's `sub` is `repo:GitGitRice@160424208/squadmeet@1408673415:ref:refs/heads/main`. The
  role's trust policy expected `repo:GitGitRice/squadmeet:ref:refs/heads/main`. Found with
  `gh api repos/GitGitRice/squadmeet/actions/oidc/customization/sub`. Fix: new `sub` in the
  role's trust policy. [deploy/setup-github-deploy.sh](deploy/setup-github-deploy.sh) now asks
  GitHub for the prefix. Lesson: for an OIDC "not authorized" error, compare the token's real
  claims with the trust policy before you look at credentials.
- **A new Now-meetup is not "active"** (`SCRUM-29`, 2026-10-08). Symptom: pytest creates a
  Meetup through the API, but the Place detail lists no Meetup and `people_now` stays 0; 3 of
  the new tests fail, while creating and ending work. Wrong guess: a time zone mix-up between
  Python (`datetime.now(UTC)`) and the `timestamptz` column. Real cause: the "active" condition
  used PostgreSQL's `now()`, which is the start time of the **transaction**, not the current
  time. Each test runs in one transaction (rollback fixture), so a Meetup created inside it
  starts *after* `now()` and fails `starts_at <= now()`. In production the same gap exists
  within one request. Fix: the app passes its own clock to `is_active(now)`, the same clock that
  sets `starts_at` ([backend/app/meetups.py](backend/app/meetups.py)). Lesson: `now()` in
  PostgreSQL is frozen per transaction (`clock_timestamp()` is not); compare times from one
  clock.

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

## Shared log (until 2026-10-08)

The team log before the split. New lines go to each person's `HANDOFF.local.md`.

Newest first. One line per session: date · who · what changed.

- 2026-10-08 · Steven · [PR #9](https://github.com/GitGitRice/squadmeet/pull/9) into `dev`: HANDOFF split into this shared file (in git) and `HANDOFF.local.md` (each person's progress, not in git), PR text may be English, `TICKETS.md` with David's tickets split. Needs Stefan's approval.

- 2026-10-08 · Steven · David left the project. Created `SCRUM-46` (In Progress, German) with the ticket split and scope suggestions for Stefan to confirm. Jira assignees not changed yet. Later: Stefan agreed; reassigned the 11 tickets and Epic owners in Jira, updated `TICKETS.md`. Dropped the "PR in German" rule (`CLAUDE.md`, *Conventions*).

- 2026-10-08 · Stefan · PR #7 and #8 merged by Steven, with review comments on `SCRUM-17`/`SCRUM-18`. Decision: in the prototype the Host can Leave and hands over to the earliest Join. Fix branch `feature/SCRUM-17-host-leave` (Host Leave, cancelled-text bug, glossary names). `SCRUM-18` decisions answered (Condition = what the city must fix; "Oft abgeschlossen" → "Zeitweise nicht zugänglich"; no lighting Reason) on branch `feature/SCRUM-18-review-decisions`.

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
