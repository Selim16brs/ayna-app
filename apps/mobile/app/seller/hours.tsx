import { useCallback, useState } from 'react';
import { useFocusEffect } from 'expo-router';
import { Alert, ScrollView, StyleSheet } from 'react-native';
import { api } from '../../src/api';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { space, type ColorTokens } from '../../src/theme';
import { useThemedStyles } from '../../src/theme-context';
import {
  Button,
  Screen,
  StackHeader,
  Text,
  WorkingHours,
  type DayHours,
} from '../../src/ui';

/**
 * ÇALIŞMA SAATLERİ — kendi ekranı, kendi kaydı.
 *
 * Eskiden "Profili düzenle" ekranının içindeydi ve oradaki her şey gibi ADMIN
 * ONAYINA gidiyordu. İkisi de yanlıştı: saatler uzmanın kendi takvimi, onay
 * beklemesi anlamsız; ve ad/sosyal medya ile aynı formda olması, saat
 * değiştirmek isteyeni gereksiz bir onay kuyruğuna sokuyordu.
 *
 * Artık doğrudan kaydediliyor. Tek istisna ÇAKIŞMA: kapatılan bir aralıkta
 * onaylanmış müşteri randevusu varsa sunucu bunu döndürüyor ve uzman
 * uyarılıyor — çünkü müşteri o saate göre plan yaptı.
 */
export default function SellerHoursScreen() {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  const sellerHours = useStore((s) => s.sellerHours);
  const setSellerHours = useStore((s) => s.setSellerHours);
  const [hours, setHours] = useState<DayHours[]>(sellerHours);
  const [busy, setBusy] = useState(false);

  // Ekrana her dönüşte sunucudaki gerçeği al: başka cihazdan değişmiş olabilir.
  useFocusEffect(
    useCallback(() => {
      void api
        .myHours()
        .then((r) => {
          if (r.hours?.length) {
            setHours(r.hours);
            setSellerHours(r.hours);
          }
        })
        .catch(() => undefined);
    }, [setSellerHours]),
  );

  const kaydet = async () => {
    if (busy) return;
    setBusy(true);
    try {
      const r = await api.setMyHours(hours);
      setSellerHours(r.hours ?? hours);
      if (r.conflicts?.length) {
        // Randevular İPTAL EDİLMEZ: müşteri onayladığı saati kaybetmemeli.
        // Uzman ya saatleri geri açar ya da randevuyu kendi iptal eder —
        // ikisini de yapmazsa gelmemesi "uzman gelmedi" cezası doğurur.
        Alert.alert(
          t('hours.conflict_t'),
          `${t('hours.conflict_b')}\n\n${r.conflicts.map((c) => `• ${c.dateLabel}`).join('\n')}\n\n${t('hours.conflict_penalty')}`,
          [{ text: t('common.ok') }],
        );
      } else {
        Alert.alert(t('hours.saved'));
      }
    } catch {
      Alert.alert(t('common.error'));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('hours.title')} subtitle={t('hours.subtitle')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <WorkingHours value={hours} onChange={setHours} />
        <Text variant="caption" tone="muted" style={styles.note}>
          {t('hours.note')}
        </Text>
        <Button label={t('common.save')} variant="primary" onPress={kaydet} disabled={busy} />
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (_colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1),
      paddingBottom: space(3),
      gap: space(2),
    },
    note: { lineHeight: 18 },
  });
