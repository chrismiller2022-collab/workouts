# Handoff: KB Workouts

A personal web app for saving kettlebell workouts seen on Instagram, randomizing or building a session, and following along with a real-time timer. One user (the owner), deployed on Vercel.

Last updated: 2026-11-17.

## Where things are

| Thing | Location |
|---|---|
| Code | GitHub `chrismiller2022-collab/workouts`, branch `claude/fervent-lovelace-i2e517`. It is the repo's only branch, so it is the default branch and Vercel's production branch. |
| Hosting | Vercel project `workouts` (team "Chris Miller's projects", Hobby plan). Every push to the branch redeploys production. |
| Database | Neon Postgres (free), connected through Vercel Storage. |
| AI | Anthropic API, model `claude-haiku-5-5`, called only by the "Extract workout" button. |

## What's built (Phase 1)

- **Add** (`/add`): paste an Instagram link and/or caption. Claude turns it into exercises, reps, seconds and rounds in an editable form. With only a link, the server tries to read the caption from the page's Open Graph tags; Instagram often blocks this, so pasting is the reliable path. `/add?url=…&text=…` prefills the form, for an iPhone Share Sheet shortcut.
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
2. **The "Running without a database" warning on production:** the owner saw it with Neon connected. The likely cause, a prefixed env var name, was fixed in `1a5a235`. Not confirmed on the live site because the Vercel connector was refused for the team scope. If the warning persists, check the env var names in Vercel → Settings → Environment Variables and confirm the latest deployment ran after Neon was connected.
3. **Passkey fix on the owner's real device:** fixed in `a0e878c`; the owner hasn't confirmed yet.

## Known limitations

- The Instagram caption fetch is best-effort and often blocked.
- Passkeys are bound to the hostname. A custom domain needs new passkeys.
- No tests in the repo. The browser checks above were ad-hoc Playwright scripts, not committed.
- `next lint` and `tsc` are clean; `npm run build` passes.

## Roadmap (agreed with the owner)

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
