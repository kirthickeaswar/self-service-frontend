# Spectrum Self-Service Utility (Week-1 Frontend)

Frontend-first implementation for Spectrum (ION Group) task scheduling utility. This release includes full Client and Admin dashboards with mocked API behavior, CRUD flows, troubleshooting logs, role switching, and resilient UX states.

## Tech Stack

- React + TypeScript + Vite
- React Router
- Material UI (MUI)
- Mock API via in-memory service with realistic latency/error behavior

## Setup

```bash
npm install
npm run dev
```

Open the app at the local Vite URL (typically `http://localhost:5173`).

## Week-1 Scope Implemented

- App shell with responsive sidebar + top bar
- Role switcher (Client/Admin) with route-level access control
- Client dashboard, tasks list, task details, create task, troubleshoot
- Admin overview, all tasks, admin logs, access control matrix
- CRUD flows:
  - Create task (+ optional initial schedule)
  - Delete task (cascade delete schedules + logs)
  - Delete schedule only (task remains)
  - Pause/resume task
  - Pause/resume schedule
- Log fetch + filtering (level/date/search/task/schedule)
- UX quality requirements:
  - Skeleton loading states
  - Empty states
  - Error states + retry surfaces
  - Confirmation dialogs
  - Snackbars/toasts

## Folder Structure

```text
src/
  app/
    RoleContext.tsx
    SnackbarContext.tsx
    router.tsx
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
    tasks/
      api/tasksApi.ts
      components/
      hooks/
    logs/
      api/logsApi.ts
      components/
  mocks/
    db.ts
    seed.ts
    server.ts
  pages/
    client/
    admin/
  types/
    domain.ts
```

## Mock API Design

Mock API layer lives in `src/mocks/server.ts` and mirrors backend-style endpoints:

- `GET /api/tasks`
- `POST /api/tasks`
- `GET /api/tasks/:taskId`
- `DELETE /api/tasks/:taskId`
- `PATCH /api/tasks/:taskId` (pause/resume)
- `POST /api/tasks/:taskId/schedules`
- `DELETE /api/tasks/:taskId/schedules/:scheduleId`
- `PATCH /api/tasks/:taskId/schedules/:scheduleId` (pause/resume)
- `GET /api/logs?taskId=&scheduleId=`

Behavior:

- Simulated latency: 400-800ms
- Random failure: 10% chance to force error-state testing

## Seed Data

- 12 tasks with mixed types/statuses
- 1-4 schedules per task
- Varied logs across INFO/WARN/ERROR and BATCH/SYSTEM sources

## Swapping Mock API with Real C# Backend

1. Keep `src/features/tasks/api/tasksApi.ts` and `src/features/logs/api/logsApi.ts` as stable interfaces.
2. Replace their internals from `apiServer` calls to `fetch`/`axios` calls to C# endpoints.
3. Preserve domain contracts in `src/types/domain.ts` (or map backend DTOs into these UI models).
4. Remove/disable mock imports in production builds.
5. Optional next step: replace in-memory mock with MSW for contract-style integration tests.

This keeps page and component layers unchanged while backend services are integrated.
