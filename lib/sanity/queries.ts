import { sanityClient, hasSanityConfig } from "./client";
import { getCategoryCreditCost } from "@/lib/credits";
import { getPublicAssetUrl } from "@/lib/storage";
import type { SoundAsset } from "@/lib/sounds";

type SoundFetchOptions = {
  cache?: "force-cache" | "no-store";
  next?: {
    revalidate?: number | false;
  };
};

const fetchOptions =
  process.env.NODE_ENV === "development" ? { cache: "no-store" as const } : { next: { revalidate: 60 } };

const soundsQuery = `*[_type == "soundAsset"] | order(_createdAt desc) {
  "id": _id,
  title,
  category,
  "producerName": coalesce(producerName, ""),
  bpm,
  "mood": coalesce(mood, ""),
  "credits": coalesce(credits, 1),
  "duration": coalesce(duration, "0:00"),
  "tags": coalesce(tags, []),
  "accent": coalesce(accent, "volt"),
  previewUrl,
  downloadUrl
}`;

export async function getSounds(options: SoundFetchOptions = fetchOptions): Promise<SoundAsset[]> {
  if (!hasSanityConfig) {
    return [];
  }

  try {
    const sounds = await sanityClient.fetch<SoundAsset[]>(soundsQuery, {}, options);

    return sounds.map((sound) => ({
      ...sound,
      credits: getCategoryCreditCost(sound.category, sound.credits),
      previewUrl: getPublicAssetUrl(sound.previewUrl),
      downloadUrl: getPublicAssetUrl(sound.downloadUrl)
    }));
  } catch {
    return [];
  }
}
