"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, CheckCircle2, Heart, Loader2, Pause, Play, X } from "lucide-react";
import {
  CREDIT_STORAGE_KEY,
  getDailyCreditTotal,
  getDefaultCreditState,
  normalizeCreditState,
  type CreditState
} from "@/lib/credits";
import {
  DEFAULT_PREVIEW_VOLUME,
  PREVIEW_VOLUME_CHANGE_EVENT,
  PREVIEW_VOLUME_STORAGE_KEY,
  normalizePreviewVolume
} from "@/lib/previewVolume";
import { cn } from "@/lib/utils";
import { type SoundAsset } from "@/lib/sounds";

type SoundRowProps = {
  sound: SoundAsset;
  isDownloaded?: boolean;
  isFavorited?: boolean;
  onDownloadRecorded?: (sound: SoundAsset) => void;
  onFavoriteToggle?: (sound: SoundAsset) => void;
};

type ActivePreview = {
  id: string;
  stop: () => void;
};

const accentClass = {
  volt: "bg-volt",
  coral: "bg-coral",
  cyan: "bg-cyan",
  plum: "bg-plum text-bone"
};

const audioFilePattern = /\.(mp3|wav|m4a|ogg|flac|webm)(\?|#|$)/i;
const downloadableFilePattern = /\.(zip|rar|7z|mp3|wav|m4a|ogg|flac|webm|mid|midi)(\?|#|$)/i;
let activePreview: ActivePreview | null = null;
const typeLabels = new Map([
  ["midi", "MIDI"],
  ["loops", "Loop"],
  ["phrases", "Phrase"],
  ["oneshots", "One shot"],
  ["starters", "Starter"]
]);
const newSoundWindowMs = 1000 * 60 * 60 * 24 * 2;

function getIframeSrc(value: string) {
  const match = value.match(/src=["']([^"']+)["']/i);
  return match?.[1] ?? value;
}

function getMegaEmbedUrl(value: string) {
  const src = getIframeSrc(value).trim();

  if (!src.includes("mega.nz/")) {
    return "";
  }

  if (src.includes("/embed/")) {
    return src;
  }

  const match = src.match(/mega\.nz\/file\/([^#?/\s]+)(#[^\s"']+)?/i);

  if (!match) {
    return "";
  }

  return `https://mega.nz/embed/${match[1]}${match[2] ?? ""}`;
}

function isMegaUrl(value: string) {
  return getIframeSrc(value).includes("mega.nz/");
}

function slugifyDownloadName(value: string) {
  return (
    value
      .toLowerCase()
      .replace(/[^@a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "prodbrogy-download"
  );
}

function getSiteDownloadUrl(value: string, sound: SoundAsset) {
  const cleanName = slugifyDownloadName(
    [
      "@prodbrogy",
      sound.producerName ? `x-${sound.producerName}` : "",
      sound.title,
      sound.bpm && sound.bpm > 0 ? `${sound.bpm}-bpm` : ""
    ]
      .filter(Boolean)
      .join("-")
  );

  return `/api/download?url=${encodeURIComponent(value)}&name=${encodeURIComponent(cleanName)}`;
}

function getPreviewLimit(category: string) {
  if (category === "midi") {
    return 15;
  }

  return 20;
}

function parseDurationSeconds(value: string) {
  const parts = value
    .split(":")
    .map((part) => Number.parseInt(part, 10))
    .filter((part) => Number.isFinite(part));

  if (parts.length === 0) {
    return 0;
  }

  return parts.reduce((total, part) => total * 60 + part, 0);
}

function getPlayableDuration(duration: number, previewLimit: number | null, fallbackDuration = 0) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : fallbackDuration || previewLimit || 0;

  if (!previewLimit) {
    return safeDuration;
  }

  return safeDuration > 0 ? Math.min(safeDuration, previewLimit) : previewLimit;
}

function isRecentlyAdded(createdAt?: string) {
  if (!createdAt) {
    return false;
  }

  const createdTime = new Date(createdAt).getTime();

  return Number.isFinite(createdTime) && Date.now() - createdTime <= newSoundWindowMs;
}

function getCreditLabel(credits: number) {
  return `Costs ${credits} ${credits === 1 ? "credit" : "credits"}`;
}

function readStoredPreviewVolume() {
  try {
    return normalizePreviewVolume(window.localStorage.getItem(PREVIEW_VOLUME_STORAGE_KEY));
  } catch {
    return DEFAULT_PREVIEW_VOLUME;
  }
}

export function SoundRow({
  sound,
  isDownloaded = false,
  isFavorited = false,
  onDownloadRecorded,
  onFavoriteToggle
}: SoundRowProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [isAudioLoading, setIsAudioLoading] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const [, setNotice] = useState("");
  const [playhead, setPlayhead] = useState(0);
  const timerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const fadeStartedRef = useRef(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef("");
  const previewVolumeRef = useRef(DEFAULT_PREVIEW_VOLUME);

  const previewLimit = useMemo(() => getPreviewLimit(sound.category), [sound.category]);
  const fallbackPreviewDuration = useMemo(() => parseDurationSeconds(sound.duration), [sound.duration]);
  const isNew = useMemo(() => isRecentlyAdded(sound.createdAt), [sound.createdAt]);

  const meta = useMemo(
    () =>
      [sound.bpm && sound.bpm > 0 ? `${sound.bpm} BPM` : ""]
        .filter(Boolean)
        .join(" / "),
    [sound.bpm]
  );

  const flashNotice = (message: string) => {
    setNotice(message);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setNotice(""), 2200);
  };

  useEffect(() => {
    previewVolumeRef.current = readStoredPreviewVolume();
  }, []);

  useEffect(() => {
    const syncPreviewVolume = (event?: Event) => {
      const nextVolume =
        event instanceof CustomEvent ? normalizePreviewVolume(event.detail) : readStoredPreviewVolume();

      previewVolumeRef.current = nextVolume;

    if (audioRef.current && !fadeStartedRef.current) {
      audioRef.current.muted = nextVolume <= 0;
      audioRef.current.volume = nextVolume;

      if (nextVolume <= 0) {
        stopPlayback("Volume is muted");
      }
    }
    };

    window.addEventListener(PREVIEW_VOLUME_CHANGE_EVENT, syncPreviewVolume);
    window.addEventListener("storage", syncPreviewVolume);

    return () => {
      window.removeEventListener(PREVIEW_VOLUME_CHANGE_EVENT, syncPreviewVolume);
      window.removeEventListener("storage", syncPreviewVolume);
    };
  }, []);

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      clearPlaybackTimers();
      if (activePreview?.id === sound.id) {
        activePreview = null;
      }
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [sound.id]);

  const clearPlaybackTimers = () => {
    if (progressTimerRef.current) {
      window.clearInterval(progressTimerRef.current);
      progressTimerRef.current = null;
    }

    if (fadeTimerRef.current) {
      window.clearInterval(fadeTimerRef.current);
      fadeTimerRef.current = null;
    }
  };

  const stopPlayback = (message?: string) => {
    const audio = audioRef.current;

    clearPlaybackTimers();

    if (audio) {
      audio.pause();
      audio.currentTime = 0;
      audio.muted = previewVolumeRef.current <= 0;
      audio.volume = previewVolumeRef.current;
    }

    setIsAudioLoading(false);
    setIsPlaying(false);
    setPlayhead(0);
    fadeStartedRef.current = false;

    if (message) {
      flashNotice(message);
    }

    if (activePreview?.id === sound.id) {
      activePreview = null;
    }
  };

  const startProgressTracking = (audio: HTMLAudioElement) => {
    clearPlaybackTimers();
    progressTimerRef.current = window.setInterval(() => {
      const duration = getPlayableDuration(audio.duration, previewLimit, fallbackPreviewDuration);
      const elapsed = Math.min(audio.currentTime, duration);

      setPlayhead(duration > 0 ? Math.min(1, elapsed / duration) : 0);

      const fadeSeconds = Math.min(2, duration);
      const shouldFade = duration > 0 && duration - elapsed <= fadeSeconds;

      if (shouldFade && !fadeStartedRef.current) {
        startFade(audio, Math.max(0.35, duration - elapsed));
      }

      if (previewLimit && elapsed >= duration) {
        stopPlayback();
      }
    }, 120);
  };

  const startFade = (audio: HTMLAudioElement, seconds: number) => {
    const startVolume = audio.volume || previewVolumeRef.current;
    const startedAt = performance.now();
    const fadeMs = seconds * 1000;

    fadeStartedRef.current = true;
    fadeTimerRef.current = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / fadeMs);
      audio.volume = Math.max(0, startVolume * (1 - progress));

      if (progress >= 1 && fadeTimerRef.current) {
        window.clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    }, 50);
  };

  const activatePreview = () => {
    if (activePreview?.id !== sound.id) {
      activePreview?.stop();
    }

    activePreview = {
      id: sound.id,
      stop: () => {
        stopPlayback();
        setEmbedUrl("");
      }
    };
  };

  const clearActivePreview = () => {
    if (activePreview?.id === sound.id) {
      activePreview = null;
    }
  };

  const handlePreview = () => {
    previewVolumeRef.current = readStoredPreviewVolume();

    if (previewVolumeRef.current <= 0) {
      stopPlayback("Volume is muted");
      return;
    }

    const previewSource = sound.previewUrl;

    if (!previewSource) {
      setIsAudioLoading(false);
      setIsPlaying((current) => !current);
      flashNotice("Preview coming soon");
      return;
    }

    const megaEmbedUrl = getMegaEmbedUrl(previewSource);

    if (megaEmbedUrl) {
      activatePreview();
      audioRef.current?.pause();
      clearPlaybackTimers();
      setIsAudioLoading(false);
      setIsPlaying(false);
      setPlayhead(0);
      fadeStartedRef.current = false;
      setEmbedUrl(megaEmbedUrl);
      flashNotice("Mega preview opened");
      return;
    }

    const audioUrl = getIframeSrc(previewSource).trim();

    if (!audioFilePattern.test(audioUrl)) {
      setIsAudioLoading(false);
      flashNotice("Preview link needs audio");
      return;
    }

    if (!audioRef.current || audioUrlRef.current !== audioUrl) {
      const audio = new Audio();
      audio.src = audioUrl;
      audio.preload = "metadata";
      audio.addEventListener("ended", () => stopPlayback());
      audioRef.current = audio;
      audioUrlRef.current = audioUrl;
    }

    if (isPlaying) {
      stopPlayback();
      clearActivePreview();
      return;
    }

    activatePreview();
    setIsAudioLoading(true);
    audioRef.current.currentTime = 0;
    audioRef.current.muted = false;
    audioRef.current.volume = previewVolumeRef.current;
    fadeStartedRef.current = false;
    audioRef.current
      .play()
      .then(() => {
        setIsAudioLoading(false);
        setIsPlaying(true);
        startProgressTracking(audioRef.current as HTMLAudioElement);
      })
      .catch(() => {
        setIsAudioLoading(false);
        setIsPlaying(false);
        clearActivePreview();
        flashNotice("Preview unavailable");
      });
  };

  const handleDownload = () => {
    if (!sound.downloadUrl) {
      flashNotice("Download coming soon");
      return;
    }

    let nextUsed = 0;
    let state = getDefaultCreditState();

    if (!isDownloaded) {
      try {
        const stored = window.localStorage.getItem(CREDIT_STORAGE_KEY);
        state = normalizeCreditState(stored ? (JSON.parse(stored) as CreditState) : getDefaultCreditState());
      } catch {
        state = getDefaultCreditState();
      }

      nextUsed = state.used + sound.credits;

      if (nextUsed > getDailyCreditTotal(state)) {
        flashNotice("Out of daily credits");
        return;
      }

      window.localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify({ ...state, used: nextUsed }));
      window.dispatchEvent(new Event("credits:changed"));
    }

    onDownloadRecorded?.(sound);
    const downloadUrl = getIframeSrc(sound.downloadUrl).trim();
    const isDirectFile = downloadableFilePattern.test(downloadUrl);

    flashNotice(
      isDirectFile || isDownloaded ? "Download starting" : `Reserved ${sound.credits} credit${sound.credits === 1 ? "" : "s"}`
    );

    const link = document.createElement("a");
    link.href = isDirectFile ? getSiteDownloadUrl(downloadUrl, sound) : downloadUrl;
    link.rel = "noopener";

    if (isDirectFile) {
      link.download = "";
    } else if (isMegaUrl(downloadUrl)) {
      link.target = "_blank";
      flashNotice("Mega download opened");
    }

    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  return (
    <>
      <article
        data-sound-row
        className="grid min-h-[94px] gap-1.5 border-2 border-ink bg-white p-1.5 shadow-[4px_4px_0_#11110f] lg:min-h-[98px] lg:grid-cols-[1fr_220px] lg:gap-2 lg:p-2"
      >
        <div className="grid grid-cols-[36px_1fr] gap-1.5 lg:grid-cols-[48px_1fr] lg:gap-2">
          <button
            type="button"
            onClick={handlePreview}
            className={cn(
              "flex h-9 w-9 items-center justify-center border-2 border-ink transition hover:-translate-y-0.5 lg:h-12 lg:w-12",
              accentClass[sound.accent]
            )}
            aria-label={`${isAudioLoading ? "Loading" : isPlaying ? "Pause" : "Play"} ${sound.title}`}
          >
            {isAudioLoading ? (
              <Loader2 className="h-4 w-4 animate-spin lg:h-5 lg:w-5" />
            ) : isPlaying ? (
              <Pause className="h-4 w-4 lg:h-5 lg:w-5" />
            ) : (
              <Play className="h-4 w-4 fill-current lg:h-5 lg:w-5" />
            )}
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-1.5 lg:gap-2">
              <div className="min-w-0">
                <p className="truncate font-display text-base font-black uppercase leading-tight lg:text-xl">{sound.title}</p>
                {/*
                {sound.producerName ? (
                  <p className="mt-0.5 truncate text-[10px] font-black uppercase text-ink/70 lg:mt-1 lg:text-xs">Collab with {sound.producerName}</p>
                ) : null}
                */}
                <p className="mt-0.5 min-h-3.5 truncate text-[10px] font-bold uppercase text-ink/55 lg:mt-1 lg:min-h-4 lg:text-xs">
                  {meta}
                </p>
              </div>
              <div className="flex flex-wrap justify-end gap-1 lg:gap-2">
                {isNew ? (
                  <span className="inline-flex items-center border-2 border-ink bg-volt px-1.5 py-0.5 font-display text-[9px] font-black uppercase lg:px-2 lg:text-[11px]">
                    New
                  </span>
                ) : null}
                {isDownloaded ? (
                  <span className="inline-flex items-center gap-1 border-2 border-ink bg-cyan px-1.5 py-0.5 font-display text-[9px] font-black uppercase lg:px-2 lg:text-[11px]">
                    <CheckCircle2 className="h-3 w-3 lg:h-3.5 lg:w-3.5" aria-hidden />
                    Downloaded
                  </span>
                ) : null}
                <span
                  className="border-2 border-ink bg-bone px-1.5 py-0.5 font-display text-[9px] font-black uppercase text-ink lg:px-2 lg:text-[11px]"
                  title={getCreditLabel(sound.credits)}
                >
                  {getCreditLabel(sound.credits)}
                </span>
              </div>
            </div>

            <div className="mt-1.5 border-2 border-ink bg-bone p-1 lg:mt-3 lg:p-1.5">
              <div className="h-1.5 overflow-hidden border-2 border-ink bg-white lg:h-2">
                <span
                  className={cn("block h-full transition-[width]", isPlaying ? accentClass[sound.accent] : "bg-ink/55")}
                  style={{ width: `${playhead * 100}%` }}
                  aria-hidden
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex min-w-0 flex-row items-center justify-between gap-1.5 border-t-2 border-ink pt-1.5 lg:flex-col lg:items-stretch lg:justify-between lg:gap-2 lg:border-l-2 lg:border-t-0 lg:pl-2 lg:pt-0">
          <p className="min-w-0 truncate font-display text-sm font-black uppercase leading-none text-ink/65 lg:text-base">
            {typeLabels.get(sound.category) ?? sound.category}
          </p>
          <div className="flex min-w-0 shrink-0 items-center justify-end gap-1.5 lg:mt-auto lg:gap-2">
            <button
              type="button"
              onClick={() => onFavoriteToggle?.(sound)}
              className={cn(
                "inline-flex h-8 w-8 shrink-0 items-center justify-center border-2 border-ink transition hover:-translate-y-0.5 lg:h-9 lg:w-9",
                isFavorited ? "bg-coral text-ink" : "bg-white text-ink"
              )}
              aria-label={`${isFavorited ? "Remove from" : "Add to"} stash: ${sound.title}`}
              title={isFavorited ? "Remove from stash" : "Add to stash"}
            >
              <Heart className={cn("h-3.5 w-3.5 lg:h-4 lg:w-4", isFavorited && "fill-current")} aria-hidden />
            </button>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex h-8 w-8 shrink-0 items-center justify-center gap-1.5 border-2 border-ink bg-ink font-display text-[11px] font-black uppercase text-bone transition hover:-translate-y-0.5 lg:h-9 lg:w-auto lg:px-2.5"
              aria-label={`Download ${sound.title}`}
            >
              <ArrowDownToLine className="h-3.5 w-3.5" aria-hidden />
              <span className="hidden lg:inline">Download</span>
            </button>
          </div>
        </div>
      </article>

      {embedUrl ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/80 p-4">
          <div className="w-full max-w-2xl border-2 border-ink bg-white p-3 shadow-hard">
            <div className="mb-3 flex items-center justify-between gap-3">
              <p className="min-w-0 truncate font-display text-xl font-black uppercase">{sound.title}</p>
              <button
                type="button"
                onClick={() => {
                  setEmbedUrl("");
                  clearActivePreview();
                }}
                className="flex h-10 w-10 shrink-0 items-center justify-center border-2 border-ink bg-bone"
                aria-label="Close preview"
              >
                <X className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <iframe
              title={`${sound.title} preview`}
              src={embedUrl}
              className="h-40 w-full border-2 border-ink bg-bone"
              allow="autoplay; fullscreen"
            />
          </div>
        </div>
      ) : null}
    </>
  );
}
