import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import { Pressable, StyleSheet, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocale } from '../locale';
import { useStore } from '../store';
import { useTheme } from '../theme-context';

// §9.5/§10.3 — satıcı kullanıcı modundayken kalıcı "İşletme/Salon Moduna Dön" butonu.
export function SellerModeReturn() {
  const { colors } = useTheme();
  const { t } = useLocale();
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const role = useStore((s) => s.currentUser?.role);
  const mode = useStore((s) => s.sellerViewMode);
  const setMode = useStore((s) => s.setSellerViewMode);
  const isSeller = role === 'salon' || role === 'professional';
  if (!isSeller || mode !== 'user') return null;
  return (
    <Pressable
      style={[styles.btn, { backgroundColor: colors.ink, bottom: (insets.bottom || 12) + 12 }]}
      onPress={() => {
        setMode('seller');
        router.replace('/seller/reports');
      }}
    >
      <Ionicons name="briefcase" size={16} color={colors.bg} />
      <Text style={[styles.label, { color: colors.bg }]}>{t('seller.mode.back')}</Text>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  btn: {
    position: 'absolute',
    alignSelf: 'center',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 18,
    paddingVertical: 12,
    borderRadius: 999,
    shadowColor: '#000',
    shadowOpacity: 0.25,
    shadowRadius: 12,
    shadowOffset: { width: 0, height: 6 },
    elevation: 10,
  },
  label: { fontSize: 13, fontWeight: '700' },
});
