import { useState } from 'react';
import { Alert, Image, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import { useApp } from '../utils/AppContext';
import { ACCESS_APPROVE, canApprove, describeLoginError, findAccount } from '../utils/accounts';
import { formatDuration, formatTime, goTo, makeRecordBase } from '../utils/helpers';
import { findMachine } from '../utils/machineList';
import { COMPLETION_APPROVAL_CHECKS, WORK_APPROVAL_CHECKS } from '../utils/checklistItems';
import { cardStyle, colors, textStyles } from '../utils/theme';

// The approver signs off right on this phone (no internet needed):
// username + password are checked against the accounts saved on the phone,
// and the account must have the "Approve" access (ACCESS_APPROVE).
// "work" tab = before the repair starts, "completion" tab = after the repair.
export default function ApprovalScreen({ navigation, route }) {
  const { user, setup, urgentDraft, setUrgentDraft, addRecord } = useApp();
  const [tab, setTab] = useState(route.params?.mode || 'completion');
  const [checked, setChecked] = useState({}); // { 0: true, 2: true }
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [remarks, setRemarks] = useState('');
  const [isChecking, setIsChecking] = useState(false);

  if (!urgentDraft) {
    return (
      <Screen title="Supervisor Approval" onBack={() => navigation.goBack()}>
        <Text style={textStyles.body}>There is no repair sheet to approve.</Text>
      </Screen>
    );
  }

  const draft = urgentDraft;
  const stop = findMachine(draft.assetCode);
  const checks = tab === 'work' ? WORK_APPROVAL_CHECKS : COMPLETION_APPROVAL_CHECKS;
  const savedApproval = tab === 'work' ? draft.workApproval : draft.completionApproval;
  const isApproved = savedApproval && savedApproval.status === 'approved';

  function changeTab(newTab) {
    setTab(newTab);
    setChecked({});
    setUsername('');
    setPassword('');
    setRemarks('');
  }

  function toggleCheck(index) {
    setChecked({ ...checked, [index]: !checked[index] });
  }

  // Checks the username and password. Returns the account of an approver, or null.
  async function verifyApprover() {
    if (username.trim() === '' || password === '') {
      Alert.alert('Sign-off needed', 'Please enter the username and password of the approver.');
      return null;
    }
    try {
      const account = await findAccount(username, password);
   
      if (!canApprove(account)) {
        Alert.alert('Not allowed', `This account has no "${ACCESS_APPROVE}" access.`);
        return null;
      }
      return account;
    } catch (error) {
      Alert.alert('Approval failed', describeLoginError(error));
      return null;
    }
  }

  function makeApproval(status, account) {
    return {
      status,
      approvedBy: account.name,
      approverUsername: account.username,
      approverEmpId: account.emp_id,
      remarks: remarks.trim(),
      approvedAt: new Date().toISOString(),
    };
  }

  async function handleApprove() {
    if (isChecking) return;
    const allChecked = checks.every((text, index) => checked[index]);
    if (!allChecked) {
      Alert.alert('Please check all items', 'The approver must confirm every item.');
      return;
    }

    setIsChecking(true);
    const account = await verifyApprover();
    setIsChecking(false);
    if (!account) return;

    const approval = makeApproval('approved', account);

    if (tab === 'work') {
      setUrgentDraft({ ...draft, workApproval: approval });
      navigation.goBack();
      return;
    }

    // Completion approved: save the whole urgent record on the phone
    addRecord({
      ...makeRecordBase(user, setup, stop ? stop.code : draft.assetCode.trim().toUpperCase(), stop),
      type: 'urgent',
      problem: draft.problem.trim(),
      correctiveAction: draft.correctiveAction.trim(),
      notifiedAt: draft.notifiedAt,
      startTime: draft.startTime,
      endTime: draft.endTime,
      workApproval: draft.workApproval,
      completionApproval: approval,
      photoUri: draft.photo.uri,
      photoTakenAt: draft.photo.takenAt,
      gps: draft.photo.gps,
    });
    setUrgentDraft(null);
    Alert.alert('Saved', 'Urgent repair saved on this phone. Roving can continue.');
    goTo(navigation, 'Route');
  }

  async function handleReject() {
    if (isChecking) return;
    if (remarks.trim() === '') {
      Alert.alert('Remarks needed', 'Please write the reason for rejecting.');
      return;
    }

    setIsChecking(true);
    const account = await verifyApprover();
    setIsChecking(false);
    if (!account) return;

    const rejection = makeApproval('rejected', account);
    if (tab === 'work') {
      setUrgentDraft({ ...draft, workApproval: rejection });
    } else {
      setUrgentDraft({ ...draft, completionApproval: rejection });
    }
    navigation.goBack();
  }

  return (
    <Screen title="Supervisor Approval" onBack={() => navigation.goBack()} activeTab="Route">
      {/* Tabs */}
      <View style={styles.tabs}>
        <Pressable style={[styles.tab, tab === 'work' && styles.tabActive]} onPress={() => changeTab('work')}>
          <Text style={[styles.tabText, tab === 'work' && { color: colors.white }]}>Work Approval</Text>
        </Pressable>
        <Pressable style={[styles.tab, tab === 'completion' && styles.tabActive]} onPress={() => changeTab('completion')}>
          <Text style={[styles.tabText, tab === 'completion' && { color: colors.white }]}>Completion Approval</Text>
        </Pressable>
      </View>

      {/* Status */}
      {isApproved ? (
        <View style={[styles.status, { backgroundColor: colors.greenLight, borderColor: colors.green }]}>
          <Text style={[styles.statusTitle, { color: colors.greenDark }]}>Approved</Text>
          <Text style={textStyles.body}>By {savedApproval.approvedBy} at {formatTime(savedApproval.approvedAt)}</Text>
        </View>
      ) : savedApproval ? (
        <View style={[styles.status, { backgroundColor: colors.redLight, borderColor: colors.red }]}>
          <Text style={[styles.statusTitle, { color: colors.redDark }]}>Rejected</Text>
          <Text style={textStyles.body}>{savedApproval.approvedBy}: {savedApproval.remarks}</Text>
        </View>
      ) : (
        <View style={[styles.status, { backgroundColor: colors.amberLight, borderColor: colors.amber }]}>
          <Text style={[styles.statusTitle, { color: colors.amberDark }]}>Waiting for Approval</Text>
          <Text style={textStyles.body}>An approver must sign off before the work continues.</Text>
        </View>
      )}

      {/* Repair summary */}
      <View style={cardStyle}>
        <Text style={textStyles.small}>TARGET MACHINE</Text>
        <Text style={textStyles.title}>{draft.assetCode} {stop ? stop.name : ''}</Text>
        <Text style={[textStyles.label, { marginBottom: 10 }]}>{stop ? `${stop.area}, ${stop.floor}` : ''}</Text>

        <Text style={textStyles.small}>LOGGED TECHNICIAN</Text>
        <Text style={styles.value}>{user.name} ({user.role})</Text>

        <Text style={textStyles.small}>OBSERVED ISSUE</Text>
        <Text style={styles.value}>{draft.problem || '—'}</Text>

        {tab === 'completion' ? (
          <View>
            <Text style={textStyles.small}>REPAIR WINDOW</Text>
            <Text style={styles.value}>
              {formatTime(draft.startTime)} – {formatTime(draft.endTime)} ({formatDuration(draft.startTime, draft.endTime)})
            </Text>
            <Text style={textStyles.small}>CORRECTIVE ACTION</Text>
            <Text style={styles.value}>{draft.correctiveAction || '—'}</Text>
            {draft.photo ? <Image source={{ uri: draft.photo.uri }} style={styles.photo} /> : null}
          </View>
        ) : null}
      </View>

      {/* Sign-off (hidden once approved) */}
      {!isApproved ? (
        <View>
          <View style={cardStyle}>
            <Text style={textStyles.heading}>Approver Verification</Text>
            {checks.map((text, index) => (
              <Pressable key={text} style={styles.checkRow} onPress={() => toggleCheck(index)}>
                <MaterialIcons
                  name={checked[index] ? 'check-box' : 'check-box-outline-blank'}
                  size={30}
                  color={checked[index] ? colors.primary : colors.muted}
                />
                <Text style={styles.checkText}>{index + 1}. {text}</Text>
              </Pressable>
            ))}
          </View>

          <View style={cardStyle}>
            <Text style={textStyles.heading}>Approver Sign-off</Text>
            <Text style={[textStyles.label, { marginTop: 8 }]}>Username</Text>
            <TextInput
              value={username}
              onChangeText={setUsername}
              autoCapitalize="none"
              autoCorrect={false}
              placeholder="Username"
              style={styles.input}
            />
            <Text style={[textStyles.label, { marginTop: 8 }]}>Password</Text>
            <TextInput
              value={password}
              onChangeText={setPassword}
              secureTextEntry
              autoCapitalize="none"
              placeholder="Password"
              style={styles.input}
            />
            <Text style={[textStyles.label, { marginTop: 8 }]}>Remarks</Text>
            <TextInput
              value={remarks}
              onChangeText={setRemarks}
              placeholder="Remarks (required if rejecting)"
              multiline
              style={[styles.input, { minHeight: 72, textAlignVertical: 'top', paddingTop: 10 }]}
            />
          </View>

          <BigButton
            title={tab === 'work' ? 'Approve Work' : 'Approve & Resume Roving'}
            icon="check-circle"
            variant="success"
            onPress={handleApprove}
            loading={isChecking}
          />
          <BigButton title="Reject / Rework Required" icon="cancel" variant="danger" onPress={handleReject} disabled={isChecking} />
        </View>
      ) : (
        <BigButton title="Back" variant="neutral" onPress={() => navigation.goBack()} />
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  tabs: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  tab: {
    flex: 1,
    minHeight: 52,
    borderRadius: 8,
    backgroundColor: colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  tabActive: { backgroundColor: colors.primary },
  tabText: { fontSize: 14, fontWeight: '700', color: colors.muted },
  status: { padding: 12, borderRadius: 12, borderWidth: 1, marginBottom: 12 },
  statusTitle: { fontSize: 16, fontWeight: '800', marginBottom: 2 },
  value: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 10 },
  photo: { width: '100%', height: 180, borderRadius: 8, marginTop: 4 },
  checkRow: { minHeight: 56, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 6 },
  checkText: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text },
  input: {
    minHeight: 52,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 15,
    backgroundColor: colors.white,
    marginTop: 4,
  },
});
