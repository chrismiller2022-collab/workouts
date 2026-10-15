import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET() {
  const passkeys = await db().listPasskeys();
  return NextResponse.json(passkeys.map(({ id, name, created_at, last_used_at }) => ({ id, name, created_at, last_used_at })));
}
