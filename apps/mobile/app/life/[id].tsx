import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { ImageBackground, Pressable, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getArticle } from '../../src/data';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

export default function ArticleDetailScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const router = useRouter();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = getArticle(id ?? '');

  if (!article) {
    return (
      <Screen edges={[]}>
        <StackHeader title={t('life.title')} />
        <View style={styles.empty}>
          <Text variant="body" tone="muted">
            {t('common.soon')}
          </Text>
        </View>
      </Screen>
    );
  }

  return (
    <Screen edges={[]}>
      <StackHeader title={t('life.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        {/* Tam-kadraj kapak foto — ProCard dili: alta koyu gradient + üstte başlık */}
        <ImageBackground
          source={{ uri: article.image }}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={['rgba(24,18,22,0)', 'rgba(24,18,22,0.25)', 'rgba(24,18,22,0.9)']}
            locations={[0, 0.5, 1]}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTag}>
            <Text variant="caption" tone="onAccent" style={styles.heroTagText}>
              {article.tag}
            </Text>
          </View>
          <View style={styles.heroBottom}>
            <Text variant="title" tone="onColor" style={styles.heroTitle}>
              {article.title}
            </Text>
            <View style={styles.heroMeta}>
              <Text variant="caption" tone="onColor" style={styles.heroMetaText}>
                {article.readMin} {t('life.read')}
              </Text>
            </View>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <Text variant="bodyStrong" tone="ink" style={styles.lead}>
            {article.excerpt}
          </Text>

          {article.body.map((para, i) => (
            <Text key={i} variant="body" tone="inkSoft" style={styles.para}>
              {para}
            </Text>
          ))}

          {/* §5.5 — yazı sonunda bağlamsal teklif köprüsü */}
          <Pressable style={styles.cta} onPress={() => router.push('/demand/new')}>
            <View style={styles.ctaIcon}>
              <Ionicons name="pricetags" size={18} color={colors.onAccent} />
            </View>
            <Text variant="bodyStrong" tone="onAccent" style={styles.ctaText}>
              {t('life.cta')}
            </Text>
            <Ionicons name="arrow-forward" size={18} color={colors.onAccent} />
          </Pressable>
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: space(13) },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    hero: {
      height: 320,
      marginHorizontal: space(3),
      marginTop: space(2.5),
      borderRadius: radius.xl,
      overflow: 'hidden',
      justifyContent: 'flex-start',
      backgroundColor: colors.bgSunken,
    },
    heroImage: { borderRadius: radius.xl },
    heroTag: {
      position: 'absolute',
      top: space(2),
      left: space(2),
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.5),
      paddingVertical: 6,
      borderRadius: radius.pill,
    },
    heroTagText: { fontWeight: '800' },
    heroBottom: {
      position: 'absolute',
      left: space(2.25),
      right: space(2.25),
      bottom: space(2.25),
    },
    heroTitle: { fontSize: 26, lineHeight: 31, fontWeight: '800', letterSpacing: -0.5 },
    heroMeta: { flexDirection: 'row', alignItems: 'center', marginTop: space(1) },
    heroMetaText: { opacity: 0.9, fontWeight: '600' },
    body: { paddingHorizontal: space(3), paddingTop: space(3) },
    lead: { fontSize: 17, lineHeight: 25 },
    para: { marginTop: space(2.25), lineHeight: 25 },
    cta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      backgroundColor: colors.accent,
      borderRadius: radius.lg,
      padding: space(2),
      marginTop: space(3),
    },
    ctaIcon: {
      width: 40,
      height: 40,
      borderRadius: radius.md,
      backgroundColor: 'rgba(0,0,0,0.12)',
      alignItems: 'center',
      justifyContent: 'center',
    },
    ctaText: { flex: 1 },
  });
