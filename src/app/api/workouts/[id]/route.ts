import { NextResponse } from "next/server";
import { db } from "@/lib/db";

type Ctx = { params: Promise<{ id: string }> };

export async function GET(_req: Request, { params }: Ctx) {
  const w = await db().getWorkout((await params).id);
  return w ? NextResponse.json(w) : NextResponse.json({ error: "Not found" }, { status: 404 });
}

export async function DELETE(_req: Request, { params }: Ctx) {
  await db().deleteWorkout((await params).id);
  return new NextResponse(null, { status: 204 });
}
