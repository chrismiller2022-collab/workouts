import "server-only";
import { NextResponse } from "next/server";
import { createSessionToken, SESSION_COOKIE, SESSION_DAYS } from "./session";

export const CHALLENGE_COOKIE = "kb_webauthn";

const cookieBase = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/" };

export async function withSession(res: NextResponse): Promise<NextResponse> {
  res.cookies.set(SESSION_COOKIE, await createSessionToken(), { ...cookieBase, maxAge: SESSION_DAYS * 86_400 });
  return res;
}

export function setChallengeCookie(res: NextResponse, token: string) {
  res.cookies.set(CHALLENGE_COOKIE, token, { ...cookieBase, maxAge: 300 });
}

export function clearCookie(res: NextResponse, name: string) {
  res.cookies.set(name, "", { ...cookieBase, maxAge: 0 });
}

/** Passkeys are bound to the site's hostname, so derive the relying party from the request. */
export function relyingParty(req: Request) {
  const url = new URL(req.url);
  const host = req.headers.get("x-forwarded-host") ?? req.headers.get("host") ?? url.host;
  const proto = req.headers.get("x-forwarded-proto") ?? url.protocol.replace(":", "");
  return { rpID: host.split(":")[0], origin: `${proto}://${host}` };
}
