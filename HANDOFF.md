# Handoff: KB Workouts

A personal web app for saving kettlebell workouts seen on Instagram, randomizing or building a session, and following along with a real-time timer. One user (the owner), deployed on Vercel.

Last updated: 2026-11-17.

## Where things are

| Thing | Location |
|---|---|
| Code | GitHub `chrismiller2022-collab/workouts`, branch `claude/fervent-lovelace-i2e517` is the default and Vercel's production branch. Current work is on `claude/adoring-carson-2am4tg` (preview deployments only until merged). |
| Hosting | Vercel project `workouts` (team "Chris Miller's projects", Hobby plan). Every push to the branch redeploys production. |
| Database | Neon Postgres (free), connected through Vercel Storage. |
| AI | Anthropic API, model `claude-haiku-5-5`, called only by the "Extract workout" button. |

## What's built (Phase 1)

- **Add** (`/add`): paste an Instagram link and/or caption.
  - Link only: `POST /api/imports` starts a background job (`src/lib/import.ts`) that fetches the post through Bright Data (`src/lib/scrape.ts`: caption, comments, creator, video URL), extracts the workout and saves it. The page polls `/api/imports/:id` and opens the saved workout. Without `BRIGHTDATA_API_KEY` it falls back to Open Graph tags, which Instagram usually blocks.
  - With pasted text: Claude turns it into an editable form, as before.
  - `/add?url=…&text=…` prefills the form, for an iPhone Share Sheet shortcut.
- **Randomize** (`/randomize`): one exercise per chosen category (swings first), with rounds sized to the target minutes. 🎲 rerolls a single exercise.
- **Build** (`/build`): compose a workout from the library.
- **Play** (`/play?id=…`, or unsaved via sessionStorage): interval timer with get-ready, work and rest phases, 3-2-1 beeps, spoken cues, form cues, wake lock, pause/skip/back. Rep-only sets show a "Done" button; reps plus seconds runs EMOM-style.
- **Exercises** (`/exercises`): 29 seeded movements with form cues. Each has a `demo_url` slot (GIF, image or MP4) that the player shows.
- **Sign-in** (`/login`, `/settings`): password page, then passkeys added from Settings. Sessions last 180 days.

## Code map

| File | What it does |
|---|---|
| `src/lib/types.ts` | `Exercise`, `Workout`, `WorkoutItem`, categories |
| `src/lib/workout.ts` | Timeline builder for the player, time estimates, randomizer |
| `src/lib/db.ts` | Storage. Postgres when a database URL is set, otherwise in-memory (resets on restart). Creates tables and seeds exercises on first use. |
| `src/lib/parse.ts` | Claude extraction (structured output via Zod) and the best-effort Instagram caption fetch |
| `src/lib/session.ts` | HMAC-signed cookies using Web Crypto, so it runs in Edge middleware |
| `src/lib/auth-server.ts` | Cookie helpers and the WebAuthn relying party (rpID/origin) from request headers |
| `src/middleware.ts` | When `APP_PASSWORD` is set, gates every page and API except `/login` and the sign-in endpoints |
| `src/app/api/auth/passkey/*` | WebAuthn register and login via `@simplewebauthn/server` v14 |
| `src/components/Player.tsx` | Follow-along player |
| `src/components/WorkoutEditor.tsx` | Shared editor used by Add, Build and Randomize |

Workout items are stored as `jsonb` on the `workouts` row. Saving a workout links each item to a library exercise by name and creates exercises that don't exist yet.

## Environment variables (Vercel)

| Name | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Extraction. Without it, Extract returns a clear error. |
| `BRIGHTDATA_API_KEY` | Link import. Not set yet: the owner has no Bright Data account. Scraper ids are looked up by name from `/datasets/list`; override with `BRIGHTDATA_INSTAGRAM_REELS_DATASET` / `_POSTS_DATASET`. |
| `APP_PASSWORD` | Turns on the sign-in page. Also the session signing key unless `SESSION_SECRET` is set; changing it signs everyone out. |
| `SESSION_SECRET` | Optional separate signing key. |
| Database URL | Any of `DATABASE_URL`, `POSTGRES_URL`, or a prefixed form such as `STORAGE_DATABASE_URL` (the code scans for names ending in `_DATABASE_URL` or `_POSTGRES_URL`). The Neon integration sets one. |

## Decisions and why

- **Neon instead of Supabase:** the owner's Supabase free plan already has its 2 active projects (one holds an unrelated sports/betting app). The owner chose an alternative over sharing or pausing a project.
- **Haiku for extraction:** the owner wants low API cost. Estimated about 0.1¢ per caption (not measured). Revisit for Phase 2 video understanding.
- **Own sign-in page instead of HTTP Basic auth:** the owner wanted a password-only prompt.
- **Passkeys don't require user verification** (`requireUserVerification: false`, with `userVerification: "preferred"`). Registration failed on the owner's device with "User verification was required". Sign-in options also list all saved credentials (`allowCredentials`) so providers that can't search discoverable credentials without biometrics still work. Acceptable because it's single-user and adding a passkey requires being signed in.

## Verified vs. not verified

Verified locally in headless Chromium against real Postgres 16:
- randomize → save → play
- rep-based "Done" flow
- password sign-in (wrong password rejected)
- passkey add and sign-in, with virtual authenticators both with and without user verification
- logged-out API calls return 401
- tables and seed created on an empty database
- prefixed database URL detected

**Not verified yet:**
1. **Extraction with a real API key:** never run, because no key was available in the dev container. Try one real caption first.
2. **Bright Data link import against the real service:** tested only against a mock. The record field names in `toPostContent` (`description`, `user_posted`, `latest_comments`, `video_url`, `thumbnail`) are best guesses and must be checked against the first real response.
3. **The "Running without a database" warning on production:** `DATABASE_URL` and `ANTHROPIC_API_KEY` are confirmed present in Vercel production and the latest deployment postdates them, so it should be gone. Not seen on the page itself.
4. **Passkey fix on the owner's real device:** fixed in `a0e878c`; the owner hasn't confirmed yet.

## Known limitations

- The Instagram caption fetch is best-effort and often blocked.
- Passkeys are bound to the hostname. A custom domain needs new passkeys.
- No tests in the repo. The browser checks above were ad-hoc Playwright scripts, not committed.
- `next lint` and `tsc` are clean; `npm run build` passes.

## Roadmap (agreed with the owner, 2026-11-17)

Goal: a workout version of ReciMe for one user on iPhone. All workout types, kettlebell first.

1. **Link import** (built, needs a Bright Data key and a real-world check).
2. **Share from Instagram:** installable site plus an Apple Shortcut in the share sheet that sends the link to the app.
3. **Read the video** when caption and comments have no workout: audio transcript plus sampled frames. `imports.video_url` is already stored for this.
4. **Database:** equipment, muscle group, format, creator, tags; edit, search, filter.
5. **Generator:** by time, equipment, focus and format, drawing on imported workouts and their rep ranges.
6. **Optional native app** for a true share extension.

Older notes on demos and animation:

- **Phase 2:** ingest the reel video: download, transcribe, read frames with Claude vision, as a background job (Vercel function limits). Loop the relevant clip as each exercise's demo.
- **Phase 3:** map exercises to licensed animations (ExerciseDB API or Gymvisual) through `demo_url`.
- **Phase 4 (optional):** pose estimation (MediaPipe) on the reel to drive a stick-figure or 3D animation.

## Running locally

```bash
npm install
cp .env.example .env.local   # everything optional
npm run dev
```

With no database URL it uses the in-memory store. With no `APP_PASSWORD` there is no sign-in.
