# Ticket-Übersicht — wer womit anfängt

Snapshot von Jira (Projekt `SCRUM`) am 08.10.2026, nach dem Merge von `SCRUM-24` (PR #16). David ist raus, seine Tickets sind auf Steven und Stefan verteilt (`SCRUM-46`). Jira ist die Single Source of Truth; diese Datei kann
veraltet sein. Die Liste jeder Person ist in Arbeitsreihenfolge: Bearbeite das oberste offene Ticket, dessen Blocker erledigt sind.

- **✓ = erledigt** (Done in Jira).
- **● = in Arbeit** (In Progress oder In Review in Jira).
- **▶ = jetzt starten** (alle Blocker erledigt).
- **Blockiert von** = Jira "is blocked by" Verknüpfung. Starte ein Ticket, wenn diese erledigt (Done) sind.
- **Prio** (nur Sprint 2): Must / Should / Could. Must zuerst.

Sprint 1 = Mi 07.10. – Fr 09.10. (Walking Skeleton live). Sprint 2 = Mo 12.10. – Fr 16.10.
(Feature Freeze).

## Steven

| | Key | Titel | Epic | Sprint | Prio | Blockiert von |
|-|-----|-------|------|--------|------|---------------|
| ✓ | SCRUM-16 | Skeleton: ein Platz auf der Karte, lokal | SCRUM-6 Infrastruktur & Pipeline | 1 | | — |
| ✓ | SCRUM-22 | Registrieren und anmelden mit einem Nickname | SCRUM-2 Anmeldung und Registrierung | 1 | | 16 |
| ✓ | SCRUM-46 | David ist raus: seine Tickets auf Steven und Stefan aufteilen | — | 1 | | — |
| ✓ | SCRUM-19 | CI: Tests und Images bei jedem Pull Request | SCRUM-6 Infrastruktur & Pipeline | 1 | | 16 |
| ✓ | SCRUM-20 | AWS Host mit HTTPS | SCRUM-6 Infrastruktur & Pipeline | 1 | | 16 |
| ● | SCRUM-23 | Automatisches Deploy + Smoke-Test | SCRUM-6 Infrastruktur & Pipeline | 1 | | 19, 20 |
| ▶ | SCRUM-26 | MFA mit einer Authenticator-App | SCRUM-2 Anmeldung und Registrierung | 2 | Must | 22 |
| ▶ | SCRUM-27 | Captcha (Turnstile) und Login-Rate-Limit | SCRUM-2 Anmeldung und Registrierung | 2 | Must | 22 |
| ▶ | SCRUM-28 | Datenschutzseite, Impressum und "Mein Konto löschen" | SCRUM-14 Datenschutz & Konto | 2 | Must | 22 |
| | SCRUM-33 | Passwort-Reset mit Recovery-Code oder MFA-Code | SCRUM-2 Anmeldung und Registrierung | 2 | Must | 22, 26 |
| ▶ | SCRUM-30 | Einen Platz vorschlagen, mit der Duplikat-Warnung | SCRUM-9 Platzvorschläge & Bestätigungen | 2 | Should | 22, 21 |
| | SCRUM-36 | Einen Platzvorschlag am Platz bestätigen | SCRUM-9 Platzvorschläge & Bestätigungen | 2 | Should | 30 |
| | SCRUM-39 | Admin: Platz sperren, entsperren und löschen | SCRUM-13 Admin & Moderation | 2 | Must | 26, 37 |
| | SCRUM-40 | In-App Benachrichtigungsliste | SCRUM-12 Benachrichtigungen | 2 | Should | 37 |
| | SCRUM-41 | Favoriten mit Zeit-Regeln | SCRUM-12 Benachrichtigungen | 2 | Should | 40 |
| | SCRUM-44 | Web-Push für Benachrichtigungen | SCRUM-12 Benachrichtigungen | 2 | Could | 40 |
| | SCRUM-45 | Home-Bereich Benachrichtigungen | SCRUM-12 Benachrichtigungen | 2 | Could | 40 |

## Stefan

| | Key | Titel | Epic | Sprint | Prio | Blockiert von |
|-|-----|-------|------|--------|------|---------------|
| ✓ | SCRUM-17 | Meetup-Screens als klickbarer Prototyp | SCRUM-8 Treffen (Haupt-Workflow) | 1 | | — |
| ✓ | SCRUM-18 | Die Liste der Gründe pro Aktivitätstyp | SCRUM-10 Bewertungen & Fotos | 1 | | — |
| ✓ | SCRUM-21 | Echte Plätze für Leipzig auf der Karte | SCRUM-7 Plätze & Karte | 1 | | 16 |
| ▶ | SCRUM-25 | Die anderen 4 Städte importieren | SCRUM-7 Plätze & Karte | 1 | | 21 |
| ✓ | SCRUM-24 | Filter und Platz-Details | SCRUM-7 Plätze & Karte | 1 | | 21 |
| ▶ | SCRUM-29 | Ein Jetzt-Meetup erstellen und auf der Karte sehen | SCRUM-8 Treffen (Haupt-Workflow) | 2 | Must | 22, 24, 17 |
| ▶ | SCRUM-31 | Einen Platz mit Sternen und Gründen bewerten | SCRUM-10 Bewertungen & Fotos | 2 | Must | 22, 24, 18 |
| | SCRUM-35 | Meetup zu einer späteren Zeit | SCRUM-8 Treffen (Haupt-Workflow) | 2 | Must | 29 |
| | SCRUM-34 | Einem Meetup mit Party-Größe beitreten, und Verlassen | SCRUM-8 Treffen (Haupt-Workflow) | 2 | Must | 29 |
| | SCRUM-37 | Host: Absagen, Übergabe und Geschlossen | SCRUM-8 Treffen (Haupt-Workflow) | 2 | Must | 34 |
| | SCRUM-38 | Wöchentliche Serie mit Terminen | SCRUM-8 Treffen (Haupt-Workflow) | 2 | Should | 34, 35 |
| ▶ | SCRUM-32 | Kontaktanfrage, annehmen, entfernen und Blockieren | SCRUM-11 Kontakte & Blockieren | 2 | Should | 22 |
| | SCRUM-42 | Foto-Upload und Admin-Freigabe | SCRUM-10 Bewertungen & Fotos | 2 | Should | 39, 20 |
| | SCRUM-43 | Kontakte: Benachrichtigung für deren Meetups und Einladungen | SCRUM-11 Kontakte & Blockieren | 2 | Could | 32, 40 |

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
| SCRUM-7 | Plätze & Karte | Stefan |
| SCRUM-9 | Platzvorschläge & Bestätigungen | Steven |
| SCRUM-13 | Admin & Moderation | Steven |
