import { requireAuth } from "@/lib/auth/guard";
import { GuideClient } from "./guide-client";

export default async function GuidePage() {
  await requireAuth();
  return <GuideClient />;
}
