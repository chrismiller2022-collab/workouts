import Link from "next/link";
import { notFound } from "next/navigation";
import DeleteWorkoutButton from "@/components/DeleteWorkoutButton";
import { db } from "@/lib/db";
import { describeItem, estimateSeconds, formatDuration } from "@/lib/workout";

export const dynamic = "force-dynamic";

export default async function WorkoutPage({ params }: { params: Promise<{ id: string }> }) {
  const w = await db().getWorkout((await params).id);
  if (!w) notFound();
  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-bold">{w.title}</h1>
        <p className="text-sm text-zinc-400">
          ≈ {formatDuration(estimateSeconds(w))} · {w.rounds} {w.rounds === 1 ? "round" : "rounds"}
          {w.rest_seconds > 0 && ` · ${w.rest_seconds}s rest`}
          {w.round_rest_seconds > 0 && ` · ${w.round_rest_seconds}s between rounds`}
        </p>
        {w.source_url && (
          <a href={w.source_url} target="_blank" rel="noreferrer" className="text-sm text-orange-400 underline">Original post ↗</a>
        )}
      </div>
      <ol className="space-y-2">
        {w.items.map((it, i) => (
          <li key={i} className="card flex items-center justify-between">
            <span><span className="mr-3 font-mono text-zinc-500">{i + 1}</span><span className="font-semibold">{it.name}</span></span>
            <span className="text-sm text-zinc-400">{describeItem(it)}{it.notes ? ` · ${it.notes}` : ""}</span>
          </li>
        ))}
      </ol>
      {w.notes && <p className="whitespace-pre-wrap text-sm text-zinc-300">{w.notes}</p>}
      <div className="flex gap-2">
        <Link href={`/play?id=${w.id}`} className="btn-primary flex-1">Start ▶</Link>
        <DeleteWorkoutButton id={w.id!} />
      </div>
    </div>
  );
}
