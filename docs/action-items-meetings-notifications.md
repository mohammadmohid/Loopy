# Action items, meetings, and notifications — implementation notes

This document describes the fixes and behaviors added around **meeting action proposals (assign-task type)**, **meeting UX (host/participants and filters)**, and **in-app notifications** (copy, routing, and delivery hygiene). It also records **edge cases**, **performance** considerations, and **maintainability** guidance for future changes.

**Verification:** Automated checks (`pnpm exec tsc --noEmit` in `frontend`, `services/project`, `services/transcription`) were used during implementation; integration scenarios below should still be exercised manually using the checklist in section 4.

---

## 1. Action items (transcription + meeting artifact UI)

### 1.1 Goals

- Allow hosts to choose a **task type** aligned with the project task model: `task`, `bug`, `feature`, `story`.
- Persist that choice as a **draft** on the proposal before approve.
- On **approve**, create the project task with the chosen **type** (default `task` if unset).
- Keep **manual minutes edits** from overwriting curated proposal cards (see section 1.4).

### 1.2 Backend (`services/transcription`)

| Area | Behavior |
|------|----------|
| **Schema / parser** | `ActionProposal` supports optional `draftTaskType` (`services/transcription/src/lib/parseActionProposals.ts`). |
| **Normalization** | `normalizeDraftTaskType()` accepts only `task \| bug \| feature \| story` (case-insensitive trim); invalid strings are ignored (`services/transcription/src/controllers/actionProposalController.ts`). |
| **PATCH** `action-proposals/:id` | Accepts `draftTaskType`: valid string sets the field; `null` or `""` clears it. |
| **Approve (`assign_task`)** | Execution payload uses `type: normalizeDraftTaskType(proposal.draftTaskType) ?? "task"`. Task creation goes through the gateway `POST /api/projects/:projectId/tasks` with `type` in the body. |

### 1.3 Frontend (`frontend/src/app/(dashboard)/meetings/[id]/page.tsx`)

- Constants for labels (e.g. `TASK_ACTION_TYPES`).
- Pending **assign task** cards: **Edit** loads `draftTaskType` (default `task`), **Save** sends `draftTaskType` with assignees/due date via PATCH.
- Read-only card shows **Type:** from `draftTaskType ?? "task"`.

### 1.4 Minutes vs proposals (important behavioral split)

- **`updateSummary`** (manual save of minutes) updates `artifact.summary` **only** and **does not** call `syncArtifactActionProposalsFromSummary`. Host-edited minutes no longer wipe or replace proposal cards (`services/transcription/src/controllers/transcriptionController.ts`).
- **AI-driven flows still sync proposals from summary text**, including:
  - Transcription pipeline completion after summary generation.
  - Background `triggerSummary` success/failure paths.
  - Host `getArtifact` backfill when proposals are empty but summary exists.

**Implication:** If someone regenerates summary from AI, proposals may be rebuilt from parsed summary lines; manual card edits should still be preserved when only minutes are edited via `PUT …/summary/:meetingId`.

### 1.5 Edge cases — action items

| Scenario | Expected behavior |
|----------|-------------------|
| Invalid `draftTaskType` in PATCH | Ignored / cleared only via `null` or `""` per controller rules. |
| Approve without ever PATCHing type | Defaults to **`task`**. |
| Meeting approve → project API | Uses host session (cookies/auth headers); failures surface as approve error. |
| Non-host views artifact | Backend may omit `actionProposals` from payload for non-hosts; UI should match product rules. |

### 1.6 Performance — action items

- PATCH and approve are **single-document** artifact updates plus one HTTP call to create a task — acceptable for interactive host flows.
- Parsing/sync on **full AI summary** is heavier; it runs asynchronously or after NLP — avoid coupling UI to full sync on every keystroke (already avoided for manual minutes).

### 1.7 Maintainability — action items

- **Single source of truth** for allowed types: mirror `services/project/src/models/Task.ts` enum with transcription `TASK_TYPE_VALUES` / frontend constants — if you add a type in Mongo schema, update **all three** (project model, transcription normalizer, UI labels).
- Consider a **shared package constant** for task types to prevent drift.

---

## 2. Meetings

### 2.1 Host locked in participant pickers

**Components:** `schedule-meeting-dialog.tsx`, `host-meeting-dialog.tsx`, `edit-scheduled-meeting-dialog.tsx`.

| Flow | Locked identity |
|------|-----------------|
| Schedule / Host new meeting | Current user from `useAuth()` — **always** in selection; toggle for that id is a no-op; payload unions `hostUserId` into `participants`. |
| Edit upcoming meeting | Meeting’s **host** from `hostId` (string or populated `{ _id }`); merged into `participants` on load; cannot be removed; save ensures host id is included. |

**UI:** Host row shows a **Host** chip (with lock icon) and non-clickable styling for toggling off.

### 2.2 Copy: “Host Meeting”

**File:** `frontend/src/app/(dashboard)/meetings/page.tsx` — instant-meeting primary action label reads **Host Meeting** (replacing “Capture Meeting”) for clarity.

### 2.3 Project filter (past + upcoming lists)

**Component:** `frontend/src/app/(dashboard)/meetings/_components/meeting-history-list.tsx`.

**Problem fixed:** Filter previously used **`projectName`** on meetings; API payloads typically expose **`projectId`** only, so the dropdown was empty or filtering failed.

**Solution:**

1. On mount, fetch **`GET /projects`** (workspace-scoped array with `_id`, `name`).
2. Derive distinct **`projectId`s from the meetings list**, join to names via a map.
3. Filter state is **`filterProjectId`**: `"all"` or a 24-char hex id.
4. Compare **`meetingProjectId(meeting)`** to selection.
5. Unknown ids still appear as **`Project (xxxxxxxx…)`** fallback labels.
6. If options change and current selection is invalid, reset to **All projects**.

**Consumers:** Past meetings on main meetings page and upcoming meetings on `frontend/src/app/(dashboard)/meetings/upcoming/page.tsx` (both render `MeetingHistoryList`).

### 2.4 Edge cases — meetings

| Scenario | Behavior |
|----------|----------|
| Auth not hydrated when dialog opens | Participant effect runs again when `hostUserId` becomes available; payload still unions host on submit. |
| Host `projectId` missing on meeting row | Filter option may rely on empty ids — meeting won’t match a specific project filter; consider backend always returning `projectId`. |
| `/projects` fails | Dropdown still lists ids with fallback labels; filtering by id works. |
| Edit meeting: legacy doc without `hostId` | No locked row if host id resolves empty; saving does not inject unknown host. |

### 2.5 Performance — meetings

- **One `/projects` fetch per `MeetingHistoryList` mount** — if multiple instances mount simultaneously, consider lifting fetch to SWR/React Query later (not required for typical single-list usage).
- Project filter options use **`useMemo`** over meetings + workspace projects — O(n) in list sizes.

### 2.6 Maintainability — meetings

- **`meetingProjectId` / host helpers** are duplicated between list and edit dialog — extracting to `@/lib/meeting-host` or a small `meeting-utils.ts` would reduce drift.
- Schedule/host dialogs duplicate participant UX — a shared **ParticipantPicker** component could unify behavior.

---

## 3. Notifications

### 3.1 Task-type visibility

**Backend (`services/project`):**

- `formatTaskTypeLabel()` in `services/project/src/services/notificationDispatch.ts`.
- Task lifecycle notifications prefix body with **`[Bug]`**, **`[Feature]`**, etc., and set **`metadata.taskType`** (`taskController.ts`, due reminders in `jobs/notificationReminders.ts`).
- Assignee / PM notifications for assignment, due changes, completion include consistent copy where applicable.

**Frontend:**

- `notification-slide-over.tsx` shows a **pill** when `metadata.taskType` is present.

### 3.2 Routing on notification click

**Module:** `frontend/src/lib/notification-navigation.ts` — **`getNotificationHref()`**.

| Condition | Route |
|-----------|--------|
| `category === "meeting"` | `/meetings/upcoming` |
| Task-related **and** valid `metadata.projectId` | `/projects/:projectId?tab=tasks` |

**Task-related** means:

- `category === "task"`, **or**
- `kind` in `{ TASK_ASSIGNED, TASK_DUE_UPDATED, TASK_DUE_3D, TASK_DUE_24H, PM_TASK_ASSIGNED, PM_TASK_COMPLETED }`.

**Project backlog tab:** `frontend/src/app/(dashboard)/projects/[id]/page.tsx` reads **`?tab=tasks`** on load (with `id` dependency) to activate the Backlog tab.

**Slide-over:** marks read, closes panel, **`router.push(href)`** when href exists.

### 3.3 Delivery hygiene

- **`dispatchToUsers`** filters **`userIds`** to valid Mongo ObjectIds before `Notification.create` — avoids insert errors and stray recipients (`notificationDispatch.ts`).
- Meeting reminder recipient extraction uses validated id strings (`notificationReminders.ts`).
- Task due reminders include **`type`** in query select and assignee id validation where applicable.

### 3.4 Timing

- Reminder cron scheduling was tightened to **every 5 minutes** (from 10) for closer alignment with “today” / “within an hour” / due-soon windows (`startNotificationReminderJobs` log message updated accordingly).

### 3.5 Edge cases — notifications

| Scenario | Behavior |
|----------|----------|
| Legacy notification without `projectId` | Click marks read **only** — no navigation. |
| `PM_TASK_*` with `category: "update"` | Still routed via **`TASK_ROUTING_KINDS`** if `projectId` present. |
| `category: "meeting"` without `meetingId` in metadata | Still routes to **upcoming** list (list is global to workspace UX). |
| Duplicate dedupe keys | Mongo unique sparse index — second insert skipped per user; see `Notification` schema in `@loopy/shared`. |
| SSE + list | Real-time event prepends notification; unread count incremented if new. |

### 3.6 Performance — notifications

- **Per-recipient loop** in `dispatchToUsers` — acceptable for small recipient sets; for bulk broadcasts consider batch insert + fan-out (future).
- **Cron every 5 min** increases reminder query frequency vs 10 min — monitor DB load if `meetings` / `tasks` collections grow very large; add compound indexes if slow.
- Frontend lists cap at **120** notifications (project `listNotifications`) — stale older items not shown in panel.

### 3.7 Maintainability — notifications

- **`TASK_ROUTING_KINDS`** must stay aligned with **`kind` strings** emitted by the project service — centralize in a shared const or generate OpenAPI/types.
- **`formatTaskTypeLabel`** and frontend **`TASK_TYPE_LABELS`** duplicate mapping — optional shared JSON or tiny shared package.

---

## 4. Verification checklist (manual QA)

### Action items

- [ ] Host edits assign-task card: change type to **Bug**, save, reload artifact — draft persists.
- [ ] Approve creates task with correct **type** in project backlog/board.
- [ ] Manual minutes save **does not** remove edited proposal cards.
- [ ] Trigger AI summary regenerate — confirm product expectation for proposal sync vs edited cards.

### Meetings

- [ ] Schedule + Host: host always selected, cannot deselect; API receives host in `participants`.
- [ ] Edit upcoming: host row locked; PATCH participants always includes host id.
- [ ] Past + upcoming lists: project dropdown shows **names**; filtering narrows rows correctly.
- [ ] Meetings with only `projectId` (no `projectName`) still filter correctly.

### Notifications

- [ ] New assignment shows **`[Feature]`** (or chosen type) and pill when metadata present.
- [ ] Click meeting notification → **Upcoming meetings** page.
- [ ] Click task notification → **project backlog** (`?tab=tasks`).
- [ ] Notification with missing `projectId` → mark read, no broken navigation.

---

## 5. File index (quick reference)

| Topic | Primary paths |
|-------|----------------|
| Action proposal types / approve | `services/transcription/src/controllers/actionProposalController.ts`, `services/transcription/src/lib/parseActionProposals.ts` |
| Manual minutes vs proposals | `services/transcription/src/controllers/transcriptionController.ts` (`updateSummary`) |
| Meeting detail UI (tasks) | `frontend/src/app/(dashboard)/meetings/[id]/page.tsx` |
| Participant lock + schedule/host | `frontend/src/app/(dashboard)/meetings/_components/schedule-meeting-dialog.tsx`, `host-meeting-dialog.tsx` |
| Edit scheduled + host lock | `frontend/src/app/(dashboard)/meetings/_components/edit-scheduled-meeting-dialog.tsx` |
| Project filter | `frontend/src/app/(dashboard)/meetings/_components/meeting-history-list.tsx` |
| Notification dispatch + labels | `services/project/src/services/notificationDispatch.ts`, `services/project/src/controllers/taskController.ts`, `services/project/src/jobs/notificationReminders.ts` |
| Notification UI + links | `frontend/src/lib/notification-navigation.ts`, `frontend/src/app/(dashboard)/_components/notification-slide-over.tsx`, `frontend/src/app/(dashboard)/projects/[id]/page.tsx` |

---

## 6. Risks and follow-ups

1. **Task type drift** between services if enums change without updating transcription + frontend.
2. **AI summary regeneration** may repopulate proposals from parsed summary — document product policy for hosts (“Save minutes” vs “Regenerate”).
3. **Cron frequency** vs infrastructure cost — revisit if scale grows.
4. **Meeting notification route** always goes to `/meetings/upcoming` — fine for reminders; optional enhancement: deep-link to meeting detail when `metadata.meetingId` exists.

This document should be updated whenever kinds, categories, routes, or enums change.
