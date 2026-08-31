import { Component, type ErrorInfo, type ReactNode } from 'react';
import { Pressable, StyleSheet, View } from 'react-native';
import { t } from '@ayna/i18n';
import { getCurrentLocale } from '../locale';
import { radius, space, font } from '../theme';
import { lightColors } from '../theme.palette';
import { Text } from './Text';

/**
 * HATA SINIRI — çökme yerine kurtarma ekranı.
 *
 * Denetim #9: _"Yakalanmamış hata olduğunda uygulama kapanmaz; kullanıcıya
 * kurtarma ekranı gösterir."_ Uygulamada hiçbir hata sınırı YOKTU: tek bir
 * render hatası (ör. sunucudan beklenmedik biçimde veri gelmesi) uygulamayı
 * kapatıyordu ve kullanıcı ne olduğunu bilmiyordu.
 *
 * SINIRI: bu bileşen yalnız RENDER ve yaşam döngüsü hatalarını yakalar.
 * Olay işleyicisindeki ve async koddaki hatalar buraya DÜŞMEZ — onlar için
 * `kurGlobalHataYakalayici` var (aşağıda).
 *
 * TEMA: kasıtlı olarak açık palet sabit. Kurtarma ekranı, tema sağlayıcısının
 * KENDİSİ patladığında da çizilebilmeli; `useTheme` çağırmak o durumda ikinci
 * bir çökme üretirdi.
 */
interface Props {
  children: ReactNode;
  /** Hata kaydı — Sentry bağlanınca buraya verilecek. */
  onError?: (error: Error, info: ErrorInfo) => void;
}
interface State {
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  state: State = { error: null };

  static getDerivedStateFromError(error: Error): State {
    return { error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    this.props.onError?.(error, info);
  }

  private yeniden = () => this.setState({ error: null });

  render() {
    if (!this.state.error) return this.props.children;
    const dil = getCurrentLocale();
    return (
      <View style={styles.root}>
        <View style={styles.card}>
          <Text variant="h2" style={styles.title}>
            {t(dil, 'crash.title')}
          </Text>
          <Text variant="body" style={styles.body}>
            {t(dil, 'crash.body')}
          </Text>
          {/* HATA METNİ GÖSTERİLMEZ. Denetim #11: kullanıcıya stack trace ya da
              teknik metin gösterilmez — anlamı yok ve güven kırar. Ayrıntı
              hata kaydına gider. */}
          <Pressable style={styles.button} onPress={this.yeniden} accessibilityRole="button">
            <Text variant="cta" style={styles.buttonText}>
              {t(dil, 'crash.retry')}
            </Text>
          </Pressable>
        </View>
      </View>
    );
  }
}

/**
 * KÜRESEL HATA YAKALAYICI — async ve olay işleyicisi hataları.
 *
 * Hata sınırı bunları göremez. React Native'de yakalanmamış bir JS hatası
 * varsayılan olarak kırmızı ekran (geliştirme) ya da SESSİZ ÇÖKME (üretim)
 * üretiyor. Burada yakalanıp kayda alınıyor; uygulama ayakta kalıyor.
 *
 * `isFatal` olsa bile varsayılan davranışı ÇAĞIRMIYORUZ: o davranış üretimde
 * uygulamayı kapatmak demek ve denetim tam bunu yasaklıyor.
 */
export function kurGlobalHataYakalayici(kaydet: (e: unknown, olumcul: boolean) => void): void {
  const g = globalThis as { ErrorUtils?: { setGlobalHandler: (h: unknown) => void } };
  if (!g.ErrorUtils?.setGlobalHandler) return;
  g.ErrorUtils.setGlobalHandler((error: unknown, isFatal?: boolean) => {
    kaydet(error, !!isFatal);
  });
}

const c = lightColors;
const styles = StyleSheet.create({
  root: {
    flex: 1,
    backgroundColor: c.bg,
    alignItems: 'center',
    justifyContent: 'center',
    padding: space(3),
  },
  card: {
    width: '100%',
    backgroundColor: c.surface,
    borderRadius: radius.lg,
    padding: space(3),
    gap: space(1.5),
    alignItems: 'center',
  },
  title: { color: c.ink, textAlign: 'center' },
  body: { color: c.muted, textAlign: 'center', lineHeight: 22 },
  button: {
    marginTop: space(1),
    backgroundColor: c.accent,
    borderRadius: radius.pill,
    paddingHorizontal: space(3),
    paddingVertical: space(1.5),
    minHeight: 44,
    justifyContent: 'center',
  },
  buttonText: { color: c.onAccent, fontFamily: font.semibold },
});
