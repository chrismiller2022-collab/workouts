import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { ExerciseSchema } from "@/lib/validate";

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  const parsed = ExerciseSchema.partial().safeParse(await req.json());
  if (!parsed.success) return NextResponse.json({ error: parsed.error.issues[0].message }, { status: 400 });
  return NextResponse.json(await db().updateExercise((await params).id, parsed.data));
}
