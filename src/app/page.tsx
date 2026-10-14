import Link from "next/link";
import { db, usingDatabase } from "@/lib/db";
import { estimateSeconds, formatDuration } from "@/lib/workout";

export const dynamic = "force-dynamic";

export default async function Home() {
  const workouts = await db().listWorkouts();
  return (
    <div className="space-y-6">
      <section className="grid grid-cols-3 gap-3">
        <Link href="/randomize" className="card text-center hover:border-orange-500">
          <div className="text-2xl">🎲</div>
          <div className="mt-1 text-sm font-semibold">Randomize</div>
        </Link>
        <Link href="/add" className="card text-center hover:border-orange-500">
          <div className="text-2xl">📥</div>
          <div className="mt-1 text-sm font-semibold">Add from Insta</div>
        </Link>
        <Link href="/build" className="card text-center hover:border-orange-500">
          <div className="text-2xl">🛠️</div>
          <div className="mt-1 text-sm font-semibold">Build</div>
        </Link>
      </section>

      {!usingDatabase() && (
        <p className="rounded-lg border border-yellow-700 bg-yellow-950/40 p-3 text-sm text-yellow-200">
          Running without a database: saved workouts are kept in memory and will disappear on restart. See the README to connect a database.
        </p>
      )}

      <section>
        <h2 className="mb-3 text-lg font-bold">Saved workouts</h2>
        {workouts.length === 0 ? (
          <p className="text-sm text-zinc-400">Nothing saved yet. Add one from Instagram or randomize a workout.</p>
        ) : (
          <ul className="space-y-2">
            {workouts.map((w) => (
              <li key={w.id}>
                <Link href={`/workouts/${w.id}`} className="card flex items-center justify-between hover:border-orange-500">
                  <div>
                    <div className="font-semibold">{w.title}</div>
                    <div className="text-xs text-zinc-400">
                      {w.items.length} exercises · {w.rounds} {w.rounds === 1 ? "round" : "rounds"}
                      {w.source_url && " · from Instagram"}
                    </div>
                  </div>
                  <span className="text-sm text-zinc-400">{formatDuration(estimateSeconds(w))}</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
