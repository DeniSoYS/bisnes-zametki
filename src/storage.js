import AsyncStorage from '@react-native-async-storage/async-storage';

const NOTES_KEY = 'bisnes-zametki:notes';

export async function loadNotes() {
  const rawNotes = await AsyncStorage.getItem(NOTES_KEY);

  if (!rawNotes) {
    return [];
  }

  try {
    const notes = JSON.parse(rawNotes);
    return Array.isArray(notes) ? notes : [];
  } catch {
    return [];
  }
}

export async function saveNotes(notes) {
  await AsyncStorage.setItem(NOTES_KEY, JSON.stringify(notes));
}
