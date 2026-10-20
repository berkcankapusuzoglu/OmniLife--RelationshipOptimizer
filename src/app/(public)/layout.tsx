import { PublicChrome } from "@/components/public-chrome";

/**
 * Shared public layout. It never reads request headers: shared layouts are not
 * re-rendered on soft navigation, so the per-route chrome decision lives in
 * the client `PublicChrome` component (D-58).
 */
export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <PublicChrome>{children}</PublicChrome>;
}
