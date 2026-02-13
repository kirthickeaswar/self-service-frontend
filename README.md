# Spectrum Scheduler Frontend (Week-1)

Simple frontend for task scheduling and monitoring, built first with mock APIs so backend can be connected later.

## 1) What This App Does

- Login with username + password (mock auth for now).
- Supports 3 roles:
  - `ADMIN`: full admin dashboard + user/role management.
  - `EDITOR`: user dashboard + full task edit actions.
  - `VIEWER`: user dashboard + read-only access.
- Manage scheduled tasks:
  - Create, update, delete task
  - Add, edit, delete schedule
  - Pause/resume task and schedule
  - View logs and filter logs
- Supports recurring via cron-style schedule builder and one-time schedules.

## 2) If You Are New To React (Quick Mental Model)

- Think in 4 layers:
  - `pages/`: complete screens (what user sees).
  - `components/`: reusable UI blocks.
  - `features/*/api`: functions that talk to backend (or mock backend now).
  - `mocks/`: fake backend data + fake API logic.
- UI calls API functions from `features/*/api`.
- API functions currently call mock server (`src/mocks/server.ts`).
- Later, only API layer needs changing for real backend.

## 3) Tech Stack

- React + TypeScript + Vite
- React Router
- Material UI (MUI)
- In-memory mock API (simulated latency + failure)

## 4) Run Locally

```bash
npm install
npm run dev
```

- Open: `http://localhost:5173/login`

## 5) Mock Login Credentials

- `admin / admin123` -> ADMIN
- `editor / editor123` -> EDITOR
- `viewer / viewer123` -> VIEWER
- `alice / alice123` -> EDITOR

## 6) Main Folders (Short Guide)

```text
src/
  app/
    AuthContext.tsx       # login state + session persistence
    router.tsx            # all routes + role guards
    SnackbarContext.tsx   # toast messages
    theme.ts              # MUI theme
  components/
    common/               # reusable UI components
    layout/AppShell.tsx   # sidebar + top bar shell
  features/
    tasks/
      api/tasksApi.ts     # task-related API interface
      components/         # task forms/tables
      hooks/
      utils/
    logs/
      api/logsApi.ts      # logs API interface
      components/
  mocks/
    db.ts                 # in-memory database
    seed.ts               # initial mock data
    server.ts             # mock API implementation
  pages/
    LoginPage.tsx
    client/               # user dashboard pages
    admin/                # admin dashboard pages
  types/domain.ts         # shared data models
```

## 7) Current Role Access

- `VIEWER`:
  - Can view dashboard, tasks, details, logs.
  - Cannot create/edit/delete/pause/resume.
- `EDITOR`:
  - Same as viewer + full task/schedule actions.
- `ADMIN`:
  - Admin pages, all task actions, task types, and user-role management.

## 8) Important Data Models

- `Task`
  - id, name, description, type, createdBy, status, schedules, etc.
- `Schedule`
  - mode (`CRON` or `NON_RECURRING`), cron/date/time, nextRunAt, status.
- `LogEntry`
  - taskId/scheduleId, level, message, timestamp.
- `User`
  - username, password (mock only), role.

All models are in:
- `src/types/domain.ts`

## 9) API Endpoints (Current Mock)

Implemented inside:
- `src/mocks/server.ts`

Examples:
- Auth:
  - login
  - get/create/update/delete users
- Tasks:
  - list/get/create/update/delete task
  - pause/resume task
  - add/update/delete/pause-resume schedule
- Logs:
  - list logs with filters

## 10) How To Replace Mock APIs With Real C# APIs

Keep this simple path:

- Step 1: Keep page/components unchanged.
  - Do not rewrite UI screens.
- Step 2: Replace only API layer internals:
  - `src/features/tasks/api/tasksApi.ts`
  - `src/features/logs/api/logsApi.ts`
- Step 3: Change each function from `apiServer.*` to `fetch`/`axios` call to C# endpoints.
- Step 4: Map backend DTO response to frontend models in `src/types/domain.ts` shape.
- Step 5: Keep error handling behavior:
  - Throw `Error(message)` so existing toasts/error states continue working.
- Step 6: Remove mock usage in production:
  - Stop importing `src/mocks/server.ts` from API layer.

Practical rule:
- If backend contract changes, update mapping inside API layer first, not UI pages.

## 11) Suggested Backend Mapping Checklist

- Auth endpoints:
  - login
  - list/create/update/delete users (admin)
- Task endpoints:
  - CRUD task
  - pause/resume task
  - schedule CRUD + pause/resume
- Logs endpoint:
  - filter by task, schedule, level, date range, search
- Task type endpoints:
  - list/add/edit/delete type (with batch file path)

## 12) Build

```bash
npm run build
```

This should compile TypeScript and build Vite output in `dist/`.

## 13) Detailed React Learning Guide

- If you are new to React, read:
  - `docs/REACT_LEARNING_GUIDE.md`
