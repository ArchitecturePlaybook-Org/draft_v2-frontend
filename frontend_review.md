# Next.js Frontend Architectural Review

**Target:** Enterprise-Ready Production Deployment  
**Role:** Principal Frontend Architect & Lead Engineer  
**Codebase Checked:** `draft_v2-frontend`

---

## 🏗️ Architectural Overview & Design Pattern Evaluation
The frontend is built using Next.js (App Router), TypeScript, Tailwind CSS, and Zustand. 

### Core Strengths (What is Done Correctly)
* **BFF Proxy Layer Integration:** The custom Backend-for-Frontend (BFF) proxy at `/api/[[...path]]/route.ts` is an excellent architecture. It abstracts cookie parsing, refresh logic, and token validation away from the client browser, completely eliminating the need to expose JWTs to browser localStorage.
* **HttpOnly Cookie Strategy:** Setting JWT access and refresh tokens inside `HttpOnly`, `Secure`, and `SameSite="lax"` cookies is the absolute industry gold standard for preventing cross-site scripting (XSS) token theft.
* **Domain Layer Split:** Domain actions are separated cleanly into `src/domains/` (e.g. `auth/api.ts`, `projects/api.ts`). This is highly modular and prevents the mix of presentation components and raw network protocols.
* **IndexedDB Offline Capability:** The offline capability is driven by Dexie.js (`OfflineDB`), supporting request queue synchronization and cache retrievals, showing robust foresight.

---

## 🔍 Detailed Review Findings

### Issue 1: Lack of Next.js Route Protection Middleware
* **Severity:** High
* **Affected File(s):** No `middleware.ts` file exists at the project root or `src/` directory.
* **Current Implementation:** Route protection is handled React-reactively. Pages render client-side layouts (`"use client"`), fetch data, fail with a `401 Unauthorized` in `fetchFromBff.ts`, and trigger a client-side redirect (`window.location.href = "/login"`).
* **Problem:** Users can navigate directly to protected paths (e.g., `/dashboard/*`). Next.js will fetch, parse, and render layout assets, sidebar wrappers, and UI blocks before the client detects unauthenticated state.
* **Why it matters:** 
  1. **UX Layout Flash:** The user briefly sees private dashboard layouts/sidebar menus before being ejected to `/login`.
  2. **Security Leakage:** Exposes dashboard component blueprints, structures, and layout structures to unauthorized clients.
  3. **Wasted Network Bandwidth:** Server resources are consumed rendering/sending static dashboard page chunks to unauthenticated clients.
* **Recommended Solution:** Create a standard Next.js middleware at `src/middleware.ts` to inspect requests for session tokens and perform a server-side redirect before layouts are served.
* **Example Implementation:**
  ```typescript
  // src/middleware.ts
  import { NextResponse } from "next/server";
  import type { NextRequest } from "next/server";

  export function middleware(req: NextRequest) {
    const hasSession = req.cookies.has("AP_REFRESH_TOKEN");
    const { pathname } = req.nextUrl;

    if (pathname.startsWith("/dashboard") && !hasSession) {
      const loginUrl = new URL("/login", req.url);
      return NextResponse.redirect(loginUrl);
    }
    return NextResponse.next();
  }

  export const config = {
    matcher: ["/dashboard/:path*"],
  };
  ```

---

### Issue 2: Concurrency Race Condition in Token Refresh Handler
* **Severity:** High
* **Affected File(s):** [refresh.ts](file:///d:/ArchitecturePlayBook/v1.1/draft_v2-frontend/src/lib/api/refresh.ts)
* **Current Implementation:** 
  ```typescript
  if (originalRes.status === 401) {
    const refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
    ...
    const refreshRes = await fetch(`${DJANGO_API_URL}/api/v1/users/auth/token/refresh/`, { ... });
  }
  ```
* **Problem:** Multiple dashboard API requests run in parallel. If the access token expires, both requests fail with `401` at the exact same millisecond. Both enter `refreshIfNeeded` concurrently and invoke parallel `token/refresh` calls to Django.
* **Why it matters:** If Django is configured with strict refresh token rotation (re-issuing a new refresh token on every refresh and blacklisting the old one), the first refresh request will succeed and rotate the token, while the second request will hit the endpoint with the *already rotated* (now blacklisted) token. This triggers a 401 from Django, clearing user credentials, and forcing an authenticated user into a sudden logout loop.
* **Recommended Solution:** Implement a centralized refresh locking mechanism (mutex) to hold parallel requests until the active refresh completes, then forward the retry using the fresh access token.
* **Example Implementation:**
  ```typescript
  // src/lib/api/refresh.ts
  let activeRefreshPromise: Promise<string | null> | null = null;

  export async function refreshIfNeeded(req: NextRequest, originalRes: Response, fetchOriginal: (hdrs: Headers) => Promise<Response>) {
    if (originalRes.status !== 401) return { res: originalRes };

    const refreshToken = req.cookies.get(COOKIE_REFRESH_TOKEN)?.value;
    if (!refreshToken) return { res: originalRes, refreshFailed: true };

    if (!activeRefreshPromise) {
      activeRefreshPromise = (async () => {
        try {
          const res = await fetch(`${DJANGO_API_URL}/api/v1/users/auth/token/refresh/`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ refresh: refreshToken }),
          });
          if (!res.ok) return null;
          const data = await res.json();
          return data.access;
        } catch {
          return null;
        } finally {
          activeRefreshPromise = null;
        }
      })();
    }

    const newAccessToken = await activeRefreshPromise;
    if (!newAccessToken) {
      return { res: originalRes, refreshFailed: true };
    }

    const newHeaders = new Headers(req.headers);
    newHeaders.set("Authorization", `Bearer ${newAccessToken}`);
    const retriedRes = await fetchOriginal(newHeaders);
    return { res: retriedRes, newTokens: { access: newAccessToken } };
  }
  ```

---

### Issue 3: Dexie Offline Crash on FormData Serialization
* **Severity:** High
* **Affected File(s):** [fetchFromBff.ts](file:///d:/ArchitecturePlayBook/v1.1/draft_v2-frontend/src/shared/api/fetchFromBff.ts#L42-L50), [db.ts](file:///d:/ArchitecturePlayBook/v1.1/draft_v2-frontend/src/shared/offline/db.ts)
* **Current Implementation:** When offline, mutating operations are queued:
  ```typescript
  await db.syncQueue.add({
    url: fullUrl,
    method: method,
    body: finalOptions.body, // This can be raw FormData
    ...
  });
  ```
* **Problem:** `FormData` objects contain file uploads/binary components. `FormData` is **not** structured-cloneable, so attempting to store it in IndexedDB triggers a fatal browser crash.
* **Why it matters:** The offline capability completely crashes when uploading drawings, site photos, or avatars while offline, blocking regular UI states.
* **Recommended Solution:** In the sync database interceptor, check if the body is `FormData`. If so, extract form fields into a plain serializable object and convert raw file entries into `Blob` buffers (which IndexedDB supports) to rebuild the `FormData` upon flushing the queue.

---

### Issue 4: Monolithic 1,000-Line Mega-Component in Tasks Domain
* **Severity:** Medium
* **Affected File(s):** [TaskExecutionSidePanel.tsx](file:///d:/ArchitecturePlayBook/v1.1/draft_v2-frontend/src/components/projects/TaskExecutionSidePanel.tsx)
* **Current Implementation:** Over 1,000 lines of code doing sidebar container resizing, checklist proofs, checklist template management, subtask CRUD rendering, Three.js model attachments, and field diary inputs in a single file.
* **Why it matters:** High cognitive overhead, difficult testing, and slow developer velocity when modifying simple visual structures.
* **Recommended Solution:** Decompose the tab panels into standalone presentation subcomponents:
  * `components/projects/task-panel/TaskChecklistTab.tsx`
  * `components/projects/task-panel/TaskSubtasksTab.tsx`
  * `components/projects/task-panel/TaskExecutionTab.tsx`
  Extract layout resizing into a reusable hook `src/hooks/usePanelResize.ts`.

---

### Issue 5: Static Imports of Heavy 3D Model Rendering Engine
* **Severity:** Medium
* **Affected File(s):** [TaskExecutionSidePanel.tsx](file:///d:/ArchitecturePlayBook/v1.1/draft_v2-frontend/src/components/projects/TaskExecutionSidePanel.tsx), [DataHubTab.tsx](file:///d:/ArchitecturePlayBook/v1.1/draft_v2-frontend/src/components/projects/DataHubTab.tsx)
* **Current Implementation:** 
  ```typescript
  import ModelViewer from "@/components/ModelViewer";
  ```
* **Problem:** Statically importing `ModelViewer` bundle (Three.js and parsing utilities) causes it to be compiled into the core dashboard chunk.
* **Why it matters:** Users landing on the dashboard download hundreds of kilobytes of 3D rendering scripts even if they only look at a Kanban board, leading to slower page load times.
* **Recommended Solution:** Import the model viewer component dynamically to load the 3D libraries on demand:
  ```typescript
  import dynamic from "next/dynamic";
  const ModelViewer = dynamic(() => import("@/components/ModelViewer"), {
    ssr: false,
    loading: () => <div className="h-48 flex items-center justify-center">Loading 3D Engine...</div>
  });
  ```

---

### Issue 6: Core State Queries Bypassing TanStack Query Provider
* **Severity:** Medium
* **Affected File(s):** [projects/page.tsx (ProjectsPageInner)](file:///d:/ArchitecturePlayBook/v1.1/draft_v2-frontend/src/app/dashboard/projects/page.tsx#L63-L88)
* **Current Implementation:** Fetches project registry lists and assigned tasks manually inside raw React `useEffect` triggers, storing data in local React state.
* **Why it matters:** Repeatedly mounts and displays raw loading states on every view navigation. Lacks query deduplication, focus refetching, automatic query caching, and seamless background synchronizations.
* **Recommended Solution:** Migrate REST API query fetches to TanStack Query (`useQuery`), utilizing the workspace's pre-configured `QueryProvider`.
* **Example Implementation:**
  ```typescript
  const { data: projects = [], isLoading } = useQuery({
    queryKey: ['projects'],
    queryFn: () => projectsApi.getProjects().then(res => Array.isArray(res) ? res : res.results || [])
  });
  ```

---

### Issue 7: Redundant Complex Queries Executing on Simple Tab Navigation
* **Severity:** Medium
* **Affected File(s):** [project-store.ts](file:///d:/ArchitecturePlayBook/v1.1/draft_v2-frontend/src/store/project-store.ts#L52-L77)
* **Current Implementation:** Inside the Zustand action `fetchProject`, the app requests project details and then automatically makes a secondary API request:
  ```typescript
  const matrixData = await projectsApi.getMatrix(data.uid);
  set({ zones: matrixData.zones, phases: matrixData.phases });
  ```
* **Problem:** The Matrix endpoint executes expensive database joins/aggregations. Fetching this on every project mount—even if the user is only viewing Kanban board or documents—wastes database performance.
* **Why it matters:** Unnecessary backend load and slower dynamic page layout transitions.
* **Recommended Solution:** Decouple matrix coordinates from basic project details. Fetch the matrix data only when the "Matrix" tab is mounted, or lazily inside the matrix component itself.

---

### Issue 8: Missing Framework-level Loading & Error Boundaries
* **Severity:** Low
* **Affected Folder(s):** `src/app/dashboard/` and dynamic routes.
* **Current Implementation:** No `loading.tsx` or `error.tsx` layouts are configured.
* **Why it matters:** Transitioning between dynamic routes feels laggy with no progress indicators. Runtime errors crash the UI completely into a blank canvas.
* **Recommended Solution:** Place a `loading.tsx` skeleton and a custom `error.tsx` boundary layout at the root of `src/app/dashboard`.

---

## 📈 Quality Scoring

* **Overall Architecture Score:** `8 / 10` (Modular domain structure, but has monolithic components)
* **Next.js Architecture Score:** `6 / 10` (App router directory matches spec, but misses Server Components and Middleware)
* **React Best Practices Score:** `7 / 10` (Clean hook usage, but too much raw state for complex forms and API syncing)
* **Authentication Score:** `9 / 10` (BFF proxy and HttpOnly cookies implementation is secure)
* **Authorization Score:** `8 / 10` (Triple-layered RBAC logic is solid, but lacks centralized conditional rendering components)
* **API Layer Score:** `9 / 10` (Clean abstraction from Django backend details)
* **API Proxy / BFF Architecture Score:** `10 / 10` (Clean request buffering, cookie injection, and CORS isolation)
* **Service Layer Score:** `9 / 10` (Modular, feature-grouped API configurations)
* **State Management Score:** `8 / 10` (Zustand is highly performant, but server caching is missing)
* **TypeScript Score:** `9 / 10` (Strong types, clean interfaces, 0 "any" uses in codebase)
* **Security Score:** `9 / 10` (Strong CSP, safe proxy error handling, secure cookies)
* **Performance Score:** `6 / 10` (Static heavy imports and N+1 query store patterns need attention)
* **Code Quality Score:** `7 / 10` (Well-commented codebase, but contains monolithic files)
* **Production Readiness Score:** `7 / 10` (Ready after implementing Middleware and Refresh Locking)

---

## 🗺️ Prioritized Roadmap

### 🚨 Critical — Must Fix Before Production
1. **Next.js Route Protection Middleware:** Establish `src/middleware.ts` to block access to `/dashboard/*` server-side if authentication cookies are missing.
2. **Refresh Token Concurrency Lock:** Implement promise locking inside `src/lib/api/refresh.ts` to prevent parallel invalidations of rotated refresh tokens.

### ⚠️ High Priority
1. **FormData IndexedDB Serialization Guard:** Clean up offline database handlers to save binary files safely as Blobs or block FormData from causing client crashes.
2. **3D Model Lazy Loading:** Update Three.js/ModelViewer components to import dynamically using `next/dynamic` with `ssr: false`.

### 📅 Medium Priority
1. **Migrate to TanStack Query (`useQuery`):** Move central dashboard/project queries to `@tanstack/react-query` to leverage automatic caching and background synchronization.
2. **Decompose TaskExecutionSidePanel:** Split the 1,000-line panel into tabbed components.
3. **Decouple Matrix API fetches:** Stop fetching matrix grids during simple project page load.

### 💡 Low Priority / Nice to Have
1. **Centralize Permission Guards:** Write a `<PermissionGuard>` component wrapper to replace repeating inline ternary logic.
2. **Add loading.tsx and error.tsx:** Place skeleton frames and fallback views in dashboard dynamic route folders.

---

## 🛠️ Execution Classification
* **Quick Wins (Less than 1 day):**
  * Implement route protection `src/middleware.ts`.
  * Convert `ModelViewer` to use dynamic imports.
  * Add default `loading.tsx` and `error.tsx` layouts.
  * Safe-guard the Offline DB FormData uploads.
* **Medium Effort (1-3 days):**
  * Integrate concurrent refresh promise lock.
  * Decouple Matrix query triggers from project store hydration.
  * Build the `<PermissionGuard>` layout wrapper.
* **Major Refactoring (3+ days):**
  * Break down the `TaskExecutionSidePanel` into modular tabs.
  * Migrate raw `useEffect` list fetching across dashboard modules to TanStack Query.

---

## 📂 Recommended Enterprise Folder Structure

```
src/
├── app/                  # Next.js App Router (Layouts & Pages)
│   ├── api/              # Route Handlers / BFF endpoints
│   ├── dashboard/        # Main Dashboard route segment
│   └── middleware.ts     # Global request intercept (Route security)
├── components/           # Shared & Feature Specific UI Components
│   ├── ui/               # Base shadcn / layout primitives
│   ├── shared/           # Cross-feature components (Navbar, Theme)
│   └── projects/         # Feature specific components
│       └── task-panel/   # Decomposed task panel subcomponents
├── domains/              # Isolated feature API models and service calls
│   ├── auth/             # Authentication services
│   └── projects/         # Projects REST endpoints
├── hooks/                # Global reusable custom hooks
├── lib/                  # Third party wrapper setup configurations
│   └── api/              # BFF handler, resolution mapping, and refreshes
├── providers/            # Core React context wrappers
├── shared/               # Global utility scripts and shared models
│   ├── api/              # Central fetchFromBff client definition
│   └── offline/          # Dexie.js offline DB setup
├── store/                # Zustand global UI/UX stores
└── types/                # Global TypeScript definitions
```
