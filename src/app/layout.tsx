import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Link from "next/link";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KB Workouts",
  description: "Collect kettlebell workouts and follow along in real time.",
};

export const viewport: Viewport = { themeColor: "#0c0c0e" };

const NAV = [
  { href: "/", label: "Home" },
  { href: "/add", label: "Add" },
  { href: "/randomize", label: "Randomize" },
  { href: "/build", label: "Build" },
  { href: "/exercises", label: "Exercises" },
];

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
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
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
