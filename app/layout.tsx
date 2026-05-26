import type { Metadata } from "next";
import { Inter, Space_Grotesk } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap"
});

const space = Space_Grotesk({
  subsets: ["latin"],
  variable: "--font-space",
  display: "swap"
});

export const metadata: Metadata = {
  metadataBase: new URL(process.env.NEXT_PUBLIC_SITE_URL || "https://prodbrogy.com"),
  title: {
    default: "Prodbrogy Sound Supply",
    template: "%s | Prodbrogy"
  },
  description: "Download MIDI, loops, phrases, one shots, and starter ideas from the Prodbrogy sound vault.",
  applicationName: "Prodbrogy",
  keywords: [
    "Prodbrogy",
    "producer sounds",
    "MIDI downloads",
    "loop kits",
    "one shots",
    "beat maker samples",
    "music production"
  ],
  authors: [{ name: "Prodbrogy" }],
  creator: "Prodbrogy",
  publisher: "Prodbrogy",
  category: "music",
  icons: {
    icon: "/icon.png",
    apple: "/apple-icon.png"
  },
  openGraph: {
    title: "Prodbrogy Sound Supply",
    description: "A credit-based sound vault for MIDI, loops, phrases, one shots, and starter ideas.",
    url: "/",
    siteName: "Prodbrogy",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary",
    title: "Prodbrogy Sound Supply",
    description: "Download MIDI, loops, phrases, one shots, and starter ideas from the Prodbrogy sound vault."
  },
  robots: {
    index: true,
    follow: true
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${inter.variable} ${space.variable}`}>{children}</body>
    </html>
  );
}
