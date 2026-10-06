import { StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

// Small colored label such as "Done", "Pending", "Issue", "Waiting".
const LOOKS = {
  pending: { label: 'Pending', icon: 'schedule', color: colors.amberDark, background: colors.amberLight },
  done: { label: 'Done', icon: 'check-circle', color: colors.greenDark, background: colors.greenLight },
  issue: { label: 'Issue', icon: 'warning', color: colors.redDark, background: colors.redLight },
  deferred: { label: 'Deferred', icon: 'build', color: colors.muted, background: colors.border },
  uploaded: { label: 'Uploaded', icon: 'cloud-done', color: colors.greenDark, background: colors.greenLight },
  waiting: { label: 'Waiting', icon: 'cloud-queue', color: colors.amberDark, background: colors.amberLight },
  failed: { label: 'Failed', icon: 'sync-problem', color: colors.redDark, background: colors.redLight },
};

export default function StatusPill({ status }) {
  const look = LOOKS[status];
  return (
    <View style={[styles.pill, { backgroundColor: look.background }]}>
      <MaterialIcons name={look.icon} size={14} color={look.color} />
      <Text style={[styles.text, { color: look.color }]}>{look.label}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 4,
    paddingHorizontal: 8,
    paddingVertical: 3,
    borderRadius: 999,
  },
  text: { fontSize: 12, fontWeight: '700' },
});
