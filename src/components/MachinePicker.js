import { useState } from 'react';
import { Pressable, SectionList, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { groupByFloor } from '../utils/helpers';
import { colors, textStyles } from '../utils/theme';

// List of machines with checkboxes, grouped by floor.
// Has a search box, "Select all shown" and "Select all" for each floor.
// selected = { machineCode: true }. onChange(newSelected) is called on every change.
// header = something to show on top (a title, filters). getNote(machine) = small extra text under a machine.
export default function MachinePicker({ machines, selected, onChange, header, getNote }) {
  const [search, setSearch] = useState('');

  const text = search.trim().toLowerCase();
  const visibleMachines = machines.filter(
    (machine) =>
      text === '' ||
      machine.code.toLowerCase().includes(text) ||
      machine.name.toLowerCase().includes(text)
  );
  const sections = groupByFloor(visibleMachines);
  const allVisibleSelected = visibleMachines.length > 0 && visibleMachines.every((m) => selected[m.code]);

  function toggleMachine(code) {
    const copy = { ...selected };
    if (copy[code]) {
      delete copy[code];
    } else {
      copy[code] = true;
    }
    onChange(copy);
  }

  // Select (or clear) a list of machines at once: a floor, or everything shown
  function toggleMany(list) {
    const copy = { ...selected };
    const everyOneSelected = list.every((machine) => copy[machine.code]);
    list.forEach((machine) => {
      if (everyOneSelected) {
        delete copy[machine.code];
      } else {
        copy[machine.code] = true;
      }
    });
    onChange(copy);
  }

  // This is an element (not a function) on purpose, so the search box keeps the keyboard open while typing
  const listHeader = (
    <View>
      {header}
      <View style={styles.searchBox}>
        <MaterialIcons name="search" size={22} color={colors.muted} />
        <TextInput
          value={search}
          onChangeText={setSearch}
          placeholder="Search code or name"
          autoCorrect={false}
          style={styles.searchInput}
        />
        {search !== '' ? (
          <Pressable onPress={() => setSearch('')} style={styles.clearButton}>
            <MaterialIcons name="close" size={20} color={colors.muted} />
          </Pressable>
        ) : null}
      </View>

      <Pressable style={styles.selectAll} onPress={() => toggleMany(visibleMachines)}>
        <MaterialIcons
          name={allVisibleSelected ? 'check-box' : 'check-box-outline-blank'}
          size={28}
          color={colors.primary}
        />
        <Text style={styles.selectAllText}>
          {allVisibleSelected ? 'Clear all shown' : 'Select all shown'} ({visibleMachines.length})
        </Text>
      </Pressable>
    </View>
  );

  function renderSectionHeader({ section }) {
    const count = section.data.filter((machine) => selected[machine.code]).length;
    const isAll = count === section.data.length;
    return (
      <Pressable style={styles.floorHeader} onPress={() => toggleMany(section.data)}>
        <MaterialIcons name="layers" size={18} color={colors.primary} />
        <Text style={styles.floorText}>{section.title}</Text>
        <Text style={styles.floorCount}>{count}/{section.data.length}</Text>
        <Text style={styles.floorAction}>{isAll ? 'Clear' : 'Select all'}</Text>
      </Pressable>
    );
  }

  function renderMachine({ item }) {
    const isSelected = selected[item.code] === true;
    const note = getNote ? getNote(item) : '';
    return (
      <Pressable
        onPress={() => toggleMachine(item.code)}
        style={[styles.row, isSelected && { backgroundColor: colors.primaryLight, borderColor: colors.primary }]}
      >
        <MaterialIcons
          name={isSelected ? 'check-box' : 'check-box-outline-blank'}
          size={28}
          color={isSelected ? colors.primary : colors.muted}
        />
        <View style={{ flex: 1 }}>
          <Text style={styles.code}>{item.code}</Text>
          <Text style={textStyles.label}>{item.name}</Text>
          {note ? <Text style={styles.note}>{note}</Text> : null}
        </View>
      </Pressable>
    );
  }

  return (
    <SectionList
      sections={sections}
      keyExtractor={(machine) => machine.code}
      renderItem={renderMachine}
      renderSectionHeader={renderSectionHeader}
      ListHeaderComponent={listHeader}
      ListEmptyComponent={<Text style={styles.empty}>No machines found.</Text>}
      extraData={selected}
      stickySectionHeadersEnabled={false}
      keyboardShouldPersistTaps="handled"
      contentContainerStyle={{ padding: 16, paddingBottom: 24 }}
    />
  );
}

const styles = StyleSheet.create({
  searchBox: {
    minHeight: 52,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
  },
  searchInput: { flex: 1, fontSize: 16, minHeight: 48 },
  clearButton: { width: 40, height: 40, alignItems: 'center', justifyContent: 'center' },
  selectAll: { minHeight: 52, flexDirection: 'row', alignItems: 'center', gap: 10, marginTop: 8 },
  selectAllText: { fontSize: 15, fontWeight: '700', color: colors.primary },
  floorHeader: {
    minHeight: 48,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingHorizontal: 12,
    marginTop: 8,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 4,
    borderLeftColor: colors.primary,
    backgroundColor: '#E0E3E6',
  },
  floorText: { flex: 1, fontSize: 13, fontWeight: '700', color: colors.text, textTransform: 'uppercase' },
  floorCount: { fontSize: 12, fontWeight: '700', color: colors.muted },
  floorAction: { fontSize: 12, fontWeight: '800', color: colors.primary },
  row: {
    minHeight: 60,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingHorizontal: 12,
    paddingVertical: 8,
    marginBottom: 6,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: colors.border,
    backgroundColor: colors.white,
  },
  code: { fontSize: 16, fontWeight: '800', color: colors.text },
  note: { fontSize: 12, fontWeight: '700', color: colors.amberDark, marginTop: 2 },
  empty: { textAlign: 'center', color: colors.muted, marginTop: 32 },
});
