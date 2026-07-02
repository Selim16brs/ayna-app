import { useRef, useState } from 'react';
import { Ionicons } from '@expo/vector-icons';
import { useLocalSearchParams, useRouter } from 'expo-router';
import {
  Dimensions,
  Image,
  type NativeScrollEvent,
  type NativeSyntheticEvent,
  Pressable,
  ScrollView,
  StyleSheet,
  View,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Text } from '../src/ui';

const { width, height } = Dimensions.get('window');

export default function GalleryScreen() {
  const router = useRouter();
  const insets = useSafeAreaInsets();
  const params = useLocalSearchParams<{ images?: string; index?: string }>();
  const images: string[] = (() => {
    try {
      return params.images ? (JSON.parse(params.images) as string[]) : [];
    } catch {
      return [];
    }
  })();
  const start = Number(params.index ?? 0) || 0;
  const [page, setPage] = useState(start);
  const ref = useRef<ScrollView>(null);

  const onScroll = (e: NativeSyntheticEvent<NativeScrollEvent>) => {
    setPage(Math.round(e.nativeEvent.contentOffset.x / width));
  };

  return (
    <View style={styles.root}>
      <ScrollView
        ref={ref}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        contentOffset={{ x: start * width, y: 0 }}
        onMomentumScrollEnd={onScroll}
      >
        {images.map((uri, i) => (
          <View key={i} style={styles.page}>
            <Image source={{ uri }} style={styles.image} resizeMode="contain" />
          </View>
        ))}
      </ScrollView>

      <Pressable
        style={[styles.close, { top: insets.top + 8 }]}
        onPress={() => router.back()}
        hitSlop={10}
      >
        <Ionicons name="close" size={24} color="#fff" />
      </Pressable>

      {images.length > 1 ? (
        <View style={[styles.counter, { bottom: insets.bottom + 24 }]}>
          <Text variant="caption" tone="onColor">
            {page + 1} / {images.length}
          </Text>
        </View>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: '#000' },
  page: { width, height, alignItems: 'center', justifyContent: 'center' },
  image: { width, height: height * 0.8 },
  close: {
    position: 'absolute',
    right: 20,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(255,255,255,0.16)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  counter: {
    position: 'absolute',
    alignSelf: 'center',
    backgroundColor: 'rgba(255,255,255,0.16)',
    paddingHorizontal: 18,
    paddingVertical: 8,
    borderRadius: 999,
  },
});
