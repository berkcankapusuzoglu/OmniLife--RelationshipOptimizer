import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getAllSlugs, getPostBySlug } from "@/lib/blog/posts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { NewsletterSignup } from "@/components/newsletter-signup";

interface Props {
  params: Promise<{ slug: string }>;
}

export async function generateStaticParams() {
  return getAllSlugs().map((slug) => ({ slug }));
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) return {};

  return {
    title: `${post.title} — OmniLife Blog`,
    description: post.description,
    openGraph: {
      title: post.title,
      description: post.description,
      type: "article",
      publishedTime: post.date,
      authors: [post.author],
      url: `https://omnilife.app/blog/${post.slug}`,
    },
    twitter: {
      card: "summary_large_image",
      title: post.title,
      description: post.description,
    },
  };
}

export default async function BlogPostPage({ params }: Props) {
  const { slug } = await params;
  const post = getPostBySlug(slug);
  if (!post) notFound();

  const jsonLd = {
    "@context": "https://schema.org",
    "@type": "Article",
    headline: post.title,
    description: post.description,
    datePublished: post.date,
    author: {
      "@type": "Organization",
      name: post.author,
    },
    publisher: {
      "@type": "Organization",
      name: "OmniLife",
      url: "https://omnilife.app",
    },
    mainEntityOfPage: {
      "@type": "WebPage",
      "@id": `https://omnilife.app/blog/${post.slug}`,
    },
    keywords: post.tags.join(", "),
  };

  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <article className="mx-auto max-w-3xl px-4 py-16 sm:px-6 lg:px-8">
        {/* Header */}
        <header className="mb-10">
          <div className="mb-4 flex items-center gap-2 text-sm text-muted-foreground">
            <time dateTime={post.date}>
              {new Date(post.date).toLocaleDateString("en-US", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </time>
            <span aria-hidden="true">&middot;</span>
            <span>{post.readingTime}</span>
          </div>

          <h1 className="text-3xl font-bold tracking-tight sm:text-4xl lg:text-5xl">
            {post.title}
          </h1>

          <p className="mt-4 text-lg text-muted-foreground leading-relaxed">
            {post.description}
          </p>

          <div className="mt-5 flex items-center gap-3">
            <span className="text-sm font-medium">{post.author}</span>
            <div className="flex gap-1.5">
              {post.tags.map((tag) => (
                <Badge key={tag} variant="secondary" className="text-xs">
                  {tag}
                </Badge>
              ))}
            </div>
          </div>
        </header>

        {/* Article body */}
        <div
          className="blog-prose max-w-none text-base sm:text-lg"
          dangerouslySetInnerHTML={{ __html: post.content }}
        />

        {/* Newsletter CTA */}
        <div className="my-12 rounded-xl border border-violet-500/20 bg-gradient-to-r from-violet-500/5 to-purple-500/5 p-6">
          <NewsletterSignup
            source="blog"
            heading="Get weekly relationship insights — free"
            description="Science-backed tips delivered every Tuesday. No spam, unsubscribe anytime."
          />
        </div>

        {/* CTA */}
        <div className="mt-16 rounded-xl bg-card p-8 text-center ring-1 ring-foreground/10">
          <h2 className="text-2xl font-bold">
            Ready to see your relationship score?
          </h2>
          <p className="mt-2 text-muted-foreground">
            Take the free quiz in under 5 minutes and get personalized
            recommendations backed by research.
          </p>
          <div className="mt-6 flex justify-center gap-3">
            <Button size="lg" render={<Link href="/quiz" />}>
              Take the Free Quiz
            </Button>
            <Button variant="outline" size="lg" render={<Link href="/register" />}>
              Create Account
            </Button>
          </div>
        </div>

        {/* Back link */}
        <div className="mt-10">
          <Link
            href="/blog"
            className="text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            &larr; Back to all articles
          </Link>
        </div>
      </article>
    </>
  );
}
