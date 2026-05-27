import { HomeClient } from "./HomeClient";
import { getSounds } from "@/lib/sanity/queries";
import { siteConfig } from "@/lib/site";

export default async function Home() {
  const sounds = await getSounds();
  const structuredData = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "WebSite",
        "@id": `${siteConfig.url}/#website`,
        name: siteConfig.name,
        url: siteConfig.url,
        description: siteConfig.description,
        inLanguage: "en",
        publisher: {
          "@id": `${siteConfig.url}/#brand`
        }
      },
      {
        "@type": "Organization",
        "@id": `${siteConfig.url}/#brand`,
        name: siteConfig.shortName,
        url: siteConfig.url,
        sameAs: siteConfig.socials
      }
    ]
  };

  return (
    <>
      <script
        type="application/ld+json"
        suppressHydrationWarning
        dangerouslySetInnerHTML={{ __html: JSON.stringify(structuredData) }}
      />
      <HomeClient sounds={sounds} />
    </>
  );
}
