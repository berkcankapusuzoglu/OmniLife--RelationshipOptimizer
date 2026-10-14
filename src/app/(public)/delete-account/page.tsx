import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";
import { getCurrentUser } from "@/lib/auth/guard";
import { DeleteAccountClient } from "./delete-account-client";

export const metadata: Metadata = {
  title: "Delete your account — OmniLife",
  description: "Delete your OmniLife Relationship Optimizer account and associated data, or find help if you cannot sign in.",
};

export default async function DeleteAccountPage({ searchParams }: { searchParams: Promise<{ deleted?: string }> }) {
  const user = await getCurrentUser();
  const { deleted } = await searchParams;
  const contact = z.email().safeParse(process.env.ACCOUNT_DELETION_CONTACT_EMAIL);
  const verifiedContact = process.env.ACCOUNT_DELETION_CONTACT_VERIFIED === "true" && contact.success ? contact.data : null;

  return (
    <article className="mx-auto max-w-2xl space-y-6 px-6 py-12">
      <h1 className="text-3xl font-semibold">Delete your OmniLife account</h1>
      {!user && deleted === "1" ? (
        <p role="status" className="rounded-lg border p-4">Your account and active app data have been deleted. You have been signed out.</p>
      ) : user ? (
        <section className="space-y-4 rounded-lg border p-6">
          <h2 className="text-xl font-medium">Delete the account you are signed into</h2>
          <DeleteAccountClient />
        </section>
      ) : (
        <p><Link href="/login" className="underline">Sign in</Link>, then return to this page to delete your account on the web. You can also delete it in Settings → Data.</p>
      )}
      <section className="space-y-3">
        <h2 className="text-xl font-medium">What is deleted</h2>
        <p>Your account and active app data are removed immediately after successful deletion, including logs, computed scores, check-ins, coaching conversations, profiles, constraints, recommendations, password-reset tokens, tasks you created, referrals, and associated mailing-list records.</p>
        <p>Your partner keeps their account, logs, and tasks they created. Their link to you and task assignments to you are cleared. Shared couple sync records are deleted.</p>
        <p>Stripe subscriptions and the associated Stripe customer are removed when identifiers exist. If billing cleanup fails, your app account is kept and the form gives retry instructions. Store subscriptions must be canceled in the store separately.</p>
        <p>This removes active application records. Backup copies and payment-provider records may follow separate retention processes; contact support for an applicable retention explanation.</p>
      </section>
      <section className="space-y-3 rounded-lg border p-6">
        <h2 className="text-xl font-medium">Cannot sign in?</h2>
        <p>Try <Link href="/forgot-password" className="underline">resetting your password</Link>. A manual deletion request requires verification that you own the account. Never send your password or payment details.</p>
        {verifiedContact ? (
          <p>Email the monitored deletion contact at <a className="underline" href={`mailto:${verifiedContact}?subject=OmniLife%20account%20deletion`}>{verifiedContact}</a> from your account email address. Include a request to delete your account and associated data.</p>
        ) : (
          <p role="note">Manual deletion contact pending owner verification. This fallback is not available until the OmniLife owner verifies a monitored contact address. Use the sign-in and password-reset options above in the meantime.</p>
        )}
      </section>
      <Link href="/privacy" className="block underline">Privacy policy</Link>
    </article>
  );
}
