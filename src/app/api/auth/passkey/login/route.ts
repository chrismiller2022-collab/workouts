import { generateAuthenticationOptions, verifyAuthenticationResponse } from "@simplewebauthn/server";
import { isoBase64URL } from "@simplewebauthn/server/helpers";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { CHALLENGE_COOKIE, clearCookie, relyingParty, setChallengeCookie, withSession } from "@/lib/auth-server";
import { db } from "@/lib/db";
import { authEnabled, sign, verify } from "@/lib/session";

/** Step 1: options for the browser's passkey prompt (any passkey saved for this site). */
export async function GET(req: Request) {
  if (!authEnabled()) return NextResponse.json({ error: "Sign-in is not enabled" }, { status: 400 });
  const options = await generateAuthenticationOptions({ rpID: relyingParty(req).rpID, userVerification: "preferred" });
  const res = NextResponse.json(options);
  setChallengeCookie(res, await sign("auth", options.challenge, 300_000));
  return res;
}

/** Step 2: check the signature against the stored public key and start a session. */
export async function POST(req: Request) {
  if (!authEnabled()) return NextResponse.json({ error: "Sign-in is not enabled" }, { status: 400 });
  const { response } = await req.json();
  const challenge = await verify("auth", (await cookies()).get(CHALLENGE_COOKIE)?.value);
  if (!challenge) return NextResponse.json({ error: "Sign-in timed out. Try again." }, { status: 400 });

  const passkey = response?.id ? await db().getPasskey(response.id) : null;
  if (!passkey) return NextResponse.json({ error: "That passkey isn't registered here. Use your password." }, { status: 401 });

  const { rpID, origin } = relyingParty(req);
  try {
    const result = await verifyAuthenticationResponse({
      response,
      expectedChallenge: challenge,
      expectedOrigin: origin,
      expectedRPID: rpID,
      credential: {
        id: passkey.id,
        publicKey: isoBase64URL.toBuffer(passkey.public_key),
        counter: passkey.counter,
        transports: passkey.transports ?? undefined,
      },
    });
    if (!result.verified) throw new Error("Passkey could not be verified");
    await db().touchPasskey(passkey.id, result.authenticationInfo.newCounter);
    const res = await withSession(NextResponse.json({ ok: true }));
    clearCookie(res, CHALLENGE_COOKIE);
    return res;
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 401 });
  }
}
