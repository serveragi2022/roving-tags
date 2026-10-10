import { Image, Modal, Pressable, StyleSheet, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { colors } from '../utils/theme';

// Shows a photo on the whole screen. The whole picture is visible (it is not cropped).
// Tap anywhere or the X to close.
export default function PhotoViewer({ uri, visible, onClose }) {
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={onClose} statusBarTranslucent>
      <Pressable style={styles.backdrop} onPress={onClose}>
        {uri ? <Image source={{ uri }} style={styles.image} resizeMode="contain" /> : null}
        <View style={styles.close}>
          <MaterialIcons name="close" size={28} color={colors.white} />
        </View>
      </Pressable>
    </Modal>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: '#000000', alignItems: 'center', justifyContent: 'center' },
  image: { width: '100%', height: '100%' },
  close: {
    position: 'absolute',
    top: 48,
    right: 16,
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: 'rgba(0,0,0,0.6)',
    alignItems: 'center',
    justifyContent: 'center',
  },
});
