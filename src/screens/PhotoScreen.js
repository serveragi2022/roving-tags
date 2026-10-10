import { useState } from 'react';
import { Alert, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import PhotoCapture from '../components/PhotoCapture';
import { useApp } from '../utils/AppContext';
import { formatGps, getStopStatus, goTo, makeRecordBase } from '../utils/helpers';
import { cardStyle, colors, textStyles } from '../utils/theme';

export default function PhotoScreen({ navigation, route }) {
  const { user, setup, stops, todayRecords, addRecord } = useApp();
  const { stopCode, answers, remarks, checklist } = route.params;
  const stop = stops.find((item) => item.code === stopCode);

  const [photo, setPhoto] = useState(null);
  const [isSaved, setIsSaved] = useState(false);

  // Next stop that still has no record (calculated after saving, so it skips this one)
  const nextStop = stops.find((item) => getStopStatus(item, todayRecords).status === 'pending');

  function handleSave() {
    if (!photo) {
      Alert.alert('Photo needed', 'Please take a live photo of the machine and the clean workspace.');
      return;
    }
    if (isSaved) return; // prevent saving twice
    if (todayRecords.some((item) => item.assetCode === stopCode && item.type === 'inspection')) {
      Alert.alert('Already inspected', `${stopCode} already has an inspection for this date and shift.`);
      return;
    }

    addRecord({
      ...makeRecordBase(user, setup, stopCode, stop),
      type: 'inspection',
      checklistId: checklist.id,
      checklistName: checklist.name,
      checklistItems: checklist.items,
      answers,
      remarks,
      photoUri: photo.uri,
      photoTakenAt: photo.takenAt,
      gps: photo.gps,
    });
    setIsSaved(true);
  }

  return (
    <Screen
      title={`${stopCode} ${stop ? stop.name : ''}`}
      onBack={isSaved ? undefined : () => navigation.goBack()}
      pillText={stop ? stop.area : ''}
      activeTab="Scan"
    >
      <Text style={[textStyles.small, { marginBottom: 8 }]}>STEP 2 OF 2 • PROOF &amp; PHOTO</Text>

      {/* Rules */}
      <View style={[cardStyle, { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}>
        <View style={styles.row}>
          <MaterialIcons name="photo-camera" size={20} color={colors.primary} />
          <Text style={[textStyles.heading, { fontSize: 15 }]}>Live Camera Required • Gallery Disabled</Text>
        </View>
        <Text style={[textStyles.body, { marginTop: 6 }]}>
          Take a wide-angle photo of the machine and the clean workspace around it.
        </Text>
      </View>

      {!isSaved ? <PhotoCapture photo={photo} onPhotoTaken={setPhoto} /> : null}

      {/* Auto tags */}
      {photo ? (
        <View style={cardStyle}>
          <Text style={[textStyles.heading, { marginBottom: 8 }]}>Auto-Stamped Details</Text>
          <Text style={textStyles.small}>MACHINE &amp; ZONE</Text>
          <Text style={styles.tagValue}>{stopCode} • {stop ? `${stop.area}, ${stop.floor}` : ''}</Text>
          <Text style={textStyles.small}>OPERATOR</Text>
          <Text style={styles.tagValue}>{user.employeeId} ({user.name})</Text>
          <Text style={textStyles.small}>EXACT TIMESTAMP</Text>
          <Text style={styles.tagValue}>{new Date(photo.takenAt).toLocaleString()}</Text>
          <Text style={textStyles.small}>GPS LOCATION</Text>
          <Text style={styles.tagValue}>{formatGps(photo.gps)}</Text>
        </View>
      ) : null}

      {/* Save */}
      {!isSaved ? (
        <BigButton title="Save Record to Phone" icon="save" onPress={handleSave} disabled={!photo} />
      ) : (
        <View>
          <View style={[cardStyle, { backgroundColor: colors.greenLight, borderColor: colors.green }]}>
            <View style={styles.row}>
              <MaterialIcons name="check-circle" size={22} color={colors.greenDark} />
              <Text style={[textStyles.heading, { color: colors.greenDark, fontSize: 16 }]}>Saved on this phone</Text>
            </View>
            <Text style={[textStyles.body, { marginTop: 6 }]}>
              The record will be uploaded when you tap Upload (top bar or History).
            </Text>
          </View>

          {nextStop ? (
            <BigButton
              title={`Next Stop (${nextStop.code})`}
              icon="arrow-forward"
              onPress={() => goTo(navigation, 'Scan')}
            />
          ) : (
            <BigButton title="Finish — Review & Upload" icon="cloud-upload" onPress={() => goTo(navigation, 'History')} />
          )}
          <BigButton title="Back to Route Overview" icon="alt-route" variant="neutral" onPress={() => goTo(navigation, 'Route')} />
        </View>
      )}
    </Screen>
  );
}

const styles = StyleSheet.create({
  row: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  tagValue: { fontSize: 15, fontWeight: '600', color: colors.text, marginBottom: 10 },
});
