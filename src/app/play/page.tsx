"use client";
import Link from "next/link";
import { useEffect, useState } from "react";
import Player from "@/components/Player";
import { api, readStashedWorkout } from "@/lib/client";
import type { Exercise, Workout } from "@/lib/types";

export default function PlayPage() {
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const id = new URLSearchParams(window.location.search).get("id");
    const load = id ? api.workout(id) : Promise.resolve(readStashedWorkout());
    load
      .then((w) => (w ? setWorkout(w) : setError("No workout loaded.")))
      .catch((e: Error) => setError(e.message));
    api.exercises().then(setLibrary).catch(() => {});
  }, []);

  if (error) {
    return (
      <div className="space-y-3 text-center">
        <p className="text-zinc-400">{error}</p>
        <Link href="/" className="btn-primary">Pick a workout</Link>
      </div>
    );
  }
  if (!workout) return <p className="text-center text-zinc-400">Loading…</p>;
  return <Player workout={workout} library={library} />;
}
