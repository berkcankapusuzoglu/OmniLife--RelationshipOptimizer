import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — OmniLife",
  description:
    "How OmniLife collects, uses, and protects your personal data. GDPR-friendly privacy policy for our relationship optimization platform.",
};

export default function PrivacyPolicyPage() {
  return (
    <article className="prose prose-invert mx-auto max-w-3xl px-6 py-12">
      <h1>Privacy Policy</h1>
      <p className="text-muted-foreground text-sm">
        Last updated: March 21, 2026
      </p>

      <p>
        OmniLife (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;) operates the
        OmniLife Relationship Optimizer platform. This Privacy Policy explains
        what data we collect, why we collect it, how we store it, and what
        rights you have.
      </p>

      <h2>1. Data We Collect</h2>
      <h3>Account Information</h3>
      <p>
        When you register, we collect your <strong>email address</strong> and a
        hashed version of your password. We never store passwords in plain text.
      </p>

      <h3>Relationship &amp; Life Data</h3>
      <p>
        When you use the app, we store the data you provide through daily logs,
        including self-reported scores across life pillars (vitality, growth,
        security, connection) and relationship dimensions (emotional closeness,
        trust, fairness, stress, autonomy). We also store computed scores,
        scenario profiles, and recommendation history.
      </p>

      <h3>Usage Data</h3>
      <p>
        We collect basic server-side request data (timestamps, pages visited) to
        maintain the service. We do <strong>not</strong> use third-party
        analytics or tracking scripts.
      </p>

      <h2>2. How We Use Your Data</h2>
      <ul>
        <li>To provide and improve the relationship optimization service</li>
        <li>To compute your life, relationship, and total quality scores</li>
        <li>To generate personalized recommendations and exercises</li>
        <li>To authenticate your sessions</li>
        <li>To communicate important service updates</li>
      </ul>

      <h2>3. Data Storage &amp; Security</h2>
      <p>
        Your data is stored in a <strong>PostgreSQL database</strong> hosted on
        Supabase with encryption at rest and in transit. We use secure,
        server-side session management. All connections use TLS.
      </p>

      <h2>4. Cookies &amp; Local Storage</h2>
      <h3>Session Cookie</h3>
      <p>
        We set a single <strong>httpOnly session cookie</strong> when you log
        in. It contains an encrypted session token and expires after{" "}
        <strong>7 days</strong>. This cookie is essential for authentication and
        cannot be disabled while using the app.
      </p>

      <h3>Local Storage</h3>
      <p>
        We use browser localStorage for two non-essential preferences:
      </p>
      <ul>
        <li>
          <strong>PWA install prompt dismissal</strong> &mdash; remembers if you
          dismissed the &quot;install app&quot; banner
        </li>
        <li>
          <strong>Milestone dismissal</strong> &mdash; remembers if you
          dismissed a milestone notification
        </li>
      </ul>

      <h3>No Tracking or Advertising Cookies</h3>
      <p>
        We do <strong>not</strong> use any third-party tracking cookies,
        advertising cookies, or analytics pixels. There are no cookies from
        Google Analytics, Facebook, or any other third-party service embedded in
        our pages.
      </p>

      <h2>5. Third-Party Services</h2>
      <p>We share data with the following third parties only as needed:</p>
      <ul>
        <li>
          <strong>Supabase</strong> &mdash; database hosting (your relationship
          data is stored here)
        </li>
        <li>
          <strong>Stripe</strong> &mdash; payment processing for subscriptions.
          Stripe receives your payment details directly; we never see or store
          your full card number.
        </li>
        <li>
          <strong>Vercel</strong> &mdash; application hosting
        </li>
      </ul>
      <p>
        We do not sell, rent, or trade your personal data to any third party.
      </p>

      <h2>6. Data Retention</h2>
      <p>
        We retain your data for as long as your account is active. If you delete
        your account, we will permanently delete all your personal data,
        including daily logs, scores, and relationship profiles, within{" "}
        <strong>30 days</strong>. Anonymized, aggregated data that cannot be
        linked back to you may be retained for service improvement.
      </p>

      <h2>7. Your Rights</h2>
      <p>
        Depending on your jurisdiction (including under GDPR, CCPA, and similar
        laws), you have the right to:
      </p>
      <ul>
        <li>
          <strong>Access</strong> &mdash; request a copy of all data we hold
          about you
        </li>
        <li>
          <strong>Rectification</strong> &mdash; correct inaccurate data
        </li>
        <li>
          <strong>Deletion</strong> &mdash; request permanent deletion of your
          account and data
        </li>
        <li>
          <strong>Portability</strong> &mdash; receive your data in a
          machine-readable format (JSON)
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
        To exercise any of these rights, contact us at the address below. We
        will respond within 30 days.
      </p>

      <h2>8. Children&apos;s Privacy</h2>
      <p>
        OmniLife is intended for users who are <strong>18 years or older</strong>
        . We do not knowingly collect data from anyone under 18. If we learn
        that we have collected personal information from a child under 18, we
        will delete it promptly.
      </p>

      <h2>9. International Data Transfers</h2>
      <p>
        Your data may be processed in countries other than your own. We ensure
        appropriate safeguards are in place, including standard contractual
        clauses where required.
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
        <strong>Email:</strong> privacy@omnilife.app
      </p>
    </article>
  );
}
