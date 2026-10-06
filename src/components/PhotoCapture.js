import { useRef, useState } from 'react';
import { ActivityIndicator, Alert, Image, Pressable, StyleSheet, Text, View } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import { useIsFocused } from '@react-navigation/native';
import { MaterialIcons } from '@expo/vector-icons';
import BigButton from './BigButton';
import { getCurrentLocation } from '../utils/location';
import { colors } from '../utils/theme';

// Live camera only (no gallery). Shows the camera until a photo is taken, then shows the photo.
// photo is { uri, takenAt, gps } or null. onPhotoTaken(photo) is called with a new photo, or null on Retake.
export default function PhotoCapture({ photo, onPhotoTaken }) {
  const cameraRef = useRef(null);
  const isFocused = useIsFocused(); // only one camera should be open at a time
  const [permission, requestPermission] = useCameraPermissions();
  const [isTaking, setIsTaking] = useState(false);

  async function takePicture() {
    if (isTaking || !cameraRef.current) return;
    setIsTaking(true);
    try {
      const takenAt = new Date().toISOString();
      const picture = await cameraRef.current.takePictureAsync({ quality: 0.6 });
      const gps = await getCurrentLocation();
      onPhotoTaken({ uri: picture.uri, takenAt, gps });
    } catch (error) {
      Alert.alert('Camera error', 'Could not take the photo. Please try again.');
    }
    setIsTaking(false);
  }

  // Photo already taken: show it with a Retake button
  if (photo) {
    return (
      <View>
        <Image source={{ uri: photo.uri }} style={styles.frame} />
        <BigButton title="Retake Photo" icon="cached" variant="neutral" onPress={() => onPhotoTaken(null)} />
      </View>
    );
  }

  if (!permission) {
    return <View style={[styles.frame, styles.center]}><ActivityIndicator color={colors.white} /></View>;
  }

  if (!permission.granted) {
    return (
      <View style={[styles.frame, styles.center, { padding: 16 }]}>
        <MaterialIcons name="no-photography" size={40} color={colors.white} />
        <Text style={styles.permissionText}>Camera permission is needed to take the photo.</Text>
        <BigButton title="Allow Camera" onPress={requestPermission} />
      </View>
    );
  }

  return (
    <View style={styles.frame}>
      {isFocused ? <CameraView ref={cameraRef} style={StyleSheet.absoluteFill} facing="back" /> : null}
      <View style={styles.shutterArea}>
        <Pressable onPress={takePicture} disabled={isTaking} style={styles.shutter}>
          {isTaking ? <ActivityIndicator color={colors.primary} /> : <MaterialIcons name="photo-camera" size={32} color={colors.primary} />}
        </Pressable>
        <Text style={styles.shutterText}>TAKE PHOTO</Text>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  frame: {
    height: 320,
    borderRadius: 12,
    overflow: 'hidden',
    backgroundColor: '#111827',
    marginBottom: 12,
  },
  center: { alignItems: 'center', justifyContent: 'center' },
  permissionText: { color: colors.white, fontSize: 14, textAlign: 'center', marginVertical: 12 },
  shutterArea: { position: 'absolute', bottom: 12, left: 0, right: 0, alignItems: 'center' },
  shutter: {
    width: 68,
    height: 68,
    borderRadius: 34,
    backgroundColor: colors.white,
    borderWidth: 4,
    borderColor: colors.primary,
    alignItems: 'center',
    justifyContent: 'center',
  },
  shutterText: { color: colors.white, fontSize: 11, fontWeight: '700', marginTop: 4 },
});
