"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV = [
  { href: "/", label: "Home" },
  { href: "/add", label: "Add" },
  { href: "/randomize", label: "Randomize" },
  { href: "/build", label: "Build" },
  { href: "/exercises", label: "Exercises" },
  { href: "/settings", label: "⚙︎" },
];

export default function Nav() {
  if (usePathname() === "/login") return null;
  return (
    <header className="sticky top-0 z-10 border-b border-zinc-800 bg-background/90 backdrop-blur">
      <nav className="mx-auto flex max-w-3xl items-center gap-1 overflow-x-auto px-4 py-3 text-sm">
        <Link href="/" className="mr-3 font-bold text-orange-500">KB</Link>
        {NAV.map((n) => (
          <Link key={n.href} href={n.href} className="rounded-md px-3 py-1.5 text-zinc-300 hover:bg-zinc-800 hover:text-white">
            {n.label}
          </Link>
        ))}
      </nav>
    </header>
  );
}
