import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

// Two big buttons: Good (green) / Not Good (red).
// value is 'good', 'bad' or undefined (not answered yet).
export default function GoodBadToggle({ value, onChange, goodLabel = 'Good', badLabel = 'Not Good' }) {
  return (
    <View style={styles.row}>
      <Pressable
        onPress={() => onChange('good')}
        style={[styles.segment, value === 'good' && { backgroundColor: colors.green }]}
      >
        <MaterialIcons name="check" size={20} color={value === 'good' ? colors.white : colors.muted} />
        <Text style={[styles.text, value === 'good' && styles.textOn]}>{goodLabel}</Text>
      </Pressable>

      <Pressable
        onPress={() => onChange('bad')}
        style={[styles.segment, value === 'bad' && { backgroundColor: colors.red }]}
      >
        <MaterialIcons name="warning" size={20} color={value === 'bad' ? colors.white : colors.muted} />
        <Text style={[styles.text, value === 'bad' && styles.textOn]}>{badLabel}</Text>
      </Pressable>
    </View>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', gap: 8, marginTop: 10 },
  segment: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: colors.border,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
  },
  text: { fontSize: 14, fontWeight: '700', color: colors.muted },
  textOn: { color: colors.white },
});
