import "server-only";
import Anthropic from "@anthropic-ai/sdk";
import { zodOutputFormat } from "@anthropic-ai/sdk/helpers/zod";
import { z } from "zod";
import { CATEGORIES, type Exercise, type Workout } from "./types";

const ParsedWorkout = z.object({
  title: z.string().describe("Short descriptive title, e.g. 'Swing + Goblet Squat Ladder'"),
  rounds: z.number().int().describe("How many times the full circuit is repeated. 1 if not stated."),
  rest_seconds: z.number().int().describe("Rest between exercises in seconds. 0 if not stated."),
  round_rest_seconds: z.number().int().describe("Rest between rounds in seconds. 0 if not stated."),
  notes: z.string().nullable().describe("Anything useful that doesn't fit elsewhere: bell weight, tempo, format like EMOM/AMRAP."),
  items: z.array(
    z.object({
      name: z.string().describe("Exercise name. Reuse the exact library name when it is the same movement."),
      category: z.enum(CATEGORIES),
      reps: z.number().int().nullable().describe("Reps per set (per side if unilateral). Null if timed only."),
      seconds: z.number().int().nullable().describe("Work interval in seconds, or the EMOM window. Null if rep-based only."),
      notes: z.string().nullable().describe("e.g. 'each side', 'alternate arms', 'heavy'"),
    }),
  ),
});

const SYSTEM = `You turn workout posts (Instagram captions, the creator's comments, transcripts, notes) into structured workouts.
Most posts are kettlebell routines, but handle any equipment or bodyweight.
- Extract every exercise in order. Expand shorthand ("KB", "DL", "OH press", "TGU").
- The workout may be in the caption or in a comment (creators often post it as the first comment). Ignore hashtags, promotion and chatter.
- Mention the equipment in notes when it is not a kettlebell.
- If the post is an EMOM, set each item's seconds to 60 (or the stated window) and keep its reps.
- If the post is "40/20" style intervals, set seconds to the work time and rest_seconds to the rest time.
- If something is unstated, use the defaults described in the schema; do not invent numbers.
- If the text contains no workout at all, return an empty items list.`;

let client: Anthropic | null = null;

export async function parseWorkoutText(text: string, library: Exercise[]): Promise<Workout> {
  if (!process.env.ANTHROPIC_API_KEY) {
    throw new Error("ANTHROPIC_API_KEY is not set, so AI parsing is unavailable. Add the workout manually instead.");
  }
  client ??= new Anthropic();
  const names = library.map((e) => `${e.name} (${e.category})`).join(", ");

  // Haiku is plenty for pulling sets/reps out of a caption, at a fraction of the cost.
  const response = await client.messages.parse({
    model: "claude-haiku-5-5",
    max_tokens: 16000,
    thinking: { type: "adaptive" },
    output_config: { effort: "low", format: zodOutputFormat(ParsedWorkout) },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `Exercise library: ${names}\n\n<post>\n${text}\n</post>`,
      },
    ],
  });

  if (response.stop_reason === "refusal") throw new Error("The model declined to parse this text.");
  const parsed = response.parsed_output;
  if (!parsed) throw new Error("Couldn't read a workout from that text.");
  return {
    ...parsed,
    rounds: Math.max(1, parsed.rounds),
    rest_seconds: Math.max(0, parsed.rest_seconds),
    round_rest_seconds: Math.max(0, parsed.round_rest_seconds),
  };
}
