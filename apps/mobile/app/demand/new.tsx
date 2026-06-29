import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { CATEGORIES } from '../../src/data';
import { useLocale } from '../../src/locale';
import { colors, radius, space } from '../../src/theme';
import { Button, Screen, StackHeader, Text } from '../../src/ui';

export default function NewDemandScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const [desc, setDesc] = useState('');
  const [category, setCategory] = useState<string>(CATEGORIES[0]!.id);
  const [budget, setBudget] = useState('');

  const canSubmit = desc.trim().length > 0 && Number(budget) > 0;

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('demand.new.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="h2" tone="ink" style={styles.label}>
          {t('demand.new.desc')}
        </Text>
        <TextInput
          value={desc}
          onChangeText={setDesc}
          placeholder={t('demand.new.desc_ph')}
          placeholderTextColor={colors.muted}
          multiline
          style={styles.textarea}
        />

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('quote.new.category')}
        </Text>
        <View style={styles.categories}>
          {CATEGORIES.map((cat) => {
            const active = cat.id === category;
            return (
              <Pressable
                key={cat.id}
                onPress={() => setCategory(cat.id)}
                style={[styles.categoryChip, active && styles.categoryActive]}
              >
                <Ionicons
                  name={cat.icon}
                  size={16}
                  color={active ? colors.onColor : colors.inkSoft}
                />
                <Text variant="caption" tone={active ? 'onColor' : 'inkSoft'}>
                  {t(cat.labelKey)}
                </Text>
              </Pressable>
            );
          })}
        </View>

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('demand.new.budget')}
        </Text>
        <View style={styles.budgetBox}>
          <Text variant="title" tone="rose">
            ₸
          </Text>
          <TextInput
            value={budget}
            onChangeText={(v) => setBudget(v.replace(/[^0-9]/g, ''))}
            placeholder={t('demand.new.budget_ph')}
            placeholderTextColor={colors.muted}
            keyboardType="number-pad"
            style={styles.budgetInput}
          />
        </View>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('demand.new.submit')}
          variant={canSubmit ? 'primary' : 'secondary'}
          disabled={!canSubmit}
          onPress={() => router.replace({ pathname: '/demand/results', params: { budget } })}
        />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space(3), paddingBottom: space(4) },
  label: { marginTop: space(2.5), marginBottom: space(1.5) },
  textarea: {
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    padding: space(2),
    minHeight: 110,
    textAlignVertical: 'top',
    fontFamily: 'Manrope_400Regular',
    fontSize: 15,
    color: colors.ink,
  },
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
  budgetBox: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderRadius: radius.lg,
    paddingHorizontal: space(2),
  },
  budgetInput: {
    flex: 1,
    height: 60,
    fontFamily: 'Manrope_600SemiBold',
    fontSize: 22,
    color: colors.ink,
  },
  footer: {
    paddingHorizontal: space(3),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
