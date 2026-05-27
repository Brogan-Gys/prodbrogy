import type { Metadata } from "next";
import { siteConfig } from "@/lib/site";
import "./globals.css";

export const metadata: Metadata = {
  metadataBase: new URL(siteConfig.url),
  title: {
    default: siteConfig.name,
    template: "%s | Prodbrogy"
  },
  description: siteConfig.description,
  applicationName: siteConfig.shortName,
  keywords: [
    "Prodbrogy",
    "Prodbrogy Sound Supply",
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
  alternates: {
    canonical: "/"
  },
  openGraph: {
    title: siteConfig.name,
    description: "A credit-based sound vault for MIDI, loops, phrases, one shots, and starter ideas.",
    url: "/",
    siteName: siteConfig.shortName,
    type: "website",
    locale: "en_US"
  },
  twitter: {
    card: "summary",
    title: siteConfig.name,
    description: siteConfig.description
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-image-preview": "large",
      "max-snippet": -1
    }
  }
};

export default function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
