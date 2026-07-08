import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { UserAddress } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Button, Screen, StackHeader, Text, TextInput } from '../../src/ui';

export default function AddressesScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const addresses = useStore((s) => s.addresses);
  const addAddress = useStore((s) => s.addAddress);
  const removeAddress = useStore((s) => s.removeAddress);

  const [label, setLabel] = useState<UserAddress['label']>('home');
  const [detail, setDetail] = useState('');

  const add = () => {
    addAddress(label, detail);
    setDetail('');
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('addresses.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="caption" tone="muted" style={styles.hint}>
          {t('addresses.hint')}
        </Text>

        {addresses.length > 0 ? (
          <View style={styles.list}>
            {addresses.map((a) => (
              <View key={a.id} style={[styles.row, shadow.soft]}>
                <View style={[styles.icon, { backgroundColor: colors.accentSoft }]}>
                  <Ionicons
                    name={a.label === 'home' ? 'home' : 'briefcase'}
                    size={18}
                    color={colors.accentFg}
                  />
                </View>
                <View style={styles.rowText}>
                  <Text variant="bodyStrong" tone="ink">
                    {t(a.label === 'home' ? 'auth.address.home' : 'auth.address.work')}
                  </Text>
                  <Text variant="caption" tone="muted" numberOfLines={2}>
                    {a.detail}
                  </Text>
                </View>
                <Pressable onPress={() => removeAddress(a.id)} hitSlop={8}>
                  <Ionicons name="trash-outline" size={20} color={colors.muted} />
                </Pressable>
              </View>
            ))}
          </View>
        ) : (
          <View style={styles.empty}>
            <Ionicons name="location-outline" size={30} color={colors.muted} />
            <Text variant="caption" tone="muted">
              {t('addresses.empty')}
            </Text>
          </View>
        )}

        {/* Yeni adres ekle */}
        <Text variant="label" tone="accentFg" style={styles.addLabel}>
          {t('addresses.add')}
        </Text>
        <View style={styles.chips}>
          <Chip
            label={t('auth.address.home')}
            active={label === 'home'}
            onPress={() => setLabel('home')}
          />
          <Chip
            label={t('auth.address.work')}
            active={label === 'work'}
            onPress={() => setLabel('work')}
          />
        </View>
        <TextInput
          value={detail}
          onChangeText={setDetail}
          placeholder={t('auth.address.detail_ph')}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        <Button
          label={t('addresses.add')}
          variant={detail.trim() ? 'primary' : 'secondary'}
          disabled={!detail.trim()}
          onPress={add}
        />
      </ScrollView>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  const styles = useThemedStyles(makeStyles);
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text variant="caption" tone={active ? 'onAccent' : 'inkSoft'}>
        {label}
      </Text>
    </Pressable>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(2),
      paddingBottom: space(6),
      gap: space(1.5),
    },
    hint: { marginLeft: space(0.5) },
    list: { gap: space(1.25) },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      padding: space(2),
    },
    icon: {
      width: 44,
      height: 44,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
    },
    rowText: { flex: 1, gap: 2 },
    empty: { alignItems: 'center', paddingVertical: space(4), gap: space(1) },
    addLabel: { marginTop: space(2), marginLeft: space(0.5) },
    chips: { flexDirection: 'row', gap: space(1) },
    chip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
    },
    chipActive: { backgroundColor: colors.accent },
    input: {
      height: 54,
      paddingHorizontal: space(2),
      borderRadius: radius.lg,
      backgroundColor: colors.surfaceMuted,
      fontSize: 16,
      color: colors.ink,
    },
  });
