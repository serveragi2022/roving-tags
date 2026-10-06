import AsyncStorage from '@react-native-async-storage/async-storage';

// Small helpers to save and load JSON on the phone

export async function saveJson(key, value) {
  try {
    await AsyncStorage.setItem(key, JSON.stringify(value));
  } catch (error) {
    console.log('Could not save', key, error);
  }
}

export async function loadJson(key, fallbackValue) {
  try {
    const text = await AsyncStorage.getItem(key);
    return text ? JSON.parse(text) : fallbackValue;
  } catch (error) {
    console.log('Could not load', key, error);
    return fallbackValue;
  }
}
