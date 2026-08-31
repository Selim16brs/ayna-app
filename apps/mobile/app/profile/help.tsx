import { useCallback, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useFocusEffect } from 'expo-router';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { api, ApiError, type SupportTicket } from '../../src/api';
import { FAQ } from '../../src/data';
import { useStore } from '../../src/store';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  Button,
  Screen,
  SectionHeader,
  StackHeader,
  TAB_BAR_CLEARANCE,
  Text,
  TextInput,
} from '../../src/ui';

// Yönlendirme başlıkları — sunucudaki TOPICS ile aynı.
const KONULAR = ['payment', 'booking', 'safety', 'account', 'other'] as const;
type Konu = (typeof KONULAR)[number];

export default function HelpScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState<string | null>(null);

  // DESTEK TALEBİ — bu düğme eskiden hiçbir şey yapmıyordu ("Yakında").
  // Parası takılan ya da güvenlik sorunu yaşayan biri için kabul edilemezdi.
  const token = useStore((s) => s.token);
  const [konu, setKonu] = useState<Konu>('other');
  const [metin, setMetin] = useState('');
  const [gonderiliyor, setGonderiliyor] = useState(false);
  const [talepler, setTalepler] = useState<SupportTicket[]>([]);

  const talepleriYukle = useCallback(() => {
    if (!token) return;
    void api
      .mySupportTickets(token)
      .then(setTalepler)
      .catch(() => undefined);
  }, [token]);
  useFocusEffect(talepleriYukle);

  const gonder = async () => {
    if (!token || gonderiliyor) return;
    if (metin.trim().length < 5) {
      Alert.alert(t('help.contact'), t('help.too_short'));
      return;
    }
    setGonderiliyor(true);
    try {
      await api.createSupportTicket(token, konu, metin.trim());
      setMetin('');
      talepleriYukle();
      Alert.alert(t('help.sent_t'), t('help.sent_b'));
    } catch (e) {
      const kod = e instanceof ApiError ? e.code : '';
      Alert.alert(
        t('help.contact'),
        kod === 'TOO_MANY_OPEN' ? t('help.too_many') : t('common.error'),
      );
    } finally {
      setGonderiliyor(false);
    }
  };

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('help.title')} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
        <Text variant="body" tone="inkSoft" style={styles.subtitle}>
          {t('help.subtitle')}
        </Text>

        <View style={[styles.group, shadow.soft]}>
          {FAQ.map((f, i) => {
            const expanded = open === f.id;
            return (
              <View key={f.id} style={i < FAQ.length - 1 && styles.rowBorder}>
                <Pressable style={styles.qRow} onPress={() => setOpen(expanded ? null : f.id)}>
                  <Text variant="bodyStrong" tone="ink" style={styles.qText}>
                    {f.q}
                  </Text>
                  <Ionicons
                    name={expanded ? 'chevron-up' : 'chevron-down'}
                    size={18}
                    color={colors.muted}
                  />
                </Pressable>
                {expanded && (
                  <Text variant="body" tone="inkSoft" style={styles.aText}>
                    {f.a}
                  </Text>
                )}
              </View>
            );
          })}
        </View>

        {/* BİZE ULAŞ — iki ölü satır yerine gerçek bir form.
            Konu başlığı yönlendirme için: güvenlik talebi ile fatura talebi
            aynı kuyrukta beklememeli. */}
        <SectionHeader title={t('help.contact')} />
        <View style={[styles.group, shadow.soft, styles.form]}>
          <View style={styles.konular}>
            {KONULAR.map((k) => (
              <Pressable
                key={k}
                onPress={() => setKonu(k)}
                style={[styles.konu, konu === k && styles.konuOn]}
                accessibilityRole="button"
                accessibilityState={{ selected: konu === k }}
              >
                <Text variant="caption" tone={konu === k ? 'onAccent' : 'inkSoft'}>
                  {t(`help.topic.${k}` as 'help.topic.other')}
                </Text>
              </Pressable>
            ))}
          </View>
          <TextInput
            value={metin}
            onChangeText={setMetin}
            placeholder={t('help.placeholder')}
            multiline
            style={styles.formInput}
          />
          <Button
            label={gonderiliyor ? t('common.loading') : t('help.send')}
            variant="primary"
            onPress={gonder}
          />
        </View>

        {/* Taleplerim + yanıtlar */}
        {talepler.length ? (
          <>
            <SectionHeader title={t('help.my_tickets')} />
            <View style={[styles.group, shadow.soft]}>
              {talepler.map((tk, i) => (
                <View key={tk.id} style={i < talepler.length - 1 ? styles.rowBorder : undefined}>
                  <View style={styles.ticketHead}>
                    <Text variant="caption" tone="muted" style={styles.rowLabel}>
                      {t(`help.topic.${tk.topic}` as 'help.topic.other')}
                    </Text>
                    <Text
                      variant="micro"
                      style={{ color: tk.reply ? colors.success : colors.gold }}
                    >
                      {t(tk.reply ? 'help.status.answered' : 'help.status.open')}
                    </Text>
                  </View>
                  <Text variant="body" tone="ink" style={styles.aText}>
                    {tk.body}
                  </Text>
                  {tk.reply ? (
                    <View style={styles.reply}>
                      <Text variant="caption" tone="inkSoft">
                        {tk.reply}
                      </Text>
                    </View>
                  ) : null}
                </View>
              ))}
            </View>
          </>
        ) : null}
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1),
      paddingBottom: TAB_BAR_CLEARANCE,
    },
    subtitle: { marginBottom: space(2.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    rowBorder: {
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: colors.surfaceMuted,
    },
    qRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(2),
    },
    qText: { flex: 1 },
    form: { gap: space(1.5) },
    konular: { flexDirection: 'row', flexWrap: 'wrap', gap: space(0.75) },
    konu: {
      paddingHorizontal: space(1.5),
      height: 34,
      borderRadius: radius.pill,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    konuOn: { backgroundColor: colors.accent },
    formInput: { minHeight: 96, textAlignVertical: 'top' },
    ticketHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1),
      paddingTop: space(1.5),
    },
    reply: {
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      padding: space(1.5),
      marginTop: space(1),
      marginBottom: space(1.5),
    },
    aText: {
      paddingHorizontal: space(2),
      paddingBottom: space(2),
      marginTop: -space(0.5),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    icon: {
      width: 38,
      height: 38,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowLabel: { flex: 1 },
  });
