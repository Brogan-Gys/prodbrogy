import { HomeClient } from "./HomeClient";
import { getFreeKits, getSoundsPage } from "@/lib/sanity/queries";
import { INITIAL_SOUND_PAGE_SIZE } from "@/lib/sounds";
import { siteConfig } from "@/lib/site";

export default async function Home() {
  // Only the first page is serialised into the HTML; HomeClient pulls the rest
  // in one background request after the page is interactive.
  const [soundsPage, freeKits] = await Promise.all([
    getSoundsPage({ limit: INITIAL_SOUND_PAGE_SIZE }),
    getFreeKits()
  ]);
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
      <HomeClient sounds={soundsPage.sounds} totalSounds={soundsPage.total} freeKits={freeKits} />
    </>
  );
}
