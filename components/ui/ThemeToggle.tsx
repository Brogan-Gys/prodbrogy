"use client";

import { useEffect, useState } from "react";
import { Moon, Sun } from "lucide-react";
import {
  applyThemePreference,
  readThemePreference,
  THEME_EVENT,
  themePreferences,
  type ThemePreference
} from "@/lib/theme";

const options: Record<ThemePreference, { label: string; icon: typeof Sun }> = {
  light: { label: "Light", icon: Sun },
  dark: { label: "Dark", icon: Moon }
};

/** Best-effort save to the signed-in profile. Signed-out visitors keep the
 *  choice in their browser only, so a failure here is not worth surfacing. */
async function saveThemeToProfile(theme: ThemePreference) {
  try {
    await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ theme })
    });
  } catch {
    // Offline or signed out — localStorage still has the choice.
  }
}

export function ThemeToggle({ className = "" }: { className?: string }) {
  const [preference, setPreference] = useState<ThemePreference>("light");
  // The server cannot know the visitor's theme, so the active segment is only
  // marked once the real preference has been read on the client.
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    setPreference(readThemePreference());
    setIsReady(true);

    const sync = () => setPreference(readThemePreference());
    window.addEventListener(THEME_EVENT, sync);
    window.addEventListener("storage", sync);

    return () => {
      window.removeEventListener(THEME_EVENT, sync);
      window.removeEventListener("storage", sync);
    };
  }, []);

  const choose = (next: ThemePreference) => {
    setPreference(next);
    applyThemePreference(next);
    void saveThemeToProfile(next);
  };

  const other: ThemePreference = preference === "dark" ? "light" : "dark";
  const CurrentIcon = options[preference].icon;

  return (
    <>
      {/* Phones: one compact button that flips between the two. */}
      <button
        type="button"
        onClick={() => choose(other)}
        aria-label={`Switch to ${options[other].label.toLowerCase()} theme`}
        title={`Switch to ${options[other].label.toLowerCase()} theme`}
        className={`inline-flex h-10 w-9 shrink-0 items-center justify-center border-2 border-ink bg-white transition hover:-translate-y-0.5 sm:hidden ${className}`}
      >
        <CurrentIcon className="h-4 w-4" aria-hidden />
      </button>

      {/* Wider screens: both states visible, the current one highlighted. */}
      <div
        className={`hidden h-10 shrink-0 items-center border-2 border-ink bg-white sm:inline-flex ${className}`}
        role="radiogroup"
        aria-label="Colour theme"
      >
        {themePreferences.map((value, index) => {
          const { label, icon: Icon } = options[value];
          const isActive = isReady && preference === value;

          return (
            <button
              key={value}
              type="button"
              role="radio"
              aria-checked={isActive}
              aria-label={label}
              title={label}
              onClick={() => choose(value)}
              className={`inline-flex h-full w-9 items-center justify-center transition ${
                index > 0 ? "border-l-2 border-ink" : ""
              } ${isActive ? "bg-cyan text-stamp" : "text-ink/55 hover:text-ink"}`}
            >
              <Icon className="h-4 w-4" aria-hidden />
            </button>
          );
        })}
      </div>
    </>
  );
}
