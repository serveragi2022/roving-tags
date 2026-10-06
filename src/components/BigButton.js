import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

// Large button for gloved hands (min 56px tall).
// variant: primary (blue), success (green), danger (red outline), neutral (white)
const VARIANTS = {
  primary: { background: colors.primary, border: colors.primaryDark, text: colors.white },
  success: { background: colors.green, border: colors.greenDark, text: colors.white },
  danger: { background: colors.white, border: colors.red, text: colors.red },
  neutral: { background: colors.white, border: colors.borderStrong, text: colors.text },
};

export default function BigButton({
  title,
  icon,
  onPress,
  variant = 'primary',
  disabled = false,
  loading = false,
}) {
  const look = VARIANTS[variant];
  const isOff = disabled || loading;

  return (
    <Pressable
      onPress={onPress}
      disabled={isOff}
      style={({ pressed }) => [
        styles.button,
        {
          backgroundColor: look.background,
          borderColor: look.border,
          borderBottomWidth: pressed ? 2 : 4,
          opacity: isOff ? 0.5 : 1,
        },
      ]}
    >
      {loading ? (
        <ActivityIndicator color={look.text} />
      ) : (
        <>
          {icon ? <MaterialIcons name={icon} size={24} color={look.text} /> : null}
          <Text style={[styles.title, { color: look.text }]}>{title}</Text>
        </>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  button: {
    minHeight: 56,
    borderRadius: 12,
    borderWidth: 1,
    paddingHorizontal: 16,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  title: { fontSize: 15, fontWeight: '700', letterSpacing: 0.3, flexShrink: 1, textAlign: 'center' },
});
