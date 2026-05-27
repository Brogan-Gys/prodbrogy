const fallbackUrl = "https://prodbrogy.com";

function getSiteUrl() {
  const explicitUrl = process.env.NEXT_PUBLIC_SITE_URL;
  const vercelProductionUrl = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const vercelPreviewUrl = process.env.VERCEL_URL;
  const url = explicitUrl || (vercelProductionUrl ? `https://${vercelProductionUrl}` : "") || (vercelPreviewUrl ? `https://${vercelPreviewUrl}` : "") || fallbackUrl;

  return url.replace(/\/+$/, "");
}

export const siteConfig = {
  name: "Prodbrogy Sound Supply",
  shortName: "Prodbrogy",
  url: getSiteUrl(),
  description: "Download MIDI, loops, phrases, one shots, and starter ideas from the Prodbrogy sound vault.",
  socials: [
    "https://instagram.com/prodbrogy",
    "https://youtube.com/@prodbrogy",
    "https://www.beatstars.com/prodbrogyqa9",
    "https://t.me/prodbrogy"
  ]
};
