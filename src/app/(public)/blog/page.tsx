import type { Metadata } from "next";
import Link from "next/link";
import { getAllPosts } from "@/lib/blog/posts";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "Blog — OmniLife Relationship Optimizer",
  description:
    "Research-backed articles on relationship scoring, couples assessment, scenario modes, and the psychology behind a healthier partnership.",
  openGraph: {
    title: "Blog — OmniLife Relationship Optimizer",
    description:
      "Research-backed articles on relationship scoring, couples assessment, and the psychology behind a healthier partnership.",
    type: "website",
    url: "https://omnilife.app/blog",
  },
};

export default function BlogListPage() {
  const posts = getAllPosts();

  return (
    <div className="mx-auto max-w-5xl px-4 py-16 sm:px-6 lg:px-8">
      <header className="mb-12 text-center">
        <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">
          The OmniLife Blog
        </h1>
        <p className="mt-4 text-lg text-muted-foreground">
          Research-backed insights on relationship health, scoring science, and
          practical exercises for couples.
        </p>
      </header>

      <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
        {posts.map((post) => (
          <Link
            key={post.slug}
            href={`/blog/${post.slug}`}
            className="group flex flex-col overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-all hover:ring-foreground/20 hover:shadow-lg"
          >
            <div className="flex flex-1 flex-col p-5">
              <div className="mb-3 flex items-center gap-2 text-xs text-muted-foreground">
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

              <h2 className="mb-2 text-lg font-semibold leading-snug group-hover:text-primary transition-colors">
                {post.title}
              </h2>

              <p className="mb-4 flex-1 text-sm text-muted-foreground leading-relaxed">
                {post.description}
              </p>

              <div className="flex flex-wrap gap-1.5">
                {post.tags.slice(0, 3).map((tag) => (
                  <Badge key={tag} variant="secondary" className="text-[0.65rem]">
                    {tag}
                  </Badge>
                ))}
              </div>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
