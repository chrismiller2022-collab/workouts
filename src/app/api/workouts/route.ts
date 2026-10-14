import { NextResponse } from "next/server";
import { db, linkItemsToLibrary } from "@/lib/db";
import { WorkoutSchema } from "@/lib/validate";

export async function GET() {
  return NextResponse.json(await db().listWorkouts());
}

export async function POST(req: Request) {
  const parsed = WorkoutSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  const items = await linkItemsToLibrary(parsed.data.items);
  return NextResponse.json(await db().createWorkout({ ...parsed.data, items }), { status: 201 });
}
