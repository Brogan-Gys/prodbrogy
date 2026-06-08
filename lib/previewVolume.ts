export const PREVIEW_VOLUME_STORAGE_KEY = "prodbrogy-preview-volume";
export const PREVIEW_VOLUME_CHANGE_EVENT = "preview-volume:changed";
export const DEFAULT_PREVIEW_VOLUME = 0.6;

export function normalizePreviewVolume(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return DEFAULT_PREVIEW_VOLUME;
  }

  const number = typeof value === "number" ? value : Number(value);

  if (!Number.isFinite(number)) {
    return DEFAULT_PREVIEW_VOLUME;
  }

  return Math.min(Math.max(number, 0), 1);
}
