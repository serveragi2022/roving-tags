import { Alert, Pressable, SectionList, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import StatusPill from '../components/StatusPill';
import BigButton from '../components/BigButton';
import { useApp } from '../utils/AppContext';
import { countStops, formatDateLabel, formatTime, getStopStatus, goTo, groupByFloor } from '../utils/helpers';
import { cardStyle, colors, textStyles } from '../utils/theme';

const STRIPE_COLORS = {
  pending: colors.amber,
  done: colors.green,
  issue: colors.red,
  deferred: colors.muted,
};

export default function RouteScreen({ navigation }) {
  const { setup, stops, todayRecords } = useApp();

  const counts = countStops(stops, todayRecords);
  const completed = counts.done + counts.issue;
  const percent = counts.total === 0 ? 0 : Math.round((completed / counts.total) * 100);
  const nextStop = stops.find((stop) => getStopStatus(stop, todayRecords).status === 'pending');
  const sections = groupByFloor(stops);

  function handleStopPress(stop, status, record) {
    if (status === 'pending') {
      navigation.navigate('Scan');
      return;
    }
    // Already roved: show a short summary
    const time = formatTime(record.createdAt);
    const message =
      status === 'deferred'
        ? `Roving deferred because of an urgent repair (${time}).`
        : `Roved at ${time}.`;
    Alert.alert(`${stop.code} ${stop.name}`, message);
  }

  function renderHeader() {
    return (
      <View>
        <View style={cardStyle}>
          <View style={styles.rowBetween}>
            <View style={{ flex: 1 }}>
              <Text style={textStyles.small}>ZONE &amp; SHIFT STATUS</Text>
              <Text style={textStyles.heading}>{setup.mill} • Shift {setup.shift}</Text>
              <Text style={textStyles.label}>{formatDateLabel(setup.workDate)}</Text>
            </View>
            <View style={{ alignItems: 'flex-end' }}>
              <Text style={[textStyles.title, { color: colors.primary }]}>{percent}%</Text>
              <Text style={textStyles.label}>{completed} of {counts.total} Completed</Text>
            </View>
          </View>
          <View style={styles.legendRow}>
            <Text style={[styles.legend, { color: colors.greenDark }]}>● {counts.done} Done</Text>
            <Text style={[styles.legend, { color: colors.redDark }]}>● {counts.issue} Flagged</Text>
            <Text style={[styles.legend, { color: colors.amberDark }]}>● {counts.pending + counts.deferred} Pending</Text>
          </View>
        </View>

        <BigButton title="Edit Route" icon="edit" variant="neutral" onPress={() => navigation.navigate('AssignRoute')} />
      </View>
    );
  }

  function renderStop({ item: stop }) {
    const { status, record } = getStopStatus(stop, todayRecords);
    const isNext = nextStop && nextStop.code === stop.code;
    const firstRemark = record && record.remarks ? Object.values(record.remarks)[0] : '';

    return (
      <Pressable
        onPress={() => handleStopPress(stop, status, record)}
        style={[styles.stopCard, isNext && { borderColor: colors.amber, borderWidth: 2 }]}
      >
        <View style={[styles.stripe, { backgroundColor: STRIPE_COLORS[status] }]} />
        <View style={{ flex: 1, paddingLeft: 8 }}>
          <Text style={styles.stopName}>{stop.code} {stop.name}</Text>
          <View style={styles.stopInfoRow}>
            <StatusPill status={status} />
            {isNext ? <Text style={styles.nextTag}>NEXT STOP</Text> : null}
            {record ? <Text style={textStyles.label}>{formatTime(record.createdAt)}</Text> : null}
          </View>
          {status === 'issue' && firstRemark ? (
            <Text style={[styles.remark, { color: colors.redDark }]}>{firstRemark}</Text>
          ) : null}
        </View>
        <MaterialIcons name="chevron-right" size={24} color={colors.muted} />
      </Pressable>
    );
  }

  function renderEmpty() {
    return (
      <View style={{ alignItems: 'center', marginTop: 24 }}>
        <Text style={[textStyles.body, { marginBottom: 12 }]}>No route assigned yet.</Text>
        <BigButton title="Assign Route" icon="add-task" onPress={() => navigation.navigate('AssignRoute')} />
      </View>
    );
  }

  return (
    <Screen
      title="Assigned Route"
      onBack={() => goTo(navigation, 'Home')}
      pillText={setup.mill}
      activeTab="Route"
      scroll={false}
    >
      <SectionList
        sections={sections}
        keyExtractor={(stop) => stop.code}
        renderItem={renderStop}
        renderSectionHeader={({ section }) => (
          <View style={styles.floorHeader}>
            <MaterialIcons name="layers" size={18} color={colors.primary} />
            <Text style={styles.floorText}>{section.title}</Text>
          </View>
        )}
        ListHeaderComponent={stops.length > 0 ? renderHeader : null}
        ListEmptyComponent={renderEmpty}
        contentContainerStyle={{ padding: 16, paddingBottom: 96 }}
        stickySectionHeadersEnabled={false}
      />

      {/* Floating scan button */}
      <Pressable style={styles.fab} onPress={() => navigation.navigate('Scan')}>
        <MaterialIcons name="qr-code-scanner" size={26} color={colors.white} />
        <Text style={styles.fabText}>SCAN QR</Text>
      </Pressable>
    </Screen>
  );
}

const styles = StyleSheet.create({
  rowBetween: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  legendRow: { flexDirection: 'row', justifyContent: 'space-between', marginTop: 12 },
  legend: { fontSize: 12, fontWeight: '700' },
  floorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginTop: 4,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: '#E0E3E6',
  },
  floorText: { fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase' },
  stopCard: {
    minHeight: 64,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: colors.white,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    paddingVertical: 10,
    paddingRight: 8,
    marginBottom: 8,
    overflow: 'hidden',
  },
  stripe: { width: 6, alignSelf: 'stretch' },
  stopName: { fontSize: 16, fontWeight: '700', color: colors.text },
  stopInfoRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 6 },
  nextTag: {
    fontSize: 10,
    fontWeight: '800',
    color: colors.white,
    backgroundColor: colors.primary,
    paddingHorizontal: 6,
    paddingVertical: 2,
    borderRadius: 4,
  },
  remark: { fontSize: 13, fontWeight: '600', marginTop: 4 },
  fab: {
    position: 'absolute',
    right: 16,
    bottom: 16,
    minHeight: 56,
    paddingHorizontal: 22,
    borderRadius: 28,
    backgroundColor: colors.primary,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    elevation: 6,
  },
  fabText: { color: colors.white, fontSize: 15, fontWeight: '700', letterSpacing: 0.5 },
});
