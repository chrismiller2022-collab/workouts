"use client";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client";

export default function DeleteWorkoutButton({ id }: { id: string }) {
  const router = useRouter();
  return (
    <button
      className="btn-ghost text-red-400"
      onClick={async () => {
        if (!confirm("Delete this workout?")) return;
        await api.deleteWorkout(id);
        router.push("/");
        router.refresh();
      }}
    >
      Delete
    </button>
  );
}
