import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { parseWorkoutText } from "@/lib/parse";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { url, text } = (await req.json()) as { url?: string; text?: string };
  const source = text?.trim() ?? "";
  if (!source) return NextResponse.json({ error: "Paste the caption or workout text." }, { status: 422 });

  try {
    const workout = await parseWorkoutText(source, await db().listExercises());
    return NextResponse.json({ workout: { ...workout, source_url: url || null } });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message }, { status: 500 });
  }
}
