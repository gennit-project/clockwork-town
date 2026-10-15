# Completed roadmap work

Specs and "what was actually built" notes for finished items, kept for reference and for
their *Known gaps* lists. The open roadmap is in [../README.md](../README.md); nothing in
the parent folder is meant to describe finished work.

| Done | Spec |
|------|------|
| Epic 0: alerts/tickets, behavioral traits, ranked values, need gating | [epic-0-foundation.md](epic-0-foundation.md) |
| Epic 1.1–1.4: daily summaries, reunions, approval/disapproval, group situations | [epic-1-relationships-done.md](epic-1-relationships-done.md) |
| Epic 6.1: cause records and the "why" view | [epic-6-1-cause-records.md](epic-6-1-cause-records.md) |

## What is built (verified against the code at the time of writing)

approval and disapproval (witness reactions, grievances, tickets); daily summary memories; reunion hugs and pet greetings with a recent-events feed; homebody pets that live at their owner's home; ranked values (per-value state, neglect drain, planner nudge, dashboard panel, editor ranking); behavioral traits (per-character decay, disabled romance need, editor picker); need gating + rebalanced decay; live `/alerts` and `/tickets` (derived alerts, in-memory ticket lifecycle); 9-need utility sim; directed relationships (short/long-term scores + labels, proposals, decay); short/long-term memories + memory timeline with eventType filtering; activity log / log stream; employment & work shifts; read-only calendar; **animal runtime** (needs, movement, action choice) + **human↔animal petting**; coordinated `chat_friend` (pairs and groups of up to 4), group movies and art when bored, and `date` (always one other person), with a short per-target backoff after a rejection; Grafana reskin (world/region hexmap, town & character dashboards, relationships graph); world isolation; character editor (name/age/bio/schedule); household editor (members + animals); lot & household **template libraries**; lot/space/item creation (item authoring is inline per-room in `SpaceDetail.vue`); **backup/restore to Google Drive** (encrypted; the world export/import covers lots, spaces, items, households, residents with their schedules, traits and ranked values, and animals with owners, homes and locations; it does **not** yet include relationships, memories or live need state; `npm run check:backup` round-trips a world against a running backend and fails if anything is lost).
