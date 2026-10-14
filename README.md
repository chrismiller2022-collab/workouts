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

The app runs with no configuration. Without Supabase it uses an in-memory store, and without `ANTHROPIC_API_KEY` the "Extract" button reports that AI parsing is unavailable.

## Set up Supabase

1. Create a project at supabase.com.
2. In the SQL editor, run `supabase/migrations/0001_init.sql` and then `0002_seed_exercises.sql`.
3. Set `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY`. The service key is used server-side only. RLS is enabled with no policies, so the public anon key can't touch the data.

## Deploy to Vercel

1. Import this repo in Vercel.
2. Add the environment variables from `.env.example`. Set `APP_PASSWORD` so the site isn't open to the public.
3. Deploy.

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

- AI parsing uses `claude-opus-5-5` with server-side refusal fallback (`fallbacks: "default"`) enabled. To turn it off, remove `betas`/`fallbacks` in `src/lib/parse.ts`.
- Code layout: `src/lib/workout.ts` (timeline, estimates, randomizer), `src/lib/db.ts` (Supabase or memory store), `src/lib/parse.ts` (Claude extraction), `src/components/Player.tsx` (follow-along player).
