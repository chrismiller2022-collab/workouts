import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import Nav from "@/components/Nav";
import "./globals.css";

const geistSans = Geist({ variable: "--font-geist-sans", subsets: ["latin"] });
const geistMono = Geist_Mono({ variable: "--font-geist-mono", subsets: ["latin"] });

export const metadata: Metadata = {
  title: "KB Workouts",
  description: "Collect kettlebell workouts and follow along in real time.",
};

export const viewport: Viewport = { themeColor: "#0c0c0e" };

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <Nav />
        <main className="mx-auto max-w-3xl px-4 py-6">{children}</main>
      </body>
    </html>
  );
}
