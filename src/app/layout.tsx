import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { TooltipProvider } from "@/components/ui/tooltip";
import { PWARegister } from "@/components/pwa-register";
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
  title: "OmniLife — Optimize Your Relationship With Science",
  description:
    "Track 9 relationship dimensions, get a science-backed score, and improve together with 37 psychology-grounded exercises. Free to start.",
  keywords:
    "relationship score, couples assessment, relationship quiz, relationship optimizer, couples app",
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
  },
  twitter: {
    card: "summary_large_image",
    title: "OmniLife — Optimize Your Relationship With Science",
    description:
      "Track 9 relationship dimensions, get a science-backed score, and improve together with 37 psychology-grounded exercises. Free to start.",
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
        <TooltipProvider>{children}</TooltipProvider>
        <PWARegister />
      </body>
    </html>
  );
}
