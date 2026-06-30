import { useLocalSearchParams } from 'expo-router';
import { ImageBackground, ScrollView, StyleSheet, View } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { getArticle } from '../../src/data';
import { useLocale } from '../../src/locale';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useThemedStyles } from '../../src/theme-context';
import { Screen, StackHeader, Text } from '../../src/ui';

export default function ArticleDetailScreen() {
  const { t } = useLocale();
  const styles = useThemedStyles(makeStyles);
  const { id } = useLocalSearchParams<{ id: string }>();
  const article = getArticle(id ?? '');

  if (!article) {
    return (
      <Screen edges={['top']}>
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
    <Screen edges={['top']}>
      <StackHeader title={t('life.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <ImageBackground
          source={{ uri: article.image }}
          style={styles.hero}
          imageStyle={styles.heroImage}
        >
          <LinearGradient
            colors={['rgba(0,0,0,0.05)', 'rgba(0,0,0,0.45)']}
            style={StyleSheet.absoluteFill}
          />
          <View style={styles.heroTag}>
            <Text variant="caption" tone="onColor" style={styles.heroTagText}>
              {article.tag}
            </Text>
          </View>
        </ImageBackground>

        <View style={styles.body}>
          <Text variant="title" tone="ink">
            {article.title}
          </Text>
          <View style={styles.meta}>
            <Text variant="caption" tone="rose">
              {article.tag}
            </Text>
            <Text variant="caption" tone="muted">
              {'·'}
            </Text>
            <Text variant="caption" tone="muted">
              {article.readMin} {t('life.read')}
            </Text>
          </View>

          <Text variant="bodyStrong" tone="inkSoft" style={styles.lead}>
            {article.excerpt}
          </Text>

          {article.body.map((para, i) => (
            <Text key={i} variant="body" tone="ink" style={styles.para}>
              {para}
            </Text>
          ))}
        </View>
      </ScrollView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingBottom: space(5) },
    empty: { flex: 1, alignItems: 'center', justifyContent: 'center' },
    hero: {
      height: 220,
      marginHorizontal: space(3),
      borderRadius: radius.lg,
      overflow: 'hidden',
      justifyContent: 'flex-start',
    },
    heroImage: { borderRadius: radius.lg },
    heroTag: {
      position: 'absolute',
      top: space(1.5),
      left: space(1.5),
      backgroundColor: colors.accent,
      paddingHorizontal: space(1.25),
      paddingVertical: 4,
      borderRadius: radius.pill,
    },
    heroTagText: { fontWeight: '600' },
    body: { paddingHorizontal: space(3), paddingTop: space(2.5) },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      marginTop: space(1),
    },
    lead: { marginTop: space(2.5), lineHeight: 24 },
    para: { marginTop: space(2), lineHeight: 24 },
  });
