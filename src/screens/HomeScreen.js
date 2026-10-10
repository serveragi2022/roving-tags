import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import { useApp } from '../utils/AppContext';
import { canSetup, describeLoginError } from '../utils/accounts';
import { APP_TITLE, countStops, formatDateLabel, getGreeting, getStopStatus, goTo } from '../utils/helpers';
import { cardStyle, colors, textStyles } from '../utils/theme';

export default function HomeScreen({ navigation }) {
  const { user, setup, stops, todayRecords, accountInfo, syncAccounts, logoutUser, isOnline } = useApp();
  const [isSyncing, setIsSyncing] = useState(false);
  const isSetupAllowed = canSetup(user);

  const counts = countStops(stops, todayRecords);
  const completed = counts.done + counts.issue;
  const percent = counts.total === 0 ? 0 : Math.round((completed / counts.total) * 100);
  const nextStop = stops.find((stop) => getStopStatus(stop, todayRecords).status === 'pending');

  function handleStart() {
    if (stops.length === 0) {
      if (isSetupAllowed) navigation.navigate('AssignRoute');
      else goTo(navigation, 'Setup'); // operator: pick another date / shift
    } else if (nextStop) {
      navigation.navigate('Scan');
    } else {
      goTo(navigation, 'History'); // everything is done: go to review and upload
    }
  }

  async function handleSync() {
    if (!isOnline) {
      Alert.alert('No internet', 'Connect to the internet to sync the accounts.');
      return;
    }
    setIsSyncing(true);
    try {
      const count = await syncAccounts();
      Alert.alert('Done', `${count} accounts saved on this phone.`);
    } catch (error) {
      Alert.alert('Sync failed', describeLoginError(error));
    }
    setIsSyncing(false);
  }

  function handleLogout() {
    Alert.alert('Logout?', 'Records saved on this phone are kept.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Logout',
        onPress: () => {
          logoutUser();
          goTo(navigation, 'Login');
        },
      },
    ]);
  }

  if (!user) return null; // right after logout, before the Login screen shows

  return (
    <Screen title={APP_TITLE} pillText={`Shift ${setup.shift}`} activeTab="Route">
      {/* Operator and setup */}
      <View style={cardStyle}>
        <Text style={textStyles.small}>SHIFT OPERATOR</Text>
        <Text style={[textStyles.title, { marginTop: 2 }]}>{getGreeting()}, {user.name}</Text>
        <View style={styles.roleChip}>
          <MaterialIcons name="engineering" size={16} color={colors.primary} />
          <Text style={styles.roleText}>{user.role} (Shift {setup.shift})</Text>
        </View>

        <View style={styles.setupRow}>
          <View style={{ flex: 1 }}>
            <Text style={textStyles.small}>DATE • SHIFT</Text>
            <Text style={textStyles.body}>{formatDateLabel(setup.workDate)}</Text>
            <Text style={textStyles.body}>Shift {setup.shift}</Text>
          </View>
          <Pressable style={styles.changeButton} onPress={() => goTo(navigation, 'Setup')}>
            <MaterialIcons name="edit-calendar" size={18} color={colors.primary} />
            <Text style={styles.changeText}>Change</Text>
          </Pressable>
        </View>
      </View>

      {/* Route progress */}
      {stops.length === 0 ? (
        <View style={[cardStyle, { borderLeftWidth: 6, borderLeftColor: colors.amber }]}>
          <Text style={[textStyles.small, { color: colors.amberDark }]}>TODAY'S ROUTE</Text>
          <Text style={[textStyles.heading, { marginTop: 4 }]}>No route assigned yet</Text>
          <Text style={[textStyles.label, { marginTop: 4 }]}>
            {isSetupAllowed
              ? `Choose the machines to rove for Shift ${setup.shift}.`
              : `No route has been set for Shift ${setup.shift} yet.`}
          </Text>
        </View>
      ) : (
        <View style={[cardStyle, { borderLeftWidth: 6, borderLeftColor: colors.green }]}>
          <Text style={[textStyles.small, { color: colors.primary }]}>TODAY'S ASSIGNED ROUTE</Text>
          <Text style={[textStyles.title, { marginTop: 2 }]}>Shift {setup.shift} Roving</Text>

          <View style={styles.metricBox}>
            <View style={styles.rowBetween}>
              <Text style={styles.metric}>{completed} / {counts.total} <Text style={styles.metricLabel}>Stops Done</Text></Text>
              <Text style={[textStyles.heading, { color: colors.greenDark }]}>{percent}%</Text>
            </View>
            <View style={styles.progressTrack}>
              <View style={[styles.progressFill, { width: `${percent}%` }]} />
            </View>
          </View>

          <View style={styles.rowBetween}>
            <View style={[styles.countBox, { backgroundColor: colors.greenLight }]}>
              <Text style={[styles.countNumber, { color: colors.greenDark }]}>{counts.done}</Text>
              <Text style={[styles.countLabel, { color: colors.greenDark }]}>Completed</Text>
            </View>
            <View style={[styles.countBox, { backgroundColor: colors.redLight }]}>
              <Text style={[styles.countNumber, { color: colors.redDark }]}>{counts.issue}</Text>
              <Text style={[styles.countLabel, { color: colors.redDark }]}>Issue Logged</Text>
            </View>
            <View style={[styles.countBox, { backgroundColor: colors.amberLight }]}>
              <Text style={[styles.countNumber, { color: colors.amberDark }]}>{counts.pending + counts.deferred}</Text>
              <Text style={[styles.countLabel, { color: colors.amberDark }]}>Pending</Text>
            </View>
          </View>
        </View>
      )}

      {/* Main buttons */}
      <BigButton
        title={
          stops.length === 0
            ? isSetupAllowed ? 'ASSIGN ROUTE' : 'CHANGE DATE / SHIFT'
            : nextStop ? 'START ROVING' : 'REVIEW & UPLOAD'
        }
        icon={stops.length === 0 ? (isSetupAllowed ? 'add-task' : 'edit-calendar') : nextStop ? 'play-arrow' : 'cloud-upload'}
        onPress={handleStart}
      />
      {nextStop ? (
        <Text style={styles.nextText}>Next: {nextStop.code} {nextStop.name}</Text>
      ) : stops.length > 0 ? (
        <Text style={styles.nextText}>All stops are done for this shift.</Text>
      ) : null}
      <BigButton
        title="Urgent Breakdown / Callout"
        icon="report"
        variant="danger"
        onPress={() => navigation.navigate('Urgent')}
      />

      {/* Shift details */}
      <View style={cardStyle}>
        <Text style={textStyles.heading}>Shift Details</Text>
        <Text style={[textStyles.small, { marginTop: 12 }]}>ASSIGNED ROUTE</Text>
        <Text style={textStyles.body}>Shift {setup.shift} • {stops.length} machines</Text>

        <Text style={[textStyles.small, { marginTop: 12 }]}>LOGGED IN</Text>
        <Text style={textStyles.body}>{user.name} • {user.employeeId}</Text>
      </View>

      {/* Account and settings */}
      <View style={cardStyle}>
        <Text style={textStyles.small}>ACCOUNT</Text>
        <Text style={[textStyles.label, { marginTop: 4, marginBottom: 12 }]}>
          {accountInfo.count} accounts saved for offline use
          {accountInfo.syncedAt ? ` • last sync ${new Date(accountInfo.syncedAt).toLocaleString()}` : ''}
        </Text>
        <BigButton title="Sync Accounts" icon="sync" variant="neutral" onPress={handleSync} loading={isSyncing} />
        {isSetupAllowed ? (
          <BigButton
            title="Manage Checklists"
            icon="fact-check"
            variant="neutral"
            onPress={() => navigation.navigate('Checklists')}
          />
        ) : null}
        <BigButton title="Logout" icon="logout" variant="danger" onPress={handleLogout} />
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  roleChip: {
    flexDirection: 'row',
    alignItems: 'center',
    alignSelf: 'flex-start',
    gap: 6,
    marginTop: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 999,
    backgroundColor: colors.primaryLight,
    borderWidth: 1,
    borderColor: colors.primary,
  },
  roleText: { fontSize: 12, fontWeight: '700', color: colors.primary },
  setupRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  changeButton: {
    minHeight: 44,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  changeText: { fontSize: 13, fontWeight: '700', color: colors.primary },
  metricBox: {
    backgroundColor: colors.background,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.border,
    padding: 12,
    marginVertical: 12,
  },
  metric: { fontSize: 32, fontWeight: '800', color: colors.text },
  metricLabel: { fontSize: 16, fontWeight: '600', color: colors.muted },
  progressTrack: { height: 14, borderRadius: 7, backgroundColor: colors.border, marginTop: 8, overflow: 'hidden' },
  progressFill: { height: 14, borderRadius: 7, backgroundColor: colors.green },
  countBox: { flex: 1, marginHorizontal: 4, borderRadius: 8, paddingVertical: 10, alignItems: 'center' },
  countNumber: { fontSize: 20, fontWeight: '800' },
  countLabel: { fontSize: 11, fontWeight: '700', marginTop: 2 },
  nextText: { textAlign: 'center', color: colors.muted, fontSize: 13, marginTop: -4, marginBottom: 12 },
  callButton: {
    minHeight: 40,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 12,
    borderRadius: 8,
    backgroundColor: colors.background,
  },
  callText: { fontSize: 13, fontWeight: '700', color: colors.primary },
});
