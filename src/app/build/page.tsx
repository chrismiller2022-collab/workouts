"use client";
import { useEffect, useState } from "react";
import WorkoutEditor from "@/components/WorkoutEditor";
import { api } from "@/lib/client";
import type { Exercise, Workout } from "@/lib/types";

export default function BuildPage() {
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [workout, setWorkout] = useState<Workout>({
    title: "My KB workout",
    rounds: 4,
    rest_seconds: 20,
    round_rest_seconds: 60,
    items: [],
  });

  useEffect(() => {
    api.exercises().then(setLibrary).catch(() => {});
  }, []);

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Build a workout</h1>
      <WorkoutEditor value={workout} onChange={setWorkout} library={library} />
    </div>
  );
}
