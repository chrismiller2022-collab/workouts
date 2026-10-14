import { NextResponse } from "next/server";
import { db } from "@/lib/db";
import { fetchInstagramCaption, parseWorkoutText } from "@/lib/parse";

export const maxDuration = 60;

export async function POST(req: Request) {
  const { url, text } = (await req.json()) as { url?: string; text?: string };
  let source = text?.trim() ?? "";
  let fetchedCaption: string | null = null;

  if (!source && url) {
    fetchedCaption = await fetchInstagramCaption(url);
    source = fetchedCaption ?? "";
  }
  if (!source) {
    return NextResponse.json(
      { error: "Couldn't read the caption from that link. Paste the caption or workout text instead." },
      { status: 422 },
    );
  }

  try {
    const workout = await parseWorkoutText(source, await db().listExercises());
    return NextResponse.json({ workout: { ...workout, source_url: url || null }, fetchedCaption });
  } catch (e) {
    return NextResponse.json({ error: (e as Error).message, fetchedCaption }, { status: 500 });
  }
}
