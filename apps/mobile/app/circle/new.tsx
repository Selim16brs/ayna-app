import { useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useRouter } from 'expo-router';
import {
  KeyboardAvoidingView,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Switch,
  View,
} from 'react-native';
import { CATEGORIES, type CirclePostType } from '../../src/data';
import { useLocale } from '../../src/locale';
import { useStore } from '../../src/store';
import { type ColorTokens, radius, space, font } from '../../src/theme';
import { useTheme, useThemedStyles } from '../../src/theme-context';
import { tri } from '../../src/taxonomy';
import {
  HizmetIkonu,
  Button,
  Screen,
  Segmented,
  StackHeader,
  Text,
  TextInput,
} from '../../src/ui';

export default function NewPostScreen() {
  const router = useRouter();
  const { t, locale } = useLocale();
  const { colors } = useTheme();
  const styles = useThemedStyles(makeStyles);
  const addPost = useStore((s) => s.addPost);

  const [type, setType] = useState<CirclePostType>('recommend');
  /*
   * KATEGORİ KODU saklanıyor, etiket değil.
   *
   * Eskiden o anki dildeki ETİKET ("Saç") kaydediliyordu. Rusça arayüzdeki
   * bir kullanıcı Türkçe yazılmış gönderide "Saç" görüyor, W2W kategori
   * şeridi de sabit TR metinlerle eşleştiği için dil değiştiren kullanıcının
   * gönderileri filtrelerin dışında kalıyordu.
   */
  const [category, setCategory] = useState<string>(CATEGORIES[0]!.id);
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
    <Screen edges={['bottom']} keyboardAvoiding={false}>
      <StackHeader title={t('circle.new.title')} />
      {/*
       * KLAVYE İÇERİĞİ ÖRTMESİN.
       *
       * Kurucu: "hem ikonlar hatalı hem de klavye üste çıkıyor."
       * Metin alanına dokununca klavye açılıyor, "Paylaş" düğmesi yazının
       * ÜSTÜNE biniyor ve yazdığı satır görünmez oluyordu — ne yazdığını
       * göremeden gönderi oluşturuyordu.
       *
       * iOS'ta `padding`, Android'de `height`: iki platformun klavye
       * ölçüm davranışı farklı ve tek değer ikisinde birden doğru çalışmıyor.
       */}
      <KeyboardAvoidingView
        style={styles.kacis}
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 8 : 0}
      >
        <ScrollView
          keyboardShouldPersistTaps="handled"
          /*
           * `flex: 1` ŞART. Yoksa ScrollView kendini içeriği kadar
           * boyutlandırıyor, kap taşıyor ve son satır ("Anonim paylaş")
           * "Paylaş" düğmesinin altında yarım kalıyordu — kurucunun
           * "kaymış ekran" dediği şey buydu.
           */
          style={styles.kaydirma}
          contentContainerStyle={styles.content}
          showsVerticalScrollIndicator={false}
        >
          <Text variant="h2" tone="ink" style={styles.label}>
            {t('circle.new.type')}
          </Text>
          <Segmented options={typeOptions} value={type} onChange={setType} />

          <Text variant="h2" tone="ink" style={styles.label}>
            {t('circle.new.category')}
          </Text>
          {/*
           * ANA SAYFADAKİ KUTU. Burada hap içinde 20'lik ikon çiziliyordu;
           * Figma çiziminin ayrıntısı o boyutta dağılıp başka bir ikon gibi
           * görünüyordu. Kurucu: "hizmet ikonları ana sayfadaki gibi olacak."
           *
           * Yatay kaydırma: on kategori sarmalayınca ekranın yarısını yiyor,
           * altındaki metin alanı görünmez oluyordu.
           */}
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.categories}
          >
            {CATEGORIES.map((cat) => {
              const label = tri(cat.ad, locale);
              const active = cat.id === category;
              return (
                <Pressable key={cat.id} onPress={() => setCategory(cat.id)} style={styles.kategori}>
                  <HizmetIkonu id={cat.id} tarz="kutu" secili={active} />
                  <Text variant="caption" tone={active ? 'ink' : 'inkSoft'} numberOfLines={1}>
                    {label}
                  </Text>
                </Pressable>
              );
            })}
          </ScrollView>

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
            <View style={styles.anonIcon}>
              <Ionicons name="shield-checkmark" size={20} color={colors.accentFg} />
            </View>
            <View style={styles.anonText}>
              <Text variant="bodyStrong" tone="ink">
                {t('circle.new.anonymous')}
              </Text>
            </View>
            <Switch
              value={anonymous}
              onValueChange={setAnonymous}
              trackColor={{ false: colors.surfaceMuted, true: colors.accent }}
              thumbColor={colors.surface}
            />
          </View>
        </ScrollView>

        {/* Düğme de kaçış alanının İÇİNDE: dışarıda kalsaydı klavye onu
            yazının üstüne bindirirdi — sorunun görünen hâli buydu. */}
        <View style={styles.footer}>
          <Button
            label={t('circle.new.submit')}
            variant={canSubmit ? 'primary' : 'secondary'}
            disabled={!canSubmit}
            onPress={submit}
          />
        </View>
      </KeyboardAvoidingView>
    </Screen>
  );
}

const makeStyles = (colors: ColorTokens) =>
  StyleSheet.create({
    // Alt boşluk küçüldü: düğme şeridi KARDEŞ eleman, içeriğin üstüne
    // binmiyor. Eski 104px, son kartla düğme arasında koca bir delik
    // bırakıyordu.
    content: { paddingHorizontal: space(3), paddingTop: space(1), paddingBottom: space(2) },
    label: {
      marginTop: space(3),
      marginBottom: space(1.5),
      fontSize: 20,
      fontFamily: font.semibold,
      letterSpacing: -0.4,
    },
    kacis: { flex: 1 },
    kaydirma: { flex: 1 },
    // Ana sayfadaki ızgara ile aynı: kutu + altında etiket.
    kategori: { alignItems: 'center', gap: space(0.75), width: 76 },
    textarea: {
      minHeight: 120,
      paddingHorizontal: space(2),
      paddingVertical: space(1.5),
      borderRadius: radius.lg,
      backgroundColor: colors.surface,
      borderWidth: 1,
      borderColor: colors.line,
      color: colors.ink,
      textAlignVertical: 'top',
    },
    categories: {
      flexDirection: 'row',
      // Sarma YOK: 64'lük kutular sarınca metin alanı ekrandan çıkıyordu.
      gap: space(1.5),
      paddingVertical: space(0.5),
    },
    anonRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: space(1.5),
      marginTop: space(2.5),
      backgroundColor: colors.surfaceMuted,
      borderRadius: radius.lg,
      paddingHorizontal: space(2),
      paddingVertical: space(1.75),
    },
    anonIcon: {
      width: 40,
      height: 40,
      borderRadius: 20,
      backgroundColor: colors.accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
    },
    anonText: { flex: 1 },
    footer: {
      paddingHorizontal: space(3),
      paddingTop: space(1.5),
      paddingBottom: space(3),
    },
  });
