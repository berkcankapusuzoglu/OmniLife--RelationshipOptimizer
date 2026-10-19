import { NextRequest, NextResponse } from "next/server";
import { runReminders } from "@/lib/push/reminders";

export const dynamic = "force-dynamic";

// Hourly scheduler (GitHub Actions, .github/workflows/push-reminders.yml) sends
// Authorization: Bearer <CRON_SECRET>. Guarded exactly like /api/keepalive.
export async function GET(req: NextRequest): Promise<NextResponse> {
  const cronSecret = process.env.CRON_SECRET;
  if (!cronSecret) {
    return NextResponse.json({ error: "Reminders are not configured." }, { status: 503 });
  }
  if (req.headers.get("authorization") !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const { daily, trial } = await runReminders();
    return NextResponse.json({ ok: true, daily, trial }, { headers: { "Cache-Control": "no-store" } });
  } catch {
    console.error("[push-reminders] Reminder job failed.");
    return NextResponse.json({ error: "Reminder job failed." }, { status: 500 });
  }
}
