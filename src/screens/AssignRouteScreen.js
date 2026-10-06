import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import MachinePicker from '../components/MachinePicker';
import { useApp } from '../utils/AppContext';
import { formatDateLabel, goTo } from '../utils/helpers';
import { getMachinesOfMill } from '../utils/machineList';
import { colors, textStyles } from '../utils/theme';

// Choose which machines will be roved for the date + mill + shift picked on the Setup screen.
export default function AssignRouteScreen({ navigation }) {
  const { setup, stops, saveRoute } = useApp();
  const [selected, setSelected] = useState(() => {
    const result = {};
    stops.forEach((stop) => (result[stop.code] = true)); // start with the saved route
    return result;
  });

  const selectedCount = Object.keys(selected).length;

  function handleSave() {
    if (selectedCount === 0) {
      Alert.alert('No machines selected', 'Please select at least one machine to rove.');
      return;
    }
    saveRoute(Object.keys(selected));
    goTo(navigation, 'Home');
  }

  return (
    <Screen
      title="Assign Route"
      onBack={() => navigation.goBack()}
      pillText={setup.mill}
      hideNav
      scroll={false}
      footer={
        <View>
          <Text style={styles.footerText}>{selectedCount} machine(s) selected</Text>
          <BigButton title="Save Route" icon="check" onPress={handleSave} />
        </View>
      }
    >
      <MachinePicker
        machines={getMachinesOfMill(setup.mill)}
        selected={selected}
        onChange={setSelected}
        header={
          <View style={{ marginBottom: 12 }}>
            <Text style={textStyles.small}>STEP 2 • ASSIGN ROUTE</Text>
            <Text style={[textStyles.title, { marginVertical: 4 }]}>{setup.mill} • Shift {setup.shift}</Text>
            <Text style={textStyles.label}>{formatDateLabel(setup.workDate)}</Text>
          </View>
        }
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  footerText: { textAlign: 'center', fontSize: 13, fontWeight: '700', color: colors.muted, marginBottom: 8 },
});
