import { NextResponse } from "next/server";
import { clearCookie } from "@/lib/auth-server";
import { SESSION_COOKIE } from "@/lib/session";

export async function POST() {
  const res = NextResponse.json({ ok: true });
  clearCookie(res, SESSION_COOKIE);
  return res;
}
