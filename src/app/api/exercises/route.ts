import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ExerciseSchema } from "@/lib/validate";

export async function GET() {
  return NextResponse.json(await db().listExercises());
}

export async function POST(req: Request) {
  const parsed = ExerciseSchema.safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  try {
    return NextResponse.json(await db().createExercise(parsed.data), { status: 201 });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 400 });
  }
}
