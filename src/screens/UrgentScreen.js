import { useEffect } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import PhotoCapture from '../components/PhotoCapture';
import { useApp } from '../utils/AppContext';
import { formatDuration, formatTime, goTo, makeBlankUrgentDraft } from '../utils/helpers';
import { findMachine } from '../utils/machineList';
import { cardStyle, colors, textStyles } from '../utils/theme';

// Path B: urgent breakdown. The sheet is kept in the app context (urgentDraft)
// so the technician can leave to scan a QR or get approval and come back.
export default function UrgentScreen({ navigation, route }) {
  const { urgentDraft, setUrgentDraft } = useApp();
  const codeFromChecklist = route.params?.assetCode;

  // Create the sheet when the screen opens (or continue the one in progress)
  useEffect(() => {
    if (!urgentDraft) {
      setUrgentDraft(makeBlankUrgentDraft(codeFromChecklist || ''));
    } else if (codeFromChecklist && !urgentDraft.assetCode) {
      setUrgentDraft({ ...urgentDraft, assetCode: codeFromChecklist });
    }
  }, []);

  if (!urgentDraft) return null;

  const draft = urgentDraft;
  const stop = findMachine(draft.assetCode); // any machine in the list, not only the route
  const workApproved = draft.workApproval && draft.workApproval.status === 'approved';
  const completionRejected = draft.completionApproval && draft.completionApproval.status === 'rejected';

  function update(changes) {
    setUrgentDraft({ ...draft, ...changes });
  }

  function handleRequestCompletion() {
    const missing = [];
    if (!draft.assetCode.trim()) missing.push('Asset code');
    if (!workApproved) missing.push('Work approval');
    if (!draft.problem.trim()) missing.push('Problem description');
    if (!draft.correctiveAction.trim()) missing.push('Corrective action taken');
    if (!draft.startTime) missing.push('Start time');
    if (!draft.endTime) missing.push('End time');
    if (!draft.photo) missing.push('Live photo');

    if (missing.length > 0) {
      Alert.alert('Please complete', 'Missing: ' + missing.join(', '));
      return;
    }
    navigation.navigate('Approval', { mode: 'completion' });
  }

  function handleCancel() {
    Alert.alert('Cancel repair sheet?', 'Everything you entered on this sheet will be deleted.', [
      { text: 'Keep it', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          setUrgentDraft(null);
          goTo(navigation, 'Home');
        },
      },
    ]);
  }

  return (
    <Screen
      title="Urgent Repair Sheet"
      onBack={() => navigation.goBack()}
      activeTab="Route"
      footer={
        <BigButton title="Request Completion Approval" icon="send" onPress={handleRequestCompletion} />
      }
    >
      {/* Warning banner */}
      <View style={styles.warning}>
        <MaterialIcons name="warning" size={24} color={colors.redDark} />
        <Text style={styles.warningText}>
          Roving is deferred because of an urgent breakdown repair.
        </Text>
      </View>

      {completionRejected ? (
        <View style={[cardStyle, { backgroundColor: colors.redLight, borderColor: colors.red }]}>
          <Text style={[textStyles.heading, { color: colors.redDark }]}>Completion was rejected</Text>
          <Text style={textStyles.body}>
            {draft.completionApproval.approvedBy}: {draft.completionApproval.remarks}
          </Text>
          <Text style={[textStyles.label, { marginTop: 4 }]}>Fix the problem, then request approval again.</Text>
        </View>
      ) : null}

      {/* Step 1: notify */}
      <View style={cardStyle}>
        <Text style={textStyles.small}>STEP 1 • COMMUNICATION</Text>
        <Text style={[textStyles.heading, { marginVertical: 4 }]}>Notify Production / Process Owner</Text>
        {draft.notifiedAt ? (
          <Text style={[textStyles.body, { color: colors.greenDark, marginBottom: 10 }]}>
            ✓ Notified at {formatTime(draft.notifiedAt)}
          </Text>
        ) : (
          <BigButton
            title="I Notified the Process Owner"
            icon="notifications-active"
            onPress={() => update({ notifiedAt: new Date().toISOString() })}
          />
        )}

        {workApproved ? (
          <Text style={[textStyles.body, { color: colors.greenDark }]}>
            ✓ Work approved by {draft.workApproval.approvedBy}
          </Text>
        ) : (
          <BigButton
            title="Get Work Approval"
            icon="verified-user"
            disabled={!draft.notifiedAt}
            onPress={() => navigation.navigate('Approval', { mode: 'work' })}
          />
        )}
      </View>

      {/* Step 2: asset */}
      <View style={cardStyle}>
        <Text style={textStyles.small}>STEP 2 • MACHINE</Text>
        <Text style={[textStyles.heading, { marginVertical: 4 }]}>Asset Verification</Text>
        <TextInput
          value={draft.assetCode}
          onChangeText={(text) => update({ assetCode: text })}
          placeholder="Asset code, e.g. M33-A"
          autoCapitalize="characters"
          autoCorrect={false}
          style={styles.input}
        />
        {stop ? (
          <Text style={[textStyles.label, { marginBottom: 8 }]}>{stop.name} • {stop.area}, {stop.floor}</Text>
        ) : null}
        <BigButton
          title="Scan QR (if available)"
          icon="qr-code-scanner"
          variant="neutral"
          onPress={() => navigation.navigate('Scan', { forUrgent: true })}
        />
      </View>

      {/* Step 3: details */}
      <View style={cardStyle}>
        <Text style={textStyles.small}>STEP 3 • TECHNICAL LOG</Text>
        <Text style={[textStyles.label, { marginTop: 8 }]}>Problem description</Text>
        <TextInput
          value={draft.problem}
          onChangeText={(text) => update({ problem: text })}
          placeholder="What is wrong?"
          multiline
          style={[styles.input, styles.multiline]}
        />
        <Text style={[textStyles.label, { marginTop: 8 }]}>Corrective action taken</Text>
        <TextInput
          value={draft.correctiveAction}
          onChangeText={(text) => update({ correctiveAction: text })}
          placeholder="What did you do to fix it?"
          multiline
          style={[styles.input, styles.multiline]}
        />
      </View>

      {/* Step 4: timer */}
      <View style={cardStyle}>
        <View style={styles.rowBetween}>
          <View>
            <Text style={textStyles.small}>STEP 4 • WORK PUNCH</Text>
            <Text style={textStyles.heading}>Work Timer</Text>
          </View>
          <Text style={[textStyles.heading, { color: colors.primary }]}>
            {formatDuration(draft.startTime, draft.endTime)}
          </Text>
        </View>
        <View style={{ marginTop: 12 }}>
          {draft.startTime ? (
            <Text style={[textStyles.body, { marginBottom: 10 }]}>✓ Start time: {formatTime(draft.startTime)}</Text>
          ) : (
            <BigButton
              title="Punch Start Time"
              icon="play-circle-outline"
              disabled={!workApproved}
              onPress={() => update({ startTime: new Date().toISOString() })}
            />
          )}
          {draft.endTime ? (
            <Text style={textStyles.body}>✓ End time: {formatTime(draft.endTime)}</Text>
          ) : (
            <BigButton
              title="Punch End Time"
              icon="stop-circle"
              disabled={!draft.startTime}
              onPress={() => update({ endTime: new Date().toISOString() })}
            />
          )}
          {!workApproved ? (
            <Text style={[textStyles.label, { marginTop: 4 }]}>Work approval is needed before you can punch the start time.</Text>
          ) : null}
        </View>
      </View>

      {/* Step 5: photo */}
      <View style={cardStyle}>
        <Text style={textStyles.small}>STEP 5 • VISUAL PROOF</Text>
        <Text style={[textStyles.heading, { marginVertical: 4 }]}>Live Verification Photo</Text>
        <Text style={[textStyles.label, { marginBottom: 10 }]}>
          Camera only. Show the machine status and the clean workspace around it.
        </Text>
        <PhotoCapture photo={draft.photo} onPhotoTaken={(photo) => update({ photo })} />
      </View>

      <BigButton title="Cancel Repair Sheet" variant="neutral" onPress={handleCancel} />
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  warning: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    padding: 12,
    marginBottom: 12,
    borderRadius: 12,
    backgroundColor: colors.redLight,
    borderWidth: 1,
    borderColor: colors.red,
  },
  warningText: { flex: 1, fontSize: 14, fontWeight: '700', color: colors.redDark },
  input: {
    minHeight: 52,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: colors.white,
    marginTop: 6,
    marginBottom: 6,
  },
  multiline: { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 },
});
