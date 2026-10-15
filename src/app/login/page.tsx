"use client";
import { startAuthentication } from "@simplewebauthn/browser";
import { useEffect, useState } from "react";

function nextPath() {
  const next = new URLSearchParams(window.location.search).get("next") ?? "/";
  return next.startsWith("/") && !next.startsWith("//") ? next : "/";
}

export default function LoginPage() {
  const [password, setPassword] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [passkeySupported, setPasskeySupported] = useState(false);

  useEffect(() => setPasskeySupported(typeof window !== "undefined" && "PublicKeyCredential" in window), []);

  const done = () => window.location.replace(nextPath());

  const withPassword = async (e: React.FormEvent) => {
    e.preventDefault();
    setBusy(true);
    setError(null);
    const res = await fetch("/api/auth/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (res.ok) return done();
    setError("Wrong password");
    setBusy(false);
  };

  const withPasskey = async () => {
    setBusy(true);
    setError(null);
    try {
      const optionsJSON = await fetch("/api/auth/passkey/login").then((r) => r.json());
      const response = await startAuthentication({ optionsJSON });
      const res = await fetch("/api/auth/passkey/login", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ response }),
      });
      if (res.ok) return done();
      setError(((await res.json()) as { error?: string }).error ?? "Passkey sign-in failed");
    } catch (e) {
      const err = e as Error;
      setError(err.name === "NotAllowedError" ? "Passkey sign-in was cancelled." : err.message);
    }
    setBusy(false);
  };

  return (
    <div className="mx-auto mt-10 max-w-sm space-y-6">
      <div className="text-center">
        <div className="text-4xl">🏋️</div>
        <h1 className="mt-2 text-2xl font-bold">KB Workouts</h1>
      </div>
      {passkeySupported && (
        <>
          <button className="btn-primary h-12 w-full text-base" disabled={busy} onClick={withPasskey}>
            Sign in with passkey
          </button>
          <div className="flex items-center gap-3 text-xs text-zinc-500">
            <div className="h-px flex-1 bg-zinc-800" />or<div className="h-px flex-1 bg-zinc-800" />
          </div>
        </>
      )}
      <form onSubmit={withPassword} className="space-y-3">
        <input className="input h-12 text-base" type="password" placeholder="Password" autoComplete="current-password"
          autoFocus value={password} onChange={(e) => setPassword(e.target.value)} />
        <button className={`${passkeySupported ? "btn-ghost" : "btn-primary"} h-12 w-full text-base`} disabled={busy || !password}>
          Sign in
        </button>
      </form>
      {error && <p className="text-center text-sm text-red-400">{error}</p>}
    </div>
  );
}
