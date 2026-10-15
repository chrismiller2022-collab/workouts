/**
 * Signed-cookie sessions. Uses Web Crypto only, so it runs in middleware (Edge) and route handlers.
 * Signing key: SESSION_SECRET if set, otherwise APP_PASSWORD (changing it signs everyone out).
 */
export const SESSION_COOKIE = "kb_session";
export const SESSION_DAYS = 180;

const enc = new TextEncoder();

export const authEnabled = () => Boolean(process.env.APP_PASSWORD);
const secret = () => process.env.SESSION_SECRET || process.env.APP_PASSWORD || "";

function toBase64Url(bytes: ArrayBuffer): string {
  let s = "";
  for (const b of new Uint8Array(bytes)) s += String.fromCharCode(b);
  return btoa(s).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

async function hmac(data: string): Promise<string> {
  const key = await crypto.subtle.importKey("raw", enc.encode(secret()), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  return toBase64Url(await crypto.subtle.sign("HMAC", key, enc.encode(data)));
}

function safeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

/** Signs `value` for one purpose with an expiry: "value.exp.sig". `value` must not contain dots. */
export async function sign(purpose: string, value: string, ttlMs: number): Promise<string> {
  const exp = Date.now() + ttlMs;
  return `${value}.${exp}.${await hmac(`${purpose}:${value}:${exp}`)}`;
}

/** Returns the signed value if the token is authentic and unexpired, else null. */
export async function verify(purpose: string, token: string | undefined): Promise<string | null> {
  const [value, exp, sig] = token?.split(".") ?? [];
  if (!value || !exp || !sig || Number(exp) < Date.now()) return null;
  return safeEqual(sig, await hmac(`${purpose}:${value}:${exp}`)) ? value : null;
}

export const createSessionToken = () => sign("session", "me", SESSION_DAYS * 86_400_000);
export const isValidSession = async (token: string | undefined) => (await verify("session", token)) === "me";

export async function passwordMatches(input: string): Promise<boolean> {
  const expected = process.env.APP_PASSWORD;
  if (!expected) return false;
  // Compare MACs so the comparison time doesn't depend on the password.
  return safeEqual(await hmac(`pw:${input}`), await hmac(`pw:${expected}`));
}
