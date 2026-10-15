"use client";
import { startRegistration } from "@simplewebauthn/browser";
import { useCallback, useEffect, useState } from "react";

interface PasskeyRow {
  id: string;
  name: string;
  created_at: string;
  last_used_at: string | null;
}

function guessDeviceName() {
  const ua = navigator.userAgent;
  if (/iPhone/.test(ua)) return "iPhone";
  if (/iPad/.test(ua)) return "iPad";
  if (/Android/.test(ua)) return "Android";
  if (/Mac/.test(ua)) return "Mac";
  if (/Windows/.test(ua)) return "Windows PC";
  return "Passkey";
}

const fmt = (iso: string) => new Date(iso).toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });

export default function SettingsPage() {
  const [passkeys, setPasskeys] = useState<PasskeyRow[]>([]);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  const load = useCallback(() => {
    fetch("/api/auth/passkeys").then((r) => (r.ok ? r.json() : [])).then(setPasskeys).catch(() => {});
  }, []);
  useEffect(load, [load]);

  const addPasskey = async () => {
    setBusy(true);
    setMessage(null);
    try {
      const optionsJSON = await fetch("/api/auth/passkey/register").then((r) => r.json());
      const response = await startRegistration({ optionsJSON });
      const res = await fetch("/api/auth/passkey/register", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response, name: guessDeviceName() }),
      });
      const body = await res.json();
      if (!res.ok) throw new Error(body.error ?? "Couldn't save passkey");
      setMessage({ ok: true, text: "Passkey added. Next time, tap “Sign in with passkey”." });
      load();
    } catch (e) {
      const err = e as Error;
      const text =
        err.name === "InvalidStateError" ? "This device already has a passkey for this site."
        : err.name === "NotAllowedError" ? "Passkey setup was cancelled."
        : err.message;
      setMessage({ ok: false, text });
    }
    setBusy(false);
  };

  const remove = async (id: string) => {
    if (!confirm("Remove this passkey? You can still sign in with your password.")) return;
    await fetch(`/api/auth/passkeys/${encodeURIComponent(id)}`, { method: "DELETE" });
    load();
  };

  const signOut = async () => {
    await fetch("/api/auth/logout", { method: "POST" });
    window.location.replace("/login");
  };

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Settings</h1>

      <section className="card space-y-3">
        <div>
          <h2 className="font-semibold">Passkeys</h2>
          <p className="text-sm text-zinc-400">Sign in with Face ID, Touch ID or your phone instead of typing the password.</p>
        </div>
        {passkeys.length > 0 && (
          <ul className="divide-y divide-zinc-800">
            {passkeys.map((p) => (
              <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                <div>
                  <div className="font-medium">🔑 {p.name}</div>
                  <div className="text-xs text-zinc-500">
                    Added {fmt(p.created_at)}{p.last_used_at && ` · last used ${fmt(p.last_used_at)}`}
                  </div>
                </div>
                <button className="btn-ghost px-3 text-red-400" onClick={() => remove(p.id)}>Remove</button>
              </li>
            ))}
          </ul>
        )}
        <button className="btn-primary" disabled={busy} onClick={addPasskey}>+ Add a passkey on this device</button>
        {message && <p className={`text-sm ${message.ok ? "text-green-400" : "text-red-400"}`}>{message.text}</p>}
      </section>

      <button className="btn-ghost" onClick={signOut}>Sign out</button>
    </div>
  );
}
