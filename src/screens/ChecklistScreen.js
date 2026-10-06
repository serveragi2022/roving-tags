import { useState } from 'react';
import { Alert, StyleSheet, Text, TextInput, View } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import Screen from '../components/Screen';
import BigButton from '../components/BigButton';
import GoodBadToggle from '../components/GoodBadToggle';
import { useApp } from '../utils/AppContext';
import { formatTime } from '../utils/helpers';
import { getAllItems } from '../utils/checklistItems';
import { cardStyle, colors, textStyles } from '../utils/theme';

export default function ChecklistScreen({ navigation, route }) {
  const { stops, getChecklistFor } = useApp();
  const stop = stops.find((item) => item.code === route.params?.stopCode);

  const [openedAt] = useState(new Date().toISOString());
  const [answers, setAnswers] = useState({}); // { gauges: 'good', leaks: 'bad', ... }
  const [remarks, setRemarks] = useState({}); // { leaks: 'Oil on the floor' }

  if (!stop) {
    return (
      <Screen title="Roving Checklist" onBack={() => navigation.goBack()}>
        <Text style={textStyles.body}>Machine not found. Please scan again.</Text>
      </Screen>
    );
  }

  // The checklist assigned to this machine (or the Standard Checklist)
  const checklist = getChecklistFor(stop.code);
  const allItems = getAllItems(checklist);
  const operatingItems = allItems.filter((item) => item.section === 'operating');
  const housekeepingItems = allItems.filter((item) => item.section === 'housekeeping');

  const answeredCount = Object.keys(answers).length;
  const stopNumber = stops.indexOf(stop) + 1;

  function setAnswer(itemId, value) {
    setAnswers({ ...answers, [itemId]: value });
  }

  function setRemark(itemId, text) {
    setRemarks({ ...remarks, [itemId]: text });
  }

  function handleNext() {
    if (answeredCount < allItems.length) {
      Alert.alert('Checklist not complete', `Please answer all ${allItems.length} checks.`);
      return;
    }

    // Every "Not Good" answer needs a short remark
    const missingRemark = allItems.find(
      (item) => answers[item.id] === 'bad' && !(remarks[item.id] || '').trim()
    );
    if (missingRemark) {
      Alert.alert('Remarks needed', `Please write what is wrong for "${missingRemark.label}".`);
      return;
    }

    // Only keep remarks for "Not Good" items
    const finalRemarks = {};
    allItems.forEach((item) => {
      if (answers[item.id] === 'bad') finalRemarks[item.id] = remarks[item.id].trim();
    });

    // The checklist is saved with the record, so old records stay readable if the checklist changes later
    const checklistInfo = {
      id: checklist.id,
      name: checklist.name,
      items: allItems.map((item) => ({ id: item.id, label: item.label, section: item.section })),
    };

    navigation.navigate('Photo', {
      stopCode: stop.code,
      answers,
      remarks: finalRemarks,
      checklist: checklistInfo,
    });
  }

  function renderItem(item) {
    const isBad = answers[item.id] === 'bad';
    return (
      <View key={item.id} style={styles.item}>
        <View style={styles.itemHeader}>
          <MaterialIcons name={item.icon} size={22} color={colors.muted} />
          <Text style={styles.itemLabel}>{item.label}</Text>
          {answers[item.id] === 'good' ? <Text style={[styles.tag, { color: colors.greenDark }]}>OK</Text> : null}
          {isBad ? <Text style={[styles.tag, { color: colors.redDark }]}>DEFECT</Text> : null}
        </View>

        <GoodBadToggle
          value={answers[item.id]}
          onChange={(value) => setAnswer(item.id, value)}
          goodLabel={item.goodLabel}
          badLabel={item.badLabel}
        />

        {isBad ? (
          <View style={styles.defectBox}>
            <Text style={styles.defectTitle}>What is wrong?</Text>
            <TextInput
              value={remarks[item.id] || ''}
              onChangeText={(text) => setRemark(item.id, text)}
              placeholder="Write a short remark"
              multiline
              style={styles.remarkInput}
            />
          </View>
        ) : null}
      </View>
    );
  }

  return (
    <Screen
      title="Roving Checklist"
      onBack={() => navigation.goBack()}
      pillText={stop.area}
      activeTab="Scan"
      footer={
        <View>
          <BigButton title="Next: Take Live Photo" icon="photo-camera" onPress={handleNext} />
          <BigButton
            title="Cannot rove now — Urgent repair required"
            icon="warning"
            variant="danger"
            onPress={() => navigation.navigate('Urgent', { assetCode: stop.code })}
          />
        </View>
      }
    >
      {/* Machine info */}
      <View style={[cardStyle, { borderLeftWidth: 6, borderLeftColor: colors.primary }]}>
        <Text style={styles.assetCode}>{stop.code}</Text>
        <Text style={textStyles.heading}>{stop.name}</Text>
        <Text style={[textStyles.label, { marginTop: 4 }]}>{stop.area}, {stop.floor}</Text>
        <Text style={[textStyles.label, { color: colors.primary, marginTop: 4 }]}>Checklist: {checklist.name}</Text>
        <View style={styles.infoRow}>
          <View>
            <Text style={textStyles.small}>SHIFT PROGRESS</Text>
            <Text style={textStyles.body}>Stop {stopNumber} of {stops.length}</Text>
          </View>
          <View>
            <Text style={textStyles.small}>CHECKS ANSWERED</Text>
            <Text style={textStyles.body}>{answeredCount} of {allItems.length}</Text>
          </View>
          <View>
            <Text style={textStyles.small}>OPENED</Text>
            <Text style={textStyles.body}>{formatTime(openedAt)}</Text>
          </View>
        </View>
      </View>

      {operatingItems.length > 0 ? (
        <View style={cardStyle}>
          <Text style={textStyles.heading}>1. Operating Status</Text>
          {operatingItems.map(renderItem)}
        </View>
      ) : null}

      {housekeepingItems.length > 0 ? (
        <View style={cardStyle}>
          <Text style={textStyles.heading}>2. 5S / Housekeeping</Text>
          {housekeepingItems.map(renderItem)}
        </View>
      ) : null}
    </Screen>
  );
}

const styles = StyleSheet.create({
  assetCode: { fontSize: 28, fontWeight: '800', color: colors.text },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 12,
    paddingTop: 12,
    borderTopWidth: 1,
    borderTopColor: colors.border,
  },
  item: { marginTop: 16, paddingTop: 12, borderTopWidth: 1, borderTopColor: colors.border },
  itemHeader: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  itemLabel: { flex: 1, fontSize: 15, fontWeight: '700', color: colors.text },
  tag: { fontSize: 11, fontWeight: '800' },
  defectBox: {
    marginTop: 10,
    padding: 10,
    borderRadius: 8,
    backgroundColor: colors.redLight,
    borderWidth: 1,
    borderColor: colors.red,
  },
  defectTitle: { fontSize: 13, fontWeight: '700', color: colors.redDark, marginBottom: 6 },
  remarkInput: {
    minHeight: 48,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: colors.borderStrong,
    backgroundColor: colors.white,
    paddingHorizontal: 10,
    fontSize: 14,
  },
});
