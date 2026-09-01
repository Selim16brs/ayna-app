import { Ionicons } from '@expo/vector-icons';
import { akisAdimi } from '../../src/booking-flow';
import { sablonlar, type Sablon } from '../../src/mesaj-sablonlari';
import { useLocalSearchParams, useRouter } from 'expo-router';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Alert,
  Image,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { api, type ChatMessage } from '../../src/api';
import { isRiskyMessage } from '../../src/messages-guard';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useKeyboardShown } from '../../src/keyboard';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { Screen, Text } from '../../src/ui';

// EK Z.1 — Sohbet thread'i. Numara maskeleme + moderasyon backend'de; engellenen gönderemez.
export default function ChatThreadScreen() {
  const { t } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const klavyeAcik = useKeyboardShown();
  const insets = useSafeAreaInsets();
  const router = useRouter();
  const params = useLocalSearchParams<{ id: string; name?: string; otherId?: string }>();
  const convId = params.id;
  const token = useStore((s) => s.token);
  // §9 — şablonlar DURUMA bağlı olduğu için bu konuşmanın hangi randevuya ait
  // olduğunu bilmemiz gerekiyor. Karşı tarafla olan AKTİF randevu aranıyor;
  // kapanmış randevuda şablon gösterilmiyor (akışa ait değil).
  const ilgiliRandevu = useStore((s) =>
    s.bookings.find((b) => b.proId === params.otherId && akisAdimi(b.status) >= 0),
  );
  /**
   * Şablonlar için rolüm — hesabımın türü değil, BU RANDEVUDAKİ taraf.
   *
   * Hesap tipinden okunuyordu: uzman hesabı olan biri başka bir uzmandan
   * randevu alıp ona yazdığında UZMAN şablonlarını görüyordu ("Sorun değil,
   * bekliyorum") — müşteri olduğu bir konuşmada.
   */
  const benUzman = ilgiliRandevu?.benimRolum === 'uzman';
  const [items, setItems] = useState<ChatMessage[] | null>(null);
  const [sending, setSending] = useState(false);
  const [photo, setPhoto] = useState<string | null>(null);
  const [blocked, setBlocked] = useState(false);
  const [notice, setNotice] = useState('');
  const [following, setFollowing] = useState(false);
  const scrollRef = useRef<ScrollView>(null);

  const load = useCallback(async () => {
    if (!token) return setItems([]);
    try {
      setItems(await api.chatMessages(token, convId));
    } catch {
      setItems([]);
    }
  }, [token, convId]);

  useEffect(() => {
    void load();
  }, [load]);

  // Engelli listesini oku → karşı taraf engelli mi?
  useEffect(() => {
    if (!token || !params.otherId) return;
    void api
      .blockedUsers(token)
      .then((list) => setBlocked(list.some((b) => b.id === params.otherId)))
      .catch(() => {});
  }, [token, params.otherId]);

  // §5.5 — karşı tarafı takip ediyor muyum? (karşılıklı takip → serbest DM)
  useEffect(() => {
    if (!token || !params.otherId) return;
    void api
      .myFollows()
      .then((r) => setFollowing(r.following.some((f) => f.userId === params.otherId)))
      .catch(() => {});
  }, [token, params.otherId]);

  const toggleFollow = async () => {
    if (!token || !params.otherId) return;
    const next = !following;
    setFollowing(next);
    try {
      await api.circleFollow(params.otherId, next);
    } catch {
      setFollowing(!next);
    }
  };

  /** Galeriden fotoğraf seç — gönderilmeden önce ön izleme olarak durur. */

  /**
   * §9 — şablon gönderimi. Metin ŞABLONDAN üretiliyor; kullanıcının yazdığı
   * hiçbir serbest metin yok.
   *
   * Gecikme şablonu seçilirse karşı tarafa push gider (§9) ve 15+ dakikalık
   * gecikmede uzmanın "müşteri gelmedi" butonu açılır (§4.8) — o kural sunucuda
   * randevu saatine bakarak işliyor, burada yalnız bildirim tetikleniyor.
   */
  const sablonGonder = async (sb: Sablon) => {
    if (!token || sending) return;
    setSending(true);
    setNotice('');
    try {
      await api.sendChatMessage(token, convId, t(sb.anahtar));
      await load();
      requestAnimationFrame(() => scrollRef.current?.scrollToEnd({ animated: true }));
    } catch {
      setNotice(t('messages.start_err'));
    } finally {
      setSending(false);
    }
  };

  // SERBEST METİN GÖNDERİMİ KALDIRILDI (brief §9). Eski `send`, kullanıcının
  // yazdığı metni ve fotoğrafı gönderiyordu; ikisi de uygulama dışına çıkarma
  // ve pazarlık için açık kapıydı. Gönderim artık yalnız `sablonGonder`.

  // En SON riskli karşı-taraf mesajı — uyarı yalnız orada, bir kez görünür.
  const [guardOff, setGuardOff] = useState(false);
  const riskyId = useMemo(() => {
    if (guardOff) return null;
    const risky = (items ?? []).filter((m) => !m.mine && !m.hidden && isRiskyMessage(m.body));
    return risky.length ? risky[risky.length - 1]!.id : null;
  }, [items, guardOff]);

  // §21 — Şikâyet artık GERÇEK bir yere gidiyor (POST /reports). Sunucuda hedefe
  // dönen ne bildirim ne okuma ucu var; "ustaya gitmez" cümlesi doğru.
  const [reported, setReported] = useState(false);
  const onReport = () => {
    if (!token || !params.otherId || reported) return;
    Alert.alert(t('messages.guard.report'), t('messages.guard.report_note'), [
      { text: t('common.cancel'), style: 'cancel' },
      {
        text: t('messages.guard.report'),
        onPress: () => {
          setReported(true);
          void api
            .reportUser(token, {
              targetId: params.otherId!,
              reason: 'off_platform_payment',
              threadId: convId,
            })
            .then(() => Alert.alert(t('messages.guard.report_done')))
            .catch(() => {
              setReported(false);
              Alert.alert(t('messages.guard.report_err'));
            });
        },
      },
    ]);
  };

  // Engelleme geri alınabilir ama sürpriz olmamalı: ne olacağını önce söyle.
  const onBlock = () => {
    Alert.alert(t('messages.guard.block'), t('messages.guard.block_note'), [
      { text: t('common.cancel'), style: 'cancel' },
      { text: t('messages.guard.block'), style: 'destructive', onPress: () => void toggleBlock() },
    ]);
  };

  const toggleBlock = async () => {
    if (!token || !params.otherId) return;
    try {
      if (blocked) await api.unblockUser(token, params.otherId);
      else await api.blockUser(token, params.otherId);
      setBlocked(!blocked);
    } catch {
      /* yut */
    }
  };

  const headerActions = params.otherId ? (
    <View style={styles.headerActions}>
      <Pressable onPress={toggleFollow} hitSlop={8}>
        <Ionicons
          name={following ? 'person-remove' : 'person-add-outline'}
          size={20}
          color={following ? colors.accent : colors.inkSoft}
        />
      </Pressable>
      <Pressable onPress={toggleBlock} hitSlop={8}>
        <Ionicons
          name={blocked ? 'lock-open-outline' : 'ban-outline'}
          size={20}
          color={colors.danger}
        />
      </Pressable>
    </View>
  ) : undefined;

  return (
    <Screen edges={[]}>
      {/* Kanvas (design/Mesajlar.dc.html §başlık): sohbet başlığı MOR BANT DEĞİL —
          açık zeminde kompakt bir satır: geri çipi · avatar · isim + yanıt süresi.
          StackHeader 78 ekranda ortak olduğu için o değiştirilmedi; sohbet
          ekranı kendi başlığını çiziyor. */}
      <View style={[styles.chatHead, { paddingTop: insets.top + space(1) }]}>
        <Pressable
          style={styles.headChip}
          onPress={() => (router.canGoBack() ? router.back() : router.replace('/messages'))}
          hitSlop={10}
          accessibilityRole="button"
          accessibilityLabel={t('common.back')}
        >
          <Ionicons name="chevron-back" size={17} color={colors.ink} />
        </Pressable>
        <View style={styles.headText}>
          <Text variant="title" tone="ink" numberOfLines={1}>
            {params.name || t('messages.title')}
          </Text>
        </View>
        {headerActions}
      </View>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        // Sabit 90 yanlıştı: bu değer klavyenin ÜSTÜNE fazladan 90pt boşluk
        // ekliyor, yazma alanını havada bırakıyordu. KeyboardAvoidingView
        // başlığın altından ekran altına kadar uzandığı için doğru değer 0.
        keyboardVerticalOffset={0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          ref={scrollRef}
          showsVerticalScrollIndicator={false}
          contentContainerStyle={styles.content}
          onContentSizeChange={() => scrollRef.current?.scrollToEnd({ animated: false })}
        >
          <View style={styles.hintRow}>
            <Ionicons name="shield-checkmark-outline" size={13} color={colors.muted} />
            <Text variant="caption" tone="muted" style={styles.hintText}>
              {t('messages.number_hint')}
            </Text>
          </View>
          {items && items.length === 0 ? (
            <Text variant="caption" tone="muted" style={styles.threadEmpty}>
              {t('messages.thread_empty')}
            </Text>
          ) : null}
          {(items ?? []).map((m) => (
            <View key={m.id}>
              <View style={[styles.bubbleRow, m.mine ? styles.rowMine : styles.rowTheirs]}>
                <View style={[styles.bubble, m.mine ? styles.bubbleMine : styles.bubbleTheirs]}>
                  {m.hidden ? (
                    <Text variant="caption" tone="muted" style={styles.hiddenText}>
                      {t('messages.hidden')}
                    </Text>
                  ) : (
                    <>
                      {m.imageUrl ? (
                        <Image source={{ uri: m.imageUrl }} style={styles.msgImage} />
                      ) : null}
                      {m.body ? (
                        <Text variant="body" tone={m.mine ? 'onAccent' : 'ink'}>
                          {m.body}
                        </Text>
                      ) : null}
                    </>
                  )}
                </View>
              </View>

              {/* KORUMA KARTI — karşı taraf uygulama dışına para çıkarmaya
                  çalışıyorsa, mesajın HEMEN ALTINDA belirir. Suçlamaz, bilgilendirir.
                  Tespit cihazda yapılır; mesaj içeriği bu iş için hiçbir yere gitmez. */}
              {!m.mine && !m.hidden && m.id === riskyId ? (
                <View style={styles.guard}>
                  <View style={styles.guardHead}>
                    <Ionicons name="alert-circle" size={17} color={colors.danger} />
                    <Text variant="title" style={{ color: colors.danger }}>
                      {t('messages.guard.title')}
                    </Text>
                  </View>
                  <Text variant="caption" tone="inkSoft">
                    {t('messages.guard.body')}
                  </Text>
                  <View style={styles.guardFacts}>
                    <View style={styles.guardFact}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text variant="caption" tone="inkSoft" style={styles.flex}>
                        {t('messages.guard.onsite')}
                      </Text>
                    </View>
                    <View style={styles.guardFact}>
                      <Ionicons name="checkmark-circle" size={14} color={colors.success} />
                      <Text variant="caption" tone="inkSoft" style={styles.flex}>
                        {t('messages.guard.kept')}
                      </Text>
                    </View>
                  </View>
                  <View style={styles.guardActions}>
                    <Pressable style={styles.guardBtn} onPress={() => setGuardOff(true)}>
                      <Text
                        variant="captionStrong"
                        tone="inkSoft"
                        numberOfLines={1}
                        adjustsFontSizeToFit
                        minimumFontScale={0.75}
                      >
                        {t('messages.guard.ok')}
                      </Text>
                    </Pressable>
                    {params.otherId ? (
                      <Pressable
                        style={[styles.guardBtn, styles.guardBtnDanger]}
                        onPress={onReport}
                        disabled={reported}
                      >
                        <Text variant="captionStrong" style={{ color: colors.danger }}>
                          {t(reported ? 'messages.guard.report_done' : 'messages.guard.report')}
                        </Text>
                      </Pressable>
                    ) : null}
                  </View>
                  {/* Misilleme korkusu, şikâyetin önündeki asıl engel — tek cümleyle kaldırıyoruz */}
                  <Text variant="micro" tone="muted">
                    {t('messages.guard.report_note')}
                  </Text>
                  {params.otherId && !blocked ? (
                    <Pressable onPress={onBlock}>
                      <Text variant="caption" style={{ color: colors.danger }}>
                        {t('messages.guard.block')}
                      </Text>
                    </Pressable>
                  ) : null}
                </View>
              ) : null}
            </View>
          ))}
        </ScrollView>

        {blocked ? (
          <View style={styles.blockedBar}>
            <Text variant="caption" tone="muted">
              {t('messages.blocked_notice')}
            </Text>
          </View>
        ) : (
          <View>
            {notice ? (
              <View style={styles.noticeBar}>
                <Ionicons name="information-circle-outline" size={14} color={colors.muted} />
                <Text variant="caption" tone="muted" style={styles.noticeText}>
                  {notice}
                </Text>
              </View>
            ) : null}
            {/* Seçilen fotoğrafın ÖN İZLEMESİ — gönderilmeden önce görünür ve
                kaldırılabilir. Görmeden gönderilen bir foto, yanlış fotoyu
                yollamanın en kolay yoludur. */}
            {photo ? (
              <View style={styles.photoPreview}>
                <Image source={{ uri: photo }} style={styles.photoThumb} />
                <Text variant="caption" tone="muted" style={styles.photoHint}>
                  {t('messages.photo_ready')}
                </Text>
                <Pressable
                  onPress={() => setPhoto(null)}
                  hitSlop={10}
                  accessibilityRole="button"
                  accessibilityLabel={t('common.cancel')}
                >
                  <Ionicons name="close-circle" size={22} color={colors.muted} />
                </Pressable>
              </View>
            ) : null}
            <View
              style={[
                styles.composer,
                { paddingBottom: klavyeAcik ? space(1.5) : insets.bottom + space(1) },
              ]}
            >
              {/* ŞABLON SEÇİCİ — brief §9: "Serbest sohbet yok."
                  Serbest metin, uygulama dışına çıkarma (telefon/Instagram),
                  pazarlık ve taciz için açık kapıydı. Şablon listesi bunların
                  hiçbirini ifade edemiyor; moderasyon ihtiyacı kökünden kalkıyor. */}
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                contentContainerStyle={styles.sablonSerit}
                keyboardShouldPersistTaps="handled"
              >
                {sablonlar(benUzman ? 'uzman' : 'musteri', ilgiliRandevu?.status).map((sb) => (
                  <Pressable
                    key={sb.anahtar}
                    style={styles.sablonChip}
                    disabled={sending}
                    onPress={() => void sablonGonder(sb)}
                    accessibilityRole="button"
                  >
                    <Text variant="caption" tone="ink">
                      {t(sb.anahtar)}
                    </Text>
                  </Pressable>
                ))}
              </ScrollView>
            </View>
          </View>
        )}
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    flex: { flex: 1 },
    // §9 — şablon şeridi: yatay kaydırılabilir çipler. Metin girişi yok.
    sablonSerit: { gap: space(1), paddingHorizontal: space(1), alignItems: 'center' },
    sablonChip: {
      paddingHorizontal: space(1.5),
      paddingVertical: space(1),
      borderRadius: radius.pill,
      backgroundColor: colors.surfaceMuted,
      borderWidth: StyleSheet.hairlineWidth,
      borderColor: colors.line,
    },
    content: {
      paddingHorizontal: space(3),
      paddingTop: space(1),
      paddingBottom: space(3),
      gap: space(1),
    },
    hintRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: space(0.5),
      marginBottom: space(1),
    },
    hintText: { fontSize: 11 },
    threadEmpty: { textAlign: 'center', paddingVertical: space(6) },
    bubbleRow: { flexDirection: 'row' },
    rowMine: { justifyContent: 'flex-end' },
    rowTheirs: { justifyContent: 'flex-start' },
    bubble: {
      maxWidth: '80%',
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.25),
      borderRadius: radius.md,
    },
    bubbleMine: { backgroundColor: colors.accent, borderBottomRightRadius: 6 },
    bubbleTheirs: { backgroundColor: colors.surfaceMuted, borderBottomLeftRadius: 6 },
    hiddenText: { fontStyle: 'italic' },
    photoPreview: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.25),
      paddingHorizontal: space(2.5),
      paddingVertical: space(1),
    },
    photoThumb: { width: 44, height: 44, borderRadius: radius.xs },
    photoHint: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
    // §13 — 40×40'tı, dokunma alanı eşiği 44 pt. Sohbet yazma şeridinde yer
    // var; hitSlop yerine gerçek boyut verildi (görsel de dengeli kalıyor).
    attachBtn: { width: 44, height: 44, alignItems: 'center', justifyContent: 'center' },
    msgImage: {
      width: 200,
      height: 200,
      borderRadius: radius.md,
      marginBottom: space(0.75),
      resizeMode: 'cover',
    },
    composer: {
      flexDirection: 'row',
      alignItems: 'flex-end',
      gap: space(1),
      paddingHorizontal: space(3),
      paddingVertical: space(1.5),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
      backgroundColor: colors.surface,
    },
    input: {
      flex: 1,
      maxHeight: 120,
      minHeight: 44,
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.md,
      paddingHorizontal: space(1.75),
      paddingVertical: space(1.25),
      color: colors.ink,
      fontSize: 15,
    },
    sendBtn: {
      width: 44,
      height: 44,
      borderRadius: radius.pill,
      backgroundColor: colors.accent,
      alignItems: 'center',
      justifyContent: 'center',
    },
    sendBtnOff: { opacity: 0.4 },
    blockedBar: {
      alignItems: 'center',
      paddingVertical: space(2),
      borderTopWidth: StyleSheet.hairlineWidth,
      borderTopColor: colors.line,
    },
    noticeBar: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(0.75),
      paddingHorizontal: space(3),
      paddingVertical: space(1),
      backgroundColor: colors.surfaceMuted,
    },
    noticeText: { flex: 1 },
    guard: {
      backgroundColor: colors.surface,
      borderRadius: radius.lg,
      borderWidth: 2,
      borderColor: colors.dangerSoft,
      padding: space(2),
      gap: space(1.25),
      marginTop: space(1),
    },
    guardHead: { flexDirection: 'row', alignItems: 'center', gap: space(1) },
    guardFacts: {
      gap: space(1),
      backgroundColor: colors.bg,
      borderRadius: radius.md,
      padding: space(1.5),
    },
    guardFact: { flexDirection: 'row', alignItems: 'flex-start', gap: space(1) },
    guardActions: { flexDirection: 'row', gap: space(1) },
    guardBtn: {
      flex: 1,
      height: 46,
      borderRadius: 23,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surfaceMuted,
    },
    guardBtnDanger: { backgroundColor: colors.dangerSoft },
    chatHead: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      paddingHorizontal: space(2.5),
      paddingBottom: space(1.5),
      backgroundColor: colors.bg,
    },
    headChip: {
      width: 42,
      height: 42,
      borderRadius: radius.md,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: colors.surface,
    },
    headText: { flexGrow: 1, flexShrink: 1, minWidth: 0 },
    headerActions: { flexDirection: 'row', alignItems: 'center', gap: space(2) },
  });
