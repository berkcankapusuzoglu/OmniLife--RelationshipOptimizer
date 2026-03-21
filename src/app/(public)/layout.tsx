import Link from "next/link";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="border-b border-border/40 px-6 py-4">
        <Link
          href="/"
          className="text-lg font-semibold tracking-tight text-foreground"
        >
          OmniLife
        </Link>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-border/40 px-6 py-6 text-sm text-muted-foreground">
        <div className="mx-auto flex max-w-3xl flex-wrap gap-x-6 gap-y-2">
          <Link href="/privacy" className="hover:text-foreground transition-colors">
            Privacy Policy
          </Link>
          <Link href="/terms" className="hover:text-foreground transition-colors">
            Terms of Service
          </Link>
          <span className="ml-auto">&copy; {new Date().getFullYear()} OmniLife</span>
        </div>
      </footer>
    </div>
  );
}
