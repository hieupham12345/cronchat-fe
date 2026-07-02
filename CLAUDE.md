# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

CronChat Frontend — a React SPA web client (realtime chat: direct + group rooms, reactions, replies, read receipts, image uploads). Consumes the CronChat backend over REST + a single WebSocket. JavaScript (`.jsx`), no TypeScript.

## Commands

```bash
npm run dev          # Vite dev server on 0.0.0.0:3000 (strictPort, polling watcher)
npm run build        # production build → dist/
npm run preview       # preview built app on 0.0.0.0:4173
npm test             # vitest run (single pass)
npm run test:watch   # vitest watch mode
npx vitest run src/services/authService.test.js   # run a single test file
npx eslint .         # lint
```

Tests use Vitest + jsdom + React Testing Library. Setup lives in `src/test/setup.js`; shared helpers in `src/test/helpers.js`. Test files sit next to their source (`*.test.js` / `*.test.jsx`). `vite.config.js` injects a dummy `VITE_API_BASE_URL=http://api.test` for the test env.

## Architecture

**Data layer — `src/services/`.** All backend I/O funnels through two primitives in `apiClient.js` and `authService.js`:
- `apiFetch(path, options)` — thin `fetch` wrapper: prefixes `VITE_API_BASE_URL`, auto-sets JSON `Content-Type` (skips it for `FormData` so multipart uploads keep their boundary), parses JSON, throws on non-2xx.
- `authFetch(path, options)` — wraps `apiFetch`, requires an in-memory access token and injects `Authorization: Bearer <token>`. **Every authenticated call goes through `authFetch`** (chat/room/user services all import it). Public endpoints (`/login`, `/create-user`, `/auth/refresh`) call `apiFetch` directly with `credentials: 'include'`.

Domain services (`chatService`, `roomService`, `userService`) are stateless modules of exported async functions, one per endpoint. Endpoint contract lives in `FRONTEND_HANDOFF.md` (git-ignored — contains live creds; do not commit).

**Auth model — `authService.js`.** Access token (short-lived JWT) is held **in RAM only** (`inMemoryAccessToken`), never in `localStorage`/`sessionStorage`. The refresh token is an HttpOnly cookie the browser manages. `setAccessToken` decodes the JWT `exp` and schedules an auto-refresh timer 30s before expiry via `/auth/refresh`. `localStorage` holds only the non-sensitive `currentUser` profile object (id/name/role) for UI.

**Routing / guards — `src/App.jsx`.** `ProtectedRoute` gates authenticated routes: it checks `isTokenValid()`, and on miss attempts a cookie-based `refreshAccessToken()` before redirecting to `/login`. `AdminRoute` additionally checks `user.role === 'admin'`. These are UX gates only — the backend enforces real authz.

**Realtime — WebSocket in `ChatMain.jsx`.** One socket per session. URL resolves from `VITE_WS_BASE_URL` or falls back to same-origin (`ws(s)://window.location.host`). Auth is via the refresh cookie (not a header), so the socket must be same-origin with the backend. Inbound envelope: `{ type, room_id, data, ts }`; event types drive room-list and message-state updates.

**Component structure — `src/`.** `pages/` (login, dashboard, admin) → `layouts/DashboardLayout.jsx` → `components/dashboard/` (ChatMain, sidebars, ChatMessageItem, EmojiPicker, ImagePreviewModal, MessageContextMenu) and `components/auth/`. `utils/` holds `imageCompress.js` (client-side compression before upload), `imageHandle.js` (`buildImageUrl` resolves relative backend paths against `VITE_API_BASE_URL`), and `emojiData.js` (`:shortcode:` → emoji map used by ChatMain's inline auto-replace).

## Deployment

Two-stage Docker (`Dockerfile`): builds with `VITE_API_BASE_URL=/api` (same-origin), then serves `dist/` via nginx. `nginx.conf.template` is rendered at container start by nginx's envsubst, substituting `${BACKEND_ORIGIN}`: it strips the `/api` prefix and proxies REST + `/ws` to the backend on the **same origin**. Same-origin is required because the refresh cookie is `SameSite=Lax` and won't cross origins. FE is co-located with the backend on the cronchat EC2.

## Conventions

- Env vars are Vite-style (`VITE_*`) and bundled into the client — treat every `VITE_*` value as public; never put secrets there.
- Code comments are frequently in Vietnamese — match the surrounding language when editing a file, English is fine for new files.
- React 19 with the React Compiler enabled (`babel-plugin-react-compiler` in `vite.config.js`) — avoid manual `useMemo`/`useCallback` unless profiling shows a need; the compiler handles memoization.
- `.claude/rules/react/` contains detailed React style, hooks, patterns, and security rules — consult them when writing components. Note those rules assume TypeScript; this project is intentionally `.jsx`.
