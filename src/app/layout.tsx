import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWARegister } from "@/components/pwa-register";
import { AnalyticsProvider } from "@/components/analytics-provider";
import { ConversionTracker } from "@/components/conversion-tracker";
import { Suspense } from "react";
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: {
    default: "OmniLife — Optimize Your Relationship With Science",
    template: "%s | OmniLife",
  },
  description:
    "Track 9 relationship dimensions, get a science-backed score, and improve together with 37 psychology-grounded exercises. Free to start.",
  keywords:
    "relationship score, couples assessment, relationship quiz, relationship optimizer, couples app",
  metadataBase: new URL("https://omnilife.app"),
  manifest: "/manifest.json",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "OmniLife",
  },
  other: {
    "apple-touch-icon": "/icons/icon-192.svg",
  },
  openGraph: {
    title: "OmniLife — Optimize Your Relationship With Science",
    description:
      "Track 9 relationship dimensions, get a science-backed score, and improve together with 37 psychology-grounded exercises. Free to start.",
    type: "website",
    siteName: "OmniLife",
    locale: "en_US",
    images: [
      {
        url: "/api/og?life=78&rel=82&total=80&date=2026-03-21",
        width: 1200,
        height: 630,
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: "OmniLife — Optimize Your Relationship With Science",
    description:
      "Track 9 relationship dimensions, get a science-backed score, and improve together with 37 psychology-grounded exercises. Free to start.",
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  themeColor: "#7C3AED",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${geistSans.variable} ${geistMono.variable} dark h-full antialiased`}
    >
      <body className="min-h-full bg-background text-foreground">
        <TooltipProvider>
          <AnalyticsProvider>
            {children}
            <Suspense fallback={null}>
              <ConversionTracker />
            </Suspense>
          </AnalyticsProvider>
        </TooltipProvider>
        <PWARegister />
      </body>
    </html>
  );
}
