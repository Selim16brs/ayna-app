import { useEffect, useState } from 'react';
import { useRouter } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { space, type ColorTokens } from '../../src/theme';
import { useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

/**
 * MÜŞTERİ GÖZÜYLE PROFİLİM.
 *
 * Kurucu: "uzman kendi profilinin müşteri tarafında nasıl göründüğünü
 * göremiyor. kampanya ya da promosyonlarının nasıl göründüğünü göremiyor."
 *
 * Ekran AYRI BİR KOPYA DEĞİL: müşterinin gördüğü sayfanın ta kendisine
 * yönlendiriyor. Kopya bir önizleme yazsaydım ikisi zamanla ayrışır ve
 * "önizlemede böyle görünüyordu" diyen bir uzmanla karşılaşırdık.
 *
 * ── KARTI OLMAYAN UZMAN ─────────────────────────────────────────────────
 *
 * Hesap onaylanmadan keşif kartı yayında olmuyor. O durumda yönlendirme
 * "bulunamadı" ekranına düşerdi; sebebi burada yazılı.
 */
export default function SellerPreviewScreen() {
  const { t } = useLocale();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const token = useStore((s) => s.token);
  const [proId, setProId] = useState<string | null | undefined>(undefined);

  useEffect(() => {
    if (!token) {
      setProId(null);
      return;
    }
    let alive = true;
    void api
      .myProId(token)
      .then((r) => alive && setProId(r.proId))
      .catch(() => alive && setProId(null));
    return () => {
      alive = false;
    };
  }, [token]);

  useEffect(() => {
    // Kart varsa doğrudan müşterinin gördüğü sayfaya geç.
    if (proId) router.replace(`/professional/${proId}` as never);
  }, [proId, router]);

  return (
    <Screen edges={[]}>
      <StackHeader title={t('seller.menu.preview')} />
      <View style={styles.orta}>
        {proId === undefined ? (
          <ActivityIndicator />
        ) : (
          <>
            <Text variant="body" tone="inkSoft" style={styles.yazi}>
              {t('seller.menu.preview_none')}
            </Text>
            <Button label={t('common.back')} variant="secondary" onPress={() => router.back()} />
          </>
        )}
      </View>
    </Screen>
  );
}

const makeStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    orta: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(2),
      padding: space(3),
    },
    yazi: { textAlign: 'center' },
  });
