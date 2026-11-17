import { after, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { runImport } from "@/lib/import";
import { canonicalUrl, isInstagramUrl } from "@/lib/scrape";

export const maxDuration = 300;

export async function GET() {
  return NextResponse.json(await db().listImports(20));
}

/** Starts an import and returns straight away; the work continues after the response. */
export async function POST(req: Request) {
  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  if (!url || !isInstagramUrl(url)) {
    return NextResponse.json({ error: "That doesn't look like an Instagram link." }, { status: 400 });
  }
  const imp = await db().createImport(canonicalUrl(url));
  after(() => runImport(imp.id, imp.url));
  return NextResponse.json(imp, { status: 202 });
}
