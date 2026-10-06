import { StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import { useApp } from '../utils/AppContext';
import { cardStyle, colors, textStyles } from '../utils/theme';

// List of checklists. Each machine uses the checklist assigned to it,
// or the Standard Checklist when none is assigned.
export default function ChecklistsScreen({ navigation }) {
  const { checklists, checklistMap } = useApp();

  function countMachines(checklistId) {
    return Object.values(checklistMap).filter((id) => id === checklistId).length;
  }

  return (
    <Screen
      title="Checklists"
      onBack={() => navigation.goBack()}
      hideNav
      footer={
        <BigButton title="New Checklist" icon="add" onPress={() => navigation.navigate('ChecklistEdit')} />
      }
    >
      <Text style={[textStyles.label, { marginBottom: 12 }]}>
        Scanning a machine opens the checklist assigned to it. Machines without their own checklist use the Standard Checklist.
      </Text>

      {checklists.map((checklist) => {
        const isDefault = checklist.id === 'default';
        return (
          <View key={checklist.id} style={cardStyle}>
            <Text style={textStyles.heading}>{checklist.name}</Text>
            <Text style={[textStyles.label, { marginTop: 4 }]}>
              {checklist.operating.length} operating checks • {checklist.housekeeping.length} 5S checks
            </Text>
            <Text style={styles.assigned}>
              {isDefault
                ? 'Used by every machine without its own checklist'
                : `Assigned to ${countMachines(checklist.id)} machines`}
            </Text>
            <BigButton
              title="Edit Checks"
              icon="edit"
              variant="neutral"
              onPress={() => navigation.navigate('ChecklistEdit', { checklistId: checklist.id })}
            />
            {isDefault ? null : (
              <BigButton
                title="Assign to Machines"
                icon="playlist-add-check"
                onPress={() => navigation.navigate('AssignChecklist', { checklistId: checklist.id })}
              />
            )}
          </View>
        );
      })}
    </Screen>
  );
}

const styles = StyleSheet.create({
  assigned: { fontSize: 13, fontWeight: '700', color: colors.primary, marginVertical: 10 },
});
