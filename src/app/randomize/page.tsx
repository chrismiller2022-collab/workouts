"use client";
import { useEffect, useState } from "react";
import WorkoutEditor from "@/components/WorkoutEditor";
import { api } from "@/lib/client";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Exercise, type Workout } from "@/lib/types";
import { pickExercise, randomizeWorkout, toItem } from "@/lib/workout";

const DEFAULT_CATS: Category[] = ["swing", "hinge", "squat", "press", "pull", "core"];

export default function RandomizePage() {
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [minutes, setMinutes] = useState(20);
  const [count, setCount] = useState(5);
  const [work, setWork] = useState(40);
  const [rest, setRest] = useState(20);
  const [cats, setCats] = useState<Category[]>(DEFAULT_CATS);
  const [workout, setWorkout] = useState<Workout | null>(null);

  useEffect(() => {
    api.exercises().then(setLibrary).catch(() => {});
  }, []);

  const generate = () => setWorkout(randomizeWorkout(library, { minutes, count, work, rest, categories: cats }));

  const reroll = (i: number) => {
    if (!workout) return;
    const current = workout.items[i];
    const category = current.category ?? "full_body";
    const used = workout.items.map((it) => it.exercise_id ?? "");
    const e = pickExercise(library, category, used);
    if (!e) return;
    const items = workout.items.map((it, j) => (j === i ? { ...toItem(e, current.seconds ?? work), reps: current.reps } : it));
    setWorkout({ ...workout, items });
  };

  const toggle = (c: Category) => setCats((prev) => (prev.includes(c) ? prev.filter((x) => x !== c) : [...prev, c]));

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Randomize</h1>
      <div className="card space-y-4">
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          <div>
            <label className="label">Minutes</label>
            <select className="input" value={minutes} onChange={(e) => setMinutes(Number(e.target.value))}>
              {[10, 15, 20, 25, 30, 45].map((m) => <option key={m} value={m}>{m}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Exercises</label>
            <select className="input" value={count} onChange={(e) => setCount(Number(e.target.value))}>
              {[3, 4, 5, 6, 7, 8].map((n) => <option key={n} value={n}>{n}</option>)}
            </select>
          </div>
          <div>
            <label className="label">Work (s)</label>
            <input className="input" type="number" min={10} value={work} onChange={(e) => setWork(Number(e.target.value) || 40)} />
          </div>
          <div>
            <label className="label">Rest (s)</label>
            <input className="input" type="number" min={0} value={rest} onChange={(e) => setRest(Number(e.target.value) || 0)} />
          </div>
        </div>
        <div>
          <label className="label">Pull from</label>
          <div className="flex flex-wrap gap-2">
            {CATEGORIES.map((c) => (
              <button key={c} onClick={() => toggle(c)}
                className={`rounded-full border px-3 py-1 text-sm ${cats.includes(c) ? "border-orange-500 bg-orange-500/15 text-orange-300" : "border-zinc-700 text-zinc-400"}`}>
                {CATEGORY_LABELS[c]}
              </button>
            ))}
          </div>
        </div>
        <button className="btn-primary w-full" disabled={!library.length || !cats.length} onClick={generate}>
          🎲 {workout ? "Shuffle again" : "Generate workout"}
        </button>
      </div>

      {workout && <WorkoutEditor value={workout} onChange={setWorkout} library={library} onReroll={reroll} />}
    </div>
  );
}
