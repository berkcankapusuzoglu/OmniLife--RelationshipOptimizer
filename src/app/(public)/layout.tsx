import Link from "next/link";
import {
  OrganizationJsonLd,
  WebApplicationJsonLd,
} from "@/components/seo/json-ld";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col">
      <OrganizationJsonLd />
      <WebApplicationJsonLd />
      <header className="sticky top-0 z-50 border-b bg-background/80 backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-5xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/" className="text-lg font-bold tracking-tight">
            OmniLife
          </Link>
          <nav className="flex items-center gap-6 text-sm">
            <Link
              href="/blog"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Blog
            </Link>
            <Link
              href="/login"
              className="text-muted-foreground transition-colors hover:text-foreground"
            >
              Log in
            </Link>
            <Link
              href="/register"
              className="rounded-lg bg-primary px-3 py-1.5 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90"
            >
              Sign up
            </Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t py-8">
        <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="flex flex-col items-center justify-between gap-4 sm:flex-row">
            <p className="text-sm text-muted-foreground">
              &copy; 2026 OmniLife. All rights reserved.
            </p>
            <nav className="flex gap-6 text-sm text-muted-foreground">
              <Link href="/blog" className="hover:text-foreground transition-colors">
                Blog
              </Link>
              <Link href="/login" className="hover:text-foreground transition-colors">
                Log in
              </Link>
              <Link href="/register" className="hover:text-foreground transition-colors">
                Sign up
              </Link>
            </nav>
          </div>
        </div>
      </footer>
    </div>
  );
}
