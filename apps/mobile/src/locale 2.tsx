import { createContext, useContext, useMemo, useState, type ReactNode } from 'react';
import { DEFAULT_LOCALE, type Locale, type MessageKey, t as translate } from '@ayna/i18n';

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key) => translate(DEFAULT_LOCALE, key),
});

// §14.5 — hook-DIŞI erişim (store gibi): geçerli dili modül değişkeninde tutar.
let _currentLocale: Locale = DEFAULT_LOCALE;
export const getCurrentLocale = (): Locale => _currentLocale;

export function LocaleProvider({ children }: { children: ReactNode }) {
  const [locale, setLocaleState] = useState<Locale>(DEFAULT_LOCALE);
  const setLocale = (l: Locale) => {
    _currentLocale = l;
    setLocaleState(l);
  };
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key) => translate(locale, key) }),
    [locale],
  );
  return <LocaleContext.Provider value={value}>{children}</LocaleContext.Provider>;
}

export function useLocale(): LocaleContextValue {
  return useContext(LocaleContext);
}

// §14.5 — çevrilmiş metindeki {placeholder}'ları params ile doldurur (basit interpolasyon).
export function fillParams(str: string, params?: Record<string, string | number>): string {
  if (!params) return str;
  return str.replace(/\{(\w+)\}/g, (_, k: string) =>
    params[k] != null ? String(params[k]) : `{${k}}`,
  );
}
