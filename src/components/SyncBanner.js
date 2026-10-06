import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { useApp } from '../utils/AppContext';
import { colors } from '../utils/theme';

// Bar under the status bar showing online/offline and how many records wait for upload.
export default function SyncBanner() {
  const { isOnline, pendingRecords, uploadRecords, isUploading } = useApp();
  const count = pendingRecords.length;

  async function handleUploadNow() {
    if (!isOnline) {
      Alert.alert('No internet', 'Your records are safe on this phone. Try again when you have a connection.');
      return;
    }
    const result = await uploadRecords(pendingRecords);
    if (result.failed > 0) {
      Alert.alert('Upload problem', `${result.failed} record(s) failed. They stay on this phone. Please try again.`);
    }
  }

  // Online and nothing waiting: thin green bar
  if (isOnline && count === 0) {
    return (
      <View style={[styles.bar, { backgroundColor: colors.greenLight }]}>
        <Text style={[styles.text, { color: colors.greenDark }]}>● ONLINE | QUEUE EMPTY</Text>
      </View>
    );
  }

  const message = isOnline
    ? `Online — ${count} record(s) waiting to upload`
    : `Offline — ${count} record(s) waiting to upload`;

  return (
    <View style={[styles.bar, { backgroundColor: colors.amberLight }]}>
      <MaterialIcons name={isOnline ? 'cloud-queue' : 'cloud-off'} size={18} color={colors.amberDark} />
      <Text style={[styles.text, { color: colors.amberDark, flex: 1 }]}>{message}</Text>
      {count > 0 ? (
        <Pressable onPress={handleUploadNow} disabled={isUploading} style={styles.button}>
          <Text style={styles.buttonText}>{isUploading ? 'Uploading...' : 'Upload Now'}</Text>
        </Pressable>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  bar: {
    minHeight: 32,
    paddingHorizontal: 16,
    paddingVertical: 4,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  text: { fontSize: 12, fontWeight: '700', letterSpacing: 0.3 },
  button: {
    minHeight: 32,
    paddingHorizontal: 12,
    borderRadius: 6,
    backgroundColor: colors.amberDark,
    alignItems: 'center',
    justifyContent: 'center',
  },
  buttonText: { color: colors.white, fontSize: 12, fontWeight: '700' },
});
