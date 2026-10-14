import type { Category, Exercise, Workout, WorkoutItem } from "./types";

/** Rough seconds-per-rep for estimating rep-based exercises. */
export const SECONDS_PER_REP = 3;
export const GET_READY_SECONDS = 10;

export type Segment =
  | { kind: "ready"; seconds: number; next: WorkoutItem }
  | { kind: "work"; seconds: number | null; item: WorkoutItem; round: number; index: number }
  | { kind: "rest"; seconds: number; next: WorkoutItem; round: number; afterRound: boolean };

export function itemSeconds(item: WorkoutItem): number {
  if (item.seconds) return item.seconds;
  return (item.reps ?? 10) * SECONDS_PER_REP;
}

/** Flattens a workout into the ordered work/rest segments the player steps through. */
export function buildTimeline(w: Workout): Segment[] {
  const segs: Segment[] = [];
  if (w.items.length === 0) return segs;
  segs.push({ kind: "ready", seconds: GET_READY_SECONDS, next: w.items[0] });
  for (let r = 1; r <= w.rounds; r++) {
    w.items.forEach((item, i) => {
      segs.push({ kind: "work", seconds: item.seconds ?? null, item, round: r, index: i });
      const lastInRound = i === w.items.length - 1;
      const lastOverall = lastInRound && r === w.rounds;
      if (lastOverall) return;
      const next = lastInRound ? w.items[0] : w.items[i + 1];
      const rest = lastInRound && w.round_rest_seconds > 0 ? w.round_rest_seconds : w.rest_seconds;
      if (rest > 0) segs.push({ kind: "rest", seconds: rest, next, round: r, afterRound: lastInRound });
    });
  }
  return segs;
}

export function estimateSeconds(w: Workout): number {
  return buildTimeline(w).reduce(
    (sum, s) => sum + (s.kind === "work" ? (s.seconds ?? itemSeconds(s.item)) : s.seconds),
    0,
  );
}

export function formatDuration(totalSeconds: number): string {
  const m = Math.floor(totalSeconds / 60);
  const s = Math.round(totalSeconds % 60);
  return s === 0 ? `${m} min` : `${m}:${String(s).padStart(2, "0")}`;
}

export function formatClock(totalSeconds: number): string {
  const s = Math.max(0, Math.ceil(totalSeconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;
}

export function describeItem(item: WorkoutItem): string {
  const parts: string[] = [];
  if (item.reps) parts.push(`${item.reps} reps`);
  if (item.seconds) parts.push(`${item.seconds}s`);
  return parts.join(" in ") || "—";
}

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export interface RandomizeOptions {
  minutes: number;
  count: number;
  work: number;
  rest: number;
  categories: Category[];
}

export function pickExercise(pool: Exercise[], category: Category, exclude: string[] = []): Exercise | null {
  const options = pool.filter((e) => e.category === category && !exclude.includes(e.id));
  const fallback = pool.filter((e) => e.category === category);
  const list = options.length ? options : fallback;
  return list.length ? list[Math.floor(Math.random() * list.length)] : null;
}

export function toItem(e: Exercise, seconds: number): WorkoutItem {
  return {
    name: e.name,
    exercise_id: e.id,
    category: e.category,
    seconds,
    notes: e.unilateral ? "Switch sides halfway" : null,
  };
}

/**
 * Picks one exercise from each of `count` different categories (swings first if
 * allowed — it's a kettlebell workout) and sizes the rounds to fit `minutes`.
 */
export function randomizeWorkout(pool: Exercise[], opts: RandomizeOptions): Workout {
  const available = opts.categories.filter((c) => pool.some((e) => e.category === c));
  let cats: Category[] = shuffle(available.filter((c) => c !== "swing"));
  if (available.includes("swing")) cats = ["swing", ...cats];
  // If there are fewer categories than exercises requested, reuse categories.
  while (cats.length < opts.count && available.length) cats.push(...shuffle(available));
  cats = cats.slice(0, opts.count);

  const used: string[] = [];
  const items: WorkoutItem[] = [];
  for (const c of cats) {
    const e = pickExercise(pool, c, used);
    if (!e) continue;
    used.push(e.id);
    items.push(toItem(e, opts.work));
  }

  const perRound = items.length * (opts.work + opts.rest);
  const rounds = Math.max(1, Math.round((opts.minutes * 60) / Math.max(perRound, 1)));
  return {
    title: `Random ${opts.minutes}-min KB workout`,
    rounds,
    rest_seconds: opts.rest,
    round_rest_seconds: opts.rest,
    items,
  };
}
