module.exports = function (api) {
  api.cache(true);
  return {
    presets: ['babel-preset-expo'],
    // Reanimated 4 (SDK 54): worklet eklentisi react-native-worklets'e taşındı; EN SONDA olmalı.
    plugins: ['react-native-worklets/plugin'],
  };
};
