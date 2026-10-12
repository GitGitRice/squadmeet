# Ticket-Übersicht — wer womit anfängt

Snapshot von Jira (Projekt `SCRUM`) am 12.10.2026, in Sprint 2. Dominik ist seit 12.10. dabei; alle offenen Tickets sind neu verteilt (`SCRUM-51`). Jira ist die Single Source of Truth; diese Datei kann veraltet sein. Die Liste jeder Person ist in Arbeitsreihenfolge: Bearbeite das oberste offene Ticket, dessen Blocker erledigt sind.

- **✓ = erledigt** (Done in Jira).
- **● = in Arbeit** (In Progress oder In Review in Jira).
- **▶ = jetzt starten** (alle Blocker erledigt).
- **Blockiert von** = Jira "is blocked by" Verknüpfung. Starte ein Ticket, wenn diese erledigt (Done) sind.
- **Prio**: Must / Should / Could. Must zuerst.

Sprint 2 = bis Mi 21.10. (Feature Freeze). Do–Fr 22.–23.10. nur Fixes, Test, Review, Doku. Präsentation: Mo 26.10.
Erledigte Tickets aus Sprint 1 und 2 stehen in Jira.

## Steven

| | Key | Titel | Epic | Prio | Blockiert von |
|-|-----|-------|------|------|---------------|
| ● | SCRUM-27 | Captcha (Turnstile) und Login-Rate-Limit | SCRUM-2 Anmeldung | Must | 22 |
| | SCRUM-39 | Admin: Platz sperren, entsperren und löschen | SCRUM-13 Admin & Moderation | Must | 26, 37 |
| ● | SCRUM-30 | Einen Platz vorschlagen, mit der Duplikat-Warnung | SCRUM-9 Platzvorschläge | Should | 22, 21 |
| | SCRUM-36 | Platzvorschlag am Platz bestätigen (+ Konto ab 7 Tagen, Kennzeichnung) | SCRUM-9 Platzvorschläge | Should | 30 |
| | SCRUM-56 | Admin-Freigabe für Platzvorschläge, 24 h, OSM-Hinweis | SCRUM-9 Platzvorschläge | Should | 36, 39 |
| | SCRUM-57 | Platz melden | SCRUM-13 Admin & Moderation | Could | 39 |
| | SCRUM-48 | Übergabe: Stefan hostet und besitzt Squadmeet nach der Präsentation | — | Must | alle anderen Musts |

## Stefan

| | Key | Titel | Epic | Prio | Blockiert von |
|-|-----|-------|------|------|---------------|
| ● | SCRUM-28 | Datenschutzseite, Impressum und "Mein Konto löschen" | SCRUM-14 Datenschutz & Konto | Must | 22 |
| ▶ | SCRUM-35 | Meetup zu einer späteren Zeit | SCRUM-8 Treffen | Must | 29 |
| ▶ | SCRUM-34 | Einem Meetup mit Party-Größe beitreten, und Verlassen | SCRUM-8 Treffen | Must | 29 |
| | SCRUM-37 | Host: Absagen, Übergabe und Geschlossen | SCRUM-8 Treffen | Must | 34 |
| ▶ | SCRUM-55 | Meldung an die Stadt (City report) | SCRUM-10 Bewertungen & Fotos | Should | 31 |
| | SCRUM-38 | Wöchentliche Serie mit Terminen | SCRUM-8 Treffen | Should | 34, 35 |
| ▶ | SCRUM-32 | Kontaktanfrage, annehmen, entfernen und Blockieren | SCRUM-11 Kontakte | Should | 22 |
| | SCRUM-42 | Foto-Upload und Admin-Freigabe | SCRUM-10 Bewertungen & Fotos | Should | 39, 20 |
| | SCRUM-43 | Kontakte: Benachrichtigung für deren Meetups und Einladungen | SCRUM-11 Kontakte | Could | 32, 40 |

## Dominik

| | Key | Titel | Epic | Prio | Blockiert von |
|-|-----|-------|------|------|---------------|
| ▶ | SCRUM-52 | Ort oder Adresse suchen, Adresse in der Platz-Detailansicht | SCRUM-7 Plätze & Karte | Should | — |
| ▶ | SCRUM-53 | Route-Link in der Platz-Detailansicht | SCRUM-7 Plätze & Karte | Should | — |
| ▶ | SCRUM-54 | Treffen-Liste mit Zeitfilter für den sichtbaren Kartenausschnitt | SCRUM-8 Treffen | Should | 29 |
| | SCRUM-40 | In-App Benachrichtigungsliste | SCRUM-12 Benachrichtigungen | Should | 37 |
| | SCRUM-41 | Favoriten mit Zeit-Regeln | SCRUM-12 Benachrichtigungen | Should | 40 |
| | SCRUM-45 | Home-Bereich Benachrichtigungen | SCRUM-12 Benachrichtigungen | Could | 40 |
| | SCRUM-44 | Web-Push für Benachrichtigungen | SCRUM-12 Benachrichtigungen | Could | 40 |
| | SCRUM-50 | Manueller Test der ganzen App | SCRUM-15 Präsentation | Must | — (Do–Fr 22.–23.10.) |

## Alle drei (Do–Fr 22.–23.10.)

| | Key | Titel | Blockiert von |
|-|-----|-------|---------------|
| | SCRUM-49 | Die ganze Codebase reviewen | — |

## Epics

| Key | Epic | Owner |
|-----|------|-------|
| SCRUM-6 | Infrastruktur & Pipeline | Steven |
| SCRUM-2 | Anmeldung und Registrierung | Steven |
| SCRUM-14 | Datenschutz & Konto | Steven |
| SCRUM-12 | Benachrichtigungen | Dominik |
| SCRUM-8 | Treffen (Haupt-Workflow) | Stefan |
| SCRUM-10 | Bewertungen & Fotos | Stefan |
| SCRUM-11 | Kontakte & Blockieren | Stefan |
| SCRUM-15 | Präsentation & Doku | Stefan |
| SCRUM-7 | Plätze & Karte | Stefan |
| SCRUM-9 | Platzvorschläge & Bestätigungen | Steven |
| SCRUM-13 | Admin & Moderation | Steven |
