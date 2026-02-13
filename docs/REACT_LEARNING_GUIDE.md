# React Learning Guide (Using This Project)

This guide is for learning React from zero using this exact codebase.

---

## 1) What React Is (In Simple Terms)

- React builds UI using **components**.
- A component is a function that returns UI.
- React updates the UI when your data (called **state**) changes.
- You build pages by combining small reusable components.

---

## 2) How This Project Is Structured

Start here:

- `src/main.tsx`
  - App entry point.
  - Mounts React app to browser DOM.
  - Wraps app with theme, auth context, snackbar context.
- `src/app/router.tsx`
  - Defines all routes (URLs -> pages).
  - Protects routes by login and role.
- `src/components/layout/AppShell.tsx`
  - Main layout (sidebar + topbar + page content).
- `src/pages/*`
  - Actual screens users interact with.
- `src/features/*`
  - Business logic split by domain (tasks, logs).
- `src/mocks/*`
  - Fake backend for Week-1.

---

## 3) Core React Concepts You Should Learn First

### A) Component

- Function that returns JSX.
- Example mental model:
  - Input: props
  - Output: UI

### B) JSX

- HTML-like syntax inside JavaScript/TypeScript.
- Example:
  - `<Button variant="contained">Save</Button>`

### C) Props

- Data passed from parent component to child component.
- In this project:
  - `TasksTable` receives handlers like `onView`, `onDelete`.

### D) State (`useState`)

- Local data for a component.
- Changing state re-renders UI.
- In this project:
  - Filters, form values, loading/error flags.

### E) Side Effects (`useEffect`)

- Run logic after render (usually API calls).
- In this project:
  - Pages load tasks/logs inside `useEffect`.

### F) Conditional Rendering

- Show different UI based on state.
- In this project:
  - Loading skeleton vs error alert vs table.

---

## 4) React Router in This Project

File:

- `src/app/router.tsx`

What it does:

- Maps URL paths to page components.
- Guards pages with:
  - `RequireAuth` (must be logged in)
  - `RequireRole` (must have allowed role)
- Redirects:
  - Unknown paths -> `/`
  - `/app` -> `/app/dashboard`
  - `/admin` -> `/admin/overview`

Why this matters:

- URL controls what page loads.
- Access logic stays in one place.

---

## 5) State Flow in a Typical Page

Example: tasks page (`src/pages/client/ClientTasksPage.tsx`)

Pattern used:

- `const [tasks, setTasks] = useState([])`
- `const [loading, setLoading] = useState(true)`
- `const [error, setError] = useState(null)`
- `useEffect(() => { load() }, [...deps])`
- `load()`:
  - set loading true
  - call API
  - set data
  - catch error
  - set loading false

This is the standard React async page pattern.

---

## 6) API Layer Pattern (Very Important)

File:

- `src/features/tasks/api/tasksApi.ts`
- `src/features/logs/api/logsApi.ts`

Why this exists:

- UI should not know if data comes from:
  - mock server
  - real backend
- UI always calls `tasksApi.*` or `logsApi.*`.

This is what makes backend replacement easy.

---

## 7) Context API (Global State) in This Project

### Auth Context

File:

- `src/app/AuthContext.tsx`

Purpose:

- Stores logged-in user globally.
- Provides:
  - `user`
  - `login`
  - `logout`
- Persists login in `localStorage`.

When to use context:

- Data needed in many places (auth, theme, language, etc.)

---

## 8) Reusable Components (Why They Matter)

Examples:

- `PageHeader`
- `StatusChip`
- `DataTable`
- `ConfirmDialog`
- `EmptyState`
- `ErrorState`

Benefits:

- Less duplicate code
- Easier maintenance
- Consistent UI

---

## 9) Forms in This Project

Example files:

- `src/features/tasks/components/TaskForm.tsx`
- `src/features/tasks/components/ScheduleForm.tsx`

Pattern:

- Local state per field
- Validation before submit
- Submit handler calls API
- Success -> toast + navigation
- Error -> alert/toast

---

## 10) Role-Based UI Behavior

Roles:

- `VIEWER`: read-only
- `EDITOR`: full task edit actions
- `ADMIN`: admin dashboards + user management

How implemented:

- Router blocks unauthorized routes.
- UI also hides/disables actions based on role.

This is defense-in-depth:

- Route guard + UI guard.

---

## 11) MUI (Material UI) Basics in This Project

You will see components like:

- `Stack`, `Grid`, `Card`, `TextField`, `Button`, `Alert`, `Dialog`

Tips:

- `Stack` = easy spacing/layout in one direction.
- `Grid` = responsive columns.
- `TextField` handles inputs and dropdowns (`select`).
- `sx` prop is inline styling helper.

---

## 12) Mock Backend (How It Works)

Files:

- `src/mocks/db.ts` -> in-memory data
- `src/mocks/seed.ts` -> seed records
- `src/mocks/server.ts` -> API behavior

It simulates:

- latency
- occasional failures
- CRUD operations

Great for frontend development before backend is ready.

---

## 13) How To Add a New Feature (Step-by-Step)

Example: “Task Export” button

1. Add API method in `tasksApi.ts`.
2. Implement mock behavior in `mocks/server.ts`.
3. Add button in relevant page/component.
4. Add loading/success/error handling.
5. Add route if it needs new page.
6. Build and test.

---

## 14) How To Connect Real C# Backend Later

Only change API internals:

- `src/features/tasks/api/tasksApi.ts`
- `src/features/logs/api/logsApi.ts`

Keep UI unchanged.

Detailed approach:

1. Replace `apiServer.*` calls with `fetch`/`axios`.
2. Keep return types matching `src/types/domain.ts`.
3. Map backend DTOs to frontend model shape.
4. Keep errors as thrown `Error` with user-friendly message.
5. Add auth token handling (if backend uses JWT/session).

---

## 15) React Learning Path You Can Follow (Practical)

Use this order:

1. Read `src/main.tsx`
2. Read `src/app/router.tsx`
3. Read `src/app/AuthContext.tsx`
4. Read one simple page (`ClientDashboardPage.tsx`)
5. Read one CRUD page (`ClientTasksPage.tsx`)
6. Read one form component (`TaskForm.tsx`)
7. Read API layer (`tasksApi.ts`)
8. Read mock backend (`mocks/server.ts`)

At each step, run app and click same feature in browser.

---

## 16) Common Beginner Mistakes (Watch For)

- Updating state directly instead of using setter.
- Forgetting dependency list behavior in `useEffect`.
- Putting API calls directly everywhere instead of API layer.
- Not handling loading/error/empty states.
- Mixing route access logic inside many pages (keep in router guard).

---

## 17) Useful Commands

```bash
npm run dev
npm run build
```

---

## 18) Next Learning Steps (After This)

- Learn custom hooks deeply (`useTaskFilters` style).
- Learn form libraries (React Hook Form) if forms grow.
- Learn API caching (React Query) for larger apps.
- Add unit tests for:
  - utils
  - components
  - role guards

