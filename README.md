# KB Workouts

Save kettlebell workouts you find on Instagram, randomize or build your own, and follow along with a real-time timer.

## What it does (Phase 1)

- **Add**: paste an Instagram link and/or its caption. Claude extracts the exercises, reps, intervals and rounds. You review and edit the result before saving. New exercises are added to your library automatically.
- **Randomize**: pick a duration (for example 20 minutes), the number of exercises and the categories (swings, hinge, squat, press, row, core and so on). You get one exercise per category, sized into rounds. 🎲 swaps a single exercise.
- **Build**: put together your own workout from the library.
- **Play**: a full-screen follow-along timer with work and rest intervals, "next up" previews, 3-2-1 beeps, spoken cues and form cues. The screen stays awake. Rep-based sets show a "Done" button. Reps plus seconds gives an EMOM: do the reps, rest the remainder.
- **Exercises**: a library of about 30 starter exercises with form cues. Each one has a `demo_url` slot for a GIF or MP4 that plays in the player.

## Run locally

```bash
npm install
cp .env.example .env.local   # fill in what you have; everything is optional
npm run dev
```

The app runs with no configuration. Without a database URL it uses an in-memory store, and without `ANTHROPIC_API_KEY` the "Extract" button reports that AI parsing is unavailable.

## Database (free)

The app uses any Postgres database through `DATABASE_URL`. It creates its tables and loads the starter exercises the first time it runs, so there's no SQL to paste.

The easiest free option is **Neon through Vercel**: in your Vercel project, open **Storage → Create Database → Neon** (free plan) and connect it to the project. Vercel sets `DATABASE_URL` for you.

## Deploy to Vercel

1. Import this repo in Vercel.
2. Add `ANTHROPIC_API_KEY` and `APP_PASSWORD` as environment variables. With `APP_PASSWORD` set, the site shows a sign-in page.
3. Deploy, then add the Neon database (see above) and redeploy.

## Sign-in and passkeys

Set `APP_PASSWORD` to lock the site. Sign in once with the password, then go to **⚙︎ Settings → Add a passkey** to use Face ID, Touch ID or your phone after that. Sessions last 180 days. Passkeys are tied to the domain they were created on, so if you later add a custom domain, add a new passkey there.

## Share from Instagram on iPhone

Create a Shortcut that accepts **URLs** from the Share Sheet and opens:

```
https://YOUR-APP.vercel.app/add?url=[Shortcut Input]
```

Tap **Share → your shortcut** on a reel to open the Add page with the link filled in. Tap Extract. If Instagram blocks the caption fetch, which happens often, copy the caption and paste it in.

## Roadmap

- **Phase 2**: ingest the video itself (download, transcribe and read frames with Claude vision) as a background job, and loop the relevant clip as each exercise's demo.
- **Phase 3**: map exercises to licensed animations (ExerciseDB, Gymvisual) through `demo_url`.
- **Phase 4**: generate animations from the reel using pose estimation.

## Notes

- AI parsing uses `claude-haiku-5-5`, which costs about 0.1¢ per caption. Only the Extract button calls the API. The model is set in `src/lib/parse.ts`.
- Code layout: `src/lib/workout.ts` (timeline, estimates, randomizer), `src/lib/db.ts` (Postgres or memory store), `src/lib/parse.ts` (Claude extraction), `src/components/Player.tsx` (follow-along player).
