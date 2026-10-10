import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import MachinePicker from '../components/MachinePicker';
import RestrictedScreen from '../components/RestrictedScreen';
import { useApp } from '../utils/AppContext';
import { canSetup } from '../utils/accounts';
import { getMachinesOfMill, MILLS } from '../utils/machineList';
import { colors, textStyles } from '../utils/theme';

// Choose which machines use this checklist. Tip: search a machine type (for example "rollermill")
// and use "Select all shown" to pick all machines that share the same checklist.
export default function AssignChecklistScreen({ navigation, route }) {
  const { user, setup, checklists, checklistMap, assignChecklist } = useApp();
  const checklistId = route.params.checklistId;
  const checklist = checklists.find((item) => item.id === checklistId);

  const [mill, setMill] = useState(MILLS[0]);
  const [selected, setSelected] = useState(() => {
    const result = {};
    Object.keys(checklistMap).forEach((code) => {
      if (checklistMap[code] === checklistId) result[code] = true;
    });
    return result;
  });

  if (!canSetup(user)) return <RestrictedScreen navigation={navigation} title="Assign Checklist" />;

  if (!checklist) {
    return (
      <Screen title="Assign Checklist" onBack={() => navigation.goBack()} hideNav>
        <Text style={textStyles.body}>Checklist not found.</Text>
      </Screen>
    );
  }

  const selectedCount = Object.keys(selected).length;

  // Shows when a machine already uses a different checklist
  function getNote(machine) {
    const otherId = checklistMap[machine.code];
    if (!otherId || otherId === checklistId) return '';
    const other = checklists.find((item) => item.id === otherId);
    return other ? `Now uses: ${other.name}` : '';
  }

  function handleSave() {
    assignChecklist(checklistId, Object.keys(selected));
    navigation.goBack();
  }

  return (
    <Screen
      title="Assign Checklist"
      onBack={() => navigation.goBack()}
      hideNav
      scroll={false}
      footer={
        <View>
          <Text style={styles.footerText}>{selectedCount} machine(s) selected (all mills)</Text>
          <BigButton title="Save" icon="check" onPress={handleSave} />
        </View>
      }
    >
      <MachinePicker
        machines={getMachinesOfMill(mill)}
        selected={selected}
        onChange={setSelected}
        getNote={getNote}
        header={
          <View style={{ marginBottom: 12 }}>
            <Text style={textStyles.small}>CHECKLIST</Text>
            <Text style={[textStyles.title, { marginVertical: 4 }]}>{checklist.name}</Text>
            <View style={styles.chipRow}>
              {MILLS.map((item) => (
                <Pressable
                  key={item}
                  onPress={() => setMill(item)}
                  style={[styles.chip, item === mill && styles.chipActive]}
                >
                  <Text style={[styles.chipText, item === mill && { color: colors.white }]}>{item}</Text>
                </Pressable>
              ))}
            </View>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 8 },
  chip: {
    minHeight: 44,
    paddingHorizontal: 16,
    borderRadius: 999,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 14, fontWeight: '700', color: colors.text },
  footerText: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 8 },
});
