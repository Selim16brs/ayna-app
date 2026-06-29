import { Stack } from 'expo-router';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useLocale } from '../src/locale';
import { theme } from '../src/theme';

interface CardProps {
  title: string;
  subtitle: string;
  badge?: string;
}

function Card({ title, subtitle, badge }: CardProps) {
  return (
    <View style={styles.card}>
      <View style={styles.cardHeader}>
        <Text style={styles.cardTitle}>{title}</Text>
        {badge ? (
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{badge}</Text>
          </View>
        ) : null}
      </View>
      <Text style={styles.cardSubtitle}>{subtitle}</Text>
    </View>
  );
}

export default function HomeScreen() {
  const { t, locale } = useLocale();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <Stack.Screen options={{ headerShown: false }} />
      <ScrollView contentContainerStyle={styles.content}>
        <View style={styles.header}>
          <View>
            <Text style={styles.greeting}>{t('home.greeting')}</Text>
            <Text style={styles.subtitle}>{t('home.subtitle')}</Text>
          </View>
          <View style={styles.localePill}>
            <Text style={styles.localePillText}>{locale.toUpperCase()}</Text>
          </View>
        </View>

        <Text style={styles.sectionTitle}>AYNA Today</Text>

        <Card
          title={locale === 'kk' ? 'Жақын жазылу' : 'Ближайшая запись'}
          subtitle={locale === 'kk' ? 'Жұма 14:00 · Шаш сырлау' : 'Пятница 14:00 · Окрашивание'}
          badge={locale === 'kk' ? 'Расталды' : 'Подтверждено'}
        />
        <Card
          title={locale === 'kk' ? 'Күтім уақыты' : 'Время ухода'}
          subtitle={locale === 'kk' ? 'Маникюр жаңарту жақындады' : 'Скоро обновление маникюра'}
        />
        <Card
          title={locale === 'kk' ? 'Дос ұсынысы' : 'Совет подруги'}
          subtitle={
            locale === 'kk'
              ? '3 досыңыз осы шеберге барды'
              : '3 ваши подруги ходили к этому мастеру'
          }
          badge="AYNA Circle"
        />

        <View style={styles.note}>
          <Text style={styles.noteText}>
            {locale === 'kk'
              ? 'Бұл — алғашқы экран. Келесі: телефонмен кіру (OTP).'
              : 'Это первый экран. Далее: вход по телефону (OTP).'}
          </Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.bg },
  content: { padding: theme.spacing(3), gap: theme.spacing(2) },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: theme.spacing(1),
  },
  greeting: { color: theme.colors.text, fontSize: 26, fontWeight: '800' },
  subtitle: { color: theme.colors.muted, fontSize: 14, marginTop: 4 },
  localePill: {
    backgroundColor: theme.colors.surfaceAlt,
    paddingHorizontal: theme.spacing(1.5),
    paddingVertical: theme.spacing(0.5),
    borderRadius: theme.radius.pill,
  },
  localePillText: { color: theme.colors.accent, fontWeight: '700', fontSize: 13 },
  sectionTitle: {
    color: theme.colors.accent,
    fontSize: 13,
    fontWeight: '700',
    letterSpacing: 2,
    textTransform: 'uppercase',
    marginTop: theme.spacing(1),
  },
  card: {
    backgroundColor: theme.colors.surface,
    borderRadius: theme.radius.md,
    padding: theme.spacing(2),
    borderWidth: 1,
    borderColor: theme.colors.border,
  },
  cardHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  cardTitle: { color: theme.colors.text, fontSize: 17, fontWeight: '700' },
  cardSubtitle: { color: theme.colors.muted, fontSize: 14, marginTop: 6 },
  badge: {
    backgroundColor: theme.colors.primary,
    paddingHorizontal: theme.spacing(1),
    paddingVertical: 2,
    borderRadius: theme.radius.pill,
  },
  badgeText: { color: theme.colors.bg, fontSize: 11, fontWeight: '700' },
  note: {
    marginTop: theme.spacing(2),
    padding: theme.spacing(2),
    borderRadius: theme.radius.md,
    backgroundColor: theme.colors.surfaceAlt,
  },
  noteText: { color: theme.colors.muted, fontSize: 13, textAlign: 'center' },
});
