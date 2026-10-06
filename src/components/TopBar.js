import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '../utils/AppContext';
import { colors } from '../utils/theme';

// White header with title. Shows a back arrow when onBack is given.
export default function TopBar({ title, onBack, pillText }) {
  const { isOnline } = useApp();

  return (
    <View style={styles.bar}>
      {onBack ? (
        <Pressable onPress={onBack} style={styles.iconButton}>
          <MaterialIcons name="arrow-back" size={24} color={colors.primary} />
        </Pressable>
      ) : (
        <MaterialIcons name="factory" size={26} color={colors.primary} style={{ marginRight: 8 }} />
      )}

      <Text style={styles.title} numberOfLines={1}>{title}</Text>

      {pillText ? (
        <View style={styles.pill}>
          <View style={[styles.dot, { backgroundColor: isOnline ? colors.green : colors.amber }]} />
          <Text style={styles.pillText}>{pillText}</Text>
        </View>
      ) : null}
      <MaterialIcons
        name={isOnline ? 'wifi' : 'wifi-off'}
        size={22}
        color={isOnline ? colors.muted : colors.amberDark}
        style={{ marginLeft: 8 }}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 56,
    paddingHorizontal: 16,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  iconButton: { width: 48, height: 48, marginLeft: -12, alignItems: 'center', justifyContent: 'center' },
  title: { flex: 1, fontSize: 18, fontWeight: '700', color: colors.primary },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
  },
  dot: { width: 8, height: 8, borderRadius: 4 },
  pillText: { fontSize: 11, fontWeight: '700', color: colors.text, textTransform: 'uppercase' },
});
