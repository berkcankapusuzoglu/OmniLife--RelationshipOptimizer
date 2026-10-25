import { Suspense } from "react";
import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { CookieConsent } from "@/components/cookie-consent";
import { CapacitorInit } from "@/components/capacitor-init";
import { BiometricLock } from "@/components/biometric-lock";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { AnalyticsSink } from "@/components/analytics-sink";
import { ConversionTracker } from "@/components/conversion-tracker";
import { ThemeScript } from "@/components/theme-script";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // No maximumScale: pinch zoom must stay available (WCAG 1.4.4).
  viewportFit: "cover",
};

export const metadata: Metadata = {
  title: "Couplemetric",
  description:
    "Your relationship, scored — a 2-minute daily check-in that turns your relationship into a score you can actually improve.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} h-full antialiased`}
      // The pre-paint script sets the theme class, so <html> differs from
      // server HTML by design.
      suppressHydrationWarning
    >
      <head>
        <ThemeScript />
      </head>
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>
          <CapacitorInit />
          {/* Funnel instrumentation. The sink forwards trackEvent() to
              /api/track; ConversionTracker reads UTM params so quiz traffic can
              be attributed, which needs a Suspense boundary for useSearchParams. */}
          <AnalyticsSink />
          <Suspense fallback={null}>
            <ConversionTracker />
          </Suspense>
          <AnalyticsProvider>{children}</AnalyticsProvider>
          <CookieConsent />
          {/* Native-only app lock; renders nothing on the web and in server HTML. */}
          <BiometricLock />
        </TooltipProvider>
      </body>
    </html>
  );
}
