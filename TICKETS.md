# Ticket overview — who starts with what

Snapshot of Jira (`SCRUM` project) on 2026-10-07. Jira is the source of truth; this file can be
out of date. Each person's list is in work order: do the top open ticket whose blockers are done.

- **▶ = start now** (no blockers).
- **Blocked by** = Jira "is blocked by" link. Start a ticket when those are Done.
- **Prio** (Sprint 2 only): Must / Should / Could. Must first.

Sprint 1 = Wed 07.10. – Fri 09.10. (walking skeleton live). Sprint 2 = Mon 12.10. – Fri 16.10.
(feature freeze).

## Steven

| | Key | Title | Epic | Sprint | Prio | Blocked by |
|-|-----|-------|------|--------|------|------------|
| ▶ | SCRUM-16 | Skeleton: one Place on the map, locally | SCRUM-6 Infrastruktur & Pipeline | 1 | | — |
| | SCRUM-22 | Register and log in with a Nickname | SCRUM-2 Anmeldung und Registrierung | 1 | | 16 |
| | SCRUM-19 | CI: tests and images on every pull request | SCRUM-6 Infrastruktur & Pipeline | 1 | | 16 |
| | SCRUM-20 | AWS host with HTTPS | SCRUM-6 Infrastruktur & Pipeline | 1 | | 16 |
| | SCRUM-23 | Automatic deploy + smoke test | SCRUM-6 Infrastruktur & Pipeline | 1 | | 19, 20 |
| | SCRUM-26 | MFA with an authenticator app | SCRUM-2 Anmeldung und Registrierung | 2 | Must | 22 |
| | SCRUM-27 | Captcha (Turnstile) and login rate limit | SCRUM-2 Anmeldung und Registrierung | 2 | Must | 22 |
| | SCRUM-28 | Privacy page, imprint and "delete my account" | SCRUM-14 Datenschutz & Konto | 2 | Must | 22 |
| | SCRUM-33 | Password reset with a Recovery code or MFA code | SCRUM-2 Anmeldung und Registrierung | 2 | Must | 22, 26 |
| | SCRUM-40 | In-app Notification list | SCRUM-12 Benachrichtigungen | 2 | Should | 37 |
| | SCRUM-41 | Favorites with Time rules | SCRUM-12 Benachrichtigungen | 2 | Should | 40 |
| | SCRUM-44 | Web push for Notifications | SCRUM-12 Benachrichtigungen | 2 | Could | 40 |
| | SCRUM-45 | Home area Notifications | SCRUM-12 Benachrichtigungen | 2 | Could | 40 |

## Stefan

| | Key | Title | Epic | Sprint | Prio | Blocked by |
|-|-----|-------|------|--------|------|------------|
| ▶ | SCRUM-17 | Meetup screens as a clickable prototype | SCRUM-8 Treffen (Haupt-Workflow) | 1 | | — |
| ▶ | SCRUM-18 | The list of Reasons per Activity type | SCRUM-10 Bewertungen & Fotos | 1 | | — |
| | SCRUM-24 | Filter and Place detail | SCRUM-7 Plätze & Karte | 1 | | 21 |
| | SCRUM-29 | Create a Now-meetup and see it on the map | SCRUM-8 Treffen (Haupt-Workflow) | 2 | Must | 22, 24, 17 |
| | SCRUM-31 | Rate a Place with stars and Reasons | SCRUM-10 Bewertungen & Fotos | 2 | Must | 22, 24, 18 |
| | SCRUM-35 | Meetup at a later time | SCRUM-8 Treffen (Haupt-Workflow) | 2 | Must | 29 |
| | SCRUM-32 | Contact request, accept, remove and Block | SCRUM-11 Kontakte & Blockieren | 2 | Should | 22 |
| | SCRUM-42 | Photo upload and Admin approval | SCRUM-10 Bewertungen & Fotos | 2 | Should | 39, 20 |
| | SCRUM-43 | Contacts: Notification for their Meetups and invitations | SCRUM-11 Kontakte & Blockieren | 2 | Could | 32, 40 |

## David

| | Key | Title | Epic | Sprint | Prio | Blocked by |
|-|-----|-------|------|--------|------|------------|
| | SCRUM-21 | Real Places for Leipzig on the map | SCRUM-7 Plätze & Karte | 1 | | 16 |
| | SCRUM-25 | Import the other 4 cities | SCRUM-7 Plätze & Karte | 1 | | 21 |
| | SCRUM-30 | Suggest a Place, with the duplicate warning | SCRUM-9 Platzvorschläge & Bestätigungen | 2 | Must | 22, 21 |
| | SCRUM-34 | Join a Meetup with Party size, and Leave | SCRUM-8 Treffen (Haupt-Workflow) | 2 | Must | 29 |
| | SCRUM-36 | Confirm a Place suggestion at the Place | SCRUM-9 Platzvorschläge & Bestätigungen | 2 | Must | 30 |
| | SCRUM-37 | Host: Cancel, handover and Closed | SCRUM-8 Treffen (Haupt-Workflow) | 2 | Must | 34 |
| | SCRUM-38 | Weekly Series with Occurrences | SCRUM-8 Treffen (Haupt-Workflow) | 2 | Must | 34, 35 |
| | SCRUM-39 | Admin: lock, unlock and delete a Place | SCRUM-13 Admin & Moderation | 2 | Must | 26, 37 |

David has no ▶ ticket: everything waits for `SCRUM-16` (Steven's local skeleton). Until then,
David can prepare the OSM query and the data model for `SCRUM-21` without the skeleton repo.

## Epics

| Key | Epic | Owner |
|-----|------|-------|
| SCRUM-6 | Infrastruktur & Pipeline | Steven |
| SCRUM-2 | Anmeldung und Registrierung | Steven |
| SCRUM-14 | Datenschutz & Konto | Steven |
| SCRUM-12 | Benachrichtigungen | Steven |
| SCRUM-8 | Treffen (Haupt-Workflow) | Stefan |
| SCRUM-10 | Bewertungen & Fotos | Stefan |
| SCRUM-11 | Kontakte & Blockieren | Stefan |
| SCRUM-15 | Präsentation & Doku | Stefan |
| SCRUM-7 | Plätze & Karte | David |
| SCRUM-9 | Platzvorschläge & Bestätigungen | David |
| SCRUM-13 | Admin & Moderation | David |
