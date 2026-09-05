import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { Pressable, ScrollView, StyleSheet, View } from 'react-native';
import type { UserAddress } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import {
  AddressPicker,
  Button,
  Screen,
  StackHeader,
  Text,
  TextInput,
} from '../../src/ui';

export default function AddressesScreen() {
  const { t } = useLocale();
  const { colors, shadow } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const addresses = useStore((s) => s.addresses);
  const addAddress = useStore((s) => s.addAddress);
  const removeAddress = useStore((s) => s.removeAddress);
  const updateAddressCoord = useStore((s) => s.updateAddressCoord);
  /** Düzeltilmekte olan adres — null ise yeni adres ekleniyor. */
  const [duzeltilen, setDuzeltilen] = useState<UserAddress | null>(null);

  const [label, setLabel] = useState<UserAddress['label']>('home');
  const [detail, setDetail] = useState('');
  /*
   * KONUM HARİTADAN. Kurucu: "elle manuel yazılmak yerine harita üzerinden
   * iğne attırmalı ve bunu hafızasına kaydettirmeliyiz."
   *
   * Metin alanı DURUYOR — kapı numarası, kat, tarif gibi haritanın
   * bilemeyeceği ayrıntılar için. Ama nihai konum iğneden geliyor.
   */
  const [koord, setKoord] = useState<{ lat: number; lng: number } | null>(null);
  const [haritaAcik, setHaritaAcik] = useState(false);
  const sehir = useStore((s) => s.currentUser?.city);

  const add = () => {
    if (!koord) return;
    addAddress(label, detail, koord);
    setDetail('');
    setKoord(null);
  };

  return (
    <Screen edges={[]}>
      <StackHeader title={t('addresses.title')} />
      <ScrollView
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.content}
        showsVerticalScrollIndicator={false}
      >
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
                  {/*
                   * İĞNE GÖRÜNÜR VE DÜZELTİLEBİLİR.
                   *
                   * Kurucu: "cadde çok uzun bir cadde... sistem kullanıcıdan
                   * çok uzakta yerleri de gösterebilir." Sıralama cadde
                   * ADINA değil koordinata bakıyor; eksik olan doğrulamaydı —
                   * kullanıcı iğnenin nereye düştüğünü göremiyor, göremediği
                   * için düzeltemiyordu.
                   */}
                  {a.lat != null && a.lng != null ? (
                    <Pressable
                      onPress={() => {
                        setDuzeltilen(a);
                        setHaritaAcik(true);
                      }}
                      hitSlop={6}
                      style={styles.pinSatir}
                    >
                      <Ionicons name="location" size={13} color={colors.accentFg} />
                      <Text variant="micro" tone="accentFg">
                        {a.lat.toFixed(5)}, {a.lng.toFixed(5)} · {t('addresses.verify')}
                      </Text>
                    </Pressable>
                  ) : (
                    /* Eski kayıtta iğne yok — mesafe hesabına girmiyor. */
                    <Pressable
                      onPress={() => {
                        setDuzeltilen(a);
                        setHaritaAcik(true);
                      }}
                      hitSlop={6}
                      style={styles.pinSatir}
                    >
                      <Ionicons name="alert-circle-outline" size={13} color={colors.gold} />
                      <Text variant="micro" tone="gold">
                        {t('addresses.no_pin')}
                      </Text>
                    </Pressable>
                  )}
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
        {/* Haritadan iğne — ZORUNLU adım. */}
        <Pressable style={styles.haritaBtn} onPress={() => setHaritaAcik(true)}>
          <Ionicons
            name={koord ? 'location' : 'location-outline'}
            size={18}
            color={koord ? colors.accentFg : colors.muted}
          />
          <Text variant="bodyStrong" tone={koord ? 'ink' : 'muted'} style={styles.haritaYazi}>
            {koord ? t('addresses.pinned') : t('addresses.pick_on_map')}
          </Text>
          <Ionicons name="chevron-forward" size={16} color={colors.muted} />
        </Pressable>

        <TextInput
          value={detail}
          onChangeText={setDetail}
          placeholder={t('auth.address.detail_ph')}
          placeholderTextColor={colors.muted}
          style={styles.input}
        />
        {/* Neden iğne şart: mesafe hesabı buna dayanıyor. */}
        <Text variant="caption" tone="muted" style={styles.haritaNot}>
          {t('addresses.why_pin')}
        </Text>
        <Button
          label={t('addresses.add')}
          variant={koord && detail.trim() ? 'primary' : 'secondary'}
          disabled={!koord || !detail.trim()}
          onPress={add}
        />

        <AddressPicker
          visible={haritaAcik}
          initialCity={sehir ?? undefined}
          initialCoord={
            duzeltilen?.lat != null && duzeltilen?.lng != null
              ? { latitude: duzeltilen.lat, longitude: duzeltilen.lng }
              : koord
                ? { latitude: koord.lat, longitude: koord.lng }
                : undefined
          }
          onClose={() => {
            setHaritaAcik(false);
            setDuzeltilen(null);
          }}
          onPick={(r) => {
            if (duzeltilen) {
              // Mevcut adresin iğnesi düzeltiliyor; metni kullanıcı yazdıysa
              // korunuyor, haritadan geleni ezmiyoruz.
              updateAddressCoord(duzeltilen.id, { lat: r.lat, lng: r.lng });
              setDuzeltilen(null);
              return;
            }
            setKoord({ lat: r.lat, lng: r.lng });
            // Metin boşsa haritadan gelen adresle doldur; kullanıcı üstüne
            // kapı/kat ekleyebilsin.
            if (!detail.trim() && r.address) setDetail(r.address);
          }}
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
      // Alt bar bu ekranda gizli (app/_layout.tsx: stackScreen) — barın
      // yerini boş bırakmak sayfa sonunda kocaman bir boşluk demekti.
      paddingBottom: space(3),
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
    pinSatir: { flexDirection: 'row', alignItems: 'center', gap: 4, marginTop: 3 },
    haritaBtn: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2),
      // 56pt: dokunma hedefi eşiğinin üstünde.
      minHeight: 56,
      borderRadius: radius.md,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      marginBottom: space(1.5),
    },
    haritaYazi: { flex: 1 },
    haritaNot: { marginTop: space(1), marginBottom: space(2) },
    addLabel: { marginTop: space(2), marginLeft: space(0.5) },
    chips: { flexDirection: 'row', gap: space(1) },
    chip: {
      paddingHorizontal: space(1.75),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
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
