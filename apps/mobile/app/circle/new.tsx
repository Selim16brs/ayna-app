import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, Switch, TextInput, View } from 'react-native';
import { CATEGORIES, type CirclePostType } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, Segmented, StackHeader, TAB_BAR_CLEARANCE, Text } from '../../src/ui';

export default function NewPostScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const addPost = useStore((s) => s.addPost);

  const [type, setType] = useState<CirclePostType>('recommend');
  const [category, setCategory] = useState<string>(t(CATEGORIES[0]!.labelKey));
  const [text, setText] = useState('');
  const [anonymous, setAnonymous] = useState(false);

  const canSubmit = text.trim().length > 0;

  const typeOptions: { value: CirclePostType; label: string }[] = [
    { value: 'recommend', label: t('circle.type.recommend') },
    { value: 'asking', label: t('circle.type.asking') },
    { value: 'experience', label: t('circle.type.experience') },
  ];

  const submit = () => {
    const id = addPost({ type, category, text: text.trim(), anonymous });
    router.replace('/circle/' + id);
  };

  return (
    <Screen edges={['bottom']}>
      <StackHeader title={t('circle.new.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="h2" tone="ink" style={styles.label}>
          {t('circle.new.type')}
        </Text>
        <Segmented options={typeOptions} value={type} onChange={setType} />

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('circle.new.category')}
        </Text>
        <View style={styles.categories}>
          {CATEGORIES.map((cat) => {
            const label = t(cat.labelKey);
            const active = label === category;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setCategory(label)}
                style={[styles.categoryChip, active && styles.categoryActive]}
              >
                <Ionicons
                  name={cat.icon}
                  size={16}
                  color={active ? colors.onColor : colors.inkSoft}
                />
                <Text variant="caption" tone={active ? 'onColor' : 'inkSoft'}>
                  {label}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('circle.new.text')}
        </Text>
        <TextInput
          value={text}
          onChangeText={setText}
          placeholder={t('circle.new.text_ph')}
          placeholderTextColor={colors.muted}
          multiline
          style={styles.textarea}
        />

        <View style={styles.anonRow}>
          <View style={styles.anonText}>
            <Text variant="bodyStrong" tone="ink">
              {t('circle.new.anonymous')}
            </Text>
          </View>
          <Switch
            value={anonymous}
            onValueChange={setAnonymous}
            trackColor={{ false: colors.line, true: colors.rose }}
            thumbColor={colors.onColor}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('circle.new.submit')}
          variant={canSubmit ? 'primary' : 'secondary'}
          disabled={!canSubmit}
          onPress={submit}
        />
      </View>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: { paddingHorizontal: space(3), paddingBottom: space(4) },
    label: { marginTop: space(2.5), marginBottom: space(1.5) },
    categories: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
    categoryChip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
    },
    categoryActive: { backgroundColor: colors.rose, borderColor: colors.rose },
    textarea: {
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.lg,
      padding: space(2),
      minHeight: 130,
      textAlignVertical: 'top',
      fontWeight: '400',
      fontSize: 15,
      color: colors.ink,
    },
    anonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      marginTop: space(2.5),
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    anonText: { flex: 1 },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: TAB_BAR_CLEARANCE,
      borderTopWidth: 1,
      borderTopColor: colors.line,
    },
  });
