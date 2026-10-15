import { NextResponse, type NextRequest } from "next/server";
import { authEnabled, isValidSession, SESSION_COOKIE } from "@/lib/session";

// Reachable without a session: the sign-in page and the endpoints it calls.
const PUBLIC = ["/login", "/api/auth/login", "/api/auth/logout", "/api/auth/passkey/login"];

/** When APP_PASSWORD is set, every page and API requires a session cookie (password or passkey). */
export async function middleware(req: NextRequest) {
  const { pathname, search } = req.nextUrl;
  if (!authEnabled()) {
    return pathname === "/login" ? NextResponse.redirect(new URL("/", req.url)) : NextResponse.next();
  }
  if (PUBLIC.includes(pathname)) return NextResponse.next();
  if (await isValidSession(req.cookies.get(SESSION_COOKIE)?.value)) return NextResponse.next();

  if (pathname.startsWith("/api/")) return NextResponse.json({ error: "Sign in required" }, { status: 401 });
  const login = new URL("/login", req.url);
  login.searchParams.set("next", pathname + search);
  return NextResponse.redirect(login);
}

export const config = { matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"] };
