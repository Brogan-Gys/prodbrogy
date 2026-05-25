const fallbackPublicBaseUrl = "https://pub-471cfb80efa24404bc77c5c9793f45c7.r2.dev";

export const publicAssetBaseUrl =
  process.env.NEXT_PUBLIC_ASSET_BASE_URL?.replace(/\/+$/, "") || fallbackPublicBaseUrl;

export function getPublicAssetUrl(value?: string | null) {
  if (!value) {
    return undefined;
  }

  const trimmed = value.trim();

  if (!trimmed) {
    return undefined;
  }

  if (/^https?:\/\//i.test(trimmed) || trimmed.includes("<iframe")) {
    return trimmed;
  }

  return `${publicAssetBaseUrl}/${trimmed.replace(/^\/+/, "")}`;
}
