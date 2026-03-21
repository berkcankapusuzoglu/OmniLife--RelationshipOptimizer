import { getCurrentUser } from "@/lib/auth/guard";
import { getUserTier } from "@/lib/subscription/access";
import { PricingClient } from "./pricing-client";

export const metadata = {
  title: "Pricing — OmniLife",
  description: "Choose the plan that fits your relationship optimization journey",
};

export default async function PricingPage() {
  const user = await getCurrentUser();
  let currentTier: string | null = null;

  if (user) {
    currentTier = await getUserTier(user.id);
  }

  return <PricingClient currentTier={currentTier} isLoggedIn={!!user} />;
}
