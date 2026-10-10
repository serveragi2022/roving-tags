import { useState } from 'react';
import { Modal, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import { useApp } from '../utils/AppContext';
import { formatTime, goTo, makeBlankUrgentDraft } from '../utils/helpers';
import { findMachine } from '../utils/machineList';
import { colors, textStyles } from '../utils/theme';

export default function ScanScreen({ navigation, route }) {
  const { stops, records, todayRecords, urgentDraft, setUrgentDraft } = useApp();
  const isFocused = useIsFocused(); // only one camera should be open at a time
  const [permission, requestPermission] = useCameraPermissions();
  const [torchOn, setTorchOn] = useState(false);
  const [scannedStop, setScannedStop] = useState(null);
  const [errorMessage, setErrorMessage] = useState('');
  const [manualVisible, setManualVisible] = useState(false);
  const [manualCode, setManualCode] = useState('');

  // true when we came from the Urgent Repair Sheet just to read a QR code
  const forUrgent = route.params?.forUrgent === true;

  function handleBack() {
    if (navigation.canGoBack()) {
      navigation.goBack();
    } else {
      goTo(navigation, 'Route');
    }
  }

  function handleCode(rawCode) {
    const code = rawCode.trim().toUpperCase();
    if (code === '') return;

    if (forUrgent) {
      // Save the code in the urgent sheet and go back to it
      const draft = urgentDraft || makeBlankUrgentDraft();
      setUrgentDraft({ ...draft, assetCode: code });
      navigation.goBack();
      return;
    }

    const stop = stops.find((item) => item.code.toUpperCase() === code);
    if (!stop) {
      const machine = findMachine(code);
      setErrorMessage(
        machine
          ? `${machine.code} (${machine.name}) is not in today's route.`
          : `"${code}" is not a known asset code.`
      );
      return;
    }
    setErrorMessage('');
    setScannedStop(stop);
  }

  function handleManualOk() {
    setManualVisible(false);
    handleCode(manualCode);
    setManualCode('');
  }

  function scanAgain() {
    setScannedStop(null);
    setErrorMessage('');
  }

  // A machine is inspected once per date + shift (todayRecords is already this date + shift)
  const doneRecord = scannedStop
    ? todayRecords.find((item) => item.assetCode === scannedStop.code && item.type === 'inspection')
    : null;

  // When the asset was last roved (any day)
  const lastRecord = scannedStop
    ? records.find((item) => item.assetCode === scannedStop.code && item.type === 'inspection')
    : null;

  const isScanning = !scannedStop && !errorMessage;

  function renderCamera() {
    if (!permission) return null;
    if (!permission.granted) {
      return (
        <View style={styles.center}>
          <MaterialIcons name="no-photography" size={48} color={colors.white} />
          <Text style={styles.permissionText}>Camera permission is needed to scan QR codes.</Text>
          <BigButton title="Allow Camera" onPress={requestPermission} />
        </View>
      );
    }
    if (!isFocused) return null;
    return (
      <CameraView
        style={StyleSheet.absoluteFill}
        facing="back"
        enableTorch={torchOn}
        barcodeScannerSettings={{ barcodeTypes: ['qr'] }}
        onBarcodeScanned={isScanning ? (result) => handleCode(result.data) : undefined}
      />
    );
  }

  return (
    <Screen
      title={forUrgent ? 'Scan Machine QR' : 'Scan QR Code'}
      onBack={handleBack}
      activeTab="Scan"
      scroll={false}
    >
      <View style={styles.cameraArea}>
        {renderCamera()}

        {/* Torch button */}
        <Pressable style={styles.torchButton} onPress={() => setTorchOn(!torchOn)}>
          <MaterialIcons name={torchOn ? 'flashlight-on' : 'flashlight-off'} size={22} color={colors.white} />
          <Text style={styles.torchText}>{torchOn ? 'TORCH ON' : 'TORCH OFF'}</Text>
        </Pressable>

        {/* Scan frame */}
        {isScanning ? (
          <View style={styles.frameArea} pointerEvents="none">
            <View style={styles.frame} />
            <Text style={styles.hint}>Align the machine QR code within the frame</Text>
          </View>
        ) : null}

        {/* Bottom sheet: found machine */}
        {scannedStop ? (
          <View style={styles.sheet}>
            <View style={styles.verifiedRow}>
              <MaterialIcons name="check-circle" size={20} color={colors.greenDark} />
              <Text style={styles.verifiedText}>QR Code Verified</Text>
            </View>
            <Text style={styles.assetCode}>{scannedStop.code}</Text>
            <Text style={textStyles.body}>{scannedStop.name}</Text>
            <Text style={[textStyles.label, { marginTop: 6 }]}>
              {scannedStop.area} — {scannedStop.floor}
            </Text>
            <Text style={[textStyles.label, { marginBottom: 12 }]}>
              Last roved: {lastRecord ? `${new Date(lastRecord.createdAt).toLocaleDateString()} ${formatTime(lastRecord.createdAt)}` : 'not yet'}
            </Text>
            {doneRecord ? (
              <>
                <View style={styles.doneBox}>
                  <Text style={styles.doneText}>
                    Already inspected this shift at {formatTime(doneRecord.createdAt)}. A machine is inspected once per shift.
                  </Text>
                </View>
                <BigButton
                  title="View Record"
                  icon="visibility"
                  variant="neutral"
                  onPress={() => navigation.navigate('Record', { recordId: doneRecord.id })}
                />
              </>
            ) : (
              <BigButton
                title="Open Checklist"
                icon="fact-check"
                onPress={() => navigation.navigate('Checklist', { stopCode: scannedStop.code })}
              />
            )}
            <Pressable onPress={scanAgain} style={styles.linkButton}>
              <Text style={styles.linkText}>Scan a different code</Text>
            </Pressable>
          </View>
        ) : null}

        {/* Bottom sheet: unknown code */}
        {errorMessage ? (
          <View style={styles.sheet}>
            <Text style={[styles.verifiedText, { color: colors.redDark, marginBottom: 12 }]}>{errorMessage}</Text>
            <BigButton title="Scan Again" icon="center-focus-strong" onPress={scanAgain} />
          </View>
        ) : null}

        {/* Manual entry link */}
        {isScanning ? (
          <Pressable style={styles.manualButton} onPress={() => setManualVisible(true)}>
            <MaterialIcons name="dialpad" size={20} color={colors.white} />
            <Text style={styles.manualText}>QR damaged? Enter asset code manually</Text>
          </Pressable>
        ) : null}
      </View>

      <Modal visible={manualVisible} transparent animationType="fade" onRequestClose={() => setManualVisible(false)}>
        <View style={styles.modalBackground}>
          <View style={styles.modalBox}>
            <Text style={textStyles.heading}>Enter Asset Code</Text>
            <TextInput
              value={manualCode}
              onChangeText={setManualCode}
              placeholder="Example: M22-A"
              autoCapitalize="characters"
              autoCorrect={false}
              style={styles.input}
            />
            <BigButton title="OK" onPress={handleManualOk} disabled={manualCode.trim() === ''} />
            <BigButton title="Cancel" variant="neutral" onPress={() => setManualVisible(false)} />
          </View>
        </View>
      </Modal>
    </Screen>
  );
}

const styles = StyleSheet.create({
  doneBox: { backgroundColor: colors.amberLight, borderColor: colors.amber, borderWidth: 1, borderRadius: 12, padding: 12, marginBottom: 12 },
  doneText: { color: colors.amberDark, fontSize: 14, fontWeight: '700' },
  cameraArea: { flex: 1, backgroundColor: '#0B1220' },
  center: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 24 },
  permissionText: { color: colors.white, fontSize: 15, textAlign: 'center', marginVertical: 16 },
  torchButton: {
    position: 'absolute',
    top: 12,
    left: 12,
    minHeight: 48,
    paddingHorizontal: 14,
    borderRadius: 24,
    backgroundColor: 'rgba(0,0,0,0.55)',
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  torchText: { color: colors.white, fontSize: 11, fontWeight: '700' },
  frameArea: { ...StyleSheet.absoluteFillObject, alignItems: 'center', justifyContent: 'center' },
  frame: {
    width: 240,
    height: 240,
    borderRadius: 16,
    borderWidth: 4,
    borderColor: colors.green,
  },
  hint: {
    color: colors.white,
    fontSize: 14,
    fontWeight: '600',
    marginTop: 16,
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 8,
    backgroundColor: 'rgba(0,0,0,0.55)',
  },
  manualButton: {
    position: 'absolute',
    bottom: 16,
    left: 16,
    right: 16,
    minHeight: 52,
    borderRadius: 12,
    backgroundColor: 'rgba(0,0,0,0.65)',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
  },
  manualText: { color: colors.white, fontSize: 14, fontWeight: '600' },
  sheet: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 0,
    padding: 16,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    backgroundColor: colors.white,
  },
  verifiedRow: { flexDirection: 'row', alignItems: 'center', gap: 6, marginBottom: 6 },
  verifiedText: { fontSize: 15, fontWeight: '700', color: colors.greenDark },
  assetCode: { fontSize: 32, fontWeight: '800', color: colors.text },
  linkButton: { minHeight: 44, alignItems: 'center', justifyContent: 'center' },
  linkText: { color: colors.primary, fontSize: 14, fontWeight: '700' },
  modalBackground: { flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', padding: 24 },
  modalBox: { backgroundColor: colors.white, borderRadius: 16, padding: 16 },
  input: {
    minHeight: 52,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    borderRadius: 8,
    paddingHorizontal: 12,
    fontSize: 18,
    marginVertical: 12,
  },
});
