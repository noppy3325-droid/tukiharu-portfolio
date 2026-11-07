import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";
import { englishUi } from "@/lib/uiTranslations";

export type Locale = "ja" | "en";
const storageKey = "tsukiharu-ui-language-v1";
export function browserLocale(languages: readonly string[]): Locale {
  for (const language of languages) {
    const primary = language.toLowerCase().split("-")[0];
    if (primary === "ja" || primary === "en") return primary;
  }
  return "ja";
}
export function translateUi(locale: Locale, text: string) {
  return locale === "en" ? (englishUi[text.trim()] ?? text) : text;
}
const LocaleContext = createContext({
  locale: "ja" as Locale,
  preference: "auto",
  setPreference: (_value: string) => {},
  t: (text: string) => text,
});

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [preference, setPreferenceState] = useState(() => {
    try {
      return localStorage.getItem(storageKey) ?? "auto";
    } catch {
      return "auto";
    }
  });
  const [detected, setDetected] = useState(() =>
    typeof navigator === "undefined"
      ? ("ja" as Locale)
      : browserLocale(navigator.languages)
  );
  const locale =
    preference === "en" || preference === "ja" ? preference : detected;
  useEffect(() => {
    const update = () => setDetected(browserLocale(navigator.languages));
    window.addEventListener("languagechange", update);
    return () => window.removeEventListener("languagechange", update);
  }, []);
  useEffect(() => {
    document.documentElement.lang = locale;
  }, [locale]);
  const setPreference = (value: string) => {
    if (!["auto", "ja", "en"].includes(value)) return;
    setPreferenceState(value);
    try {
      localStorage.setItem(storageKey, value);
    } catch {
      /* The switch still works without storage. */
    }
  };
  return (
    <LocaleContext.Provider
      value={{
        locale,
        preference,
        setPreference,
        t: text => translateUi(locale, text),
      }}
    >
      {children}
    </LocaleContext.Provider>
  );
}
export const useLocale = () => useContext(LocaleContext);
