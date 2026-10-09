# Projekt-Tagebuch

Jedes Teammitglied schreibt pro Arbeitstag einen kurzen Eintrag: was du an dem Tag gemacht hast.
Die Details stehen in Jira. Nenne also den Ticket-Key und kopiere nicht den Ticket-Text.

**Regeln**

- Ein Block pro Tag, der neueste Tag oben.
- Eine Zeile pro Person, 1–3 kurze Punkte. Schreib deine Zeile, bevor du für den Tag aufhörst.
- Nenne den Jira-Key, wenn es einen gibt: `SCRUM-22 Login-Endpoint fertig`.
- Nichts zu berichten? Schreib, was dich blockiert hat.
- Auf Deutsch schreiben, damit alle im Team es verstehen.

---

## Fr 09.10.2026 — Tag 3

- **Steven:** `SCRUM-26` Fixes aus Stefans Review gemergt (PR #31). `SCRUM-27` Captcha (Cloudflare Turnstile) und Login-Limit gebaut, Turnstile-Schlüssel per Wizard in AWS gespeichert (PR #32, wartet auf Review). `SCRUM-48` angelegt: Übergabe an Stefan nach der Präsentation.
- **Stefan:** _bitte ausfüllen_

## Do 08.10.2026 — Tag 2

- **Team:** David hat das Projekt verlassen. Seine Tickets sind aufgeteilt (`SCRUM-46`).
- **Stefan:** `SCRUM-18` Begründungen pro Aktivitätstyp und `SCRUM-17` klickbarer Meetup-Prototyp (Karte + Panel) gemergt; Stevens Review beantwortet (Gastgeber darf verlassen, Zustand = was die Stadt beheben muss). Umfang zu zweit entschieden (`SCRUM-46`).
- **Steven:** `SCRUM-20` App läuft live auf AWS mit HTTPS (https://squadmeet.duckdns.org), `SCRUM-19` CI fertig, Stefans `SCRUM-21`/`SCRUM-24` reviewt. `SCRUM-23` automatisches Deploy bei Merge in `main` läuft (erster Deploy scheiterte am AWS-Login per OIDC, behoben in PR #24). Sprint 1 abgeschlossen, Sprint 2 geplant; `SCRUM-26` Zwei-Faktor-Anmeldung (Authenticator-App) gemergt.

## Mi 07.10.2026 — Tag 1: Thema und Planung

- **Team:** Stefans Idee gewählt (Karte mit Aktivitäts-Plätzen und Meetups). Rollen aufgeteilt.
- **Steven:** Design-Interview zur Idee geleitet; Glossar und Entscheidungen geschrieben (ADR-0001–0005). Jira eingerichtet: 11 Epics, 30 Stories/Tasks, Sprint 1. GitHub-Repo erstellt. `SCRUM-16` lokales Skeleton gemergt (Karte mit einem Platz aus der DB). `SCRUM-22` Registrieren/Anmelden/Abmelden mit Nickname gemergt. `SCRUM-19` CI-Pipeline gebaut (Tests + Docker-Images bei jedem PR, PR #6 grün, wartet auf Review); rote Pipeline blockiert jetzt den Merge.
- **Stefan:** _bitte ausfüllen_
- **David:** _bitte ausfüllen_
