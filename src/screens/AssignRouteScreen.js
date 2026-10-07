import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import MachinePicker from '../components/MachinePicker';
import RestrictedScreen from '../components/RestrictedScreen';
import { useApp } from '../utils/AppContext';
import { canSetup } from '../utils/accounts';
import { formatDateLabel, getWorkDate, goTo } from '../utils/helpers';
import { getMachinesOfMill } from '../utils/machineList';
import { colors, textStyles } from '../utils/theme';

// Choose which machines will be roved for the date + mill + shift picked on the Setup screen.
export default function AssignRouteScreen({ navigation }) {
  const { user, setup, stops, saveRoute } = useApp();
  const [selected, setSelected] = useState(() => {
    const result = {};
    stops.forEach((stop) => (result[stop.code] = true)); // start with the saved route
    return result;
  });

  const [isSaving, setIsSaving] = useState(false);
  const selectedCount = Object.keys(selected).length;

  if (!canSetup(user)) return <RestrictedScreen navigation={navigation} title="Assign Route" />;

  async function handleSave() {
    if (selectedCount === 0) {
      Alert.alert('No machines selected', 'Please select at least one machine to rove.');
      return;
    }
    setIsSaving(true);
    const isOnServer = await saveRoute(Object.keys(selected));
    setIsSaving(false);
    if (!isOnServer) {
      Alert.alert('Saved on this phone', 'It is not on the server yet (no connection, or the server did not accept it). It uploads automatically when online.');
    }
    if (setup.workDate !== getWorkDate()) {
      // Set in advance for another day: go back to Setup so you can set the next one
      Alert.alert('Route saved', `Route for ${formatDateLabel(setup.workDate)} • ${setup.mill} • Shift ${setup.shift} is saved.`);
      goTo(navigation, 'Setup');
    } else {
      goTo(navigation, 'Home');
    }
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
          <BigButton title="Save Route" icon="check" onPress={handleSave} loading={isSaving} />
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
