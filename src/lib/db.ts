import "server-only";
import postgres from "postgres";
import { SEED_EXERCISES } from "./seed";
import type { Category, Exercise, Workout, WorkoutItem } from "./types";

/**
 * Storage: Postgres (e.g. Neon via the Vercel Marketplace) when DATABASE_URL is set,
 * otherwise an in-memory store (local dev only — resets on restart).
 */
interface Store {
  listExercises(): Promise<Exercise[]>;
  createExercise(e: Omit<Exercise, "id">): Promise<Exercise>;
  updateExercise(id: string, patch: Partial<Omit<Exercise, "id">>): Promise<Exercise>;
  listWorkouts(): Promise<Workout[]>;
  getWorkout(id: string): Promise<Workout | null>;
  createWorkout(w: Workout): Promise<Workout>;
  deleteWorkout(id: string): Promise<void>;
}

/** Creates tables on first use, so a fresh database needs no manual setup. */
const SCHEMA = `
create table if not exists exercises (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  category text not null,
  cues text,
  demo_url text,
  unilateral boolean not null default false,
  created_at timestamptz not null default now()
);
create table if not exists workouts (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  source_url text,
  notes text,
  rounds int not null default 1,
  rest_seconds int not null default 0,
  round_rest_seconds int not null default 0,
  items jsonb not null default '[]'::jsonb,
  created_at timestamptz not null default now()
);`;

const EXERCISE_COLUMNS = "id, name, category, cues, demo_url, unilateral";
const WORKOUT_COLUMNS = "id, title, source_url, notes, rounds, rest_seconds, round_rest_seconds, items, created_at";

function postgresStore(url: string): Store {
  const sql = postgres(url, { max: 1, prepare: false, idle_timeout: 20 });
  let ready: Promise<void> | null = null;
  const init = () =>
    (ready ??= (async () => {
      await sql.unsafe(SCHEMA);
      const [{ count }] = await sql<{ count: number }[]>`select count(*)::int as count from exercises`;
      if (count === 0) {
        const rows = SEED_EXERCISES.map((e) => ({ ...e, cues: e.cues ?? null }));
        await sql`insert into exercises ${sql(rows, "name", "category", "cues", "unilateral")} on conflict (name) do nothing`;
      }
    })().catch((e) => {
      ready = null;
      throw e;
    }));
  const toWorkout = (r: Record<string, unknown>) =>
    ({ ...r, created_at: (r.created_at as Date).toISOString() }) as Workout;

  return {
    async listExercises() {
      await init();
      return sql<Exercise[]>`select ${sql.unsafe(EXERCISE_COLUMNS)} from exercises order by name`;
    },
    async createExercise(e) {
      await init();
      const [row] = await sql<Exercise[]>`
        insert into exercises (name, category, cues, demo_url, unilateral)
        values (${e.name}, ${e.category}, ${e.cues}, ${e.demo_url}, ${e.unilateral})
        returning ${sql.unsafe(EXERCISE_COLUMNS)}`;
      return row;
    },
    async updateExercise(id, patch) {
      await init();
      const cols = Object.keys(patch) as (keyof typeof patch)[];
      const [row] = await sql<Exercise[]>`
        update exercises set ${sql(patch, cols)} where id = ${id}
        returning ${sql.unsafe(EXERCISE_COLUMNS)}`;
      if (!row) throw new Error("Exercise not found");
      return row;
    },
    async listWorkouts() {
      await init();
      const rows = await sql`select ${sql.unsafe(WORKOUT_COLUMNS)} from workouts order by created_at desc`;
      return rows.map(toWorkout);
    },
    async getWorkout(id) {
      await init();
      if (!/^[0-9a-f-]{36}$/i.test(id)) return null;
      const [row] = await sql`select ${sql.unsafe(WORKOUT_COLUMNS)} from workouts where id = ${id}`;
      return row ? toWorkout(row) : null;
    },
    async createWorkout(w) {
      await init();
      const [row] = await sql`
        insert into workouts (title, source_url, notes, rounds, rest_seconds, round_rest_seconds, items)
        values (${w.title}, ${w.source_url ?? null}, ${w.notes ?? null}, ${w.rounds}, ${w.rest_seconds},
                ${w.round_rest_seconds}, ${sql.json(w.items as unknown as postgres.JSONValue)})
        returning ${sql.unsafe(WORKOUT_COLUMNS)}`;
      return toWorkout(row);
    },
    async deleteWorkout(id) {
      await init();
      if (!/^[0-9a-f-]{36}$/i.test(id)) return;
      await sql`delete from workouts where id = ${id}`;
    },
  };
}

function memoryStore(): Store {
  const g = globalThis as unknown as { __kbStore?: { exercises: Exercise[]; workouts: Workout[] } };
  g.__kbStore ??= {
    exercises: SEED_EXERCISES.map((e) => ({ ...e, id: crypto.randomUUID(), demo_url: null })),
    workouts: [],
  };
  const s = g.__kbStore;
  return {
    async listExercises() {
      return [...s.exercises].sort((a, b) => a.name.localeCompare(b.name));
    },
    async createExercise(e) {
      const ex = { ...e, id: crypto.randomUUID() };
      s.exercises.push(ex);
      return ex;
    },
    async updateExercise(id, patch) {
      const ex = s.exercises.find((e) => e.id === id);
      if (!ex) throw new Error("Exercise not found");
      Object.assign(ex, patch);
      return ex;
    },
    async listWorkouts() {
      return [...s.workouts].reverse();
    },
    async getWorkout(id) {
      return s.workouts.find((w) => w.id === id) ?? null;
    },
    async createWorkout(w) {
      const saved = { ...w, id: crypto.randomUUID(), created_at: new Date().toISOString() };
      s.workouts.push(saved);
      return saved;
    },
    async deleteWorkout(id) {
      s.workouts = s.workouts.filter((w) => w.id !== id);
    },
  };
}

let store: Store | null = null;

export function db(): Store {
  if (store) return store;
  const url = databaseUrl();
  store = url ? postgresStore(url) : memoryStore();
  return store;
}

// The Neon/Vercel integration sets DATABASE_URL; POSTGRES_URL covers older Vercel Postgres setups.
const databaseUrl = () => process.env.DATABASE_URL || process.env.POSTGRES_URL || null;

export const usingDatabase = () => Boolean(databaseUrl());

/**
 * Links each item to a library exercise by name, adding new exercises to the
 * library (e.g. ones pulled from an Instagram workout) as needed.
 */
export async function linkItemsToLibrary(items: WorkoutItem[]): Promise<WorkoutItem[]> {
  const library = await db().listExercises();
  const byName = new Map(library.map((e) => [e.name.trim().toLowerCase(), e]));
  const byId = new Map(library.map((e) => [e.id, e]));
  const out: WorkoutItem[] = [];
  for (const item of items) {
    let ex = (item.exercise_id && byId.get(item.exercise_id)) || byName.get(item.name.trim().toLowerCase());
    if (!ex) {
      ex = await db().createExercise({
        name: item.name.trim(),
        category: (item.category ?? "full_body") as Category,
        cues: null,
        demo_url: null,
        unilateral: false,
      });
      byName.set(ex.name.toLowerCase(), ex);
    }
    out.push({ ...item, exercise_id: ex.id, category: ex.category });
  }
  return out;
}
