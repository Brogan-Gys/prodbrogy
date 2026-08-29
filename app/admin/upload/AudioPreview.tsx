"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play } from "lucide-react";

type AudioPreviewProps = {
  // A local File (batch queue) or an already-hosted URL/path (library).
  source: File | string | null | undefined;
  label?: string;
};

// Small play/pause button that previews one sound. Only one <audio> element per
// instance; it pauses and releases any object URL on unmount.
export function AudioPreview({ source, label }: AudioPreviewProps) {
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [playing, setPlaying] = useState(false);

  const src = useMemo(() => {
    if (!source) {
      return "";
    }
    return typeof source === "string" ? source : URL.createObjectURL(source);
  }, [source]);

  useEffect(() => {
    // Revoke object URLs created for File sources when the source changes/unmounts.
    return () => {
      if (source && typeof source !== "string" && src) {
        URL.revokeObjectURL(src);
      }
    };
  }, [source, src]);

  useEffect(() => {
    const audio = audioRef.current;
    return () => {
      audio?.pause();
    };
  }, []);

  const toggle = () => {
    const audio = audioRef.current;
    if (!audio || !src) {
      return;
    }

    if (playing) {
      audio.pause();
      return;
    }

    void audio.play().catch(() => setPlaying(false));
  };

  if (!src) {
    return null;
  }

  return (
    <>
      <button
        type="button"
        onClick={toggle}
        aria-label={playing ? "Pause preview" : `Play preview${label ? ` of ${label}` : ""}`}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center border-2 border-ink bg-cyan shadow-hard transition hover:-translate-y-0.5"
      >
        {playing ? <Pause className="h-4 w-4" aria-hidden /> : <Play className="h-4 w-4" aria-hidden />}
      </button>
      <audio
        ref={audioRef}
        src={src}
        preload="none"
        onPlay={() => setPlaying(true)}
        onPause={() => setPlaying(false)}
        onEnded={() => setPlaying(false)}
      />
    </>
  );
}
