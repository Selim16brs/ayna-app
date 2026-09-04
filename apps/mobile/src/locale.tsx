import { createContext, useContext, useEffect, useMemo, useState, type ReactNode } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { getLocales } from 'expo-localization';
import { DEFAULT_LOCALE, type Locale, type MessageKey, t as translate } from '@ayna/i18n';

const DIL_ANAHTARI = 'ayna.locale';

/**
 * CİHAZ DİLİNDEN UYGULAMA DİLİ.
 *
 * `expo-localization` kuruluydu ama `getLocales()` HİÇBİR YERDE
 * çağrılmıyordu; `DEFAULT_LOCALE='tr'` sabitti. Yani telefonu Rusça olan
 * bir Almatı kullanıcısı uygulamayı okuyamadığı bir dilde karşılıyordu.
 *
 * Üçün dışındaki her dil RU'ya düşüyor — hedef pazarın ortak dili o.
 * Türkçe yalnız cihaz Türkçeyse açılıyor (geliştirme dili olması onu
 * kullanıcı varsayılanı yapmaz).
 */
function cihazDili(): Locale {
  try {
    for (const l of getLocales()) {
      const kod = (l.languageCode ?? '').toLowerCase();
      if (kod === 'tr' || kod === 'kk' || kod === 'ru') return kod;
    }
  } catch {
    // Yerelleştirme okunamazsa pazarın ortak diline düş.
  }
  return 'ru';
}

interface LocaleContextValue {
  locale: Locale;
  setLocale: (locale: Locale) => void;
  t: (key: MessageKey) => string;
  /**
   * Kullanıcının KAYITLI dil seçimi okundu mu?
   *
   * `locale` ilk karede CİHAZ dilidir; kullanıcının kendi seçimi
   * AsyncStorage'dan asenkron geliyor. Bir kez seçilip donan içerikler
   * (açılış mesajı) bunu beklemezse yanlış dilde donar: telefonu Türkçe
   * ama uygulaması Rusça olan kullanıcı Türkçe mesaj görürdü.
   */
  hazir: boolean;
}

const LocaleContext = createContext<LocaleContextValue>({
  locale: DEFAULT_LOCALE,
  setLocale: () => undefined,
  t: (key) => translate(DEFAULT_LOCALE, key),
  hazir: false,
});

// §14.5 — hook-DIŞI erişim (store gibi): geçerli dili modül değişkeninde tutar.
let _currentLocale: Locale = DEFAULT_LOCALE;
export const getCurrentLocale = (): Locale => _currentLocale;

export function LocaleProvider({ children }: { children: ReactNode }) {
  // Başlangıç CİHAZ DİLİ — eşzamanlı okunuyor, yani ilk kare doğru dilde
  // çiziliyor. Kullanıcının kendi seçimi varsa aşağıdaki etki onu eziyor.
  const [locale, setLocaleState] = useState<Locale>(() => {
    const d = cihazDili();
    _currentLocale = d;
    return d;
  });

  const setLocale = (l: Locale) => {
    _currentLocale = l;
    setLocaleState(l);
    // KALICI. Eskiden hiçbir yere yazılmıyordu: karşılama ekranındaki yorum
    // "dil seçimi kalıcı" diyordu ama her soğuk açılış Türkçeye dönüyordu.
    void AsyncStorage.setItem(DIL_ANAHTARI, l).catch(() => undefined);
  };

  const [hazir, setHazir] = useState(false);
  useEffect(() => {
    // Kullanıcının AÇIK seçimi cihaz dilini ezer — bir kez, açılışta.
    void AsyncStorage.getItem(DIL_ANAHTARI)
      .then((v) => {
        if (v === 'tr' || v === 'kk' || v === 'ru') {
          _currentLocale = v;
          setLocaleState(v);
        }
      })
      .catch(() => undefined)
      // Okuma bitti: kayıt olsun ya da olmasın, artık dil KESİN.
      // `finally` şart — okuma hata verirse de beklemeyi bitirmeliyiz,
      // yoksa açılış mesajı hiç gösterilmezdi.
      .finally(() => setHazir(true));
  }, []);
  const value = useMemo<LocaleContextValue>(
    () => ({ locale, setLocale, t: (key) => translate(locale, key), hazir }),
    [locale, hazir],
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
