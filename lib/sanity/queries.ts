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

const soundFields = `{
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

const soundsQuery = `*[_type == "soundAsset"] | order(_createdAt desc) ${soundFields}`;

/** Same ordering as soundsQuery, sliced server-side so the first paint only
 *  has to carry one page of records instead of the whole catalogue. */
const soundsPageQuery = `{
  "sounds": *[_type == "soundAsset"] | order(_createdAt desc) [$offset...$end] ${soundFields},
  "total": count(*[_type == "soundAsset"])
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

export type SoundsPage = {
  sounds: SoundAsset[];
  total: number;
};

/**
 * Reads one slice of the catalogue plus the total count. The home page uses
 * this so the initial HTML stays small; the client pulls the remainder in a
 * single background request once the page is interactive.
 */
export async function getSoundsPage(
  { offset = 0, limit = 24 }: { offset?: number; limit?: number } = {},
  options: SoundFetchOptions = fetchOptions
): Promise<SoundsPage> {
  if (!hasSanityConfig) {
    return { sounds: [], total: 0 };
  }

  try {
    const page = await withTimeout(
      sanityClient.fetch<SoundsPage>(soundsPageQuery, { offset, end: offset + limit }, options),
      SOUND_FETCH_TIMEOUT_MS
    );

    return {
      total: page?.total ?? 0,
      sounds: (page?.sounds ?? []).map((sound) => ({
        ...sound,
        credits: getCategoryCreditCost(sound.category, sound.credits),
        previewUrl: getPublicAssetUrl(sound.previewUrl),
        downloadUrl: getPublicAssetUrl(sound.downloadUrl)
      }))
    };
  } catch {
    return { sounds: [], total: 0 };
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

const soundByIdQuery = `*[_type == "soundAsset" && _id == $id][0] ${soundFields}`;

/**
 * Authoritative lookup used by the download route. The client sends only a
 * sound id; price and file URL are always resolved here so neither can be
 * tampered with in the request.
 */
export async function getSoundById(id: string): Promise<SoundAsset | null> {
  if (!hasSanityConfig || !id) {
    return null;
  }

  try {
    const sound = await withTimeout(
      sanityClient.fetch<SoundAsset | null>(soundByIdQuery, { id }, { cache: "no-store" }),
      SOUND_FETCH_TIMEOUT_MS
    );

    if (!sound) {
      return null;
    }

    return {
      ...sound,
      credits: getCategoryCreditCost(sound.category, sound.credits),
      previewUrl: getPublicAssetUrl(sound.previewUrl),
      downloadUrl: getPublicAssetUrl(sound.downloadUrl)
    };
  } catch {
    return null;
  }
}
