import type { Metadata, Viewport } from "next";
import { AccountProvider } from "@/components/auth/AccountProvider";
import { SignInDialog } from "@/components/auth/SignInDialog";
import { siteConfig } from "@/lib/site";
import { getCurrentAccountUser } from "@/lib/supabase/server";
import { themeInitScript } from "@/lib/theme";
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
    "loops",
    "one shots",
    "beat maker samples",
    "music production"
  ],
  authors: [{ name: "Prodbrogy" }],
  creator: "Prodbrogy",
  publisher: "Prodbrogy",
  category: "music",
  icons: {
    icon: [
      { url: "/tab-icon.svg", type: "image/svg+xml" },
      { url: "/favicon.ico", sizes: "48x48" },
      { url: "/icon.png", sizes: "512x512", type: "image/png" }
    ],
    apple: [{ url: "/apple-icon.png", sizes: "512x512", type: "image/png" }]
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
    card: "summary_large_image",
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

export const viewport: Viewport = {
  // Updated at runtime by applyThemePreference when the visitor toggles.
  themeColor: "#f6f1e7"
};

export default async function RootLayout({
  children
}: Readonly<{
  children: React.ReactNode;
}>) {
  // Read here rather than in the client provider so the header ships already
  // signed in or out, instead of holding a placeholder until hydration.
  const initialUser = await getCurrentAccountUser();

  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: themeInitScript }} />
        <meta name="color-scheme" content="light dark" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <AccountProvider initialUser={initialUser}>
          {children}
          <SignInDialog />
        </AccountProvider>
      </body>
    </html>
  );
}
