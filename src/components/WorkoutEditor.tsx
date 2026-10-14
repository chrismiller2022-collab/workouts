"use client";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { api, stashWorkout } from "@/lib/client";
import { CATEGORIES, CATEGORY_LABELS, type Exercise, type Workout, type WorkoutItem } from "@/lib/types";
import { estimateSeconds, formatDuration } from "@/lib/workout";

interface Props {
  value: Workout;
  onChange: (w: Workout) => void;
  library: Exercise[];
  /** When provided, each row gets a "reroll" button (used by the randomizer). */
  onReroll?: (index: number) => void;
}

const numOrNull = (v: string) => (v === "" ? null : Math.max(0, Number(v)));

export default function WorkoutEditor({ value: w, onChange, library, onReroll }: Props) {
  const router = useRouter();
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const set = (patch: Partial<Workout>) => onChange({ ...w, ...patch });
  const setItem = (i: number, patch: Partial<WorkoutItem>) =>
    set({ items: w.items.map((it, j) => (j === i ? { ...it, ...patch } : it)) });
  const move = (i: number, dir: -1 | 1) => {
    const j = i + dir;
    if (j < 0 || j >= w.items.length) return;
    const items = [...w.items];
    [items[i], items[j]] = [items[j], items[i]];
    set({ items });
  };
  const addFromLibrary = (id: string) => {
    const e = library.find((x) => x.id === id);
    if (!e) return;
    const seconds = w.items.at(-1)?.seconds ?? 40;
    set({ items: [...w.items, { name: e.name, exercise_id: e.id, category: e.category, seconds, reps: null, notes: null }] });
  };

  const onNameChange = (i: number, name: string) => {
    const match = library.find((e) => e.name.toLowerCase() === name.trim().toLowerCase());
    setItem(i, { name, exercise_id: match?.id ?? null, category: match?.category ?? w.items[i].category ?? null });
  };

  const save = async () => {
    setSaving(true);
    setError(null);
    try {
      const saved = await api.saveWorkout(w);
      router.push(`/workouts/${saved.id}`);
    } catch (e) {
      setError((e as Error).message);
      setSaving(false);
    }
  };

  const start = () => {
    stashWorkout(w);
    router.push("/play");
  };

  const valid = w.title.trim() && w.items.length > 0 && w.items.every((i) => i.name.trim());

  return (
    <div className="space-y-4">
      <div className="card space-y-3">
        <div>
          <label className="label">Title</label>
          <input className="input" value={w.title} onChange={(e) => set({ title: e.target.value })} />
        </div>
        <div className="grid grid-cols-3 gap-3">
          <div>
            <label className="label">Rounds</label>
            <input className="input" type="number" min={1} value={w.rounds}
              onChange={(e) => set({ rounds: Math.max(1, Number(e.target.value) || 1) })} />
          </div>
          <div>
            <label className="label">Rest between (s)</label>
            <input className="input" type="number" min={0} value={w.rest_seconds}
              onChange={(e) => set({ rest_seconds: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
          <div>
            <label className="label">Rest after round (s)</label>
            <input className="input" type="number" min={0} value={w.round_rest_seconds}
              onChange={(e) => set({ round_rest_seconds: Math.max(0, Number(e.target.value) || 0) })} />
          </div>
        </div>
      </div>

      <datalist id="exercise-names">
        {library.map((e) => <option key={e.id} value={e.name} />)}
      </datalist>

      <div className="space-y-2">
        {w.items.map((item, i) => (
          <div key={i} className="card space-y-2">
            <div className="flex items-center gap-2">
              <span className="w-5 shrink-0 text-center font-mono text-sm text-zinc-500">{i + 1}</span>
              <input className="input min-w-0 flex-1 font-semibold" list="exercise-names" placeholder="Exercise"
                value={item.name} onChange={(e) => onNameChange(i, e.target.value)} />
              <button className="btn-ghost shrink-0 px-2.5 text-red-400" onClick={() => set({ items: w.items.filter((_, j) => j !== i) })} aria-label="Remove">✕</button>
            </div>
            <div className="grid grid-cols-2 gap-2 pl-7">
              <div className="relative">
                <input className="input pr-12" type="number" min={0} placeholder="—" aria-label="Reps" value={item.reps ?? ""}
                  onChange={(e) => setItem(i, { reps: numOrNull(e.target.value) })} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">reps</span>
              </div>
              <div className="relative">
                <input className="input pr-12" type="number" min={0} placeholder="—" aria-label="Seconds" value={item.seconds ?? ""}
                  onChange={(e) => setItem(i, { seconds: numOrNull(e.target.value) })} />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-xs text-zinc-500">sec</span>
              </div>
            </div>
            <div className="flex items-center gap-1 pl-7">
              <input className="input mr-1 min-w-0 flex-1" placeholder="Notes (e.g. each side)" value={item.notes ?? ""}
                onChange={(e) => setItem(i, { notes: e.target.value || null })} />
              {onReroll && (
                <button className="btn-ghost shrink-0 px-2.5" title="Swap for another exercise in this category" onClick={() => onReroll(i)}>🎲</button>
              )}
              <button className="btn-ghost shrink-0 px-2.5" onClick={() => move(i, -1)} aria-label="Move up">↑</button>
              <button className="btn-ghost shrink-0 px-2.5" onClick={() => move(i, 1)} aria-label="Move down">↓</button>
            </div>
          </div>
        ))}
      </div>

      <div className="flex flex-wrap gap-2">
        <select className="input w-auto flex-1" value="" onChange={(e) => addFromLibrary(e.target.value)}>
          <option value="">+ Add from library…</option>
          {CATEGORIES.map((c) => (
            <optgroup key={c} label={CATEGORY_LABELS[c]}>
              {library.filter((e) => e.category === c).map((e) => <option key={e.id} value={e.id}>{e.name}</option>)}
            </optgroup>
          ))}
        </select>
        <button className="btn-ghost" onClick={() => set({ items: [...w.items, { name: "", seconds: 40 }] })}>+ Custom</button>
      </div>

      <div>
        <label className="label">Notes</label>
        <textarea className="input min-h-16" value={w.notes ?? ""} onChange={(e) => set({ notes: e.target.value || null })} />
      </div>

      <p className="text-xs text-zinc-500">
        Leave seconds empty for rep-based sets: you&apos;ll tap “Done” when finished. Reps + seconds = EMOM-style (do the reps, rest the remainder).
      </p>

      {error && <p className="text-sm text-red-400">{error}</p>}

      <div className="sticky bottom-0 -mx-4 flex items-center gap-2 border-t border-zinc-800 bg-background/95 px-4 py-3">
        <span className="mr-auto text-sm text-zinc-400">≈ {formatDuration(estimateSeconds(w))}</span>
        <button className="btn-ghost" disabled={!valid || saving} onClick={save}>{saving ? "Saving…" : "Save"}</button>
        <button className="btn-primary" disabled={!valid} onClick={start}>Start ▶</button>
      </div>
    </div>
  );
}
