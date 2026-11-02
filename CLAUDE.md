# CLAUDE.md

Personal gym training log. One-page app in `index.html`, served by a Cloudflare Worker (`src/worker.js`) at https://training.netwatchly.com, data in Cloudflare D1. See README.md for features and architecture.

The user speaks Serbian (Latin script); answer in Serbian unless asked otherwise.

## Workflow (agreed with the user)

- Never deploy by hand (`wrangler deploy` is off-limits). Every change goes: new branch → commit → push → PR. The user merges.
- Cloudflare Workers Builds is connected to GitHub `stojsavljevic/training-diary`: a PR runs `npx wrangler preview`, a merge to `main` runs `npx wrangler deploy`. The PR check is "Workers Builds: training-diary".
- Build logs are not readable with the wrangler OAuth token (API returns Forbidden). If a build fails, ask the user to paste the log from the Cloudflare dashboard.
- Commit messages: English, conventional (`feat:`, `fix:`, `build:`, `docs:`). PR descriptions may be in Serbian.
- When app behaviour changes, add a version entry to CHANGELOG.md (in Serbian; current: version 21; version 20 is in PR #5).

## Layout

- `index.html` — all HTML, CSS and JS in one IIFE. Views are functions returning HTML strings (`viewIdle`, `viewActive`, `viewTpl`, `viewHist`, `viewProg`, `viewSw`); `render()` replaces `#app`; one delegated click handler switches on `data-do`.
- `src/worker.js` — `/api/*` (Access JWT check + D1), everything else via `env.ASSETS`.
- `wrangler.jsonc` — bindings, custom domain, Access values, `previews` block, observability.
- `_headers` — CSP and other security headers. CSP is strict (`connect-src 'self'`, fonts only from Google Fonts); update it when adding any external resource.
- `.assetsignore` — only `index.html` and `_headers` are published; keep it that way.

## Code style

Match the existing compact style: short names, dense one-line functions, comments only for non-obvious "why". UI text is Serbian Latin. No build step, no dependencies, no frameworks.

## Data and sync

- D1 `training-diary` (prod) and `training-diary-preview` (PR previews). Table `items(user, kind, id, data, updated, deleted)`, created lazily by the Worker. `kind` is `workouts`, `templates` or `settings` (id `main`). Deletes are tombstones (`deleted=1`).
- `user` = email from the Access JWT. Access: team `https://rough-tree-2e60.cloudflareaccess.com`, AUD in `wrangler.jsonc` (Worker Access, policy "Cloudflare account members", covers production and previews). Same Access team as the user's portfolio site, so one login covers both.
- Client (`index.html`, section "server storage"): `localStorage` keys `dt.workouts`, `dt.templates`, `dt.settings`, `dt.active`, `dt.rest`, `dt.sw`, `dt.seeded`, `dt.pending`. Every change goes into the `dt.pending` queue and is removed only after the server confirms. `pull()` runs on load, when the tab becomes visible, on `online`, and every 60 s. Merge rules: pending local change wins; otherwise newer `updated` wins; device-only items are uploaded; tombstoned items are dropped; untouched starter templates (`updated: 0`) are uploaded only to an empty account.
- Server mode is chosen by hostname (`const API=...` regex: `netwatchly.com`, `*.workers.dev`, `localhost`). If the domain changes, update that regex.
- Records without an `exercises` array are rejected by the API and dropped by the client; one malformed record used to blank the whole app.
- The old Claude-artifact storage path (`initDb`, `window.claude.use('db')`) is still in the code but unused. The artifact was deleted on 2026-11-02. It can be removed in a cleanup.
- Never delete or rewrite production rows without the user's explicit OK. Read-only checks: `npx wrangler d1 execute training-diary --remote --json --command "..."`.

## Verify changes

There are no automated tests. Before opening a PR:

1. `npx wrangler dev --local --var DEV_USER:test@local` (local D1, Access check skipped).
2. Open http://127.0.0.1:8787 in the browser pane, exercise the change, check the console for errors and `/api/sync` for the stored data.
3. To test sync between "devices", seed `localStorage` with `dt.*` data and reload; to test offline, stub `window.fetch` to reject.
4. `npx wrangler deploy --dry-run` to validate the config. There is no dry-run for `wrangler preview`.

Gotchas: `.gitignore` ignores every `*.json` except `package.json` (use `.jsonc` for config). `wrangler preview` requires the `previews` block in `wrangler.jsonc` for every binding and var.

## Known issues / backlog (from the code review, not fixed yet)

- Starting a template uses the template's kg/reps, not last session's values, so progress made in a session is lost next week unless the template is edited (`makeEx`).
- Active workout, stopwatch and rest timer are device-only (`dt.active`, `dt.sw`, `dt.rest`); they survive a reload but are not synced.
- Import ignores `settings` although export includes them.
- Dips (bodyweight) still shows a "kg" column; comment above `exVal` about Dips is stale.
- `tpl-sets` action has no button (dead code).
- Rest-timer notifications on the lock screen are now possible (own domain: service worker / PWA) but not implemented.
