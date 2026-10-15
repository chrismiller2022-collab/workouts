import { generateRegistrationOptions, verifyRegistrationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CHALLENGE_COOKIE, clearCookie, relyingParty, setChallengeCookie } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { sign, verify } from "@/lib/session";

// Single-user app: every passkey belongs to the same fixed user handle.
const USER_ID = new TextEncoder().encode("kb-owner");

/** Step 1: options for the browser's "create passkey" prompt. Requires being signed in (middleware). */
export async function GET(req: Request) {
  const { rpID } = relyingParty(req);
  const existing = await db().listPasskeys();
  const options = await generateRegistrationOptions({
    rpName: "KB Workouts",
    rpID,
    userID: USER_ID,
    userName: "KB Workouts",
    attestationType: "none",
    excludeCredentials: existing.map((p) => ({ id: p.id, transports: p.transports as never })),
    authenticatorSelection: { residentKey: "required", userVerification: "preferred" },
  });
  const res = NextResponse.json(options);
  setChallengeCookie(res, await sign("reg", options.challenge, 300_000));
  return res;
}

/** Step 2: verify the new passkey and store its public key. */
export async function POST(req: Request) {
  const { response, name } = await req.json();
  const challenge = await verify("reg", (await cookies()).get(CHALLENGE_COOKIE)?.value);
  if (!challenge) return NextResponse.json({ error: "Passkey setup timed out. Try again." }, { status: 400 });

  const { rpID, origin } = relyingParty(req);
  try {
    const result = await verifyRegistrationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
    });
    if (!result.verified) throw new Error("Passkey could not be verified");
    const { credential } = result.registrationInfo;
    await db().addPasskey({
      id: credential.id,
      public_key: isoBase64URL.fromBuffer(credential.publicKey),
      counter: credential.counter,
      transports: credential.transports ?? null,
      name: String(name || "Passkey").slice(0, 60),
    });
    const res = NextResponse.json({ ok: true });
    clearCookie(res, CHALLENGE_COOKIE);
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
