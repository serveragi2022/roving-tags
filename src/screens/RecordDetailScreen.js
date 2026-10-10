import { useState } from 'react';
import { Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import PhotoViewer from '../components/PhotoViewer';
import { useApp } from '../utils/AppContext';
import { formatDateLabel, formatDuration, formatGps, hasProblem } from '../utils/helpers';
import { cardStyle, colors, textStyles } from '../utils/theme';

// "01 Oct 2026, 02:15 PM"
function formatDateTime(isoText) {
  if (!isoText) return '--';
  return new Date(isoText).toLocaleString([], {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function Row({ label, value }) {
  return (
    <View style={styles.row}>
      <Text style={styles.rowLabel}>{label}</Text>
      <Text style={styles.rowValue}>{value === undefined || value === null || value === '' ? '--' : value}</Text>
    </View>
  );
}

// One approval (work approval or completion approval) of an urgent repair sheet
function ApprovalCard({ title, approval }) {
  if (!approval) {
    return (
      <View style={cardStyle}>
        <Text style={textStyles.heading}>{title}</Text>
        <Text style={[textStyles.label, { marginTop: 4 }]}>Not done.</Text>
      </View>
    );
  }
  return (
    <View style={cardStyle}>
      <Text style={textStyles.heading}>{title}</Text>
      <Row label="Result" value={String(approval.status || '').toUpperCase()} />
      <Row label="Approved by" value={approval.approvedBy} />
      <Row label="Date and time" value={formatDateTime(approval.approvedAt)} />
      <Row label="Remarks" value={approval.remarks} />
    </View>
  );
}

// Everything that was saved in one record of the History list:
// a checklist (answers, remarks, photo) or an urgent repair sheet (problem, repair, approvals, photo).
export default function RecordDetailScreen({ navigation, route }) {
  const { records } = useApp();
  const record = records.find((item) => item.id === route.params?.recordId);
  const [isViewing, setIsViewing] = useState(false);

  if (!record) {
    return (
      <Screen title="Record" onBack={() => navigation.goBack()} activeTab="History">
        <Text style={textStyles.body}>This record was not found.</Text>
      </Screen>
    );
  }

  const isUrgent = record.type === 'urgent';
  const items = record.checklistItems || [];

  function renderAnswers(sectionName, title) {
    const sectionItems = items.filter((item) => item.section === sectionName);
    if (sectionItems.length === 0) return null;
    return (
      <View style={cardStyle}>
        <Text style={textStyles.heading}>{title}</Text>
        {sectionItems.map((item) => {
          const answer = record.answers ? record.answers[item.id] : undefined;
          const remark = record.remarks ? record.remarks[item.id] : '';
          const color = answer === 'bad' ? colors.redDark : answer === 'good' ? colors.greenDark : colors.muted;
          return (
            <View key={item.id} style={styles.answerRow}>
              <View style={{ flex: 1 }}>
                <Text style={styles.answerLabel}>{item.label}</Text>
                {remark ? <Text style={styles.remark}>Remarks: {remark}</Text> : null}
              </View>
              <Text style={[styles.answerValue, { color }]}>
                {answer === 'good' ? 'Good' : answer === 'bad' ? 'Not Good' : '--'}
              </Text>
            </View>
          );
        })}
      </View>
    );
  }

  return (
    <Screen
      title={`${record.assetCode} ${record.assetName || ''}`}
      onBack={() => navigation.goBack()}
      pillText={`Shift ${record.shift}`}
      activeTab="History"
    >
      {/* Summary */}
      <View style={cardStyle}>
        <View style={styles.summaryTop}>
          <MaterialIcons
            name={isUrgent ? 'build' : 'precision-manufacturing'}
            size={28}
            color={isUrgent ? colors.red : colors.primary}
          />
          <View style={{ flex: 1 }}>
            <Text style={textStyles.heading}>{isUrgent ? 'Urgent Repair & Approval' : 'Checklist & Photo'}</Text>
            {!isUrgent && hasProblem(record.answers) ? (
              <Text style={[textStyles.label, { color: colors.redDark }]}>Has a Not Good answer</Text>
            ) : null}
          </View>
          <StatusPill status={record.uploadStatus} />
        </View>
        <Row label="Machine" value={`${record.assetCode} ${record.assetName || ''}`} />
        <Row label="Location" value={record.location} />
        <Row label="Date" value={record.workDate ? formatDateLabel(record.workDate) : '--'} />
        <Row label="Shift" value={record.shift} />
        <Row label="Done by" value={record.operatorName} />
        <Row label="Saved at" value={formatDateTime(record.createdAt)} />
      </View>

      {/* Checklist answers */}
      {!isUrgent ? (
        <>
          <View style={cardStyle}>
            <Text style={textStyles.small}>CHECKLIST</Text>
            <Text style={textStyles.heading}>{record.checklistName || 'Checklist'}</Text>
          </View>
          {renderAnswers('operating', 'Operating Condition')}
          {renderAnswers('housekeeping', 'Housekeeping')}
        </>
      ) : (
        <>
          <ApprovalCard title="Work Approval (before the repair)" approval={record.workApproval} />
          <View style={cardStyle}>
            <Text style={textStyles.heading}>Repair</Text>
            <Row label="Notified at" value={formatDateTime(record.notifiedAt)} />
            <Row label="Started" value={formatDateTime(record.startTime)} />
            <Row label="Finished" value={formatDateTime(record.endTime)} />
            <Row label="Duration" value={formatDuration(record.startTime, record.endTime)} />
            <Text style={[styles.rowLabel, { marginTop: 12 }]}>Problem</Text>
            <Text style={styles.longText}>{record.problem || '--'}</Text>
            <Text style={[styles.rowLabel, { marginTop: 12 }]}>Corrective action</Text>
            <Text style={styles.longText}>{record.correctiveAction || '--'}</Text>
          </View>
          <ApprovalCard title="Completion Approval (after the repair)" approval={record.completionApproval} />
        </>
      )}

      {/* Photo */}
      <View style={cardStyle}>
        <Text style={textStyles.heading}>Live Photo</Text>
        {record.photoUri ? (
          <>
            <Pressable onPress={() => setIsViewing(true)}>
              <Image source={{ uri: record.photoUri }} style={styles.photo} resizeMode="contain" />
            </Pressable>
            <PhotoViewer uri={record.photoUri} visible={isViewing} onClose={() => setIsViewing(false)} />
            <Text style={[textStyles.label, { marginTop: 8 }]}>Tap the photo to enlarge it.</Text>
            <Row label="Taken at" value={formatDateTime(record.photoTakenAt)} />
            <Row label="GPS" value={formatGps(record.gps)} />
          </>
        ) : (
          <Text style={[textStyles.label, { marginTop: 4 }]}>No photo saved on this phone.</Text>
        )}
      </View>
    </Screen>
  );
}

const styles = StyleSheet.create({
  summaryTop: { flexDirection: 'row', alignItems: 'center', gap: 12, marginBottom: 8 },
  row: { flexDirection: 'row', justifyContent: 'space-between', gap: 12, paddingVertical: 6 },
  rowLabel: { fontSize: 13, fontWeight: '700', color: colors.muted },
  rowValue: { flex: 1, fontSize: 14, fontWeight: '600', color: colors.text, textAlign: 'right' },
  answerRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: 12,
    paddingVertical: 10,
    borderBottomWidth: 1,
    borderBottomColor: colors.border,
  },
  answerLabel: { fontSize: 14, fontWeight: '600', color: colors.text },
  answerValue: { fontSize: 14, fontWeight: '800' },
  remark: { fontSize: 13, color: colors.redDark, marginTop: 2 },
  longText: { fontSize: 14, color: colors.text, marginTop: 2 },
  photo: { width: '100%', aspectRatio: 3 / 4, borderRadius: 12, backgroundColor: '#111827', marginTop: 8 },
});
