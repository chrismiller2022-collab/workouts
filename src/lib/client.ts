"use client";
import type { Exercise, Workout } from "./types";

const PENDING_KEY = "kb:pending-workout";

/** Hands an unsaved workout (randomized or built) to the player page. */
export function stashWorkout(w: Workout) {
  sessionStorage.setItem(PENDING_KEY, JSON.stringify(w));
}

export function readStashedWorkout(): Workout | null {
  try {
    const raw = sessionStorage.getItem(PENDING_KEY);
    return raw ? (JSON.parse(raw) as Workout) : null;
  } catch {
    return null;
  }
}

async function json<T>(res: Response): Promise<T> {
  const body = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error((body as { error?: string }).error ?? `Request failed (${res.status})`);
  return body as T;
}

export const api = {
  exercises: () => fetch("/api/exercises").then((r) => json<Exercise[]>(r)),
  workout: (id: string) => fetch(`/api/workouts/${id}`).then((r) => json<Workout>(r)),
  saveWorkout: (w: Workout) =>
    fetch("/api/workouts", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(w),
    }).then((r) => json<Workout>(r)),
  deleteWorkout: (id: string) => fetch(`/api/workouts/${id}`, { method: "DELETE" }),
  parse: (body: { url?: string; text?: string }) =>
    fetch("/api/parse", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
    }).then((r) => json<{ workout: Workout; fetchedCaption: string | null }>(r)),
  createExercise: (e: Omit<Exercise, "id">) =>
    fetch("/api/exercises", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(e),
    }).then((r) => json<Exercise>(r)),
  updateExercise: (id: string, patch: Partial<Omit<Exercise, "id">>) =>
    fetch(`/api/exercises/${id}`, {
      method: "PATCH",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(patch),
    }).then((r) => json<Exercise>(r)),
};
