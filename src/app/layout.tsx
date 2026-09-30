import type { Metadata, Viewport } from "next";
import { Inter, Plus_Jakarta_Sans } from "next/font/google";
import { headers } from "next/headers";

import "./globals.css";

import { ThemeProvider, ThemeScript } from "@/components/theme/theme-provider";
import { SITE } from "@/lib/constants";
import { publicEnv } from "@/lib/env";
import { cn } from "@/lib/utils";

/*
  Type pairing:
   - Inter        -> UI + body. Screen par sabse saaf, professional SaaS default.
   - Plus Jakarta -> headings + wordmark. Thoda rounder geometry, isliye headings
                     ko personality milti hai bina "blog/serif" feel diye.
  Dono variable fonts hain, isliye ek hi file me saare weights aa jate hain.
*/
const fontSans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const fontDisplay = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

// Browser tab / social title. Public pehchan ab "SMIU Feedback Platform" hai
// (SITE.platformLine). Internal product naam (SITE.name = ProfAura) sirf code aur
// keywords me reh gaya hai; user-facing title yeh line dikhata hai.
const siteTitle = SITE.platformLine;

export const metadata: Metadata = {
  metadataBase: new URL(publicEnv.siteUrl),
  title: {
    default: siteTitle,
    template: `%s · ${SITE.platformLine}`,
  },
  description: SITE.description,
  applicationName: SITE.platformLine,
  keywords: [
    "university reviews",
    "teacher reviews",
    "faculty ratings",
    "SMIU",
    "Sindh Madressatul Islam University",
    "student feedback",
    "ProfAura",
  ],
  authors: [{ name: SITE.name }],
  creator: SITE.name,
  // icon.svg aur apple-icon file-convention se milte hain; yahan sirf sizes
  // declare karte hain taake browser tab aur mobile shortcut dono theek lagein.
  icons: {
    icon: [{ url: "/icon.svg", type: "image/svg+xml", sizes: "any" }],
    apple: [{ url: "/apple-icon", sizes: "180x180", type: "image/png" }],
  },
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "/",
    siteName: SITE.platformLine,
    title: siteTitle,
    description: SITE.description,
  },
  twitter: {
    card: "summary_large_image",
    title: siteTitle,
    description: SITE.description,
  },
  robots: {
    index: true,
    follow: true,
  },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // Light primary hai, magar dark bhi support karte hain - browser ko dono batate hain.
  colorScheme: "light dark",
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#ffffff" },
    { media: "(prefers-color-scheme: dark)", color: "#14161d" },
  ],
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  // Middleware ne per-request nonce x-nonce header par rakha hai. Yeh read karte
  // hi layout dynamic ho jata hai, jo theek hai: har response ka nonce alag hona
  // hi chahiye. Na mile (edge case) to undefined - report-only me koi farq nahi.
  const nonce = headers().get("x-nonce") ?? undefined;

  return (
    /*
      suppressHydrationWarning sirf <html> par: ThemeScript paint se pehle
      `class="dark"` laga sakta hai, jo server markup se match nahi karega.
      Yeh expected hai, isliye React ko warn karne se rok dete hain.
    */
    <html lang="en" suppressHydrationWarning className={cn(fontSans.variable, fontDisplay.variable)}>
      <head>
        <ThemeScript nonce={nonce} />
      </head>
      <body className="min-h-dvh bg-background font-sans text-foreground antialiased">
        {/* Skip link - keyboard/screen-reader users seedha content par ja sakein */}
        <a
          href="#main-content"
          className="sr-only focus:not-sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:rounded-md focus:bg-primary focus:px-4 focus:py-2 focus:text-sm focus:font-medium focus:text-primary-foreground"
        >
          Skip to content
        </a>
        <ThemeProvider>{children}</ThemeProvider>
      </body>
    </html>
  );
}
