import { useState } from 'react';
import { Alert, Pressable, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import RestrictedScreen from '../components/RestrictedScreen';
import { useApp } from '../utils/AppContext';
import { canSetup } from '../utils/accounts';
import { cardStyle, colors, textStyles } from '../utils/theme';

function makeId(prefix) {
  return `${prefix}_${Date.now()}_${Math.floor(Math.random() * 100000)}`;
}

// Create or edit a checklist: a name, the Operating Status checks and the 5S / Housekeeping checks.
export default function ChecklistEditScreen({ navigation, route }) {
  const { user, checklists, saveChecklist, deleteChecklist } = useApp();
  const existing = checklists.find((item) => item.id === route.params?.checklistId);

  const [name, setName] = useState(existing ? existing.name : '');
  const [operating, setOperating] = useState(existing ? existing.operating : []);
  const [housekeeping, setHousekeeping] = useState(existing ? existing.housekeeping : []);

  const isDefault = existing && existing.id === 'default';

  if (!canSetup(user)) return <RestrictedScreen navigation={navigation} title="Edit Checklist" />;

  // Small helpers so both sections work the same way
  const sections = [
    { key: 'operating', title: '1. Operating Status', items: operating, setItems: setOperating },
    { key: 'housekeeping', title: '2. 5S / Housekeeping', items: housekeeping, setItems: setHousekeeping },
  ];

  function changeLabel(section, itemId, text) {
    section.setItems(section.items.map((item) => (item.id === itemId ? { ...item, label: text } : item)));
  }

  function removeItem(section, itemId) {
    section.setItems(section.items.filter((item) => item.id !== itemId));
  }

  function addItem(section) {
    section.setItems([...section.items, { id: makeId(section.key), label: '' }]);
  }

  function handleSave() {
    if (name.trim() === '') {
      Alert.alert('Name needed', 'Please enter a name for the checklist.');
      return;
    }
    if (operating.length + housekeeping.length === 0) {
      Alert.alert('No checks', 'Please add at least one check.');
      return;
    }
    const hasEmptyCheck = [...operating, ...housekeeping].some((item) => item.label.trim() === '');
    if (hasEmptyCheck) {
      Alert.alert('Empty check', 'Please fill in or remove the empty checks.');
      return;
    }

    const clean = (list) => list.map((item) => ({ ...item, label: item.label.trim() }));
    saveChecklist({
      id: existing ? existing.id : makeId('checklist'),
      name: name.trim(),
      operating: clean(operating),
      housekeeping: clean(housekeeping),
    });
    navigation.goBack();
  }

  function handleDelete() {
    Alert.alert('Delete checklist?', 'Its machines will use the Standard Checklist again.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Delete',
        style: 'destructive',
        onPress: () => {
          deleteChecklist(existing.id);
          navigation.goBack();
        },
      },
    ]);
  }

  return (
    <Screen
      title={existing ? 'Edit Checklist' : 'New Checklist'}
      onBack={() => navigation.goBack()}
      hideNav
      footer={<BigButton title="Save Checklist" icon="check" onPress={handleSave} />}
    >
      <View style={cardStyle}>
        <Text style={textStyles.label}>Checklist name</Text>
        <TextInput
          value={name}
          onChangeText={setName}
          placeholder="Example: Rollermill Checklist"
          style={styles.input}
        />
      </View>

      {sections.map((section) => (
        <View key={section.key} style={cardStyle}>
          <Text style={textStyles.heading}>{section.title}</Text>
          {section.items.map((item) => (
            <View key={item.id} style={styles.itemRow}>
              <TextInput
                value={item.label}
                onChangeText={(text) => changeLabel(section, item.id, text)}
                placeholder="Check"
                style={[styles.input, { flex: 1, marginTop: 0 }]}
              />
              <Pressable style={styles.removeButton} onPress={() => removeItem(section, item.id)}>
                <MaterialIcons name="delete" size={24} color={colors.red} />
              </Pressable>
            </View>
          ))}
          <View style={{ height: 8 }} />
          <BigButton title="Add Check" icon="add" variant="neutral" onPress={() => addItem(section)} />
        </View>
      ))}

      {existing && !isDefault ? (
        <BigButton title="Delete Checklist" icon="delete" variant="danger" onPress={handleDelete} />
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
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
  itemRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginTop: 10 },
  removeButton: { width: 52, height: 52, alignItems: 'center', justifyContent: 'center' },
});
