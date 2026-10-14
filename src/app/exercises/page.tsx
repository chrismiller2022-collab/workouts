"use client";
import { useEffect, useState } from "react";
import { api } from "@/lib/client";
import { CATEGORIES, CATEGORY_LABELS, type Category, type Exercise } from "@/lib/types";

const EMPTY = { name: "", category: "swing" as Category, cues: "", demo_url: "", unilateral: false };

export default function ExercisesPage() {
  const [library, setLibrary] = useState<Exercise[]>([]);
  const [form, setForm] = useState(EMPTY);
  const [editing, setEditing] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    api.exercises().then(setLibrary).catch((e: Error) => setError(e.message));
  }, []);

  const submit = async () => {
    setError(null);
    const payload = { ...form, cues: form.cues || null, demo_url: form.demo_url || null };
    try {
      if (editing) {
        const updated = await api.updateExercise(editing, payload);
        setLibrary((l) => l.map((e) => (e.id === editing ? updated : e)));
      } else {
        const created = await api.createExercise(payload);
        setLibrary((l) => [...l, created].sort((a, b) => a.name.localeCompare(b.name)));
      }
      setForm(EMPTY);
      setEditing(null);
    } catch (e) {
      setError((e as Error).message);
    }
  };

  const edit = (e: Exercise) => {
    setEditing(e.id);
    setForm({ name: e.name, category: e.category, cues: e.cues ?? "", demo_url: e.demo_url ?? "", unilateral: e.unilateral });
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Exercise library</h1>
      <div className="card space-y-3">
        <div className="grid grid-cols-[2fr_1fr] gap-3">
          <div>
            <label className="label">Name</label>
            <input className="input" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} />
          </div>
          <div>
            <label className="label">Category</label>
            <select className="input" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value as Category })}>
              {CATEGORIES.map((c) => <option key={c} value={c}>{CATEGORY_LABELS[c]}</option>)}
            </select>
          </div>
        </div>
        <div>
          <label className="label">Form cues</label>
          <textarea className="input" value={form.cues} onChange={(e) => setForm({ ...form, cues: e.target.value })} />
        </div>
        <div>
          <label className="label">Demo URL (GIF / image / mp4)</label>
          <input className="input" placeholder="https://…" value={form.demo_url} onChange={(e) => setForm({ ...form, demo_url: e.target.value })} />
        </div>
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={form.unilateral} onChange={(e) => setForm({ ...form, unilateral: e.target.checked })} />
          One side at a time
        </label>
        {error && <p className="text-sm text-red-400">{error}</p>}
        <div className="flex gap-2">
          <button className="btn-primary" disabled={!form.name.trim()} onClick={submit}>{editing ? "Save changes" : "Add exercise"}</button>
          {editing && <button className="btn-ghost" onClick={() => { setEditing(null); setForm(EMPTY); }}>Cancel</button>}
        </div>
      </div>

      {CATEGORIES.map((c) => {
        const list = library.filter((e) => e.category === c);
        if (!list.length) return null;
        return (
          <section key={c}>
            <h2 className="mb-2 text-sm font-bold uppercase tracking-wide text-zinc-400">{CATEGORY_LABELS[c]}</h2>
            <ul className="space-y-2">
              {list.map((e) => (
                <li key={e.id} className="card cursor-pointer hover:border-orange-500" onClick={() => edit(e)}>
                  <div className="font-semibold">{e.name}{e.demo_url && " 🎬"}</div>
                  {e.cues && <p className="text-sm text-zinc-400">{e.cues}</p>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </div>
  );
}
