import { requireAuth } from "@/lib/auth/guard";
import { getUserTier } from "@/lib/subscription/access";
import { ExportClient } from "./export-client";

export default async function ExportPdfPage() {
  const user = await requireAuth();
  const userTier = await getUserTier(user.id);

  return (
    <div className="mx-auto max-w-4xl space-y-6">
      <div>
        <h1 className="text-2xl font-medium tracking-tight">
          Therapist Export
        </h1>
        <p className="text-sm text-muted-foreground">
          Generate a comprehensive report to share with your therapist or
          counselor
        </p>
      </div>
      <ExportClient
        userTier={userTier}
        userName={user.name ?? "User"}
      />
    </div>
  );
}
