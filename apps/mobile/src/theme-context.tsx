import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Appearance } from 'react-native';
import {
  type AksanAnahtari,
  aksanCoz,
  type ColorTokens,
  type GradientTokens,
  gradyanUret,
  makeShadow,
  paletUret,
  type ThemeMode,
  VARSAYILAN_AKSAN,
} from './theme';

interface ThemeContextValue {
  mode: ThemeMode;
  isDark: boolean;
  colors: ColorTokens;
  gradients: GradientTokens;
  shadow: ReturnType<typeof makeShadow>;
  /** Kullanıcının açık/koyu tercihi; null ise sistem temasını izler. */
  preference: ThemeMode | null;
  setPreference: (mode: ThemeMode | null) => void;
  toggle: () => void;
  /** Kullanıcının seçtiği uygulama rengi; seçim yoksa varsayılan ('gul'). */
  aksan: AksanAnahtari;
  setAksan: (aksan: AksanAnahtari) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

const TEMA_ANAHTARI = 'ayna.theme';
/**
 * UYGULAMA RENGİ — tema tercihiyle AYNI mantık: seçim kalıcı, seçim yoksa
 * varsayılan. Ayrı bir anahtar çünkü ikisi bağımsız: kullanıcı koyu temada
 * Zümrüt, açık temada da Zümrüt kullanır.
 */
const AKSAN_ANAHTARI = 'ayna.accent';

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemMode, setSystemMode] = useState<ThemeMode>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );
  /**
   * §15 — TEMA TERCİHİ KALICI.
   *
   * Eskiden yalnız bellekteydi (kodun kendi yorumu "şimdilik bellekte"
   * diyordu): kullanıcı profilden "koyu" seçiyor, uygulamayı kapatıp
   * açınca SİSTEM temasına geri dönüyordu. Dil seçiminde bulunan hatanın
   * aynısıydı.
   *
   * `null` = sistemi izle (varsayılan). Kullanıcı açıkça seçerse o kalıcı.
   */
  const [preference, setPreferenceState] = useState<ThemeMode | null>(null);
  const [aksan, setAksanState] = useState<AksanAnahtari>(VARSAYILAN_AKSAN);

  const setAksan = useCallback((secim: AksanAnahtari) => {
    setAksanState(secim);
    void AsyncStorage.setItem(AKSAN_ANAHTARI, secim).catch(() => undefined);
  }, []);

  const setPreference = useCallback((mode: ThemeMode | null) => {
    setPreferenceState(mode);
    // `null` seçimi de KALICI: "sisteme dön" bir tercih, tercihsizlik değil.
    void (
      mode === null
        ? AsyncStorage.removeItem(TEMA_ANAHTARI)
        : AsyncStorage.setItem(TEMA_ANAHTARI, mode)
    ).catch(() => undefined);
  }, []);

  useEffect(() => {
    // İKİ ANAHTAR TEK OKUMADA: açılışta ayrı ayrı beklemek gereksiz gecikme.
    void AsyncStorage.multiGet([TEMA_ANAHTARI, AKSAN_ANAHTARI])
      .then((ciftler) => {
        const kayit = Object.fromEntries(ciftler);
        const tema = kayit[TEMA_ANAHTARI];
        if (tema === 'dark' || tema === 'light') setPreferenceState(tema);
        // Bilinmeyen/bozuk kayıt varsayılana düşer — çökmek yerine gül kalır.
        setAksanState(aksanCoz(kayit[AKSAN_ANAHTARI]));
      })
      .catch(() => undefined);
  }, []);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemMode(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const mode = preference ?? systemMode;

  const toggle = useCallback(() => {
    // `setPreference` artık kalıcılığı da yaptığı için güncelleyici fonksiyon
    // kabul etmiyor; geçerli değer zaten elimizde.
    setPreference(mode === 'dark' ? 'light' : 'dark');
  }, [mode, setPreference]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: mode === 'dark',
      colors: paletUret(mode, aksan),
      gradients: gradyanUret(mode, aksan),
      shadow: makeShadow(mode),
      preference,
      setPreference,
      toggle,
      aksan,
      setAksan,
    }),
    [mode, preference, toggle, aksan, setAksan],
  );

  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

export function useTheme(): ThemeContextValue {
  const ctx = useContext(ThemeContext);
  if (!ctx) throw new Error('useTheme must be used within a ThemeProvider');
  return ctx;
}

/**
 * Tema renk/gradyanlarına bağlı StyleSheet üretir ve tema değişince yeniden hesaplar.
 * Kullanım:
 *   const styles = useThemedStyles(makeStyles);
 *   const makeStyles = (c: ColorTokens, g: GradientTokens) => StyleSheet.create({ ... });
 */
export function useThemedStyles<T>(
  factory: (colors: ColorTokens, gradients: GradientTokens) => T,
): T {
  const { colors, gradients } = useTheme();
  return useMemo(() => factory(colors, gradients), [factory, colors, gradients]);
}
