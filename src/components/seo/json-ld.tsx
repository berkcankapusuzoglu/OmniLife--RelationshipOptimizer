export function OrganizationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "Organization",
    name: "OmniLife",
    url: "https://omnilife.app",
    description:
      "Multi-objective life and relationship optimization through psychology, philosophy, and mathematics.",
    foundingDate: "2026",
    sameAs: [],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function WebApplicationJsonLd() {
  const data = {
    "@context": "https://schema.org",
    "@type": "WebApplication",
    name: "OmniLife Relationship Optimizer",
    url: "https://omnilife.app",
    description:
      "A relationship optimizer that uses weighted scoring across 9 dimensions, scenario modes, and evidence-based exercises to help couples build stronger partnerships.",
    applicationCategory: "HealthApplication",
    operatingSystem: "Web",
    offers: {
      "@type": "Offer",
      price: "0",
      priceCurrency: "USD",
      description: "Free tier with core features",
    },
    featureList: [
      "Daily relationship scoring across 9 dimensions",
      "Personalized exercise recommendations",
      "Scenario modes for life challenges",
      "Weekly trend analysis",
      "Partner comparison dashboard",
    ],
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}

export function FAQJsonLd({
  faqs,
}: {
  faqs: { question: string; answer: string }[];
}) {
  const data = {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: faqs.map((faq) => ({
      "@type": "Question",
      name: faq.question,
      acceptedAnswer: {
        "@type": "Answer",
        text: faq.answer,
      },
    })),
  };

  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data) }}
    />
  );
}
