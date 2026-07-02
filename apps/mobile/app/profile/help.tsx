import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Alert, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { FAQ } from '../../src/data';
import { useLocale } from '../../src/locale';
import { radius, space, type ColorTokens } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

export default function HelpScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const [open, setOpen] = useState<string | null>(null);

  const onContact = () => Alert.alert(t('common.soon'));

  return (
    <Screen edges={[]}>
      <StackHeader title={t('help.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.subtitle}>
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

        {/* Bize ulaş */}
        <Text variant="label" tone="rose" style={styles.section}>
          {t('help.contact')}
        </Text>
        <View style={[styles.group, shadow.soft]}>
          <Pressable onPress={onContact} style={[styles.row, styles.rowBorder]}>
            <View style={[styles.icon, { backgroundColor: colors.roseSoft }]}>
              <Ionicons name="chatbubbles-outline" size={18} color={colors.rose} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
              {t('help.chat')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
          <Pressable onPress={onContact} style={styles.row}>
            <View style={[styles.icon, { backgroundColor: colors.blueSoft }]}>
              <Ionicons name="mail-outline" size={18} color={colors.blue} />
            </View>
            <Text variant="bodyStrong" tone="ink" style={styles.rowLabel}>
              {t('help.email')}
            </Text>
            <Ionicons name="chevron-forward" size={18} color={colors.muted} />
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    subtitle: { marginBottom: space(2) },
    section: { marginTop: space(3), marginBottom: space(1.5) },
    group: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      overflow: 'hidden',
    },
    rowBorder: { borderBottomWidth: 1, borderBottomColor: colors.line },
    qRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    qText: { flex: 1 },
    aText: {
      paddingHorizontal: space(2),
      paddingBottom: space(1.75),
      marginTop: -space(0.5),
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.5),
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
