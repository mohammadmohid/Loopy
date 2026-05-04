# Loopy System Testing Report

## 5.1 Unit Testing
The following are unit tests of the system.

### Unit Testing 1: register() function with valid and invalid inputs
**Testing Objective:** To ensure the user registration function correctly validates input fields, rejects duplicate emails, and creates new user accounts with OTP verification.

| No. | Test case/Test script | Attribute and Value | Expected Result | Actual Result |
|-----|-----------------------|---------------------|-----------------|---------------|
| 1 | Call register() with all valid fields | email: "newuser@gmail.com", password: "Pass1234", firstName: "John", lastName: "Doe" | Returns 201 with success: true, needsOTP: true, and userId | Returns 201 with success: true, needsOTP: true, userId, and email |
| 2 | Call register() | email: "existing@gmail.com" (already in DB) | Returns 400 with message "User already exists" | Returns 400 with message "User already exists" |

### Unit Testing 2: login() function with valid and invalid credentials
**Testing Objective:** To ensure the login function authenticates users correctly, handles unconfirmed emails by resending OTP, and rejects invalid credentials.

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Actual Result |
|-----|-------------------------|---------------------|-----------------|---------------|
| 1 | Call login() with valid confirmed email and correct password | email: "confirmed@gmail.com", password: "CorrectPass1" | Returns 200 with JWT token cookie, success: true, and user object | Returns 200 with JWT token cookie, success: true, and user data |
| 2 | Call login() with valid email but wrong password | email: "confirmed@gmail.com", password: "WrongPassword" | Returns 401 with message "Invalid email or password" | Returns 401 with message "Invalid email or password" |
| 3 | Call login() with non-existent email | email: "nonexistent@gmail.com", password: "AnyPass123" | Returns 401 with message "Invalid email or password" | Returns 401 with message "Invalid email or password" |
| 4 | Call login() with valid unconfirmed email | email: "unconfirmed@gmail.com", password: "CorrectPass1" | Returns 200 with needsOTP: true and resends OTP email | Returns 200 with needsOTP: true, userId, and email |

### Unit Testing 3: verifyOTP() function with valid and invalid OTP codes
**Testing Objective:** To ensure the OTP verification function correctly validates OTP codes, marks users as confirmed, and handles expired or invalid codes.

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Actual Result |
|-----|-------------------------|---------------------|-----------------|---------------|
| 1 | Call verifyOTP() with valid userId and correct OTP code | userId: "valid_id", code: "123456" (matching DB record) | Returns 200 with success: true, sets JWT cookie, marks email as confirmed | Returns 200 with success: true, JWT cookie set, needsWorkspace flag included |
| 2 | Call verifyOTP() with valid userId but wrong OTP code | userId: "valid_id", code: "000000" (not matching) | Returns 400 with message "Invalid or expired code" | Returns 400 with message "Invalid or expired code" |
| 3 | Call verifyOTP() with expired OTP code | userId: "valid_id", code: "654321" (expired in DB) | Returns 400 with message "Code has expired" | Returns 400 with message "Code has expired" |
| 4 | Call verifyOTP() with missing userId or code | userId: "", code: "" | Returns 400 with message "User ID and code are required" | Returns 400 with message "User ID and code are required" |

### Unit Testing 4: generateToken() function for JWT creation
**Testing Objective:** To ensure JWT tokens are generated correctly with the right payload (id, role, workspaceId) and expiry.

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Actual Result |
|-----|-------------------------|---------------------|-----------------|---------------|
| 1 | Call generateToken() with valid user ID and role | id: "user123", role: "ADMIN", workspaceId: "ws001" | Returns a valid JWT string containing id, role, workspaceId, jti, and 1-day expiry | Returns a valid JWT string with correct payload and 1-day expiry |
| 2 | Call generateToken() without workspaceId | id: "user123", role: "USER" | Returns JWT with workspaceId set to null | Returns JWT with workspaceId: null in payload |
| 3 | Call generateToken() when JWT_SECRET is undefined | id: "user123", role: "ADMIN" (with JWT_SECRET env unset) | Throws Error "JWT_SECRET is not defined" | Throws Error "JWT_SECRET is not defined" |

### Unit Testing 5: matchPassword() method on User model
**Testing Objective:** To verify that the password hashing and comparison method on the User model works correctly using bcrypt.

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Actual Result |
|-----|-------------------------|---------------------|-----------------|---------------|
| 1 | Call matchPassword() with the correct password | enteredPassword: "CorrectPass1" (matches hashed DB password) | Returns true | Returns true |
| 2 | Call matchPassword() with an incorrect password | enteredPassword: "WrongPassword" | Returns false | Returns false |
| 3 | Call matchPassword() with an empty string | enteredPassword: "" | Returns false | Returns false |

### Unit Testing 6: createTask() function with valid and invalid inputs
**Testing Objective:** To ensure tasks are created with correct fields, default assignee logic works, and tasks are linked to the correct project.

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Actual Result |
|-----|-------------------------|---------------------|-----------------|---------------|
| 1 | Call createTask() with valid fields and explicit assignees | title: "Design UI", status: "todo", assignees: ["user1", "user2"], projectId: "proj1" | Returns 201 with task object containing title, status, assignees populated, and projectId | Returns 201 with fully populated task object |
| 2 | Call createTask() with no assignees provided | title: "Fix Bug", status: "in-progress", assignees: [] | Returns 201 with assignees defaulting to the logged-in user (creator) | Returns 201 with assignees containing only the creator's ID |
| 3 | Call createTask() with missing title | title: "", status: "todo", projectId: "proj1" | Returns 500 or validation error (title is required) | Returns 500 with Server Error |

### Unit Testing 7: sendMessage() function with valid and invalid inputs
**Testing Objective:** To verify that messages are sent correctly, restricted chat rules are enforced, and membership is validated.

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Actual Result |
|-----|-------------------------|---------------------|-----------------|---------------|
| 1 | Call sendMessage() with valid content to a channel the user belongs to | channelId: "ch001", content: "Hello team!" | Returns 201 with message object, emits new-message via Socket.IO | Returns 201 with populated message object |
| 2 | Call sendMessage() with empty content and no attachments | channelId: "ch001", content: "", attachments: [] | Returns 400 with message "Message content or attachment is required" | Returns 400 with message "Message content or attachment is required" |
| 3 | Call sendMessage() to a channel the user does not belong to | channelId: "ch_private" (user not a member), content: "Hello" | Returns 403 with message "Not a member of this channel" | Returns 403 with message "Not a member of this channel" |
| 4 | Call sendMessage() to a restricted chat channel as a MEMBER role | channelId: "ch_restricted", content: "Test", user.role: "MEMBER" | Returns 403 with message "Only admins and managers can send messages in this channel" | Returns 403 with message "Only admins and managers can send messages in this channel" |

### Unit Testing 8: createMeeting() function with valid and invalid inputs
**Testing Objective:** To ensure meetings are created correctly with a properly formatted room name and status.

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Actual Result |
|-----|-------------------------|---------------------|-----------------|---------------|
| 1 | Call createMeeting() with valid fields and no schedule | projectId: "proj1", title: "Sprint Review", hostName: "John" | Returns 201 with status "active" and roomName in format Loopy-<projectId>-<meetingId> | Returns 201 with status "active" and correct roomName format |
| 2 | Call createMeeting() with a scheduled time | projectId: "proj1", title: "Planning", scheduledAt: "2026-03-15T10:00:00Z" | Returns 201 with status "scheduled" | Returns 201 with status "scheduled" |
| 3 | Call createMeeting() without projectId | projectId: undefined, title: "Test" | Returns 400 with message "Project ID is required" | Returns 400 with message "Project ID is required" |
| 4 | Call createMeeting() without title | projectId: "proj1", title: undefined | Returns 201 with title defaulting to "Untitled Meeting" | Returns 201 with title "Untitled Meeting" |

### Unit Testing 9: createMeeting() with agenda and scheduled time
**Testing Objective:** To ensure meetings accept an optional agenda string, persist it when non-empty, set status to scheduled when scheduledAt is provided, and omit or trim empty agenda values.

| No. | Test case/Test script | Attribute and Value | Expected Result | Actual Result |
|-----|-----------------------|---------------------|-----------------|---------------|
| 1 | Call createMeeting() with scheduledAt and non-empty agenda | projectId: "proj1", title: "Planning", scheduledAt: "2026-06-01T10:00:00.000Z", agenda: " 1. Review KPIs \n 2. Risks " | Returns 201 with status: "scheduled", agenda trimmed, roomName in format Loopy-<projectId>-<meetingId> | Pass |
| 2 | Call createMeeting() with scheduledAt and empty/whitespace agenda | agenda: " " | Returns 201 with status: "scheduled"; agenda field not stored or empty per schema rules | Pass |
| 3 | Call createMeeting() with agenda only (no scheduledAt) | agenda: "Standup topics" | Returns 201 with status: "active" and agenda populated if allowed by API | Pass |
| 4 | Call createMeeting() without projectId | title: "Test", agenda: "A" | Returns 400 with message "Project ID is required" | Pass |

### Unit Testing 10: updateMeeting() for scheduled meetings (host-only, allowed fields)
**Testing Objective:** To ensure only the meeting host can update a meeting; only allowed fields (status, title, participants, scheduledAt, recordingUrl, agenda) are applied; invalid participants shape is rejected; empty update body returns 400.

| No. | Test case/Test script | Attribute and Value | Expected Result | Actual Result |
|-----|-----------------------|---------------------|-----------------|---------------|
| 1 | Call updateMeeting() as host with new scheduledAt and title | meetingId: valid, scheduledAt: "2026-06-15T14:00:00.000Z", title: "Sprint Review (moved)" | Returns 200 with updated meeting | Pass |
| 2 | Call updateMeeting() as host replacing agenda | agenda: "Updated agenda bullets" | Returns 200; agenda field matches payload | Pass |
| 3 | Call updateMeeting() as non-host user | Another user’s JWT, same meetingId | Returns 403 with message "Only the meeting host can update this meeting" | Pass |
| 4 | Call updateMeeting() with participants not an array | participants: "user1" | Returns 400 with message "participants must be an array of user ids" | Pass |
| 5 | Call updateMeeting() with only disallowed fields | Body: { "roomName": "hijack" } | Returns 400 with message "No valid fields provided for update" | Pass |

### Unit Testing 11: streamNotifications() (SSE) and connection lifecycle
**Testing Objective:** To verify the notifications SSE endpoint sets correct headers, emits an initial connected event, sends periodic ping events, and unsubscribes the client on connection close without leaking listeners.

| No. | Test case/Test script | Attribute and Value | Expected Result | Actual Result |
|-----|-----------------------|---------------------|-----------------|---------------|
| 1 | Open SSE with valid authenticated user | Valid session / JWT for userId: "u1" | Response Content-Type: text/event-stream; first event event: connected | Pass |
| 2 | Open SSE without authentication | No cookie / no auth header | Returns 401 | Pass |
| 3 | Simulate client disconnect after subscribe | Request close event fired | sseUnsubscribe called for that response; interval cleared | Pass |
| 4 | Headers for buffering proxies | Inspect response headers | Cache-Control: no-cache, no-transform, X-Accel-Buffering: no present | Pass |

### Unit Testing 12: internalMeetingPM() / dispatchToUsers() notification payload validation
**Testing Objective:** To ensure internal meeting PM notifications reject invalid payloads, return sent: 0 when no project managers exist, and return success with count when PMs are resolved.

| No. | Test case/Test script | Attribute and Value | Expected Result | Actual Result |
|-----|-----------------------|---------------------|-----------------|---------------|
| 1 | Call internalMeetingPM() with complete valid body | workspaceId, projectId, title, body, optional metadata, dedupeKey | Returns 200 JSON { ok: true, sent: <n> } | Pass |
| 2 | Call internalMeetingPM() missing title or body | workspaceId, projectId only | Returns 400 with message "Invalid payload" | Pass |
| 3 | Call internalMeetingPM() for project with no PM recipients | Valid payload, getPMRecipientIds returns [] | Returns 200 with { ok: true, sent: 0 } | Pass |

### Unit Testing 13: suggestScheduledAtIso() (action proposal helper)
**Testing Objective:** To verify free-text lines map to plausible ISO datetimes for follow-up meeting proposals.

| No. | Test case/Test script | Attribute and Value | Expected Result | Actual Result |
|-----|-----------------------|---------------------|-----------------|---------------|
| 1 | Call suggestScheduledAtIso() with “tomorrow” | rawLine: "Schedule follow-up tomorrow" | Returns ISO string approximately UTC now + 24h | Pass |
| 2 | Call suggestScheduledAtIso() with “next week” | rawLine: "Sync next week" | Returns ISO string approximately UTC now + 7d | Pass |
| 3 | Call suggestScheduledAtIso() with YYYY-MM-DD | rawLine: "Meet 2026-12-01" | Returns ISO for that calendar date | Pass |
| 4 | Call suggestScheduledAtIso() with no date cue | rawLine: "Discuss offline" | Returns undefined | Pass |

### Unit Testing 14: Action proposal type guard and stripAssigneeTail() behaviour
**Testing Objective:** To ensure only well-formed proposals pass isProposal(); assignee tails are stripped consistently from rawLine for task titles.

| No. | Test case/Test script | Attribute and Value | Expected Result | Actual Result |
|-----|-----------------------|---------------------|-----------------|---------------|
| 1 | isProposal() with valid assign_task pending | Full valid object | Returns true | Pass |
| 2 | isProposal() with missing id or wrong kind | kind: "unknown" | Returns false | Pass |
| 3 | stripAssigneeTail() with assignee: Name suffix | "Ship report assignee: Jane" | Title fragment without assignee tail | Pass |
| 4 | stripAssigneeTail() with trailing parenthetical | "Task (Bob)" | Parenthetical removed from tail | Pass |

### Unit Testing 15: resolveUserIdFromNameHint() (assignment resolution)
**Testing Objective:** To verify name hints resolve to workspace user ids when unique.

| No. | Test case/Test script | Attribute and Value | Expected Result | Actual Result |
|-----|-----------------------|---------------------|-----------------|---------------|
| 1 | Hint matches single workspace member | assigneeNameHint: "Jane Doe" | Returns that user’s id | Pass |
| 2 | Hint matches zero users | assigneeNameHint: "Nobody" | Returns null | Pass |
| 3 | Hint matches multiple users | Common name collision | Returns null or first match | Pass |

### Unit Testing 16: parseTranscriptToText() helper function
**Testing Objective:** To verify the transcript parser correctly converts various JSON formats to plain text.

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Actual Result |
|-----|-------------------------|---------------------|-----------------|---------------|
| 1 | Call parseTranscriptToText() with ElevanLabs format | { ElevanLabs: true, text: "Hello..." } | Returns "Hello..." | Pass |
| 2 | Call parseTranscriptToText() with ElevenLabs word-array | { words: [{ text: "Hello" }, ...] } | Returns "Hello world" | Pass |
| 3 | Call parseTranscriptToText() with null input | null | Returns empty string "" | Pass |

### Unit Testing 17: createVersion() function for File Management
**Testing Objective:** To ensure document version snapshots are correctly registered with incremental version numbers and R2 references.

| No. | Test Case / Test Script | Attribute and Value | Expected Result | Actual Result |
|-----|-------------------------|---------------------|-----------------|---------------|
| 1 | Call createVersion() with valid fileId and R2 key | fileId: "file001", r2Key: "versions/v2.docx", changeDescription: "Update logo" | Returns 201 with version object, versionNumber: 2, updates File's currentVersionId | Pass |
| 2 | Call createVersion() for non-existent file | fileId: "invalid", r2Key: "..." | Returns 404 with message "File not found" | Pass |
| 3 | Call createVersion() with missing R2 key | fileId: "file001", r2Key: "" | Returns 500 or validation error | Pass |

---

## 5.2 Functional Testing
The following are the functional tests of the system.

### Functional Testing 1: User Registration and Email Verification Flow
**Objective:** To ensure that a new user can register, receive an OTP email, verify their email, and be redirected to workspace creation.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Register a new user | Email: newuser@test.com, Password: TestPass123 | OTP verification page displayed | Pass | Pass |
| 2 | Enter valid OTP code | OTP Code: 123456 (valid) | Redirected to "Create Workspace" page | Pass | Pass |
| 3 | Enter invalid OTP code | OTP Code: 000000 | Error "Invalid or expired code" | Pass | Pass |
| 4 | Resend OTP code | Click "Resend Code" | Success message "OTP resent" | Pass | Pass |

### Functional Testing 2: Login with Different Roles
**Objective:** To ensure that the correct dashboard and navigation are loaded based on the user's role.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Login as ADMIN | admin@loopy.com | Admin dashboard with full navigation displayed | Pass | Pass |
| 2 | Login as PROJECT_MANAGER | pm@loopy.com | PM dashboard with appropriate navigation | Pass | Pass |
| 3 | Login as MEMBER | member@loopy.com | Member dashboard with limited navigation | Pass | Pass |
| 4 | Login with invalid credentials | Password: WrongPassword | Error "Invalid email or password" | Pass | Pass |

### Functional Testing 3: Workspace Creation and Member Invitation
**Objective:** To ensure admins can create workspaces and invite members with correct role assignment.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Create a new workspace | Name: "Loopy Dev Team" | Workspace created, user becomes ADMIN | Pass | Pass |
| 2 | Invite a member to workspace | Email: invite@test.com, Role: "MEMBER" | Invite email sent, pending invite displayed | Pass | Pass |
| 3 | Invite existing member | Email: existing@loopy.com | Error "User is already a member" | Pass | Pass |
| 4 | Create workspace with empty name | Name: "" | Error "Workspace name is required" | Pass | Pass |

### Functional Testing 4: Project CRUD Operations
**Objective:** To ensure projects can be managed with proper role-based access control.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Create project as ADMIN | Name: "Sprint 1" | Project created, chat channel auto-created | Pass | Pass |
| 2 | View project list as MEMBER | Logged in as MEMBER | Only assigned projects displayed | Pass | Pass |
| 3 | Update project name as owner | Name: "Sprint 1 - Updated" | Project name updated successfully | Pass | Pass |
| 4 | Delete project as non-owner | MEMBER user | Error 403 "Not authorized..." | Pass | Pass |
| 5 | Delete project as ADMIN | ADMIN user | Project and chat channel deleted | Pass | Pass |

### Functional Testing 5: Task Management
**Objective:** To ensure tasks can be managed within a project board.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Create a new task | Title: "Design Login", Status: "todo" | Task appears in "To Do" column | Pass | Pass |
| 2 | Update task status | Drag to "In Progress" | Task moves to "In Progress" in DB | Pass | Pass |
| 3 | Assign multiple users | Assignees: [u1, u2, u3] | Task shows all avatars | Pass | Pass |
| 4 | Delete a task | Delete action | Task removed from board and DB | Pass | Pass |

### Functional Testing 6: Real-Time Chat Messaging
**Objective:** To ensure messages, reactions, and threads work correctly in real-time.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Send a text message | Content: "Hello team!" | Message appears for all in real-time | Pass | Pass |
| 2 | Add a reaction | Emoji: "👍" | Reaction appears with user's name | Pass | Pass |
| 3 | Reply in a thread | Content: "I agree!" | Reply appears, count increments | Pass | Pass |
| 4 | Edit a sent message | New Content: "Updated" | Content updated, "edited" label appears | Pass | Pass |
| 5 | Delete a sent message | Delete action | Content changes to "This message was deleted" | Pass | Pass |

### Functional Testing 7: Meeting Creation and Joining
**Objective:** To ensure meetings can be created, joined via Jitsi, and ended.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Create active meeting | Title: "Standup" | Created with status "active" | Pass | Pass |
| 2 | Join an active meeting | Room: "Loopy-proj1-meet1" | JWT generated, user joins video | Pass | Pass |
| 3 | End an active meeting | End action | Status changes to "ended" | Pass | Pass |
| 4 | Schedule future meeting | scheduledAt: "2026-03-20..." | Status set to "scheduled" | Pass | Pass |

### Functional Testing 8: Meeting agenda — create and view
**Objective:** To ensure users can add and view agendas in meetings.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Schedule with multi-line agenda | 3+ bullets | Agenda visible on detail view | Pass | Pass |
| 2 | Edit agenda before start | Host edits agenda | UI shows updated agenda; API returns 200 | Pass | Pass |
| 3 | Non-host edit attempt | MEMBER user | Update blocked with 403 | Pass | Pass |

### Functional Testing 9: Scheduled meeting editing
**Objective:** To ensure host can reschedule and manage participants.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Host changes scheduledAt | +2 hours shift | Participants notified; calendar updated | Pass | Pass |
| 2 | Host adds participant | Append user id | New participant receives notification | Pass | Pass |
| 3 | Non-host reschedule | MEMBER user | Error 403 displayed | Pass | Pass |

### Functional Testing 10: Live notifications (SSE + in-app)
**Objective:** To verify real-time delivery and read/unread behaviour.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Subscribe to SSE | SSE connects | connected event received; pings sent | Pass | Pass |
| 2 | Trigger notification | Meeting created | SSE payload received; list updated | Pass | Pass |
| 3 | Mark notification read | Click read | Unread count decreases | Pass | Pass |

### Functional Testing 11: Action item automation from AI minutes
**Objective:** To ensure extracted items produce proposals and tasks.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Generate proposals | Completed artifact | Proposals appear as "pending" | Pass | Pass |
| 2 | Approve task proposal | Host approves | Task created in project | Pass | Pass |
| 3 | Approve meeting proposal | Host approves | New scheduled meeting created | Pass | Pass |
| 4 | Reject proposal | Host rejects | Status set to rejected; no creation | Pass | Pass |

### Functional Testing 12: Approval and assignment workflow
**Objective:** To verify RBAC and notifications for proposals.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Host approves for member | assign_task | Assignee notified; task on board | Pass | Pass |
| 2 | Non-host approve attempt | Member user | Error 403 or UI hidden | Pass | Pass |
| 3 | Multi-assignee task | Multiple IDs | All assignees notified | Pass | Pass |

### Functional Testing 13: Meeting and task reminders
**Objective:** To validate cron-driven reminders.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Scheduled meeting today | Today's window | MEETING_TODAY notification sent | Pass | Pass |
| 2 | Meeting starting soon | Within 1 hour | "Meeting soon" notification sent | Pass | Pass |
| 3 | Task due soon | Due window | Assignees notified | Pass | Pass |

### Functional Testing 14: Meeting Transcription and AI Summary
**Objective:** To ensure recordings are processed into minutes.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Trigger transcription | Recording uploaded | Artifact created; status: "processing" | Pass | Pass |
| 2 | Retrieve completed artifact | meet1 (transcribed) | Returns transcript and AI summary | Pass | Pass |
| 3 | Regenerate summary | Manual trigger | 200 OK; background update starts | Pass | Pass |

### Functional Testing 15: DOCX Editing and Versioning Flow
**Objective:** To verify the end-to-end flow of opening, editing, and snapshotting a Word document.

| No. | Test Case | Attribute and Value | Expected Result | Actual Result | Result |
|-----|-----------|---------------------|-----------------|---------------|--------|
| 1 | Open DOCX in Editor | file: "Project.docx" | Document loads in native editor surface | Pass | Pass |
| 2 | Edit and Commit Version | Change text, click "Save" | New version appears in History sidebar | Pass | Pass |
| 3 | Revert to Version | Click "Revert" on v1 | Editor reloads original content | Pass | Pass |
| 4 | Filter Explorer by DOCX | Filter: "DOCX" | Only Word documents are displayed | Pass | Pass |

---

## 5.3 Business Rules Testing
The following are decision tables of key functionality.

### Business Rules Testing 1: Workspace Role-Based Access Control
| Action | ADMIN | PROJECT_MANAGER | MEMBER |
|--------|-------|-----------------|--------|
| Invite Members | Y | N | N |
| Change Roles | Y | N | N |
| Create Projects | Y | Y | N |
| View All Projects | Y | Y | N |
| View Assigned Only | N | N | Y |
| Delete Workspace | Y | N | N |

### Business Rules Testing 2: Channel Archival Rules
| Channel Type | Archive Allowed | Error Message |
|--------------|-----------------|---------------|
| global | N | "The Everyone channel cannot be deleted" |
| project | N | "Project channels cannot be archived directly" |
| private | Y | - |

---

## 5.4 Integration Testing
Integration testing ensures microservices work together via webhooks and real-time events.

### Integration Testing 1: Project Creation and Chat Channel Auto-Creation
| No. | Test Case | Attribute and Value | Expected Result | Result |
|-----|-----------|---------------------|-----------------|--------|
| 1 | Create project with members | Members: [u1, u2] | "project" channel created; members added | Pass |
| 2 | Delete project | Project ID: "proj1" | Chat channel and messages deleted | Pass |

### Integration Testing 2: Team Management and Chat Sync
| No. | Test Case | Attribute and Value | Expected Result | Result |
|-----|-----------|---------------------|-----------------|--------|
| 1 | Create new team | Members: [u1, u2] | "team" channel created with user sync | Pass |
| 2 | Update team members | Add u3 | Chat channel members synced | Pass |

### Integration Testing 3: Workspace Creation and Global Chat
| No. | Test Case | Attribute and Value | Expected Result | Result |
|-----|-----------|---------------------|-----------------|--------|
| 1 | Create new workspace | User: "admin1" | Global "Everyone" channel created | Pass |
| 2 | Join workspace | New user joins | User auto-added to global channel | Pass |

### Integration Testing 4: Meeting Recording Pipeline
| No. | Test Case | Attribute and Value | Expected Result | Result |
|-----|-----------|---------------------|-----------------|--------|
| 1 | End meeting / upload | Recording uploaded | Webhook triggers transcription service | Pass |
| 2 | Process transcript | Deepgram API | Artifact updated to "COMPLETED" | Pass |
| 3 | AI Summary | OpenRouter API | Minutes saved to artifact summary | Pass |

### Integration Testing 5: Authentication Gateway
| No. | Test Case | Attribute and Value | Expected Result | Result |
|-----|-----------|---------------------|-----------------|--------|
| 1 | Routed to Auth | GET /api/auth/me | User profile returned via Proxy | Pass |
| 2 | Routed to Project | GET /api/projects | Workspace-scoped projects returned | Pass |
| 3 | Unauthenticated | No JWT | Returns 401 Unauthorized | Pass |

### Integration Testing 6: Workspace Deletion Across Services
| No. | Test Case | Attribute and Value | Expected Result | Result |
|-----|-----------|---------------------|-----------------|--------|
| 1 | Delete workspace | Workspace: "ws001" | Projects, channels, and meetings deleted | Pass |
| 2 | Verify user records | user1, user2 | Workspace array cleaned up in Auth DB | Pass |
