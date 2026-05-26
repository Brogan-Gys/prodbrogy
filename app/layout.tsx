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
    default: "ProdBrogy Sound Supply",
    template: "%s | ProdBrogy"
  },
  description: "Download MIDI, loops, phrases, one shots, and starter ideas from the ProdBrogy sound vault.",
  applicationName: "ProdBrogy",
  keywords: [
    "ProdBrogy",
    "producer sounds",
    "MIDI downloads",
    "loop kits",
    "one shots",
    "beat maker samples",
    "music production"
  ],
  authors: [{ name: "ProdBrogy" }],
  creator: "ProdBrogy",
  publisher: "ProdBrogy",
  category: "music",
  icons: {
    icon: "/shape.png",
    apple: "/shape.png"
  },
  openGraph: {
    title: "ProdBrogy Sound Supply",
    description: "A credit-based sound vault for MIDI, loops, phrases, one shots, and starter ideas.",
    url: "/",
    siteName: "ProdBrogy",
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary",
    title: "ProdBrogy Sound Supply",
    description: "Download MIDI, loops, phrases, one shots, and starter ideas from the ProdBrogy sound vault."
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
