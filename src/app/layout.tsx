import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import { THEME_BOOT_SCRIPT } from "@/game/theme";
import "./globals.css";

/** Archivo (OFL): a workhorse grotesque with a width axis, tabular figures and a true italic. */
const archivo = localFont({
  src: [
    { path: "./fonts/archivo.woff2", style: "normal", weight: "100 900" },
    { path: "./fonts/archivo-italic.woff2", style: "italic", weight: "100 900" },
  ],
  variable: "--font-archivo",
  display: "swap",
  declarations: [{ prop: "font-stretch", value: "62% 125%" }],
});

const DESCRIPTION =
  "Fast puzzle drills for hex-board trading games. Read the board with Pip Flash, trade smart with Port Math, and count cards with Hand Tracker. A Daily run, Rush runs and friend challenges.";

const siteUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL
  ? `https://${process.env.VERCEL_PROJECT_PRODUCTION_URL}`
  : "http://localhost:3000";

export const metadata: Metadata = {
  metadataBase: new URL(siteUrl),
  title: { default: "Hexathlon: hex-board puzzle drills", template: "%s · Hexathlon" },
  description: DESCRIPTION,
  openGraph: {
    title: "Hexathlon",
    description: DESCRIPTION,
    siteName: "Hexathlon",
    type: "website",
  },
  twitter: { card: "summary_large_image", title: "Hexathlon", description: DESCRIPTION },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f3f7f7" },
    { media: "(prefers-color-scheme: dark)", color: "#11191f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className={`${archivo.variable} h-full antialiased`} suppressHydrationWarning>
      <head>
        {/* Applies a chosen day/dusk palette before first paint. */}
        <script dangerouslySetInnerHTML={{ __html: THEME_BOOT_SCRIPT }} />
      </head>
      <body className="flex min-h-dvh flex-col">{children}</body>
    </html>
  );
}
