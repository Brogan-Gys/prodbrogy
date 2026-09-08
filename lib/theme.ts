export type ThemePreference = "light" | "dark";

export const THEME_STORAGE_KEY = "prodbrogy-theme";
export const THEME_EVENT = "theme:change";
export const DEFAULT_THEME: ThemePreference = "light";

/** Page background per theme, mirrored into <meta name="theme-color"> so the
 *  mobile browser chrome matches the page instead of the OS setting. */
export const THEME_COLORS: Record<ThemePreference, string> = {
  light: "#f6f1e7",
  dark: "#14130f"
};

export const themePreferences: ThemePreference[] = ["light", "dark"];

export function isThemePreference(value: unknown): value is ThemePreference {
  return value === "light" || value === "dark";
}

export function readThemePreference(): ThemePreference {
  try {
    const stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    return isThemePreference(stored) ? stored : DEFAULT_THEME;
  } catch {
    return DEFAULT_THEME;
  }
}

/**
 * Writes the theme to the document so the CSS variables switch, and mirrors it
 * to localStorage so the inline boot script can replay it before first paint.
 * Persisting it to the signed-in profile is handled by the account layer.
 */
export function applyThemePreference(preference: ThemePreference): ThemePreference {
  const root = document.documentElement;

  root.dataset.theme = preference;
  root.style.colorScheme = preference;

  try {
    window.localStorage.setItem(THEME_STORAGE_KEY, preference);
  } catch {
    // Private mode / blocked storage: the choice just won't survive a reload.
  }

  document
    .querySelector('meta[name="theme-color"]')
    ?.setAttribute("content", THEME_COLORS[preference]);

  window.dispatchEvent(new CustomEvent(THEME_EVENT, { detail: { preference } }));

  return preference;
}

/** Runs in <head> before first paint so the page never flashes the wrong theme.
 *  Keep it dependency-free and small — it is inlined into the HTML. */
export const themeInitScript = `(function(){try{var k=${JSON.stringify(THEME_STORAGE_KEY)};var p=localStorage.getItem(k);if(p!=="light"&&p!=="dark"){p=${JSON.stringify(DEFAULT_THEME)}}var d=document.documentElement;d.dataset.theme=p;d.style.colorScheme=p;var m=document.querySelector('meta[name="theme-color"]');if(m){m.setAttribute("content",p==="dark"?"#14130f":"#f6f1e7")}}catch(e){}})();`;
