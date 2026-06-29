import { Feather } from '@expo/vector-icons';
import { ScrollView, StyleSheet, View } from 'react-native';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../src/locale';
import { Badge, Card, Screen, Text } from '../src/ui';
import { colors, radius, space } from '../src/theme';

type IconName = keyof typeof Feather.glyphMap;

interface Item {
  icon: IconName;
  tone: 'rose' | 'gold';
  titleKey: MessageKey;
  subtitleKey: MessageKey;
  badge?: { key?: MessageKey; text?: string; tone: 'rose' | 'gold' | 'neutral' };
}

const ITEMS: Item[] = [
  {
    icon: 'calendar',
    tone: 'rose',
    titleKey: 'home.upcoming.title',
    subtitleKey: 'home.upcoming.subtitle',
    badge: { key: 'home.upcoming.badge', tone: 'rose' },
  },
  { icon: 'clock', tone: 'gold', titleKey: 'home.care.title', subtitleKey: 'home.care.subtitle' },
  {
    icon: 'users',
    tone: 'rose',
    titleKey: 'home.friend.title',
    subtitleKey: 'home.friend.subtitle',
    badge: { text: 'AYNA Circle', tone: 'gold' },
  },
];

export default function HomeScreen() {
  const { t, locale } = useLocale();

  return (
    <Screen edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <View style={styles.header}>
          <View style={styles.headerText}>
            <Text variant="title" tone="ink">
              {t('home.greeting')}
            </Text>
            <Text variant="caption" tone="inkSoft" style={styles.subtitle}>
              {t('home.subtitle')}
            </Text>
          </View>
          <View style={styles.localePill}>
            <Text variant="caption" tone="gold" style={styles.localePillText}>
              {locale.toUpperCase()}
            </Text>
          </View>
        </View>

        <Text variant="label" tone="gold" style={styles.section}>
          {t('home.section.today')}
        </Text>

        <View style={styles.list}>
          {ITEMS.map((item) => (
            <Card key={item.titleKey} style={styles.card}>
              <View
                style={[
                  styles.iconChip,
                  { backgroundColor: item.tone === 'rose' ? colors.roseSoft : colors.goldSoft },
                ]}
              >
                <Feather
                  name={item.icon}
                  size={20}
                  color={item.tone === 'rose' ? colors.rose : colors.gold}
                />
              </View>
              <View style={styles.cardBody}>
                <View style={styles.cardTop}>
                  <Text variant="h2" tone="ink" style={styles.cardTitle}>
                    {t(item.titleKey)}
                  </Text>
                  {item.badge ? (
                    <Badge
                      label={item.badge.key ? t(item.badge.key) : (item.badge.text ?? '')}
                      tone={item.badge.tone}
                    />
                  ) : null}
                </View>
                <Text variant="caption" tone="inkSoft" style={styles.cardSubtitle}>
                  {t(item.subtitleKey)}
                </Text>
              </View>
            </Card>
          ))}
        </View>

        <View style={styles.note}>
          <Feather name="info" size={14} color={colors.muted} />
          <Text variant="caption" tone="muted" style={styles.noteText}>
            {t('home.next_note')}
          </Text>
        </View>
      </ScrollView>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { padding: space(3), paddingBottom: space(6) },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: space(3),
  },
  headerText: { flex: 1 },
  subtitle: { marginTop: space(0.5) },
  localePill: {
    backgroundColor: colors.goldSoft,
    paddingHorizontal: space(1.25),
    paddingVertical: space(0.5),
    borderRadius: radius.pill,
  },
  localePillText: { letterSpacing: 1 },
  section: { marginBottom: space(1.5) },
  list: { gap: space(1.5) },
  card: { flexDirection: 'row', alignItems: 'center', gap: space(1.5) },
  iconChip: {
    width: 46,
    height: 46,
    borderRadius: radius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cardBody: { flex: 1 },
  cardTop: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  cardTitle: { flexShrink: 1, paddingRight: space(1) },
  cardSubtitle: { marginTop: space(0.5) },
  note: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    marginTop: space(3),
    paddingHorizontal: space(1),
  },
  noteText: { flex: 1 },
});
