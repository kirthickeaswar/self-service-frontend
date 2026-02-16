# AutoTasker Self-Service Frontend

Comprehensive project documentation for the React frontend integrated with the AutoTasker backend APIs.

## 1. Project Overview

- Project name: `autotasker-week1-frontend`
- Purpose: UI for configuring, monitoring, running, pausing, and troubleshooting scheduled tasks.
- Backend: C# API (no mock runtime in frontend).
- Current base API URL: `https://localhost:7153` (from `.env`).
- UI model:
- `User` side (`Viewer`, `Editor`) in `/app/*`
- `Admin` side in `/admin/*`

## 2. Tech Stack

- Framework: React 19 + TypeScript
- Bundler: Vite
- Routing: React Router (`createBrowserRouter`)
- UI: Material UI (MUI + MUI Icons)
- Styling: centralized MUI theme + component overrides
- State pattern: React local state + feature hooks + API service layer

## 3. Run & Build

## 3.1 Prerequisites

- Node.js 18+ recommended
- Running backend at `https://localhost:7153`

## 3.2 Commands

```bash
npm install
npm run dev
```

- App URL: `http://localhost:5173/login`

Build:

```bash
npm run build
```

Preview build:

```bash
npm run preview
```

## 3.3 Environment Variables

From `/Users/kirthick21/Desktop/Sprint-Frontend/.env`:

- `VITE_API_BASE_URL=https://localhost:7153`

Optional (supported in code):

- `VITE_CREATE_PASSWORD_PATH=/auth/create-password`
- Default if not set: `/auth/create-password`

## 4. Folder Structure

```text
src/
  app/
    AuthContext.tsx
    router.tsx
    SnackbarContext.tsx
    theme.ts
  components/
    common/
      ConfirmDialog.tsx
      DataTable.tsx
      EmptyState.tsx
      ErrorState.tsx
      PageHeader.tsx
      StatusChip.tsx
    layout/
      AppShell.tsx
  features/
    api/
      httpClient.ts
    tasks/
      api/tasksApi.ts
      components/{TaskForm,ScheduleForm,TasksTable}.tsx
      hooks/{useTaskFilters,useTaskTypes}.ts
      utils/{access,schedule}.ts
    logs/
      api/logsApi.ts
      components/LogsTable.tsx
  pages/
    LoginPage.tsx
    CreatePasswordPage.tsx
    client/*
    admin/*
  types/
    domain.ts
```

## 5. Architecture (How Data Flows)

## 5.1 UI Layer

- Pages compose reusable components and call feature APIs.
- `AppShell` provides sidebar + top bar layout.
- Global toast notifications from `SnackbarContext`.

## 5.2 API Layer

- All HTTP requests pass through `src/features/api/httpClient.ts`.
- `tasksApi.ts` and `logsApi.ts` wrap endpoints and convert backend payloads into frontend domain types.

## 5.3 Auth Layer

- `AuthContext` stores logged-in user in `localStorage` (`autotasker_auth_user`).
- Role-based route guards in `router.tsx` enforce access.

## 6. Domain Model (Frontend)

Defined in `/Users/kirthick21/Desktop/Sprint-Frontend/src/types/domain.ts`.

- `Task`
- `id`, `name`, `description`, `accessEmails[]`, `type`, `createdBy`, `status`, `createdAt`, `updatedAt`, `schedules[]`
- `Schedule`
- `id`, `taskId`, `mode`, `cronExpression`, `nextRunAt`, `status`, etc.
- `LogEntry`
- `id`, `userId`, `taskId`, `timestamp`, `action`, `body`, etc.
- `User`
- `id`, `name`, `email`, `userLevel`, `role`

Role mapping in frontend:

- `userLevel: 0` -> `VIEWER`
- `userLevel: 1` -> `EDITOR`
- `userLevel: 2` -> `ADMIN`

## 7. Routing & Access Control

Routes are in `/Users/kirthick21/Desktop/Sprint-Frontend/src/app/router.tsx`.

Public:

- `/login`
- `/create-password`

Authenticated user routes (`EDITOR`, `VIEWER`):

- `/app/dashboard`
- `/app/tasks`
- `/app/tasks/:taskId`
- `/app/create-task` (viewers blocked by page logic)
- `/app/logs` (labeled Audit in UI)

Authenticated admin routes (`ADMIN` only):

- `/admin/overview`
- `/admin/tasks`
- `/admin/tasks/:taskId`
- `/admin/create-task`
- `/admin/task-types`
- `/admin/users`
- `/admin/logs` (labeled Audit in UI)

Legacy redirects kept:

- `/client/*` routes redirect to `/app/*`.

## 8. Authentication & First-Time Password Flow

## 8.1 Login

- Page: `/Users/kirthick21/Desktop/Sprint-Frontend/src/pages/LoginPage.tsx`
- API call: `POST /auth/login`
- Success: stores identity in AuthContext + localStorage, routes by role.

## 8.2 First-Time Password Setup

- Admin user creation no longer sets password.
- New page: `/Users/kirthick21/Desktop/Sprint-Frontend/src/pages/CreatePasswordPage.tsx`
- API call: `tasksApi.createPassword(...)`
- Default endpoint: `POST /auth/create-password` (configurable).
- Password page includes:
- confirm password
- visibility toggles
- basic standards validation:
- minimum 8 chars
- uppercase + lowercase
- number
- special character

Login handles first-time errors:

- If backend returns password-not-set style message, user is redirected to `/create-password?email=...`.

## 9. Main Feature Modules

## 9.1 Task Management

Core API wrapper: `/Users/kirthick21/Desktop/Sprint-Frontend/src/features/tasks/api/tasksApi.ts`

Implemented capabilities:

- List/filter tasks
- Get task by ID
- Create task (with optional schedule)
- Update task
- Soft-delete task
- Run task on demand (`POST /tasks/{taskId}/run`)
- Add/update/delete schedules
- Pause/resume schedule status
- Pause/resume task behavior in list pages (applies to schedules)

Important UI behavior:

- Tasks page has per-row `Run Now` button.
- 3-dot menu shows `Pause`/`Resume` based on schedule state.
- If task has no schedules, pause action shows `Not Scheduled`.
- Task details page has `Run Now`, edit task, and schedule CRUD.

## 9.2 Schedule UX

Component: `/Users/kirthick21/Desktop/Sprint-Frontend/src/features/tasks/components/ScheduleForm.tsx`

- Modes:
- `Recurring` (Cron-based)
- `Non-Recurring` (date + time)
- Dropdown-driven cron builder:
- minute, hour, day-of-month, month, day-of-week
- manual cron override supported
- generated cron preview shown

## 9.3 Admin Task Types

Page: `/Users/kirthick21/Desktop/Sprint-Frontend/src/pages/admin/AdminTaskTypesPage.tsx`

Features:

- Add type (`title` + `batchPath`)
- Edit type and batch path
- If type already used by tasks, name editing is locked; batch path remains editable
- Delete type (backend may reject if in use)

## 9.4 Admin User Management

Page: `/Users/kirthick21/Desktop/Sprint-Frontend/src/pages/admin/AdminUsersPage.tsx`

Features:

- Create user with:
- name
- email
- role (`Viewer` / `Editor` / `Admin`)
- No password field in admin create form
- Delete user

## 9.5 Audit (formerly Logs)

Pages:

- `/Users/kirthick21/Desktop/Sprint-Frontend/src/pages/client/ClientTroubleshootPage.tsx`
- `/Users/kirthick21/Desktop/Sprint-Frontend/src/pages/admin/AdminLogsPage.tsx`

Shared table:

- `/Users/kirthick21/Desktop/Sprint-Frontend/src/features/logs/components/LogsTable.tsx`

Current compact audit UI:

- Dense rows (`Table size="small"`, reduced cell padding)
- Default columns:
- timestamp
- user email
- task name
- Row click expands details:
- action
- full body/details

## 10. API Integration Map

## 10.1 Auth

- `POST /auth/login`
- `POST {createPasswordPath}` default `/auth/create-password`

## 10.2 Users

- `GET /users`
- `POST /users`
- `DELETE /users/{id}`

## 10.3 Task Types

- `GET /tasktypes`
- `POST /tasktypes`
- `PATCH /tasktypes/{id}/batchpath`
- `PATCH /tasktypes/{id}/title`
- `DELETE /tasktypes/{id}`

## 10.4 Tasks

- `GET /tasks`
- `GET /tasks/search?q=&typeId=&status=`
- `GET /tasks/{taskId}`
- `POST /tasks`
- `PUT /tasks/{taskId}`
- `PATCH /tasks/{taskId}/status`
- `DELETE /tasks/{taskId}`
- `POST /tasks/{taskId}/run`

## 10.5 Schedules

- `GET /tasks/{taskId}/schedules`
- `POST /tasks/{taskId}/schedules`
- `PUT /tasks/{taskId}/schedules/{scheduleId}`
- `PATCH /tasks/{taskId}/schedules/{scheduleId}/status`
- `DELETE /tasks/{taskId}/schedules/{scheduleId}`

## 10.6 Audit/Logs

- `GET /logs/all`
- `GET /logs?taskId=&startTimestamp=&endTimestamp=`

## 11. Global Error Handling & Toasts

Centralized in `/Users/kirthick21/Desktop/Sprint-Frontend/src/features/api/httpClient.ts`.

Behavior:

- Parses backend `detail/title/message/errors`.
- Converts status codes to friendly UI messages.
- Context-aware conflict messages (examples):
- removing protected admin user
- task type in-use conflicts
- run conflict if already running
- create-password endpoint missing
- Handles network/CORS failure with clear message.

Toast system:

- `/Users/kirthick21/Desktop/Sprint-Frontend/src/app/SnackbarContext.tsx`
- Global bottom-right toast alerts (success/info/warning/error).

## 12. UI System & Reusable Components

Theme:

- `/Users/kirthick21/Desktop/Sprint-Frontend/src/app/theme.ts`
- dark dashboard styling
- card elevation/gradients
- polished button styles (non-uppercase labels, rounded corners, hover lift)

Reusable building blocks:

- `PageHeader`
- `DataTable`
- `StatusChip`
- `ConfirmDialog`
- `EmptyState`
- `ErrorState`

## 13. Behavior Notes

- IDs in frontend are numeric (`number`).
- UI generally shows task names; raw IDs are minimized in display.
- Audit module label is `Audit` in menus/pages (route remains `/logs` for compatibility).
- Admin uses same `Task Details` page as user side but with full edit capability.

## 14. Known Constraints / Gaps

- No automated test suite configured yet.
- Some chunk-size warnings appear during production build (from Vite/Rollup output).
- `src/pages/admin/AccessControlPage.tsx` exists in codebase but is not routed/active.
- Current auth is identity-based (no JWT/token flow yet).

## 15. Backend Swap / Extension Guidance

If backend contracts evolve:

- Update only API adapters first:
- `/Users/kirthick21/Desktop/Sprint-Frontend/src/features/tasks/api/tasksApi.ts`
- `/Users/kirthick21/Desktop/Sprint-Frontend/src/features/logs/api/logsApi.ts`
- Keep UI/domain stable via mapping.
- For new auth flow/token:
- extend `AuthContext` and `httpClient` headers/interceptors.
- For additional schedule capabilities:
- extend `ScheduleForm` + cron utilities in `src/features/tasks/utils/schedule.ts`.

## 16. Quick File Reference

Core entry points:

- App entry: `/Users/kirthick21/Desktop/Sprint-Frontend/src/main.tsx`
- Routing: `/Users/kirthick21/Desktop/Sprint-Frontend/src/app/router.tsx`
- Auth state: `/Users/kirthick21/Desktop/Sprint-Frontend/src/app/AuthContext.tsx`
- HTTP client: `/Users/kirthick21/Desktop/Sprint-Frontend/src/features/api/httpClient.ts`
- Task API: `/Users/kirthick21/Desktop/Sprint-Frontend/src/features/tasks/api/tasksApi.ts`
- Audit API: `/Users/kirthick21/Desktop/Sprint-Frontend/src/features/logs/api/logsApi.ts`

---

If you want, this can also be split into:

- `docs/ARCHITECTURE.md`
- `docs/API_MAPPING.md`
- `docs/USER_FLOW.md`
- `docs/ADMIN_FLOW.md`
- `docs/DEPLOYMENT.md`

for easier team ownership and review.
