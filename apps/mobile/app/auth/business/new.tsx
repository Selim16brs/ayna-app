import { useState } from 'react';
import { useRouter } from 'expo-router';
import { Pressable, ScrollView, StyleSheet, TextInput, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import type { MessageKey } from '@ayna/i18n';
import { useLocale } from '../../../src/locale';
import { colors, radius, space } from '../../../src/theme';
import { Button, Screen, Segmented, StackHeader, Text } from '../../../src/ui';

const SECTORS: MessageKey[] = [
  'sector.beauty',
  'sector.hairdresser',
  'sector.spa',
  'sector.cosmetology',
];
const AREAS: MessageKey[] = [
  'category.hair',
  'category.nails',
  'category.brows',
  'category.makeup',
  'category.spa',
];

export default function NewBusinessScreen() {
  const router = useRouter();
  const { t } = useLocale();
  const [kind, setKind] = useState<'salon' | 'independent'>('salon');
  const [name, setName] = useState('');
  const [sector, setSector] = useState<MessageKey>('sector.beauty');
  const [areas, setAreas] = useState<Set<MessageKey>>(new Set(['category.hair']));
  const [address, setAddress] = useState('');
  const [phone, setPhone] = useState('');

  const valid = name.trim().length > 1 && address.trim().length > 3 && phone.trim().length >= 7;

  function toggleArea(a: MessageKey) {
    setAreas((prev) => {
      const next = new Set(prev);
      if (next.has(a)) next.delete(a);
      else next.add(a);
      return next;
    });
  }

  return (
    <Screen edges={['top']}>
      <StackHeader title={t('biz.new.title')} />
      <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
        <Text variant="h2" tone="ink" style={styles.label}>
          {t('biz.kind.label')}
        </Text>
        <Segmented
          options={[
            { value: 'salon', label: t('biz.kind.salon') },
            { value: 'independent', label: t('biz.kind.independent') },
          ]}
          value={kind}
          onChange={setKind}
        />

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('biz.field.name')}
        </Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="AYNA Studio"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('biz.field.sector')}
        </Text>
        <View style={styles.chips}>
          {SECTORS.map((s) => (
            <Chip key={s} label={t(s)} active={sector === s} onPress={() => setSector(s)} />
          ))}
        </View>

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('biz.field.area')}
        </Text>
        <View style={styles.chips}>
          {AREAS.map((a) => (
            <Chip key={a} label={t(a)} active={areas.has(a)} onPress={() => toggleArea(a)} />
          ))}
        </View>

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('biz.field.address')}
        </Text>
        <TextInput
          value={address}
          onChangeText={setAddress}
          placeholder="Almatı, Dostyk 162"
          placeholderTextColor={colors.muted}
          style={styles.input}
        />

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('biz.field.phone')}
        </Text>
        <TextInput
          value={phone}
          onChangeText={(v) => setPhone(v.replace(/[^0-9 +]/g, ''))}
          placeholder="+7 700 123 45 67"
          placeholderTextColor={colors.muted}
          keyboardType="phone-pad"
          style={styles.input}
        />

        <Text variant="h2" tone="ink" style={styles.label}>
          {t('biz.field.docs')}
        </Text>
        <Pressable style={styles.docRow}>
          <Ionicons name="cloud-upload-outline" size={20} color={colors.rose} />
          <Text variant="bodyStrong" tone="rose">
            {t('biz.field.docs_add')}
          </Text>
        </Pressable>
      </ScrollView>

      <View style={styles.footer}>
        <Button
          label={t('biz.new.submit')}
          variant={valid ? 'primary' : 'secondary'}
          disabled={!valid}
          onPress={() => router.replace('/auth/business/done')}
        />
      </View>
    </Screen>
  );
}

function Chip({ label, active, onPress }: { label: string; active: boolean; onPress: () => void }) {
  return (
    <Pressable onPress={onPress} style={[styles.chip, active && styles.chipActive]}>
      <Text variant="caption" tone={active ? 'onColor' : 'inkSoft'}>
        {label}
      </Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  content: { paddingHorizontal: space(3), paddingBottom: space(4) },
  label: { marginTop: space(2.5), marginBottom: space(1.25) },
  input: {
    height: 54,
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    fontWeight: '500',
    fontSize: 16,
    color: colors.ink,
  },
  chips: { flexDirection: 'row', flexWrap: 'wrap', gap: space(1) },
  chip: {
    paddingHorizontal: space(1.75),
    paddingVertical: space(1),
    borderRadius: radius.pill,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
  },
  chipActive: { backgroundColor: colors.rose, borderColor: colors.rose },
  docRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: space(1),
    height: 54,
    paddingHorizontal: space(2),
    borderRadius: radius.lg,
    backgroundColor: colors.surface,
    borderWidth: 1,
    borderColor: colors.line,
    borderStyle: 'dashed',
  },
  footer: {
    paddingHorizontal: space(3),
    paddingTop: space(1.5),
    borderTopWidth: 1,
    borderTopColor: colors.line,
  },
});
