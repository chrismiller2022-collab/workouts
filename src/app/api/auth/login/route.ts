import { NextResponse } from "next/server";
import { withSession } from "@/lib/auth-server";
import { passwordMatches } from "@/lib/session";

export async function POST(req: Request) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  if (!password || !(await passwordMatches(password))) {
    await new Promise((r) => setTimeout(r, 600)); // slow down guessing
    return NextResponse.json({ error: "Wrong password" }, { status: 401 });
  }
  return withSession(NextResponse.json({ ok: true }));
}
