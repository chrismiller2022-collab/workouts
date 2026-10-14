"use client";
import { useEffect, useState } from "react";
import WorkoutEditor from "@/components/WorkoutEditor";
import { api } from "@/lib/client";
import type { Exercise, Workout } from "@/lib/types";

export default function AddPage() {
  const [url, setUrl] = useState("");
  const [text, setText] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [workout, setWorkout] = useState<Workout | null>(null);
  const [library, setLibrary] = useState<Exercise[]>([]);

  useEffect(() => {
    api.exercises().then(setLibrary).catch(() => {});
    // Support share links / iOS Shortcuts: /add?url=...&text=...
    const params = new URLSearchParams(window.location.search);
    setUrl(params.get("url") ?? "");
    setText(params.get("text") ?? "");
  }, []);

  const parse = async () => {
    setLoading(true);
    setError(null);
    try {
      const res = await api.parse({ url: url.trim() || undefined, text: text.trim() || undefined });
      if (res.fetchedCaption) setText(res.fetchedCaption);
      if (res.workout.items.length === 0) {
        setError("No exercises found in that text. Try pasting the full caption, or build it manually.");
      } else {
        setWorkout(res.workout);
      }
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setLoading(false);
    }
  };

  const manual = () =>
    setWorkout({ title: "", source_url: url || null, rounds: 3, rest_seconds: 15, round_rest_seconds: 60, items: [] });

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Add a workout</h1>
      <div className="card space-y-3">
        <div>
          <label className="label">Instagram link</label>
          <input className="input" placeholder="https://www.instagram.com/reel/…" value={url} onChange={(e) => setUrl(e.target.value)} />
        </div>
        <div>
          <label className="label">Caption / workout text</label>
          <textarea className="input min-h-32" value={text} onChange={(e) => setText(e.target.value)}
            placeholder={"Paste the caption, or type what you saw, e.g.\n3 rounds, 40s on / 20s off:\nKB swings, goblet squats, renegade rows, Russian twists"} />
          <p className="mt-1 text-xs text-zinc-500">
            With only a link, the app tries to read the caption itself. Instagram often blocks that, so pasting the caption is more reliable.
          </p>
        </div>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={loading || (!url.trim() && !text.trim())} onClick={parse}>
            {loading ? "Reading workout…" : "Extract workout ✨"}
          </button>
          <button className="btn-ghost" onClick={manual}>Enter manually</button>
        </div>
      </div>

      {workout && (
        <>
          <h2 className="text-lg font-bold">Check it over</h2>
          <WorkoutEditor value={workout} onChange={setWorkout} library={library} />
        </>
      )}
    </div>
  );
}
