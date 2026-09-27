"use client";

import * as React from "react";

/*
  Theme (Light / Dark / System).

  Do hisse hain:
    1) ThemeScript  -> <head> me chalta hai, paint se PEHLE <html> par class laga
                       deta hai. Is ke baghair page ek lamhe ke liye galat theme
                       me flash karta hai.
    2) ThemeProvider-> React side par state rakhta hai, localStorage me choice
                       persist karta hai, aur "system" par OS ke sath chalta hai.

  Yeh sirf dikhawe ka faisla hai. Theme ka kisi permission, data ya security se
  koi taalluq nahi - is liye poora kaam client par hona theek hai.
*/

export type Theme = "light" | "dark" | "system";

export const THEME_STORAGE_KEY = "profaura-theme";

const THEMES: readonly Theme[] = ["light", "dark", "system"];

function isTheme(value: unknown): value is Theme {
  return typeof value === "string" && (THEMES as readonly string[]).includes(value);
}

/**
 * Blocking script. Chhota rakha gaya hai kyunke yeh render se pehle chalta hai.
 * try/catch is liye ke private mode me localStorage throw kar sakta hai.
 *
 * nonce: CSP ke tehat inline script ko middleware ka per-request nonce chahiye,
 * warna enforce mode me browser ise block kar dega. Layout `headers()` se nonce
 * uthaa kar deta hai; na mile to prop chhod dete hain (report-only me bhi theek).
 */
export function ThemeScript({ nonce }: { nonce?: string }) {
  const script = `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});var d=t==="dark"||((t===null||t==="system")&&window.matchMedia("(prefers-color-scheme: dark)").matches);document.documentElement.classList.toggle("dark",d);document.documentElement.style.colorScheme=d?"dark":"light";}catch(e){}})();`;

  return <script nonce={nonce} dangerouslySetInnerHTML={{ __html: script }} />;
}

interface ThemeContextValue {
  theme: Theme;
  /** Jo asal me lagi hui hai (system resolve hone ke baad). */
  resolvedTheme: "light" | "dark";
  setTheme: (theme: Theme) => void;
}

const ThemeContext = React.createContext<ThemeContextValue | null>(null);

function applyTheme(theme: Theme): "light" | "dark" {
  const prefersDark =
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-color-scheme: dark)").matches;
  const dark = theme === "dark" || (theme === "system" && prefersDark);

  document.documentElement.classList.toggle("dark", dark);
  document.documentElement.style.colorScheme = dark ? "dark" : "light";

  return dark ? "dark" : "light";
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = React.useState<Theme>("system");
  const [resolvedTheme, setResolvedTheme] = React.useState<"light" | "dark">("light");

  // Pehle render par stored choice uthao. Script pehle hi class laga chuki hai,
  // yahan sirf React ka state usi ke sath mila rahe hain.
  React.useEffect(() => {
    let stored: string | null = null;
    try {
      stored = window.localStorage.getItem(THEME_STORAGE_KEY);
    } catch {
      stored = null;
    }
    const next = isTheme(stored) ? stored : "system";
    setThemeState(next);
    setResolvedTheme(applyTheme(next));
  }, []);

  // "System" par OS ki setting badle to turant follow karo.
  React.useEffect(() => {
    if (theme !== "system") return;

    const media = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = () => setResolvedTheme(applyTheme("system"));

    media.addEventListener("change", onChange);
    return () => media.removeEventListener("change", onChange);
  }, [theme]);

  const setTheme = React.useCallback((next: Theme) => {
    setThemeState(next);
    setResolvedTheme(applyTheme(next));
    try {
      window.localStorage.setItem(THEME_STORAGE_KEY, next);
    } catch {
      // Storage band hai (private mode). Choice sirf is session ke liye chalegi.
    }
  }, []);

  const value = React.useMemo(
    () => ({ theme, resolvedTheme, setTheme }),
    [theme, resolvedTheme, setTheme],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const context = React.useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used inside ThemeProvider");
  }
  return context;
}
