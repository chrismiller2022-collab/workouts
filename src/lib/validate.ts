import { z } from "zod";
import { CATEGORIES } from "./types";

const int = (min: number) => z.coerce.number().int().min(min);

export const WorkoutItemSchema = z.object({
  name: z.string().trim().min(1),
  exercise_id: z.string().nullish(),
  category: z.enum(CATEGORIES).nullish(),
  reps: int(1).nullish(),
  seconds: int(1).nullish(),
  notes: z.string().nullish(),
});

export const WorkoutSchema = z.object({
  title: z.string().trim().min(1),
  source_url: z.string().nullish(),
  notes: z.string().nullish(),
  rounds: int(1),
  rest_seconds: int(0),
  round_rest_seconds: int(0),
  items: z.array(WorkoutItemSchema).min(1),
});

const emptyToNull = z.string().nullable().transform((v) => v || null);

const exerciseFields = {
  name: z.string().trim().min(1),
  category: z.enum(CATEGORIES),
  cues: emptyToNull,
  demo_url: emptyToNull,
  unilateral: z.boolean(),
};

export const ExerciseSchema = z.object({
  ...exerciseFields,
  cues: emptyToNull.default(null),
  demo_url: emptyToNull.default(null),
  unilateral: z.boolean().default(false),
});

/** For PATCH: only fields that are present are validated and updated. */
export const ExercisePatchSchema = z.object(exerciseFields).partial();
