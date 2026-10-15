"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { getCurrentUser } from "@/lib/auth/guard";
import { inviteInput } from "@/lib/auth/action-inputs";
import { claimPartnerInvite } from "@/lib/auth/authorization";

export async function acceptPartnerInvite(formData: FormData): Promise<void> {
  const parsed = inviteInput.safeParse(formData.get("code"));
  const path = parsed.success ? `/invite/${parsed.data}` : "/invite/invalid";
  let user;
  try {
    user = await getCurrentUser();
  } catch {
    redirect(`${path}?error=unavailable`);
  }
  if (!user) redirect(parsed.success ? `/login?invite=${parsed.data}` : "/login");
  if (!parsed.success || user.partnerId) redirect(`${path}?error=unavailable`);
  if (formData.get("confirm") !== "yes") redirect(`${path}?error=confirmation`);

  let linked = false;
  try {
    linked = await claimPartnerInvite(user.id, parsed.data);
  } catch {
    // Return the same safe error without disclosing database details.
  }
  if (!linked) redirect(`${path}?error=unavailable`);
  revalidatePath("/", "layout");
  redirect("/overview?linked=true");
}
