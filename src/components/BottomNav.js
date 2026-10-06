import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { goTo } from '../utils/helpers';
import { colors } from '../utils/theme';

// Bottom bar: Route | Scan | History.
// "active" is 'Route', 'Scan' or 'History' (or nothing).
export default function BottomNav({ active }) {
  const navigation = useNavigation();
  const insets = useSafeAreaInsets();

  return (
    <View style={[styles.bar, { paddingBottom: insets.bottom }]}>
      <Pressable style={styles.item} onPress={() => goTo(navigation, 'Route')}>
        <MaterialIcons name="alt-route" size={26} color={active === 'Route' ? colors.primary : colors.muted} />
        <Text style={[styles.label, active === 'Route' && styles.labelActive]}>Route</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => goTo(navigation, 'Scan')}>
        <View style={styles.scanCircle}>
          <MaterialIcons name="qr-code-scanner" size={26} color={colors.white} />
        </View>
        <Text style={[styles.label, active === 'Scan' && styles.labelActive]}>Scan</Text>
      </Pressable>

      <Pressable style={styles.item} onPress={() => goTo(navigation, 'History')}>
        <MaterialIcons name="history" size={26} color={active === 'History' ? colors.primary : colors.muted} />
        <Text style={[styles.label, active === 'History' && styles.labelActive]}>History</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 64,
    flexDirection: 'row',
    justifyContent: 'space-around',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: { minWidth: 72, minHeight: 56, alignItems: 'center', justifyContent: 'center' },
  scanCircle: {
    width: 48,
    height: 48,
    borderRadius: 24,
    marginTop: -16,
    backgroundColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
    elevation: 4,
  },
  label: { fontSize: 11, fontWeight: '700', color: colors.muted, textTransform: 'uppercase', marginTop: 2 },
  labelActive: { color: colors.primary },
});
