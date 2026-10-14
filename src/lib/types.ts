export const CATEGORIES = [
  "swing",
  "hinge",
  "squat",
  "lunge",
  "press",
  "pull",
  "core",
  "carry",
  "full_body",
] as const;

export type Category = (typeof CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  swing: "Swings",
  hinge: "Hinge / Deadlift",
  squat: "Squat",
  lunge: "Lunge",
  press: "Press / Push",
  pull: "Row / Pull",
  core: "Core / Abs",
  carry: "Carry",
  full_body: "Full body",
};

export interface Exercise {
  id: string;
  name: string;
  category: Category;
  cues: string | null;
  demo_url: string | null;
  unilateral: boolean;
}

/** One exercise slot in a workout. Timed if `seconds` is set, otherwise rep-based. */
export interface WorkoutItem {
  name: string;
  exercise_id?: string | null;
  category?: Category | null;
  reps?: number | null;
  seconds?: number | null;
  notes?: string | null;
}

export interface Workout {
  id?: string;
  title: string;
  source_url?: string | null;
  notes?: string | null;
  rounds: number;
  /** Rest between exercises within a round. */
  rest_seconds: number;
  /** Rest after each round (replaces the last between-exercise rest). */
  round_rest_seconds: number;
  items: WorkoutItem[];
  created_at?: string;
}
