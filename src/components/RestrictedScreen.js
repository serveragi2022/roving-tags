import { Text, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from './Screen';
import BigButton from './BigButton';
import { colors, textStyles } from '../utils/theme';
import { ACCESS_SETUP } from '../utils/accounts';

// Shown when someone without setup access opens a setup screen.
export default function RestrictedScreen({ navigation, title }) {
  return (
    <Screen title={title} onBack={() => navigation.goBack()} hideNav>
      <View style={{ alignItems: 'center', marginTop: 40 }}>
        <MaterialIcons name="lock" size={56} color={colors.muted} />
        <Text style={[textStyles.heading, { marginTop: 12, textAlign: 'center' }]}>Restricted</Text>
        <Text style={[textStyles.label, { marginTop: 8, marginBottom: 24, textAlign: 'center' }]}>
          You have no access to set routes and checklists. Needed access: {ACCESS_SETUP}.
        </Text>
        <BigButton title="Back" icon="arrow-back" variant="neutral" onPress={() => navigation.goBack()} />
      </View>
    </Screen>
  );
}
