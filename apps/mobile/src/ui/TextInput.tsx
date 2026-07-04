import { TextInput as RNTextInput, type TextInputProps } from 'react-native';

// Girişler de SF sistem fontu — fontFamily VERİLMEZ. Sadece stil geçişi (passthrough).
export function TextInput(props: TextInputProps) {
  return <RNTextInput {...props} />;
}
