"use server";

import { requireAuth } from "@/lib/auth/guard";
import { hasFeatureAccess } from "@/lib/auth/tier-gate";
import { generateTherapistReport, type TherapistReportData } from "@/lib/export/therapist-report";

export async function generateReport(
  daysBack: number = 30
): Promise<{ error?: string; data?: TherapistReportData }> {
  const user = await requireAuth();

  const access = await hasFeatureAccess(user.id, "therapistExport");
  if (!access.allowed) {
    return {
      error: `This feature requires the ${access.requiredTier} plan. Please upgrade to export reports.`,
    };
  }

  const data = await generateTherapistReport(
    user.id,
    user.name ?? "User",
    daysBack
  );

  return { data };
}
