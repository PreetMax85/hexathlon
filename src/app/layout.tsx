import type { Metadata, Viewport } from "next";
import "./globals.css";

const DESCRIPTION =
  "Fast puzzle drills for hex-board trading games. Read the board with Pip Flash, trade smart with Port Math, and count cards with Hand Tracker. A Daily puzzle, Rush runs and friend challenges.";

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
    { media: "(prefers-color-scheme: light)", color: "#f6f5f1" },
    { media: "(prefers-color-scheme: dark)", color: "#12110f" },
  ],
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="en" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
