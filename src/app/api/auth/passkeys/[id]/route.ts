import { NextResponse } from "next/server";
import { db } from "@/lib/db";

export async function DELETE(_req: Request, { params }: { params: Promise<{ id: string }> }) {
  await db().deletePasskey(decodeURIComponent((await params).id));
  return new NextResponse(null, { status: 204 });
}
