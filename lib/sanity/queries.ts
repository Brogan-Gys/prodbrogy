import { sanityClient, hasSanityConfig } from "./client";
import { getCategoryCreditCost } from "@/lib/credits";
import type { FreeKit } from "@/lib/freeKits";
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
const SOUND_FETCH_TIMEOUT_MS = 5000;

const soundsQuery = `*[_type == "soundAsset"] | order(_createdAt desc) {
  "id": _id,
  "createdAt": _createdAt,
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

const freeKitsQuery = `*[_type == "freeKit" && published != false] | order(sortOrder asc, _createdAt desc) {
  "id": _id,
  title,
  "type": coalesce(type, "Sample kit"),
  "description": coalesce(description, ""),
  "contents": coalesce(contents, []),
  "accent": coalesce(accent, "volt"),
  "imageUrl": coverImage.asset->url,
  downloadUrl
}`;

async function withTimeout<T>(promise: Promise<T>, timeoutMs: number) {
  let timeout: ReturnType<typeof setTimeout> | undefined;

  try {
    return await Promise.race([
      promise,
      new Promise<T>((_, reject) => {
        timeout = setTimeout(() => reject(new Error("Sanity sound fetch timed out")), timeoutMs);
      })
    ]);
  } finally {
    if (timeout) {
      clearTimeout(timeout);
    }
  }
}

export async function getSounds(options: SoundFetchOptions = fetchOptions): Promise<SoundAsset[]> {
  if (!hasSanityConfig) {
    return [];
  }

  try {
    const sounds = await withTimeout(sanityClient.fetch<SoundAsset[]>(soundsQuery, {}, options), SOUND_FETCH_TIMEOUT_MS);

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

export async function getFreeKits(options: SoundFetchOptions = fetchOptions): Promise<FreeKit[]> {
  if (!hasSanityConfig) {
    return [];
  }

  try {
    const kits = await withTimeout(sanityClient.fetch<FreeKit[]>(freeKitsQuery, {}, options), SOUND_FETCH_TIMEOUT_MS);

    return kits.map((kit) => ({
      ...kit,
      downloadUrl: getPublicAssetUrl(kit.downloadUrl)
    }));
  } catch {
    return [];
  }
}
