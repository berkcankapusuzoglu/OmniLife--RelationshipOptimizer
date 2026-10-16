import { NextRequest, NextResponse } from "next/server";
import { sql } from "drizzle-orm";
import { getDb } from "@/lib/db";

export const dynamic = "force-dynamic";

// Vercel cron sends Authorization: Bearer <CRON_SECRET>. Configuration and
// deployed scheduler verification remain operator gates; this is not a public probe.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Keepalive is not configured." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    await getDb().execute(sql`select 1`);
    return NextResponse.json({ ok: true }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[keepalive] Database check failed.");
    return NextResponse.json({ error: "Database check failed." }, { status: 500 });
  }
}
