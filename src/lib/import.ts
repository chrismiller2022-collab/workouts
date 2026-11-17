import "server-only";
import { db, linkItemsToLibrary } from "./db";
import { parseWorkoutText } from "./parse";
import { fetchPost, type PostContent } from "./scrape";

/** The text handed to the model: caption first, then comments. */
export function postToText(post: PostContent): string {
  const parts: string[] = [];
  if (post.creator) parts.push(`Creator: ${post.creator}`);
  if (post.caption) parts.push(`Caption:\n${post.caption}`);
  if (post.comments.length) parts.push(`Comments:\n${post.comments.map((c) => `- ${c}`).join("\n")}`);
  return parts.join("\n\n");
}

/** Runs one import to completion and records the outcome on its row. Never throws. */
export async function runImport(id: string, url: string): Promise<void> {
  const store = db();
  try {
    const post = await fetchPost(url);
    if (!post || (!post.caption && post.comments.length === 0)) {
      await store.updateImport(id, {
        status: "failed",
        error: process.env.BRIGHTDATA_API_KEY
          ? "Couldn't read that post. It may be private or deleted."
          : "Instagram blocked the request. Paste the caption instead.",
      });
      return;
    }
    await store.updateImport(id, { ...post, status: "extracting" });

    const workout = await parseWorkoutText(postToText(post), await store.listExercises());
    if (workout.items.length === 0) {
      await store.updateImport(id, { status: "no_workout", error: "No workout found in the caption or comments." });
      return;
    }
    const items = await linkItemsToLibrary(workout.items);
    const saved = await store.createWorkout({ ...workout, items, source_url: url });
    await store.updateImport(id, { status: "done", workout_id: saved.id });
  } catch (e) {
    console.error("import failed", id, e);
    await store.updateImport(id, { status: "failed", error: (e as Error).message }).catch(() => {});
  }
}
