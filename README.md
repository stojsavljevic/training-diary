# Training Diary (Dnevnik treninga)

A gym training log for the phone: a single-page app (`index.html`, UI in Serbian) served by a Cloudflare Worker at **https://training.netwatchly.com**. Data is stored in Cloudflare D1, so every device sees the same workouts.

## Features

- Log sets (kg × reps), 3 sets per exercise; done exercises collapse and move to the bottom; cards can be reordered
- Weekly templates (Monday PUSH, Wednesday MIX, Friday PULL) with editable weight, reps and order
- Rest timer (default 90 s): warning in the last 10 s, counts below zero in red
- Stopwatch with laps
- History, progress charts per exercise (weight, estimated 1RM, volume, reps)
- Strength levels (Beginner to Elite) from estimated 1RM against reference tables for a 50-year-old man; Dips use estimated max reps
- JSON export/import (History → Podaci) for an occasional backup

## Architecture

| Part | Where |
|---|---|
| Page (HTML, CSS, JS in one file) | `index.html` |
| Worker: serves the page and the API | `src/worker.js` |
| Cloudflare config (bindings, domain, Access values, previews) | `wrangler.jsonc` |
| Security headers (CSP etc.) | `_headers` |
| Files published as static assets | only `index.html` and `_headers` (`.assetsignore`) |

API (all routes require Cloudflare Access):

- `GET /api/sync` → all workouts, templates, settings and deleted ids for the user
- `PUT /api/{workouts|templates|settings}/{id}` → save one item
- `DELETE /api/{workouts|templates}/{id}` → delete (kept as a tombstone so other devices drop it too)

## Where the data lives

- **Production:** D1 database `training-diary` (region EEUR), table `items(user, kind, id, data, updated, deleted)`. Rows are keyed by the email from the Access token.
- **Previews (PRs):** separate D1 database `training-diary-preview`; previews never touch real data.
- **On each device:** `localStorage` (`dt.*` keys) is a local copy so the app works offline. Changes wait in `dt.pending` until the server confirms them; the header shows the state ("Sačuvano na serveru", "Čeka slanje (n)", "Prijava je istekla").
- Data that exists only on a device is uploaded on the next sync; newer `updated` wins when both sides changed.

The repository contains code only. Export files (`dnevnik-treninga-*.json`) are git-ignored.

## Security

The Worker is protected by **Cloudflare Access** (Worker → Access tab, policy: Cloudflare account members, production and previews). The API additionally verifies the Access JWT (signature, `aud`, `iss`, expiry) using `ACCESS_TEAM_DOMAIN` and `ACCESS_AUD` from `wrangler.jsonc`. Without a valid token every API request is rejected with 401.

## Deployment

Deployment is automatic via **Cloudflare Workers Builds** connected to this GitHub repo:

- **Pull request** → `npx wrangler preview` (preview URL behind Access, preview database)
- **Merge to `main`** → `npx wrangler deploy` to `training.netwatchly.com`

Workflow: branch → PR → merge. Do not deploy by hand.

## Local development

```bash
npx wrangler dev --local --var DEV_USER:you@example.com
```

Runs the Worker with a local D1 database. `DEV_USER` skips the Access check and must never be set in production.

Inspect production data (requires `npx wrangler login`):

```bash
npx wrangler d1 execute training-diary --remote --command "SELECT kind, COUNT(*) FROM items WHERE deleted=0 GROUP BY kind"
```

## Limitations

- No rest-timer notifications on the lock screen (no service worker or notifications yet)
- The active workout, stopwatch and rest timer are stored only on the device until the workout is finished
