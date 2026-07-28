import { StatusBar } from 'expo-status-bar';
import { useEffect, useMemo, useState } from 'react';
import {
  Alert,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  SafeAreaView,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';

import { loadNotes, saveNotes } from './storage';

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function isUrl(value) {
  return /^https?:\/\//i.test(value.trim());
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [search, setSearch] = useState('');
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadNotes()
      .then(setNotes)
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (isReady) {
      saveNotes(notes);
    }
  }, [isReady, notes]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    if (!query) {
      return notes;
    }

    return notes.filter((note) => note.text.toLowerCase().includes(query));
  }, [notes, search]);

  function addNote() {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    setNotes((currentNotes) => [
      {
        id: createId(),
        text: cleanText,
        createdAt: new Date().toISOString(),
      },
      ...currentNotes,
    ]);
    setText('');
  }

  function deleteNote(id) {
    const remove = () => {
      setNotes((currentNotes) => currentNotes.filter((note) => note.id !== id));
    };

    if (Platform.OS === 'web') {
      remove();
      return;
    }

    Alert.alert('Удалить заметку?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: remove },
    ]);
  }

  function openNoteLink(noteText) {
    if (isUrl(noteText)) {
      Linking.openURL(noteText.trim());
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="dark" />
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.screen}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.header}>
            <Text style={styles.eyebrow}>Личная база</Text>
            <Text style={styles.title}>Заметки и ссылки</Text>
            <Text style={styles.subtitle}>
              Добавляй идеи, ссылки, задачи и быстрые записи. Всё сохраняется на этом устройстве.
            </Text>
          </View>

          <View style={styles.card}>
            <Text style={styles.label}>Новая запись</Text>
            <TextInput
              multiline
              onChangeText={setText}
              placeholder="Например: https://site.ru или важная мысль..."
              placeholderTextColor="#8b94a7"
              style={styles.input}
              textAlignVertical="top"
              value={text}
            />
            <Pressable
              onPress={addNote}
              style={({ pressed }) => [
                styles.button,
                !text.trim() && styles.buttonDisabled,
                pressed && text.trim() && styles.buttonPressed,
              ]}
            >
              <Text style={styles.buttonText}>Добавить</Text>
            </Pressable>
          </View>

          <TextInput
            onChangeText={setSearch}
            placeholder="Поиск по записям"
            placeholderTextColor="#8b94a7"
            style={styles.search}
            value={search}
          />

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Сохранено</Text>
            <Text style={styles.counter}>{notes.length}</Text>
          </View>

          {!isReady ? (
            <Text style={styles.emptyText}>Загружаю записи...</Text>
          ) : filteredNotes.length === 0 ? (
            <Text style={styles.emptyText}>
              {notes.length === 0 ? 'Пока нет записей.' : 'Поиск ничего не нашёл.'}
            </Text>
          ) : (
            filteredNotes.map((note) => (
              <View key={note.id} style={styles.noteCard}>
                <Pressable onPress={() => openNoteLink(note.text)}>
                  <Text style={[styles.noteText, isUrl(note.text) && styles.linkText]}>
                    {note.text}
                  </Text>
                </Pressable>
                <View style={styles.noteFooter}>
                  <Text style={styles.date}>{formatDate(note.createdAt)}</Text>
                  <Pressable onPress={() => deleteNote(note.id)} hitSlop={10}>
                    <Text style={styles.deleteText}>Удалить</Text>
                  </Pressable>
                </View>
              </View>
            ))
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: {
    flex: 1,
    backgroundColor: '#eef2f7',
  },
  screen: {
    flex: 1,
  },
  content: {
    alignSelf: 'center',
    maxWidth: 720,
    padding: 20,
    paddingBottom: 48,
    width: '100%',
  },
  header: {
    marginBottom: 22,
    marginTop: 12,
  },
  eyebrow: {
    color: '#2563eb',
    fontSize: 14,
    fontWeight: '700',
    letterSpacing: 0.5,
    marginBottom: 8,
    textTransform: 'uppercase',
  },
  title: {
    color: '#111827',
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
  },
  subtitle: {
    color: '#5b6475',
    fontSize: 16,
    lineHeight: 24,
    marginTop: 10,
  },
  card: {
    backgroundColor: '#ffffff',
    borderRadius: 24,
    marginBottom: 16,
    padding: 16,
    shadowColor: '#0f172a',
    shadowOffset: { width: 0, height: 12 },
    shadowOpacity: 0.08,
    shadowRadius: 24,
    elevation: 4,
  },
  label: {
    color: '#111827',
    fontSize: 15,
    fontWeight: '700',
    marginBottom: 10,
  },
  input: {
    backgroundColor: '#f8fafc',
    borderColor: '#d8dee9',
    borderRadius: 18,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    lineHeight: 24,
    minHeight: 116,
    padding: 14,
  },
  button: {
    alignItems: 'center',
    backgroundColor: '#2563eb',
    borderRadius: 16,
    marginTop: 12,
    paddingVertical: 15,
  },
  buttonDisabled: {
    backgroundColor: '#a9b8d3',
  },
  buttonPressed: {
    transform: [{ scale: 0.99 }],
  },
  buttonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '800',
  },
  search: {
    backgroundColor: '#ffffff',
    borderColor: '#e1e7ef',
    borderRadius: 18,
    borderWidth: 1,
    color: '#111827',
    fontSize: 16,
    marginBottom: 20,
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  listHeader: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 10,
  },
  sectionTitle: {
    color: '#111827',
    fontSize: 22,
    fontWeight: '800',
  },
  counter: {
    backgroundColor: '#dbeafe',
    borderRadius: 999,
    color: '#1d4ed8',
    fontSize: 14,
    fontWeight: '800',
    overflow: 'hidden',
    paddingHorizontal: 12,
    paddingVertical: 6,
  },
  emptyText: {
    color: '#6b7280',
    fontSize: 16,
    paddingVertical: 24,
    textAlign: 'center',
  },
  noteCard: {
    backgroundColor: '#ffffff',
    borderColor: '#e5eaf2',
    borderRadius: 20,
    borderWidth: 1,
    marginBottom: 12,
    padding: 16,
  },
  noteText: {
    color: '#111827',
    fontSize: 16,
    lineHeight: 24,
  },
  linkText: {
    color: '#2563eb',
    textDecorationLine: 'underline',
  },
  noteFooter: {
    alignItems: 'center',
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: 14,
  },
  date: {
    color: '#8b94a7',
    fontSize: 13,
  },
  deleteText: {
    color: '#dc2626',
    fontSize: 14,
    fontWeight: '700',
  },
});
