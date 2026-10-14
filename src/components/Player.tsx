"use client";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Exercise, Workout, WorkoutItem } from "@/lib/types";
import { buildTimeline, describeItem, formatClock, type Segment } from "@/lib/workout";

// ---- audio cues ---------------------------------------------------------
let audioCtx: AudioContext | null = null;
function beep(freq = 880, ms = 120) {
  try {
    audioCtx ??= new AudioContext();
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    osc.frequency.value = freq;
    gain.gain.setValueAtTime(0.25, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + ms / 1000);
    osc.connect(gain).connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + ms / 1000);
  } catch {
    /* audio unavailable */
  }
}
function say(text: string) {
  if (typeof window === "undefined" || !("speechSynthesis" in window)) return;
  window.speechSynthesis.cancel();
  window.speechSynthesis.speak(new SpeechSynthesisUtterance(text));
}

function announce(seg: Segment) {
  if (seg.kind === "ready") say(`Get ready. First up: ${seg.next.name}`);
  else if (seg.kind === "rest") say(`Rest. Next: ${seg.next.name}`);
  else {
    const amount = seg.item.reps ? `${seg.item.reps} reps` : seg.seconds ? `${seg.seconds} seconds` : "";
    say(`${seg.item.name}. ${amount}`);
  }
}

// ---- component ----------------------------------------------------------
export default function Player({ workout, library }: { workout: Workout; library: Exercise[] }) {
  const timeline = useMemo(() => buildTimeline(workout), [workout]);
  const [idx, setIdx] = useState(0);
  const [running, setRunning] = useState(false);
  const [remaining, setRemaining] = useState<number>(timeline[0]?.kind === "work" ? 0 : (timeline[0]?.seconds ?? 0));
  const [elapsed, setElapsed] = useState(0); // for untimed rep sets
  const [muted, setMuted] = useState(false);
  const endAt = useRef<number | null>(null);
  const startedAt = useRef<number | null>(null);
  const lastWholeSecond = useRef<number | null>(null);
  const announced = useRef<number>(-1);

  const seg = timeline[idx] as Segment | undefined;
  const done = idx >= timeline.length;
  const segSeconds = seg ? (seg.kind === "work" ? seg.seconds : seg.seconds) : null;

  const exerciseFor = useCallback(
    (item: WorkoutItem) =>
      library.find((e) => e.id === item.exercise_id) ??
      library.find((e) => e.name.toLowerCase() === item.name.toLowerCase()),
    [library],
  );

  const goTo = useCallback(
    (next: number) => {
      endAt.current = null;
      startedAt.current = null;
      lastWholeSecond.current = null;
      setElapsed(0);
      setIdx(next);
      const s = timeline[next];
      setRemaining(s && !(s.kind === "work" && s.seconds === null) ? (s.seconds ?? 0) : 0);
    },
    [timeline],
  );

  // Announce each segment once when it starts running.
  useEffect(() => {
    if (!running || !seg || announced.current === idx) return;
    announced.current = idx;
    if (!muted) announce(seg);
  }, [running, seg, idx, muted]);

  // Timer loop based on wall-clock timestamps so it stays accurate when the tab is throttled.
  useEffect(() => {
    if (!running || !seg) return;
    const timed = segSeconds !== null;
    if (timed && endAt.current === null) endAt.current = Date.now() + remaining * 1000;
    if (!timed && startedAt.current === null) startedAt.current = Date.now() - elapsed * 1000;

    const id = setInterval(() => {
      if (!timed) {
        setElapsed((Date.now() - (startedAt.current ?? Date.now())) / 1000);
        return;
      }
      const left = ((endAt.current ?? Date.now()) - Date.now()) / 1000;
      const whole = Math.ceil(left);
      if (whole !== lastWholeSecond.current) {
        lastWholeSecond.current = whole;
        if (!muted && whole <= 3 && whole >= 1) beep(660, 100);
      }
      if (left <= 0) {
        if (!muted) beep(1000, 300);
        goTo(idx + 1);
        return;
      }
      setRemaining(left);
    }, 100);
    return () => clearInterval(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [running, idx]);

  // Keep the screen awake while working out.
  useEffect(() => {
    if (!running || !("wakeLock" in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    navigator.wakeLock.request("screen").then((l) => (lock = l)).catch(() => {});
    return () => {
      lock?.release().catch(() => {});
    };
  }, [running]);

  useEffect(() => {
    if (done) {
      setRunning(false);
      if (!muted) say("Workout complete. Nice work!");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [done]);

  const togglePlay = () => {
    if (running) {
      // pause: freeze remaining time
      if (endAt.current !== null) setRemaining(Math.max(0, (endAt.current - Date.now()) / 1000));
      endAt.current = null;
      startedAt.current = null;
      setRunning(false);
    } else {
      beep(0, 1); // unlock audio on iOS with a user gesture
      setRunning(true);
    }
  };

  const workIndices = timeline.flatMap((s, i) => (s.kind === "work" ? [i] : []));
  const workDone = workIndices.filter((i) => i < idx).length;

  if (done) {
    return (
      <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 text-center">
        <div className="text-6xl">🏆</div>
        <h1 className="text-3xl font-bold">Done!</h1>
        <p className="text-zinc-400">{workout.title}</p>
        <div className="flex gap-2">
          <button className="btn-ghost" onClick={() => { announced.current = -1; goTo(0); }}>Again</button>
          <Link href="/" className="btn-primary">Home</Link>
        </div>
      </div>
    );
  }
  if (!seg) return null;

  const isWork = seg.kind === "work";
  const item = isWork ? seg.item : seg.next;
  const ex = exerciseFor(item);
  const untimed = isWork && seg.seconds === null;
  const total = segSeconds ?? 0;
  const pct = untimed || total === 0 ? 0 : 100 - (remaining / total) * 100;
  const upcoming = timeline.slice(idx + 1).find((s): s is Extract<Segment, { kind: "work" }> => s.kind === "work");

  return (
    <div className="space-y-5">
      <div className="flex items-center justify-between text-sm text-zinc-400">
        <span>{workout.title}</span>
        <span>
          {isWork && `Round ${seg.round}/${workout.rounds} · `}
          {workDone}/{workIndices.length}
        </span>
      </div>
      <div className="h-1.5 overflow-hidden rounded-full bg-zinc-800">
        <div className="h-full bg-orange-500 transition-all" style={{ width: `${(idx / timeline.length) * 100}%` }} />
      </div>

      <div className={`rounded-2xl border p-6 text-center ${isWork ? "border-orange-500/60 bg-orange-500/10" : "border-sky-500/50 bg-sky-500/10"}`}>
        <div className={`text-sm font-bold uppercase tracking-widest ${isWork ? "text-orange-400" : "text-sky-400"}`}>
          {seg.kind === "ready" ? "Get ready" : seg.kind === "rest" ? (seg.afterRound ? "Round rest" : "Rest") : "Work"}
        </div>
        <div className="my-2 font-mono text-7xl font-bold tabular-nums sm:text-8xl">
          {untimed ? formatClock(elapsed) : formatClock(remaining)}
        </div>
        <div className="text-2xl font-bold">{isWork ? item.name : `Next: ${item.name}`}</div>
        <div className="mt-1 text-zinc-300">{describeItem(item)}{item.notes ? ` · ${item.notes}` : ""}</div>
        {!untimed && (
          <div className="mx-auto mt-4 h-2 max-w-sm overflow-hidden rounded-full bg-zinc-800">
            <div className={`h-full ${isWork ? "bg-orange-500" : "bg-sky-500"}`} style={{ width: `${pct}%` }} />
          </div>
        )}
      </div>

      <DemoPanel exercise={ex} />

      <div className="flex items-center justify-center gap-3">
        <button className="btn-ghost h-12 w-12" onClick={() => goTo(Math.max(0, idx - 1))} aria-label="Previous">⏮</button>
        {untimed && running ? (
          <button className="btn-primary h-14 px-8 text-lg" onClick={() => { if (!muted) beep(1000, 200); goTo(idx + 1); }}>Done ✓</button>
        ) : (
          <button className="btn-primary h-14 w-28 text-lg" onClick={togglePlay}>{running ? "Pause" : idx === 0 ? "Start" : "Resume"}</button>
        )}
        <button className="btn-ghost h-12 w-12" onClick={() => goTo(idx + 1)} aria-label="Skip">⏭</button>
        <button className="btn-ghost h-12 w-12" onClick={() => setMuted((m) => !m)} aria-label="Mute">{muted ? "🔇" : "🔊"}</button>
      </div>

      {upcoming && isWork && (
        <p className="text-center text-sm text-zinc-500">Then: {upcoming.item.name}</p>
      )}
    </div>
  );
}

function DemoPanel({ exercise }: { exercise?: Exercise }) {
  if (!exercise) return null;
  const url = exercise.demo_url;
  const isVideo = url && /\.(mp4|webm|mov)(\?|$)/i.test(url);
  return (
    <div className="card flex gap-4">
      <div className="flex h-28 w-28 shrink-0 items-center justify-center overflow-hidden rounded-lg bg-zinc-800 text-4xl">
        {url ? (
          isVideo ? (
            <video src={url} autoPlay loop muted playsInline className="h-full w-full object-cover" />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={url} alt={exercise.name} className="h-full w-full object-cover" />
          )
        ) : (
          "🏋️"
        )}
      </div>
      <div className="text-sm">
        <div className="font-semibold">{exercise.name}</div>
        <p className="mt-1 text-zinc-400">{exercise.cues ?? "No form cues yet. Add some on the Exercises page."}</p>
      </div>
    </div>
  );
}
