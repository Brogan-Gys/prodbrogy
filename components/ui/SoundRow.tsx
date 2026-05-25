"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { ArrowDownToLine, Pause, Play, X } from "lucide-react";
import {
  CREDIT_STORAGE_KEY,
  DAILY_CREDIT_LIMIT,
  getDefaultCreditState,
  normalizeCreditState,
  type CreditState
} from "@/lib/credits";
import { cn } from "@/lib/utils";
import type { SoundAsset } from "@/lib/sounds";

declare global {
  interface Window {
    webkitAudioContext?: typeof AudioContext;
  }
}

type SoundRowProps = {
  sound: SoundAsset;
};

const accentClass = {
  volt: "bg-volt",
  coral: "bg-coral",
  cyan: "bg-cyan",
  plum: "bg-plum text-bone"
};

const audioFilePattern = /\.(mp3|wav|m4a|ogg|flac|webm)(\?|#|$)/i;
const downloadableFilePattern = /\.(zip|rar|7z|mp3|wav|m4a|ogg|flac|webm|mid|midi)(\?|#|$)/i;

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

function getSiteDownloadUrl(value: string) {
  return `/api/download?url=${encodeURIComponent(value)}`;
}

function getPreviewLimit(category: string) {
  if (category === "starters") {
    return null;
  }

  if (category === "midi") {
    return 15;
  }

  return 20;
}

function getPlayableDuration(duration: number, previewLimit: number | null) {
  const safeDuration = Number.isFinite(duration) && duration > 0 ? duration : previewLimit ?? 0;

  if (!previewLimit) {
    return safeDuration;
  }

  return safeDuration > 0 ? Math.min(safeDuration, previewLimit) : previewLimit;
}

function formatTime(seconds: number) {
  const safeSeconds = Math.max(0, Math.floor(seconds));
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;

  return `${minutes}:${remainingSeconds.toString().padStart(2, "0")}`;
}

function getTimeLabel(currentTime: number, duration: number | null, previewLimit: number | null, fallbackDuration: string) {
  if (currentTime <= 0) {
    return previewLimit ? `${formatTime(previewLimit)} preview` : fallbackDuration;
  }

  const playableDuration = getPlayableDuration(duration ?? 0, previewLimit);
  return `${formatTime(currentTime)} / ${formatTime(playableDuration)}`;
}

function normalizePeaks(peaks: number[]) {
  const cleanPeaks = peaks.filter((peak) => Number.isFinite(peak) && peak > 0);

  if (cleanPeaks.length === 0) {
    return [18, 34, 52, 28, 66, 42, 24, 58, 74, 36, 62, 30, 48, 70, 40, 56];
  }

  return cleanPeaks.map((peak) => Math.max(12, Math.min(96, Math.round(peak))));
}

async function getAudioPeaks(audioUrl: string) {
  const response = await fetch(audioUrl);
  const buffer = await response.arrayBuffer();
  const AudioContextConstructor = window.AudioContext || window.webkitAudioContext;
  const context = new AudioContextConstructor();
  const audioBuffer = await context.decodeAudioData(buffer);
  const channelData = audioBuffer.getChannelData(0);
  const barCount = 32;
  const samplesPerBar = Math.max(1, Math.floor(channelData.length / barCount));
  const rawPeaks = Array.from({ length: barCount }, (_, barIndex) => {
    const start = barIndex * samplesPerBar;
    const end = Math.min(channelData.length, start + samplesPerBar);
    let total = 0;

    for (let index = start; index < end; index += 1) {
      total += Math.abs(channelData[index]);
    }

    return total / Math.max(1, end - start);
  });
  const maxPeak = Math.max(...rawPeaks, 0.001);

  await context.close();

  return normalizePeaks(rawPeaks.map((peak) => (peak / maxPeak) * 92));
}

export function SoundRow({ sound }: SoundRowProps) {
  const [isPlaying, setIsPlaying] = useState(false);
  const [embedUrl, setEmbedUrl] = useState("");
  const [notice, setNotice] = useState("");
  const [peaks, setPeaks] = useState<number[]>(normalizePeaks(sound.waveform));
  const [playhead, setPlayhead] = useState(0);
  const [currentTime, setCurrentTime] = useState(0);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const timerRef = useRef<number | null>(null);
  const progressTimerRef = useRef<number | null>(null);
  const fadeTimerRef = useRef<number | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioUrlRef = useRef("");

  const previewLimit = useMemo(() => getPreviewLimit(sound.category), [sound.category]);

  const meta = useMemo(
    () => [sound.bpm && sound.bpm > 0 ? `${sound.bpm} BPM` : "Any BPM", sound.key, sound.mood].filter(Boolean).join(" / "),
    [sound.bpm, sound.key, sound.mood]
  );

  const flashNotice = (message: string) => {
    setNotice(message);
    if (timerRef.current) {
      window.clearTimeout(timerRef.current);
    }
    timerRef.current = window.setTimeout(() => setNotice(""), 2200);
  };

  useEffect(() => {
    return () => {
      audioRef.current?.pause();
      clearPlaybackTimers();
      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    const previewSource = sound.previewUrl;

    if (!previewSource) {
      setPeaks(normalizePeaks(sound.waveform));
      return;
    }

    const audioUrl = getIframeSrc(previewSource).trim();

    if (!audioFilePattern.test(audioUrl)) {
      setPeaks(normalizePeaks(sound.waveform));
      return;
    }

    let cancelled = false;

    getAudioPeaks(audioUrl)
      .then((nextPeaks) => {
        if (!cancelled) {
          setPeaks(nextPeaks);
        }
      })
      .catch(() => {
        if (!cancelled) {
          setPeaks(normalizePeaks(sound.waveform));
        }
      });

    return () => {
      cancelled = true;
    };
  }, [sound.previewUrl, sound.waveform]);

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
      audio.volume = 1;
    }

    setIsPlaying(false);
    setPlayhead(0);
    setCurrentTime(0);

    if (message) {
      flashNotice(message);
    }
  };

  const startProgressTracking = (audio: HTMLAudioElement) => {
    clearPlaybackTimers();
    progressTimerRef.current = window.setInterval(() => {
      const duration = getPlayableDuration(audio.duration, previewLimit);
      const elapsed = Math.min(audio.currentTime, duration);

      setCurrentTime(elapsed);
      setAudioDuration(Number.isFinite(audio.duration) ? audio.duration : null);
      setPlayhead(duration > 0 ? Math.min(1, elapsed / duration) : 0);

      if (previewLimit && duration - elapsed <= 2 && !fadeTimerRef.current) {
        startFade(audio, Math.max(0.35, duration - elapsed));
      }

      if (previewLimit && elapsed >= duration) {
        stopPlayback("Preview complete");
      }
    }, 120);
  };

  const startFade = (audio: HTMLAudioElement, seconds: number) => {
    const startVolume = audio.volume || 1;
    const startedAt = performance.now();
    const fadeMs = seconds * 1000;

    fadeTimerRef.current = window.setInterval(() => {
      const progress = Math.min(1, (performance.now() - startedAt) / fadeMs);
      audio.volume = Math.max(0, startVolume * (1 - progress));

      if (progress >= 1 && fadeTimerRef.current) {
        window.clearInterval(fadeTimerRef.current);
        fadeTimerRef.current = null;
      }
    }, 50);
  };

  const handlePreview = () => {
    const previewSource = sound.previewUrl;

    if (!previewSource) {
      setIsPlaying((current) => !current);
      flashNotice("Preview coming soon");
      return;
    }

    const megaEmbedUrl = getMegaEmbedUrl(previewSource);

    if (megaEmbedUrl) {
      audioRef.current?.pause();
      setIsPlaying(false);
      setEmbedUrl(megaEmbedUrl);
      flashNotice("Mega preview opened");
      return;
    }

    const audioUrl = getIframeSrc(previewSource).trim();

    if (!audioFilePattern.test(audioUrl)) {
      flashNotice("Preview link needs audio");
      return;
    }

    if (!audioRef.current || audioUrlRef.current !== audioUrl) {
      const audio = new Audio();
      audio.src = audioUrl;
      audio.preload = "metadata";
      audio.addEventListener("loadedmetadata", () => {
        setAudioDuration(Number.isFinite(audio.duration) ? audio.duration : null);
      });
      audio.addEventListener("ended", () => stopPlayback("Preview complete"));
      audioRef.current = audio;
      audioUrlRef.current = audioUrl;
    }

    if (isPlaying) {
      stopPlayback("Preview paused");
      return;
    }

    audioRef.current.currentTime = 0;
    audioRef.current.volume = 1;
    audioRef.current
      .play()
      .then(() => {
        setIsPlaying(true);
        startProgressTracking(audioRef.current as HTMLAudioElement);
        flashNotice("Preview playing");
      })
      .catch(() => {
        setIsPlaying(false);
        flashNotice("Preview unavailable");
      });
  };

  const handleDownload = () => {
    if (!sound.downloadUrl) {
      flashNotice("Download coming soon");
      return;
    }

    const stored = window.localStorage.getItem(CREDIT_STORAGE_KEY);
    const state = normalizeCreditState(stored ? (JSON.parse(stored) as CreditState) : getDefaultCreditState());
    const nextUsed = state.used + sound.credits;

    if (nextUsed > DAILY_CREDIT_LIMIT) {
      flashNotice("Daily credit limit reached");
      return;
    }

    window.localStorage.setItem(CREDIT_STORAGE_KEY, JSON.stringify({ ...state, used: nextUsed }));
    window.dispatchEvent(new Event("credits:changed"));
    const downloadUrl = getIframeSrc(sound.downloadUrl).trim();
    const isDirectFile = downloadableFilePattern.test(downloadUrl);

    flashNotice(isDirectFile ? "Download starting" : `Reserved ${sound.credits} credit${sound.credits === 1 ? "" : "s"}`);

    const link = document.createElement("a");
    link.href = isDirectFile ? getSiteDownloadUrl(downloadUrl) : downloadUrl;
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
      <article data-sound-row className="grid gap-3 border-2 border-ink bg-white p-3 shadow-hard lg:grid-cols-[1fr_260px]">
        <div className="grid gap-3 md:grid-cols-[56px_1fr]">
          <button
            type="button"
            onClick={handlePreview}
            className={cn(
              "flex h-14 w-14 items-center justify-center border-2 border-ink transition hover:-translate-y-0.5",
              accentClass[sound.accent]
            )}
            aria-label={`${isPlaying ? "Pause" : "Play"} ${sound.title}`}
          >
            {isPlaying ? <Pause className="h-6 w-6" /> : <Play className="h-6 w-6 fill-current" />}
          </button>

          <div className="min-w-0">
            <div className="flex flex-wrap items-start justify-between gap-2">
              <div>
                <p className="font-display text-2xl font-black uppercase leading-none">{sound.title}</p>
                <p className="mt-1 text-sm font-bold uppercase text-ink/55">{meta}</p>
              </div>
              <span className={cn("border-2 border-ink px-2 py-1 font-display text-xs font-black uppercase", accentClass[sound.accent])}>
                {sound.credits} cr
              </span>
            </div>

            <div className="relative mt-4 flex h-16 items-end gap-1 overflow-hidden border-2 border-ink bg-bone px-2 py-2">
              <span
                className="pointer-events-none absolute inset-y-0 left-0 bg-ink/10 transition-[width]"
                style={{ width: `${playhead * 100}%` }}
                aria-hidden
              />
              {peaks.map((height, index) => (
                <span
                  key={`${sound.id}-${index}`}
                  className={cn(
                    "relative z-10 flex-1 transition-all",
                    index / Math.max(peaks.length - 1, 1) <= playhead || isPlaying ? accentClass[sound.accent] : "bg-ink/55"
                  )}
                  style={{ height: `${height}%` }}
                />
              ))}
            </div>
          </div>
        </div>

        <div className="flex flex-col justify-between gap-3 border-t-2 border-ink pt-3 lg:border-l-2 lg:border-t-0 lg:pl-3 lg:pt-0">
          <div className="flex flex-wrap gap-2">
            {sound.tags.map((tag) => (
              <span key={tag} className="border border-ink/20 bg-bone px-2 py-1 text-xs font-bold uppercase text-ink/65">
                {tag}
              </span>
            ))}
          </div>
          <div className="flex items-center justify-between gap-2">
            <p className="min-h-5 text-xs font-bold uppercase text-ink/55">
              {notice || getTimeLabel(currentTime, audioDuration, previewLimit, sound.duration)}
            </p>
            <button
              type="button"
              onClick={handleDownload}
              className="inline-flex h-11 items-center gap-2 border-2 border-ink bg-ink px-3 font-display text-xs font-black uppercase text-bone transition hover:-translate-y-0.5"
            >
              <ArrowDownToLine className="h-4 w-4" aria-hidden />
              Download
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
                onClick={() => setEmbedUrl("")}
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
