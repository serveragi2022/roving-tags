import { Alert, FlatList, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import StatusPill from '../components/StatusPill';
import { useApp } from '../utils/AppContext';
import { countStops, formatTime, goTo, hasProblem } from '../utils/helpers';
import { cardStyle, colors, textStyles } from '../utils/theme';

// "History" tab: summary of the shift and the list of saved records with their upload status.
export default function ReviewScreen({ navigation }) {
  const { setup, stops, records, todayRecords, pendingRecords, isOnline, isUploading, uploadRecords } = useApp();

  const counts = countStops(stops, todayRecords);
  const urgentCount = todayRecords.filter((item) => item.type === 'urgent').length;
  const photoCount = todayRecords.filter((item) => item.photoUri).length;
  const allUploaded = records.length > 0 && pendingRecords.length === 0;

  async function upload(recordsToUpload) {
    if (!isOnline) {
      Alert.alert('No internet', 'Your records are safe on this phone. Try again when you have a connection.');
      return;
    }
    const result = await uploadRecords(recordsToUpload);
    if (result.failed > 0) {
      Alert.alert('Upload problem', `${result.uploaded} uploaded, ${result.failed} failed. Failed records stay on this phone.`);
    } else if (result.uploaded > 0) {
      Alert.alert('Done', `${result.uploaded} record(s) uploaded.`);
    }
  }

  function renderHeader() {
    return (
      <View>
        <Text style={[textStyles.small, { marginBottom: 8 }]}>{setup.mill.toUpperCase()} • SHIFT {setup.shift} SUMMARY</Text>
        <View style={styles.grid}>
          <View style={[styles.kpi, { backgroundColor: colors.greenLight }]}>
            <Text style={[styles.kpiLabel, { color: colors.greenDark }]}>STOPS DONE</Text>
            <Text style={[styles.kpiNumber, { color: colors.greenDark }]}>{counts.done + counts.issue} / {counts.total}</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: colors.amberLight }]}>
            <Text style={[styles.kpiLabel, { color: colors.amberDark }]}>ISSUES FOUND</Text>
            <Text style={[styles.kpiNumber, { color: colors.amberDark }]}>{counts.issue}</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: colors.redLight }]}>
            <Text style={[styles.kpiLabel, { color: colors.redDark }]}>URGENT REPAIRS</Text>
            <Text style={[styles.kpiNumber, { color: colors.redDark }]}>{urgentCount}</Text>
          </View>
          <View style={[styles.kpi, { backgroundColor: colors.primaryLight }]}>
            <Text style={[styles.kpiLabel, { color: colors.primary }]}>LIVE PHOTOS</Text>
            <Text style={[styles.kpiNumber, { color: colors.primary }]}>{photoCount}</Text>
          </View>
        </View>

        <View style={[cardStyle, styles.row]}>
          <MaterialIcons name="sd-storage" size={28} color={colors.primary} />
          <View style={{ flex: 1 }}>
            <Text style={textStyles.heading}>Saved on this phone</Text>
            <Text style={textStyles.label}>
              Records stay on the phone until they are uploaded. Nothing is lost if you have no signal.
            </Text>
          </View>
        </View>

        {allUploaded ? (
          <View style={[cardStyle, { backgroundColor: colors.greenLight, borderColor: colors.green }]}>
            <Text style={[textStyles.heading, { color: colors.greenDark }]}>All records uploaded</Text>
          </View>
        ) : null}

        <Text style={[textStyles.heading, { marginVertical: 8 }]}>Records ({records.length})</Text>
      </View>
    );
  }

  function renderRecord({ item }) {
    const isUrgent = item.type === 'urgent';
    const hasIssue = !isUrgent && hasProblem(item.answers);
    return (
      <View style={styles.recordCard}>
        <MaterialIcons
          name={isUrgent ? 'build' : hasIssue ? 'warning' : 'precision-manufacturing'}
          size={26}
          color={isUrgent || hasIssue ? colors.red : colors.primary}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.recordTitle}>{item.assetCode} {item.assetName}</Text>
          <Text style={textStyles.label}>
            {isUrgent ? 'Urgent Repair & Approval' : 'Checklist & Photo'} • {formatTime(item.createdAt)}
          </Text>
        </View>
        <View style={{ alignItems: 'flex-end', gap: 4 }}>
          <StatusPill status={item.uploadStatus} />
          {item.uploadStatus === 'failed' ? (
            <Text style={styles.retry} onPress={() => upload([item])}>Retry</Text>
          ) : null}
        </View>
      </View>
    );
  }

  function renderFooter() {
    return (
      <View style={{ marginTop: 8 }}>
        <BigButton
          title={`Upload All Records (${pendingRecords.length} Pending)`}
          icon="cloud-upload"
          onPress={() => upload(pendingRecords)}
          disabled={pendingRecords.length === 0}
          loading={isUploading}
        />
        <BigButton
          title="Upload Later"
          icon="wifi-tethering"
          variant="neutral"
          onPress={() => goTo(navigation, 'Home')}
        />
      </View>
    );
  }

  return (
    <Screen title="Review & Upload" activeTab="History" scroll={false}>
      <FlatList
        data={records.slice(0, 50)}
        keyExtractor={(item) => item.id}
        renderItem={renderRecord}
        ListHeaderComponent={renderHeader}
        ListEmptyComponent={<Text style={styles.empty}>No records yet. Start roving to see them here.</Text>}
        ListFooterComponent={renderFooter}
        contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 12 },
  grid: { flexDirection: 'row', flexWrap: 'wrap', gap: 8, marginBottom: 12 },
  kpi: { width: '48.5%', borderRadius: 12, padding: 12 },
  kpiLabel: { fontSize: 11, fontWeight: '800' },
  kpiNumber: { fontSize: 28, fontWeight: '800', marginTop: 4 },
  recordCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    padding: 12,
    marginBottom: 8,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  recordTitle: { fontSize: 15, fontWeight: '700', color: colors.text },
  retry: { fontSize: 13, fontWeight: '800', color: colors.primary, paddingVertical: 8, paddingHorizontal: 4 },
  empty: { textAlign: 'center', color: colors.muted, marginVertical: 24 },
});
