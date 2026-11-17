import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function GET(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  const imp = await db().getImport((await params).id);
  return imp ? NextResponse.json(imp) : NextResponse.json({ error: "Not found" }, { status: 404 });
}
