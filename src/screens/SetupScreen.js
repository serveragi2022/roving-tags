import { useEffect, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import { useApp } from '../utils/AppContext';
import { formatDateLabel, getWorkDate, goTo, shiftDate } from '../utils/helpers';
import { canSetup } from '../utils/accounts';
import { getMachinesOfMill, MILLS } from '../utils/machineList';
import { SHIFTS } from '../utils/sampleData';
import { cardStyle, colors, textStyles } from '../utils/theme';

// First screen: choose the date, mill and shift, then assign the route.
export default function SetupScreen({ navigation }) {
  const { user, setup, applySetup, loadRoute, pendingSetupCount, isOnline } = useApp();
  const [workDate, setWorkDate] = useState(setup.workDate);
  const [mill, setMill] = useState(setup.mill);
  const [shift, setShift] = useState(setup.shift);
  const [savedCount, setSavedCount] = useState(0); // machines already assigned for this choice
  const canEditSetup = canSetup(user); // only people with the Routes/Checklist access can set the route and checklists

  // Check if a route was already assigned for this date + mill + shift
  // (asks the server when online, so everyone sees what the route setter set)
  useEffect(() => {
    let isCurrent = true;
    loadRoute({ workDate, mill, shift }).then((codes) => {
      if (isCurrent) setSavedCount(codes.length);
    });
    return () => {
      isCurrent = false;
    };
  }, [workDate, mill, shift, isOnline]);

  async function openRoute(goToAssign) {
    await applySetup({ workDate, mill, shift });
    if (goToAssign) {
      navigation.navigate('AssignRoute');
    } else {
      goTo(navigation, 'Home');
    }
  }

  if (!user) return null; // right after logout, before the Login screen shows

  return (
    <Screen
      title="Roving Setup"
      hideNav
      onBack={() => goTo(navigation, 'Home')}
      footer={
        canEditSetup ? (
          savedCount > 0 ? (
            <View>
              <BigButton title={`Use Saved Route (${savedCount} machines)`} icon="play-arrow" onPress={() => openRoute(false)} />
              <BigButton title="Edit Route" icon="edit" variant="neutral" onPress={() => openRoute(true)} />
            </View>
          ) : (
            <BigButton title="Next: Assign Route" icon="arrow-forward" onPress={() => openRoute(true)} />
          )
        ) : (
          <BigButton
            title={savedCount > 0 ? `Start Roving (${savedCount} machines)` : 'No Route Set Yet'}
            icon="play-arrow"
            disabled={savedCount === 0}
            onPress={() => openRoute(false)}
          />
        )
      }
    >
      <Text style={[textStyles.small, { marginBottom: 8 }]}>STEP 1 • WHEN AND WHERE</Text>

      {/* Date */}
      <View style={cardStyle}>
        <Text style={textStyles.heading}>Date</Text>
        <View style={styles.dateRow}>
          <Pressable style={styles.dateButton} onPress={() => setWorkDate(shiftDate(workDate, -1))}>
            <MaterialIcons name="chevron-left" size={30} color={colors.primary} />
          </Pressable>
          <Text style={styles.dateText}>{formatDateLabel(workDate)}</Text>
          <Pressable style={styles.dateButton} onPress={() => setWorkDate(shiftDate(workDate, 1))}>
            <MaterialIcons name="chevron-right" size={30} color={colors.primary} />
          </Pressable>
        </View>
        <Pressable onPress={() => setWorkDate(getWorkDate())} style={styles.todayButton}>
          <Text style={styles.todayText}>Set to today</Text>
        </Pressable>
      </View>

      {/* Mill */}
      <View style={cardStyle}>
        <Text style={textStyles.heading}>Mill / Area</Text>
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
        <Text style={[textStyles.label, { marginTop: 8 }]}>
          {getMachinesOfMill(mill).length} machines in {mill}
        </Text>
      </View>

      {/* Shift */}
      <View style={cardStyle}>
        <Text style={textStyles.heading}>Shift</Text>
        <View style={styles.chipRow}>
          {SHIFTS.map((item) => (
            <Pressable
              key={item}
              onPress={() => setShift(item)}
              style={[styles.chip, { flex: 1 }, item === shift && styles.chipActive]}
            >
              <Text style={[styles.chipText, item === shift && { color: colors.white }]}>Shift {item}</Text>
            </Pressable>
          ))}
        </View>
      </View>

      {savedCount > 0 ? (
        <View style={[cardStyle, { backgroundColor: colors.greenLight, borderColor: colors.green }]}>
          <Text style={[textStyles.body, { color: colors.greenDark }]}>
            A route is already assigned for this date, mill and shift ({savedCount} machines).
          </Text>
        </View>
      ) : !canEditSetup ? (
        <View style={[cardStyle, { backgroundColor: colors.amberLight, borderColor: colors.amber }]}>
          <Text style={[textStyles.body, { color: colors.amberDark }]}>
            {isOnline
              ? 'No route has been set for this date, mill and shift yet.'
              : 'No route on this phone for this date, mill and shift. Connect to the internet to download the route.'}
          </Text>
        </View>
      ) : null}

      {canEditSetup && pendingSetupCount > 0 ? (
        <View style={[cardStyle, { backgroundColor: colors.amberLight, borderColor: colors.amber }]}>
          <Text style={[textStyles.body, { color: colors.amberDark }]}>
            {pendingSetupCount} route/checklist change(s) saved on this phone, waiting to upload. They upload automatically when online.
          </Text>
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  dateRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', marginTop: 12 },
  dateButton: {
    width: 56,
    height: 56,
    borderRadius: 12,
    backgroundColor: colors.primaryLight,
    alignItems: 'center',
    justifyContent: 'center',
  },
  dateText: { flex: 1, textAlign: 'center', fontSize: 18, fontWeight: '800', color: colors.text },
  todayButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center', marginTop: 4 },
  todayText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginTop: 12 },
  chip: {
    minHeight: 52,
    paddingHorizontal: 18,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.background,
    alignItems: 'center',
    justifyContent: 'center',
  },
  chipActive: { backgroundColor: colors.primary, borderColor: colors.primary },
  chipText: { fontSize: 15, fontWeight: '700', color: colors.text },
});
