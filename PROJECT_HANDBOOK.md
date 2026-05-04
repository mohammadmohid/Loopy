# Loopy Project Handbook

This document is the long-term reference for understanding, operating, and evolving the Loopy codebase.

---

## 1. Product Summary

Loopy is a all in one tool collaboration platform that is  workspace-based for teams. It handles:

- User onboarding and identity
- Workspace membership and role management
- Project, task, milestone, and team management
- Real-time team chat (channels, threads, reactions, mentions)
- Meeting scheduling/hosting and recording
- AI-powered meeting transcription, summaries, and Q&A

Core platform model:

- **Workspace** is the primary tenant boundary.
- Users act inside one active workspace.
- Most business features are scoped to the active workspace.

---

## 2. Repository and Monorepo Layout

Root:

- `frontend/` -> Next.js app (UI + BFF-style `/api` rewrites)
- `services/` -> backend microservices
- `services/shared/` -> shared package (`@loopy/shared`)
- `docker-compose.yml` -> production-like local/deploy orchestration
- `.github/workflows/deploy.yml` -> CI/CD build and VPS deploy pipeline

Service directories:

- `services/gateway`
- `services/auth`
- `services/project`
- `services/chat`
- `services/meeting`
- `services/transcription`
- `services/shared`

Package/workspace management:

- Root workspace: `pnpm-workspace.yaml`
- Services use TypeScript + NodeNext module resolution
- Shared package is imported as workspace dependency (`@loopy/shared`)

---

## 3. System Architecture (High-Level)

```text
Browser
  |
  v
Next.js Frontend (frontend)
  |
  |  /api/* (rewrite)
  v
Gateway (services/gateway, :8000)
  |--> /api/auth       -> Auth Service (:5001)
  |--> /api/projects   -> Project Service (:5002)
  |--> /api/meetings   -> Meeting Service (:5003)
  |--> /api/chat       -> Chat Service (:5004)
  |--> /api/artifacts  -> Transcription Service (:5005)

Shared external systems:
- MongoDB (all services)
- Cloudflare R2 (avatars/files/recordings)
- Pusher (chat realtime)
- Upstash Redis (chat cache/unread)
- Jitsi as a Service (meeting runtime + webhooks)
- Deepgram (speech-to-text)
- OpenRouter (summary + transcript Q&A)
- SMTP (OTP + invite email)
```

---

## 4. Service Catalog

## 4.1 Gateway Service (`services/gateway`)

**Purpose**

- Single backend entrypoint.
- Reverse-proxies API traffic to domain services.

**Key behaviors**

- CORS allowlist with `ALLOWED_ORIGINS`.
- `helmet()` for security headers.
- global rate limiter (100 req/15 min per IP).
- prefix-aware path rewrite helper to preserve `/api/{domain}` prefixes upstream.

**Routes proxied**

- `/api/auth` -> Auth service
- `/api/projects` -> Project service
- `/api/meetings` -> Meeting service
- `/api/artifacts` -> Transcription service
- `/api/chat` -> Chat service

---

## 4.2 Shared Package (`services/shared`, `@loopy/shared`)

**Purpose**

- Shared Mongoose models, auth middleware, and common utilities.

**Exports**

- Models: `User`, `Workspace`, `Channel`, `TokenBlocklist`, `Artifact`
- Middleware: `protect`, `authorize`
- Utility: R2 client factory (`getR2Client`)

**Important shared model constraints**

- `TokenBlocklist` has TTL expiry (`createdAt` expires in 1 day).
- `Workspace` indexes members + invite tokens.
- `Channel` has multiple compound indexes for workspace/type/member access patterns.
- `Artifact` supports both uploaded files and meeting recordings + transcription status.

---

## 4.3 Auth Service (`services/auth`)

**Purpose**

- Identity lifecycle and workspace lifecycle authority.

**Major features**

- Register, login, logout
- OTP verification and resend
- Profile retrieval and update
- Avatar upload signing + retrieval via gateway path
- Workspace CRUD and membership control
- Invite token creation/accept/join
- Workspace switch and ownership transfer

**Primary routes**

- Auth: `/register`, `/login`, `/logout`, `/me`, `/:id`
- OTP: `/verify-otp`, `/resend-otp`
- User list: `/users`
- Avatar: `/upload/avatar/sign`, `/avatars/:key`
- Workspaces:
  - `/workspaces` (create)
  - `/workspaces/invite`
  - `/workspaces/accept-invite`
  - `/workspaces/join`
  - `/workspaces/switch`
  - `/workspaces/me`
  - `/workspaces/:id/leave`
  - `/workspaces/:id/transfer-ownership`
  - `/workspaces/:id` (delete)
  - members role/remove routes

**Inter-service interactions**

- Calls chat webhook to sync workspace members into global channel.
- Calls project webhook on workspace deletion to cascade project cleanup.

---

## 4.4 Project Service (`services/project`)

**Purpose**

- Project management domain.

**Major features**

- Project CRUD + board column updates
- Role/workspace-scoped project fetching
- Task and milestone CRUD
- Team CRUD
- Dashboard KPI aggregation
- Artifact registration/signing for uploads
- Activity feed aggregation

**Primary routes**

- Projects: `/`, `/:id`, `/:id/assign-lead`
- Dashboard: `/dashboard`
- Activity: `/:projectId/activity`
- Tasks: `/:projectId/tasks`, `/tasks/:id`
- Milestones: `/:projectId/milestones`, `/milestones/:id`
- Teams: `/teams`, `/teams/:id`
- Artifacts: `/artifacts`, `/artifacts/:id`, `/artifacts/sign`
- Screen recording sign URL: `/upload/screen-recording`
- Workspace deletion webhook: `/workspace-webhook/:workspaceId`

**Inter-service interactions**

- Sends project/team lifecycle webhooks to Chat service for channel sync.

---

## 4.5 Chat Service (`services/chat`)

**Purpose**

- Workspace chat and realtime collaboration.

**Major features**

- Channel management (global/project/team/direct/private)
- Messaging, file messages, message edit/delete
- Thread replies and reaction toggles
- Full-text message search with filters
- Unread counters per user/channel
- Upload signing for chat attachments

**Realtime**

- Pusher events for:
  - `new-message`, `thread-reply`
  - `message-edited`, `message-deleted`
  - `reaction-updated`
  - `message-notification`, `mention`
  - `channel-created`, `channel-updated`, `channel-deleted`, `channel-archived`
  - member join/leave events

**Caching**

- Upstash Redis for:
  - per-channel recent message cache
  - per-user unread counts hash

**Primary routes**

- Search: `/search`
- Unread: `/unread`, `/unread/read`
- Upload: `/upload/sign`
- Channel CRUD: `/channels*`
- Message/thread/reaction routes
- Internal webhooks:
  - `/channels/project-webhook`
  - `/channels/team-webhook`
  - `/channels/member-webhook`

---

## 4.6 Meeting Service (`services/meeting`)

**Purpose**

- Meeting session lifecycle and recording ingestion bridge.

**Major features**

- Create/schedule meetings
- List "my meetings" (host/participant)
- Generate Jitsi join JWT
- End/update meetings
- Receive JaaS webhook for recording upload events

**Primary routes**

- `/` (create/list)
- `/join/:roomName` (Jitsi token)
- `/end/:roomName`
- `/:id` (get/update)
- `/webhook` (JaaS callback)

**Recording pipeline responsibilities**

- Verify webhook signature (if secret is configured).
- Download recording stream from JaaS link.
- Upload to R2 bucket.
- Save `recordingUrl` in meeting.
- Trigger transcription service.

---

## 4.7 Transcription Service (`services/transcription`)

**Purpose**

- Transcription and AI minutes workflow.

**Major features**

- Start transcription for a meeting recording URL
- Persist transcript and summary in `Artifact`
- Manual summary regeneration
- Manual summary editing
- Ask-bot Q&A over transcript

**Primary routes (mounted under `/api/artifacts`)**

- `/transcribe`
- `/summary`
- `/summary/:meetingId`
- `/ask/:meetingId`
- `/:meetingId`

**AI providers**

- Deepgram (`nova-3`) for speech-to-text
- OpenRouter model calls for summary and Q&A

---

## 5. Frontend Architecture (`frontend`)

**Stack**

- Next.js App Router (React 19)
- SWR for data fetching/cache
- Pusher JS for realtime subscriptions
- Tailwind-based UI (plus shadcn/radix components)

**API strategy**

- Central `apiRequest()` helper (`src/lib/api.ts`)
- Relative `/api/*` requests rewritten to gateway via:
  - `next.config.mjs` rewrites
  - `vercel.json` rewrite config

**Core app zones**

- `(auth)` onboarding and authentication pages
- `(dashboard)` operational app:
  - Home dashboard KPIs
  - Projects + project detail
  - Meetings + meeting detail/live
  - Chat
  - Team/workspace/settings

**State patterns**

- Auth context (`AuthProvider`) for session and access routing
- Chat context for unread tracking and pusher wiring
- SWR per-page domain fetching and mutate-based UI refreshes

---

## 6. Feature Mapping (Functional + Non-Functional)

| Feature Area | Functional capability | Main modules | Non-functional posture |
|---|---|---|---|
| Authentication | Register/login/logout, OTP, profile | Frontend auth pages, Auth service, Shared middleware | JWT cookies, token blocklist, CORS, but role/type consistency should be tightened |
| Workspace Management | Create/switch/invite/join/leave/transfer/delete | Auth service + dashboard pages | Role enforcement present; some destructive flows rely on user-confirm dialogs |
| Project Management | Project CRUD, activity, dashboards | Project service + dashboard project pages | Indexed queries, scoped access; some route mismatches in frontend calls require correction |
| Task/Milestone Workflow | CRUD, assignment, milestone completion | Project service + project detail UI | Good indexing; optimistic updates used in UI |
| Team Management | Team CRUD and role groupings | Project service + team page | Chat channel sync webhook integration |
| Chat Collaboration | Channels, messages, reactions, search, unread | Chat service + chat UI + redis + pusher | Realtime + cache; no strict auth on internal webhook endpoints |
| Meetings | Schedule/host/join/end | Meeting service + meetings UI + Jitsi | JaaS signature support; recording ingestion is async in-process |
| AI Minutes | Transcript, summary, manual edits, ask-bot | Transcription service + meeting detail UI | Background pipeline, status tracking; no queueing layer yet |
| File/Media Upload | Avatar, artifacts, chat files, screen recordings | Auth/Project/Chat/Meeting services + R2 | Presigned uploads and path checks in several places |

---

## 7. Inter-Service Workflows

## 7.1 Workspace creation/join -> global chat channel membership

1. Auth creates/joins workspace.
2. Auth calls chat member webhook.
3. Chat adds member to workspace global "Everyone" channel (or waits for lazy creation).

## 7.2 Project/team lifecycle -> chat channel lifecycle

1. Project service creates/updates/deletes project/team.
2. Project service webhook calls chat.
3. Chat creates/syncs/deletes corresponding channels + cleanup messages.

## 7.3 Meeting recording -> transcription pipeline

1. Meeting live session runs in Jitsi.
2. JaaS webhook posts recording uploaded event.
3. Meeting service verifies signature, uploads recording to R2, updates meeting.
4. Meeting service triggers transcription service `/transcribe`.
5. Transcription service updates artifact state to completed/failed.

## 7.4 Workspace deletion cascade

1. Auth deletes workspace.
2. Auth calls project workspace webhook.
3. Project service deletes workspace projects.
4. Project service triggers chat project-channel deletion for each deleted project.

---

## 8. Data Ownership and Model Boundaries

| Model | Owner module | Used by |
|---|---|---|
| `User` | Shared/Auth domain | Auth, Project (populate), Chat (populate), Meeting |
| `Workspace` | Shared/Auth domain | Auth, Project scoping, Chat workspace-scoped channels |
| `TokenBlocklist` | Shared/Auth | Auth middleware validation |
| `Channel` | Shared/Chat domain | Chat |
| `Message` | Chat | Chat |
| `Project` | Project | Project, Meeting relation by `projectId` |
| `Task` | Project | Project |
| `Milestone` | Project | Project |
| `Team` | Project | Project + chat sync |
| `Meeting` | Meeting | Meeting, frontend meeting pages |
| `Artifact` | Shared/Transcription + Project artifact registration | Project uploads, Meeting recordings, Transcription state |

---

## 9. Security Architecture

## 9.1 Implemented controls

- HTTP security headers (`helmet`) on key services.
- CORS allowlist by environment.
- JWT verification middleware (`protect`).
- Role checks (`authorize`) on privileged routes.
- Cookie-based auth with secure/sameSite logic by environment.
- Logout invalidation via token blocklist (`jti` + TTL).
- Upload flows mostly use presigned URLs instead of direct file pass-through.
- JaaS webhook signature verification logic exists.

## 9.2 Current security risks to address

1. Internal webhook endpoints generally trust network and are not signed/authenticated.
2. Some routes are unauthenticated where likely auth is expected (example: meeting `GET /:id`).
3. Chat role checks use `"MANAGER"` in places while workspace role model is `"PROJECT_MANAGER"`.
4. Missing endpoint parity can push frontend to fallback/unsafe patterns.

---

## 10. Performance and Scalability

## 10.1 Existing strengths

- Mongo indexes for key access patterns across domains.
- Redis-backed chat caching and unread counters.
- Cursor-based chat pagination.
- Lean queries used in performance-sensitive paths.
- Batch Pusher trigger behavior in places.
- Retry wrappers for inter-service HTTP calls.

## 10.2 Bottlenecks and scale constraints

- Heavy controllers/pages with broad responsibilities.
- In-request/in-process background tasks (meeting/transcription flow) can be fragile under restarts.
- Avatar URL resolution loops can be N+1 style in some endpoints.
- No explicit queue worker for long-running media/AI jobs.

---

## 11. Maintainability and Code Health

## 11.1 Positive patterns

- Clear service segmentation by domain.
- Shared package for model/middleware consistency.
- TypeScript strict mode across codebase.
- Explicit route/controller split in services.

## 11.2 Maintainability concerns

- Very large controller/page files.
- Heavy `any` usage in backend/frontend.
- Presence of `@ts-nocheck` in routes.
- No automated tests found in repository.
- Some frontend routes/pages appear linked in sidebar but not implemented.

---

## 12. Deployment and Runtime Operations

## 12.1 CI/CD

Workflow: `.github/workflows/deploy.yml`

- Builds/pushes Docker images for all backend services to GHCR.
- Deploy step copies `docker-compose.yml` to VPS.
- VPS pulls latest images and restarts containers.

## 12.2 Runtime topology (compose)

- One container per service.
- Shared bridge network.
- Service-to-service DNS by container name.

## 12.3 Environment variables (critical)

Common:

- `MONGO_URI`
- `JWT_SECRET`
- `ALLOWED_ORIGINS`
- `PORT`
- `NODE_ENV`

Storage:

- `R2_BUCKET_NAME`
- `R2_ACCOUNT_ID`
- `R2_ACCESS_KEY_ID`
- `R2_SECRET_ACCESS_KEY`
- optional `R2_PUBLIC_DOMAIN` (used by some flows)

Chat realtime/cache:

- `PUSHER_APP_ID`, `PUSHER_KEY`, `PUSHER_SECRET`, `PUSHER_CLUSTER`
- `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`

Meeting:

- `JITSI_PRIVATE_KEY`, `JITSI_KEY_ID`, `JITSI_APP_ID`
- `JAAS_WEBHOOK_SECRET`
- `TRANSCRIPTION_SERVICE_URL` (required by webhook trigger path)

AI:

- `DEEPGRAM_API_SECRET`
- `OPENROUTER_API`

Email:

- `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`

Frontend:

- `NEXT_PUBLIC_BACKEND_URL`
- `NEXT_PUBLIC_PUSHER_KEY`, `NEXT_PUBLIC_PUSHER_CLUSTER`
- `NEXT_PUBLIC_JITSI_APP_ID`
- `NEXT_PUBLIC_CHAT_POLLING_INTERVAL`

---

## 13. Known Gaps and Correctness Issues (Current)

1. **Chat upload response mismatch**
   - Frontend expects `{ url, key }`, backend returns `{ uploadUrl, key }`.

2. **Missing auth users search endpoint**
   - Frontend chat-search calls `/auth/users/search`.
   - Auth service currently exposes `/auth/users` only.

3. **Potential user lookup bug**
   - `findUserById` in auth controller uses `req.id` instead of route param.

4. **Role naming mismatch in chat**
   - Chat checks `MANAGER`; workspace model uses `PROJECT_MANAGER`.

5. **Project detail route mismatch**
   - One frontend call uses `/projects/${id}/tasks/${t.id}` while backend task patch route is `/projects/tasks/:id`.

6. **Inconsistent internal webhook protection**
   - Project/chat/auth/transcription internal hooks should be service-authenticated.

---

## 14. Operational Runbooks

## 14.1 Local development startup (typical)

1. Install dependencies:
   - `pnpm install`
2. Build shared package:
   - `pnpm --filter @loopy/shared build`
3. Start services/frontend as needed:
   - `pnpm --filter loopy-auth dev`
   - `pnpm --filter loopy-project dev`
   - `pnpm --filter loopy-chat dev`
   - `pnpm --filter loopy-meeting dev`
   - `pnpm --filter loopy-transcription dev`
   - `pnpm --filter loopy-gateway dev`
   - `pnpm --filter loopy-frontend dev`

## 14.2 Production deploy runbook (VPS)

1. Push to `main`.
2. CI builds/pushes images to GHCR.
3. Deploy job SSHes VPS and runs:
   - `docker compose pull`
   - `docker compose up -d`
4. Verify all containers and health endpoints.

## 14.3 Incident triage pointers

- Auth/login/OTP failures -> auth service logs + SMTP config.
- Chat lag/realtime issues -> pusher credentials + frontend pusher keys + Redis availability.
- Missing recordings/transcripts -> meeting webhook logs, R2 upload status, transcription service status transitions.
- Project/Team chat channel desync -> project event webhook delivery to chat.

---

## 15. Governance and Change Management Checklist

Before merging major changes:

1. Confirm workspace and role semantics are preserved.
2. Confirm gateway route mapping still matches service route prefixes.
3. Confirm frontend API helper expectations match backend response shapes.
4. Confirm webhook/event contracts remain backward-compatible.
5. Confirm env var changes are reflected in compose + deploy environment.
6. Confirm new endpoints have explicit auth/authorization decisions.
7. Confirm index requirements for any new heavy query path.

---

## 16. Suggested Next Improvements (Prioritized)

## P0 (correctness/security)

1. Fix chat upload response contract mismatch.
2. Add `/auth/users/search` or update frontend to supported endpoint.
3. Fix `findUserById` param access bug.
4. Normalize role checks (`PROJECT_MANAGER` vs `MANAGER`) across services.

## P1 (stability/maintainability)

1. Introduce queue worker for recording/transcription jobs.
3. Reduce `any` usage and remove `@ts-nocheck`.

## P2 (product completeness)

2. Add observability standards (request IDs, structured logs, error codes).

---

## 17. Quick Ownership Guide

| Domain | Primary service | Related frontend area |
|---|---|---|
| Identity + Workspace | `services/auth` | `(auth)` pages, workspace/team/settings pages |
| Projects + Tasks + Teams | `services/project` | projects/home/team pages |
| Chat + Realtime | `services/chat` | chat pages + chat context |
| Meetings + Recording bridge | `services/meeting` | meetings pages, live meeting page |
| AI Transcript + Minutes | `services/transcription` | meeting detail page |
| Routing edge | `services/gateway` | `frontend/src/lib/api.ts`, Next rewrites |
| Shared auth/models | `services/shared` | all backend services |

---

## 18. Final Notes

- Loopy’s architecture is strong in domain separation and feature breadth.
- The highest-value management focus is now **contract consistency**, **service-to-service security**, and **operational resilience for async media/AI workflows**.
- Keep this handbook updated alongside any route contracts, model changes, or deployment topology changes.
