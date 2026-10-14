import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { SEED_EXERCISES } from "./seed";
import type { Category, Exercise, Workout, WorkoutItem } from "./types";

/**
 * Storage: Supabase when SUPABASE_URL + SUPABASE_SERVICE_ROLE_KEY are set,
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

const WORKOUT_COLUMNS = "id,title,source_url,notes,rounds,rest_seconds,round_rest_seconds,items,created_at";
const EXERCISE_COLUMNS = "id,name,category,cues,demo_url,unilateral";

function supabaseStore(sb: SupabaseClient): Store {
  const check = <T>(res: { data: T | null; error: { message: string } | null }): T => {
    if (res.error) throw new Error(res.error.message);
    return res.data as T;
  };
  return {
    async listExercises() {
      return check(await sb.from("exercises").select(EXERCISE_COLUMNS).order("name"));
    },
    async createExercise(e) {
      return check(await sb.from("exercises").insert(e).select(EXERCISE_COLUMNS).single());
    },
    async updateExercise(id, patch) {
      return check(await sb.from("exercises").update(patch).eq("id", id).select(EXERCISE_COLUMNS).single());
    },
    async listWorkouts() {
      return check(await sb.from("workouts").select(WORKOUT_COLUMNS).order("created_at", { ascending: false }));
    },
    async getWorkout(id) {
      return check(await sb.from("workouts").select(WORKOUT_COLUMNS).eq("id", id).maybeSingle());
    },
    async createWorkout(w) {
      const row = {
        title: w.title,
        source_url: w.source_url ?? null,
        notes: w.notes ?? null,
        rounds: w.rounds,
        rest_seconds: w.rest_seconds,
        round_rest_seconds: w.round_rest_seconds,
        items: w.items,
      };
      return check(await sb.from("workouts").insert(row).select(WORKOUT_COLUMNS).single());
    },
    async deleteWorkout(id) {
      check(await sb.from("workouts").delete().eq("id", id));
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
  const url = process.env.SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  store = url && key
    ? supabaseStore(createClient(url, key, { auth: { persistSession: false } }))
    : memoryStore();
  return store;
}

export const usingSupabase = () => Boolean(process.env.SUPABASE_URL && process.env.SUPABASE_SERVICE_ROLE_KEY);

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
