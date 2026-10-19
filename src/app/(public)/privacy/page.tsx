import type { Metadata } from "next";
import Link from "next/link";
import { z } from "zod";

export const metadata: Metadata = {
  title: "Privacy Policy — Couplemetric",
  description:
    "How Couplemetric collects, uses, stores, and deletes account and relationship data.",
};

export default function PrivacyPolicyPage() {
  const contact = z.email().safeParse(process.env.ACCOUNT_DELETION_CONTACT_EMAIL);
  const verifiedContact = process.env.ACCOUNT_DELETION_CONTACT_VERIFIED === "true" && contact.success ? contact.data : null;
  return (
    <article className="prose prose-invert mx-auto max-w-3xl px-6 py-12">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground text-sm">
        Last updated: October 14, 2026
      </p>

      <p>
        Couplemetric (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) operates the
        Couplemetric platform. This Privacy Policy explains
        what data we collect, why we collect it, how we store it, and what
        rights you have.
      </p>

      <h2>1. Data We Collect</h2>
      <h3>Account Information</h3>
      <p>
        When you register, we collect your <strong>email address</strong>, optional
        name, and password. We store a bcrypt hash of the password, not the password
        itself. We also store your account ID, preferences, partner invitation and
        referral information, subscription status, and password-reset records.
      </p>

      <h3>Relationship &amp; Life Data</h3>
      <p>
        When you use the app, we store the data you provide through daily logs,
        including self-reported scores across life pillars (vitality, growth,
        security, connection) and relationship dimensions (emotional closeness,
        trust, fairness, stress, autonomy). We also store computed scores,
        scenario profiles, and recommendation history. This includes mood, energy,
        journal notes, weekly reflections and goals, tasks, constraints, and exercise
        activity. These entries can contain sensitive health or personal information.
        Coaching conversations and replies are stored with your account.
      </p>
      <h3>Partner Features</h3>
      <p>
        When you link accounts, your linked partner can see your name, email address,
        and latest overall quality score. The partner dashboard also shows your
        latest life and relationship scores, emotional closeness, trust, fairness,
        stress and autonomy values, and differences between your scores. Comparison
        views also share dated life, relationship, and overall quality scores and
        all nine dimension values: vitality, growth, security, connection, emotional
        closeness, trust, fairness, stress, and autonomy. Comparison history covers
        a 7-day window, or 30 days when the viewing account has a premium entitlement.
        Insights can also show up to 90 dated life and relationship score records.
        These score-comparison views do not include your journal notes, weekly
        reflections, coaching messages, or separate mood and energy-level fields.
        Couple features include shared tasks. You can unlink on the partner page. Avoid
        entering another person&apos;s sensitive information without their permission.
      </p>

      <h3>Usage Data</h3>
      <p>
        The app generates internal events such as page views, daily-log submissions,
        and milestones, with timestamps, event properties,
        and sometimes account IDs. The current event handler logs in development
        and does not have a production analytics destination registered. Campaign
        attribution is kept in browser sessionStorage. Hosting providers may process
        request and error data, including IP addresses and requested URLs, to operate
        the service. The app does not embed advertising or third-party analytics scripts.
      </p>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>To provide and improve the relationship optimization service</li>
        <li>To compute your life, relationship, and total quality scores</li>
        <li>To generate personalized recommendations and exercises</li>
        <li>To support linked-partner comparisons and shared tasks</li>
        <li>To deliver password-reset emails and respond to support requests</li>
        <li>To authenticate your sessions</li>
        <li>To communicate important service updates</li>
      </ul>

      <h2>3. Data Storage &amp; Security</h2>
      <p>
        Application records are stored in a <strong>PostgreSQL database</strong>
        hosted on Supabase. Vercel hosts the application. The public application
        URL uses HTTPS. The server verifies signed sessions and checks account and
        record ownership before allowing protected access. Signing a session prevents
        undetected changes; it does not encrypt the session contents. No method of
        storage or transmission provides absolute security.
      </p>

      <h2>4. Cookies &amp; Local Storage</h2>
      <h3>Session Cookie</h3>
      <p>
        We set a single <strong>httpOnly session cookie</strong> when you log
        in. It contains an HMAC-SHA-256 signed, unencrypted account ID and expiry,
        uses SameSite=Lax, is marked Secure in production, and expires after{" "}
        <strong>7 days</strong>. This cookie is essential for authentication and
        cannot be disabled while using the app.
      </p>

      <h3>Local Storage</h3>
      <p>
        Browser localStorage remembers app preferences and dismissed notices, including:
      </p>
      <ul>
        <li>
          <strong>PWA install prompt dismissal</strong> &mdash; remembers if you
          dismissed the &quot;install app&quot; banner
        </li>
        <li>
          <strong>Welcome and cookie notices</strong>, daily-log mode, and
          calibration reminders
        </li>
      </ul>
      <p>Browser sessionStorage also remembers campaign attribution and a dismissed landing-page notice. These local preferences are not the account database and may remain on your device after account deletion; you can clear them in your browser or app storage settings.</p>

      <h3>No Tracking or Advertising Cookies</h3>
      <p>
        We do <strong>not</strong> use any third-party tracking cookies,
        advertising cookies, or analytics pixels. There are no cookies from
        Google Analytics, Facebook, or any other third-party service embedded in
        our pages.
      </p>

      <h2>5. Third-Party Services</h2>
      <p>These services process data for the features described below:</p>
      <ul>
        <li>
          <strong>Supabase</strong> &mdash; database hosting (your relationship
          and account records are stored here)
        </li>
        <li>
          <strong>Stripe</strong> &mdash; web subscription payments and billing
          management. Stripe receives email, account identifiers, and payment
          information through its checkout. We store customer/subscription IDs and
          entitlement status, not full card numbers. Android v1 has no purchase or
          upgrade flow; existing account entitlements can still be recognized.
        </li>
        <li>
          <strong>Vercel</strong> &mdash; application hosting, request processing,
          and operational logs
        </li>
        <li>
          <strong>Resend</strong> &mdash; password-reset email delivery when
          configured. It receives your email address and the message containing
          your reset link. Never forward a reset link to someone else.
        </li>
        <li>
          <strong>Google Gemini API</strong> &mdash; optional coaching for accounts
          with access when configured. We send your message, up to ten previous
          conversation messages, and context containing recent scores, dimension
          values, trends, constraint names, and exercise titles. Replies are stored
          in the application. If the API is unavailable or unconfigured, coaching
          uses an internal rules-based response.
        </li>
      </ul>
      <p>
        Google&apos;s processing depends on the API project&apos;s paid-service
        status. Its <a href="https://ai.google.dev/gemini-api/terms">Gemini API terms</a>{" "}
        explain paid-service abuse monitoring and unpaid-service use for product
        improvement, including possible human review. Do not enter passwords,
        payment details, or information you do not want processed by the coaching service.
        Coaching can make mistakes and is not medical advice or therapy.
      </p>
      <p>
        The Android v1 app does not include an active Google Play Billing,
        RevenueCat purchase SDK, push-notification SDK, or advertising SDK. Older
        store billing records, if any, require a separate provider support request.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain your app data while your account is active. After successful account deletion,
        we immediately remove your account and active application records, including logs,
        scores, check-ins, coaching conversations, scenarios, constraints, recommendations,
        password-reset tokens, tasks you created, referrals, and associated mailing-list records.
        Your partner retains their own account and data; your link, shared sync records, and
        assignments to you are removed. Stripe billing cleanup must finish before app deletion;
        a failure keeps your account available and gives retry instructions. App-store subscriptions
        must be canceled through the store separately. Backup copies and provider records may follow
        separate retention processes; we do not promise an unverified backup-erasure deadline.
      </p>
      <p>
        The production Supabase backup and point-in-time recovery retention has
        not yet been verified by the operator. The applicable period must be
        published here before the Play launch. Supabase retention depends on the
        project plan and backup configuration; see its{" "}
        <a href="https://supabase.com/docs/guides/platform/backups">backup documentation</a>.
        Deleting an app account does not itself erase provider backups, hosting
        logs, email delivery records, or legally retained payment records.
        Resend documents 30-day email/log retention on its Free, Pro, and Scale
        plans in its <a href="https://resend.com/security">security information</a>.
        Provider retention and any separate backups must be confirmed for this deployment.
      </p>
      <p>
        Delete your account in Settings → Data or on the{" "}
        <Link href="/delete-account">account deletion page</Link>, which also explains
        sign-in recovery and the manual-request contact verification status.
      </p>

      <h2>7. Your Rights</h2>
      <p>
        Depending on your jurisdiction (including under GDPR, CCPA, and similar
        laws), you have the right to:
      </p>
      <ul>
        <li>
          <strong>Access</strong> &mdash; request access to your personal data
        </li>
        <li>
          <strong>Rectification</strong> &mdash; correct inaccurate data
        </li>
        <li>
          <strong>Deletion</strong> &mdash; request permanent deletion of your
          account and data
        </li>
        <li>
          <strong>Portability</strong> &mdash; export your daily logs,
          scores, and weekly check-ins as JSON in Settings → Data; request other
          applicable records through the verified contact
        </li>
        <li>
          <strong>Restriction</strong> &mdash; request that we limit processing
          of your data
        </li>
        <li>
          <strong>Objection</strong> &mdash; object to certain types of
          processing
        </li>
      </ul>
      <p>
        For account deletion, use the <Link href="/delete-account">account deletion page</Link>.
        Manual deletion contact availability is shown there after the owner verifies a monitored address.
      </p>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        Couplemetric is intended for users who are <strong>18 years or older</strong>
        . We do not knowingly collect data from anyone under 18. If we learn
        that we have collected personal information from a child under 18, we
        will delete it promptly.
      </p>

      <h2>9. International Data Transfers</h2>
      <p>
        Your data may be processed in countries other than your own by the
        providers above. The operator must confirm the deployment regions and
        applicable transfer safeguards before launch. Contact the verified
        privacy contact for the applicable information.
      </p>

      <h2>10. Changes to This Policy</h2>
      <p>
        We may update this Privacy Policy from time to time. We will notify you
        of significant changes by posting a notice on the platform. Continued
        use after changes constitutes acceptance.
      </p>

      <h2>11. Contact Us</h2>
      <p>
        If you have questions about this Privacy Policy or want to exercise your
        data rights, please contact us at:
      </p>
      <p>
        See the <Link href="/delete-account">account deletion page</Link> for
        the verified contact status and sign-in recovery options. A manual deletion
        request requires verification that you own the account.
      </p>
      {verifiedContact ? (
        <p>For privacy, support, and deletion requests, email <a href={`mailto:${verifiedContact}`}>{verifiedContact}</a>. This contact has been marked as monitored by the operator.</p>
      ) : (
        <p role="note">Privacy and support contact pending owner verification. The operator must verify a monitored contact before the Play launch.</p>
      )}
    </article>
  );
}
