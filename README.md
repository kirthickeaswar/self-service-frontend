# Spectrum Scheduler Frontend

Frontend app for Spectrum task scheduling, now integrated with real backend APIs.

## Run

```bash
npm install
npm run dev
```

- Open: `http://localhost:5173/login`

## Backend Config

- Base URL is set in:
  - `/Users/kirthick21/Desktop/Sprint-Frontend/.env`
- Current value:
  - `VITE_API_BASE_URL=https://localhost:7153`

## Login

- Uses backend endpoint:
  - `POST /auth/login`
- Enter real backend user email + password.

## Roles

- `ADMIN`: admin dashboard + task types + users + logs
- `EDITOR`: user dashboard + full task edits
- `VIEWER`: user dashboard + read-only

## Main Structure

```text
src/
  app/
    AuthContext.tsx
    router.tsx
    SnackbarContext.tsx
    theme.ts
  components/
    common/
    layout/AppShell.tsx
  features/
    api/httpClient.ts
    tasks/api/tasksApi.ts
    logs/api/logsApi.ts
  pages/
    LoginPage.tsx
    client/
    admin/
  types/domain.ts
```

## Important Note

- Mock API files have been removed.
- Runtime API calls are now direct backend HTTP calls through:
  - `/Users/kirthick21/Desktop/Sprint-Frontend/src/features/api/httpClient.ts`

## Build

```bash
npm run build
```

## Learning Guide

- Detailed React learning guide:
  - `/Users/kirthick21/Desktop/Sprint-Frontend/docs/REACT_LEARNING_GUIDE.md`
