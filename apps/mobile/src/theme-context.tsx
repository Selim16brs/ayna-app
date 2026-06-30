import {
  createContext,
  type ReactNode,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from 'react';
import { Appearance } from 'react-native';
import {
  type ColorTokens,
  gradientSets,
  type GradientTokens,
  makeShadow,
  palettes,
  type ThemeMode,
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
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [systemMode, setSystemMode] = useState<ThemeMode>(
    Appearance.getColorScheme() === 'dark' ? 'dark' : 'light',
  );
  // null = sistemi izle. Şimdilik bellekte; ileride kalıcı saklanabilir.
  const [preference, setPreference] = useState<ThemeMode | null>(null);

  useEffect(() => {
    const sub = Appearance.addChangeListener(({ colorScheme }) => {
      setSystemMode(colorScheme === 'dark' ? 'dark' : 'light');
    });
    return () => sub.remove();
  }, []);

  const mode = preference ?? systemMode;

  const toggle = useCallback(() => {
    setPreference((prev) => ((prev ?? systemMode) === 'dark' ? 'light' : 'dark'));
  }, [systemMode]);

  const value = useMemo<ThemeContextValue>(
    () => ({
      mode,
      isDark: mode === 'dark',
      colors: palettes[mode],
      gradients: gradientSets[mode],
      shadow: makeShadow(mode),
      preference,
      setPreference,
      toggle,
    }),
    [mode, preference, toggle],
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
