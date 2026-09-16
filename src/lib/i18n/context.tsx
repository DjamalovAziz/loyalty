"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { locales, translations, type Locale } from "./translations";

type LocaleContextValue = {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: (key: string) => string;
};

const LocaleContext = createContext<LocaleContextValue | null>(null);

const STORAGE_KEY = "loyaltysphere-locale";

function detectInitialLocale(): Locale {
  if (typeof window === "undefined") return "en";
  const stored = window.localStorage.getItem(STORAGE_KEY);
  if (stored && (locales as readonly string[]).includes(stored)) return stored as Locale;
  const browser = window.navigator.language.slice(0, 2);
  if ((locales as readonly string[]).includes(browser)) return browser as Locale;
  return "en";
}

export function LocaleProvider({ children }: { children: React.ReactNode }) {
  // Always render "en" on the server and on first client render so hydration matches;
  // swap to the detected/stored locale right after mount.
  const [locale, setLocaleState] = useState<Locale>("en");

  useEffect(() => {
    setLocaleState(detectInitialLocale());
  }, []);

  function setLocale(l: Locale) {
    setLocaleState(l);
    window.localStorage.setItem(STORAGE_KEY, l);
  }

  function t(key: string): string {
    return translations[locale][key] ?? translations.en[key] ?? key;
  }

  return <LocaleContext.Provider value={{ locale, setLocale, t }}>{children}</LocaleContext.Provider>;
}

export function useLocale() {
  const ctx = useContext(LocaleContext);
  if (!ctx) throw new Error("useLocale must be used within LocaleProvider");
  return ctx;
}
