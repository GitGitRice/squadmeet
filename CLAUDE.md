# Abschlussprojekt

Team final project (2 people since 2026-10-08), tracked in Jira.

## Handoff

[HANDOFF.md](HANDOFF.md) is each person's own living handoff: what is in flight, why, and what
comes next. It is not in git (`.gitignore`), because each person's progress differs. If it is
missing, restore the last shared version: `git show "$(git rev-list -n 1 HEAD -- HANDOFF.md)^:HANDOFF.md" > HANDOFF.md`. Its rules section says how to write in it.

- **Session start:** read `HANDOFF.md`, then the Jira issues it names, before you start work.
- **Session end:** before you stop, update `HANDOFF.md` by its rules. Then tell the person
  what you changed in it.
- **Diary:** at the end of a working day, add the person's short line to
  [DIARY.md](DIARY.md) (rules at its top), in German. Ask them what they did if you do not know.
- **Decision or debugging case:** add it to `HANDOFF.md` when it happens, not at session end.

## Jira

Use the Atlassian MCP server for Jira. The issue hierarchy and the naming conventions are in
`HANDOFF.md` → *Jira*.

## Agent skills

### Issue tracker

Issues live in Jira (project `SCRUM`), accessed through the Atlassian MCP server. See `docs/agents/issue-tracker.md`.

### Triage labels

Default label names (`needs-triage`, `needs-info`, `ready-for-agent`, `ready-for-human`, `wontfix`) as Jira labels. See `docs/agents/triage-labels.md`.

### Domain docs

Single-context: one `CONTEXT.md` and `docs/adr/` at the repo root. See `docs/agents/domain.md`.
