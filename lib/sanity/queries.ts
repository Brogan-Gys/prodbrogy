import { sanityClient, hasSanityConfig } from "./client";
import { getPublicAssetUrl } from "@/lib/storage";
import type { SoundAsset } from "@/lib/sounds";

const fetchOptions =
  process.env.NODE_ENV === "development" ? { cache: "no-store" as const } : { next: { revalidate: 60 } };

const soundsQuery = `*[_type == "soundAsset"] | order(_createdAt desc) {
  "id": _id,
  title,
  category,
  bpm,
  "key": coalesce(key, "N/A"),
  "mood": coalesce(mood, "untagged"),
  "credits": coalesce(credits, 1),
  "duration": coalesce(duration, "0:00"),
  "waveform": coalesce(waveform, [20, 44, 70, 36, 82, 55, 28, 64, 90, 48, 72, 32, 58, 86, 40, 66]),
  "tags": coalesce(tags, []),
  "accent": coalesce(accent, "volt"),
  previewUrl,
  downloadUrl
}`;

export async function getSounds(): Promise<SoundAsset[]> {
  if (!hasSanityConfig) {
    return [];
  }

  try {
    const sounds = await sanityClient.fetch<SoundAsset[]>(soundsQuery, {}, fetchOptions);

    return sounds.map((sound) => ({
      ...sound,
      previewUrl: getPublicAssetUrl(sound.previewUrl),
      downloadUrl: getPublicAssetUrl(sound.downloadUrl)
    }));
  } catch {
    return [];
  }
}
