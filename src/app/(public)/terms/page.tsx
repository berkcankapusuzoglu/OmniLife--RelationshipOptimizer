import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Terms of Service — OmniLife",
  description:
    "Terms of Service for OmniLife Relationship Optimizer. Read before using our platform.",
};

export default function TermsOfServicePage() {
  return (
    <article className="prose prose-invert mx-auto max-w-3xl px-6 py-12">
      <h1>Terms of Service</h1>
      <p className="text-muted-foreground text-sm">
        Last updated: March 21, 2026
      </p>

      <p>
        These Terms of Service (&quot;Terms&quot;) govern your use of the
        OmniLife Relationship Optimizer platform operated by OmniLife
        (&quot;we,&quot; &quot;us,&quot; &quot;our&quot;). By creating an
        account or using the service, you agree to these Terms.
      </p>

      <h2>1. Acceptance of Terms</h2>
      <p>
        By accessing or using OmniLife, you confirm that you have read,
        understood, and agree to be bound by these Terms and our{" "}
        <a href="/privacy">Privacy Policy</a>. If you do not agree, do not use
        the service.
      </p>

      <h2>2. Eligibility</h2>
      <p>
        You must be at least <strong>18 years old</strong> to use OmniLife. By
        registering, you represent that you are 18 or older and have the legal
        capacity to enter into these Terms.
      </p>

      <h2>3. Account Registration</h2>
      <p>
        You are responsible for maintaining the confidentiality of your account
        credentials. You agree to provide accurate information during
        registration and to keep it up to date. You are responsible for all
        activity that occurs under your account.
      </p>

      <h2>4. Important Disclaimer — Not Professional Advice</h2>
      <p>
        <strong>
          OmniLife is not a substitute for professional therapy, counseling, or
          medical advice.
        </strong>{" "}
        The scores, recommendations, and exercises provided by our platform are
        based on self-reported data and algorithmic models. They are intended as
        tools for self-reflection, not clinical diagnoses or treatment plans. If
        you are experiencing a mental health crisis or relationship emergency,
        please contact a qualified professional or emergency service.
      </p>

      <h2>5. Subscription &amp; Payments</h2>
      <h3>Free Tier</h3>
      <p>
        Basic features are available at no cost. We reserve the right to modify
        what is included in the free tier.
      </p>
      <h3>Paid Subscriptions</h3>
      <p>
        Premium features require a paid subscription. Payments are processed by
        Stripe. By subscribing, you authorize recurring charges at the
        applicable rate until you cancel. Prices are displayed before purchase
        and may change with 30 days&apos; notice.
      </p>
      <h3>Cancellation</h3>
      <p>
        You may cancel your subscription at any time from your account settings.
        Cancellation takes effect at the end of your current billing period. You
        will retain access to paid features until then. We do not offer prorated
        refunds for partial billing periods.
      </p>

      <h2>6. Acceptable Use</h2>
      <p>You agree not to:</p>
      <ul>
        <li>Use the service for any unlawful purpose</li>
        <li>
          Attempt to gain unauthorized access to other users&apos; accounts or
          our systems
        </li>
        <li>
          Upload malicious content or interfere with the platform&apos;s
          operation
        </li>
        <li>
          Scrape, crawl, or use automated tools to extract data from the
          platform
        </li>
        <li>
          Use the service to harass, abuse, or harm another person
        </li>
        <li>
          Resell or redistribute the service without our written consent
        </li>
      </ul>
      <p>
        We reserve the right to suspend or terminate accounts that violate these
        rules.
      </p>

      <h2>7. Intellectual Property</h2>
      <p>
        All content, design, code, algorithms, and branding on OmniLife are
        owned by us or our licensors. You may not copy, modify, distribute, or
        create derivative works from our platform without written permission.
      </p>
      <p>
        You retain ownership of the data you submit (daily logs, scores, etc.).
        By using the service, you grant us a limited license to process your
        data solely to provide the service to you.
      </p>

      <h2>8. Limitation of Liability</h2>
      <p>
        To the maximum extent permitted by law, OmniLife and its operators shall
        not be liable for any indirect, incidental, special, consequential, or
        punitive damages arising from your use of the service. Our total
        liability for any claim shall not exceed the amount you paid us in the
        12 months preceding the claim.
      </p>
      <p>
        The service is provided &quot;as is&quot; and &quot;as available&quot;
        without warranties of any kind, whether express or implied, including
        but not limited to fitness for a particular purpose, accuracy of
        recommendations, or uninterrupted availability.
      </p>

      <h2>9. Indemnification</h2>
      <p>
        You agree to indemnify and hold harmless OmniLife from any claims,
        damages, or expenses arising from your use of the service or violation
        of these Terms.
      </p>

      <h2>10. Dispute Resolution</h2>
      <p>
        We encourage you to contact us first to resolve any disputes informally.
        If a dispute cannot be resolved within 30 days, either party may pursue
        binding arbitration under the rules of the applicable arbitration
        association in the jurisdiction where OmniLife operates. You agree to
        resolve disputes on an individual basis and waive any right to
        participate in class actions.
      </p>

      <h2>11. Termination</h2>
      <p>
        We may suspend or terminate your account if you violate these Terms or
        if required by law. You may delete your account at any time. Upon
        termination, your right to use the service ceases immediately. Data
        deletion follows our <a href="/privacy">Privacy Policy</a>.
      </p>

      <h2>12. Changes to These Terms</h2>
      <p>
        We may update these Terms from time to time. We will notify you of
        material changes by posting a notice on the platform at least 14 days
        before they take effect. Continued use after changes constitutes
        acceptance of the updated Terms.
      </p>

      <h2>13. Severability</h2>
      <p>
        If any provision of these Terms is found to be unenforceable, the
        remaining provisions will continue in full force and effect.
      </p>

      <h2>14. Contact</h2>
      <p>
        Questions about these Terms? Contact us at:
      </p>
      <p>
        <strong>Email:</strong> legal@omnilife.app
      </p>
    </article>
  );
}
