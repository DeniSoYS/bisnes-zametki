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

const TYPES = [
  { id: 'task', title: 'Задача', icon: '✓', color: '#2563eb', soft: '#dbeafe' },
  { id: 'note', title: 'Запись', icon: '✎', color: '#7c3aed', soft: '#ede9fe' },
  { id: 'link', title: 'Ссылка', icon: '↗', color: '#0891b2', soft: '#cffafe' },
];

const PRIORITIES = [
  { id: 'normal', title: 'Обычная', color: '#64748b', soft: '#f1f5f9' },
  { id: 'important', title: 'Важно', color: '#d97706', soft: '#fef3c7' },
  { id: 'urgent', title: 'Срочно', color: '#dc2626', soft: '#fee2e2' },
];

const FILTERS = [
  { id: 'all', title: 'Все' },
  { id: 'task', title: 'Задачи' },
  { id: 'note', title: 'Записи' },
  { id: 'link', title: 'Ссылки' },
  { id: 'done', title: 'Готово' },
];

function createId() {
  return `${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

function formatDate(value) {
  return new Intl.DateTimeFormat('ru-RU', {
    day: '2-digit',
    month: 'short',
    hour: '2-digit',
    minute: '2-digit',
  }).format(new Date(value));
}

function isUrl(value) {
  return /^https?:\/\//i.test(value.trim());
}

function normalizeNote(note) {
  const type = note.type || (isUrl(note.text || '') ? 'link' : 'note');

  return {
    id: note.id || createId(),
    text: note.text || '',
    type,
    priority: note.priority || 'normal',
    done: Boolean(note.done),
    createdAt: note.createdAt || new Date().toISOString(),
    updatedAt: note.updatedAt || note.createdAt || new Date().toISOString(),
  };
}

function getTypeMeta(type) {
  return TYPES.find((item) => item.id === type) || TYPES[1];
}

function getPriorityMeta(priority) {
  return PRIORITIES.find((item) => item.id === priority) || PRIORITIES[0];
}

export default function App() {
  const [notes, setNotes] = useState([]);
  const [text, setText] = useState('');
  const [type, setType] = useState('task');
  const [priority, setPriority] = useState('normal');
  const [search, setSearch] = useState('');
  const [filter, setFilter] = useState('all');
  const [editingId, setEditingId] = useState(null);
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    loadNotes()
      .then((savedNotes) => setNotes(savedNotes.map(normalizeNote)))
      .finally(() => setIsReady(true));
  }, []);

  useEffect(() => {
    if (isReady) {
      saveNotes(notes);
    }
  }, [isReady, notes]);

  const stats = useMemo(() => {
    const tasks = notes.filter((note) => note.type === 'task');
    const done = tasks.filter((note) => note.done).length;

    return {
      total: notes.length,
      activeTasks: tasks.length - done,
      done,
      links: notes.filter((note) => note.type === 'link').length,
    };
  }, [notes]);

  const filteredNotes = useMemo(() => {
    const query = search.trim().toLowerCase();

    return notes.filter((note) => {
      const matchesSearch = !query || note.text.toLowerCase().includes(query);
      const matchesFilter =
        filter === 'all' ||
        note.type === filter ||
        (filter === 'done' && note.done);

      return matchesSearch && matchesFilter;
    });
  }, [filter, notes, search]);

  function resetForm() {
    setText('');
    setType('task');
    setPriority('normal');
    setEditingId(null);
  }

  function submitNote() {
    const cleanText = text.trim();

    if (!cleanText) {
      return;
    }

    if (editingId) {
      setNotes((currentNotes) =>
        currentNotes.map((note) =>
          note.id === editingId
            ? {
                ...note,
                text: cleanText,
                type,
                priority,
                updatedAt: new Date().toISOString(),
              }
            : note
        )
      );
      resetForm();
      return;
    }

    setNotes((currentNotes) => [
      {
        id: createId(),
        text: cleanText,
        type,
        priority,
        done: false,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString(),
      },
      ...currentNotes,
    ]);
    resetForm();
  }

  function startEdit(note) {
    setEditingId(note.id);
    setText(note.text);
    setType(note.type);
    setPriority(note.priority);
  }

  function toggleDone(id) {
    setNotes((currentNotes) =>
      currentNotes.map((note) =>
        note.id === id ? { ...note, done: !note.done, updatedAt: new Date().toISOString() } : note
      )
    );
  }

  function deleteNote(id) {
    const remove = () => {
      setNotes((currentNotes) => currentNotes.filter((note) => note.id !== id));
      if (editingId === id) {
        resetForm();
      }
    };

    if (Platform.OS === 'web') {
      remove();
      return;
    }

    Alert.alert('Удалить запись?', 'Это действие нельзя отменить.', [
      { text: 'Отмена', style: 'cancel' },
      { text: 'Удалить', style: 'destructive', onPress: remove },
    ]);
  }

  function openNoteLink(note) {
    if (note.type === 'link' && isUrl(note.text)) {
      Linking.openURL(note.text.trim());
    }
  }

  return (
    <SafeAreaView style={styles.safeArea}>
      <StatusBar style="light" />
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={styles.screen}>
        <ScrollView contentContainerStyle={styles.content} keyboardShouldPersistTaps="handled">
          <View style={styles.hero}>
            <Text style={styles.eyebrow}>Личная база</Text>
            <Text style={styles.title}>Центр задач, записей и ссылок</Text>
            <Text style={styles.subtitle}>Быстро сохраняй важное, разделяй по типам и находи за секунды.</Text>
          </View>

          <View style={styles.statsGrid}>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.total}</Text>
              <Text style={styles.statLabel}>Всего</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.activeTasks}</Text>
              <Text style={styles.statLabel}>Задачи</Text>
            </View>
            <View style={styles.statCard}>
              <Text style={styles.statValue}>{stats.links}</Text>
              <Text style={styles.statLabel}>Ссылки</Text>
            </View>
          </View>

          <View style={styles.card}>
            <View style={styles.formHeader}>
              <Text style={styles.cardTitle}>{editingId ? 'Редактировать' : 'Новая запись'}</Text>
              {editingId ? (
                <Pressable onPress={resetForm}>
                  <Text style={styles.cancelText}>Отмена</Text>
                </Pressable>
              ) : null}
            </View>

            <View style={styles.segmentRow}>
              {TYPES.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setType(item.id)}
                  style={[styles.segment, type === item.id && { backgroundColor: item.color }]}
                >
                  <Text style={[styles.segmentText, type === item.id && styles.segmentTextActive]}>
                    {item.icon} {item.title}
                  </Text>
                </Pressable>
              ))}
            </View>

            <TextInput
              multiline
              onChangeText={setText}
              placeholder={type === 'link' ? 'https://site.ru — полезная ссылка' : 'Что нужно сохранить?'}
              placeholderTextColor="#94a3b8"
              style={styles.input}
              textAlignVertical="top"
              value={text}
            />

            <Text style={styles.smallLabel}>Приоритет</Text>
            <View style={styles.priorityRow}>
              {PRIORITIES.map((item) => (
                <Pressable
                  key={item.id}
                  onPress={() => setPriority(item.id)}
                  style={[
                    styles.priorityPill,
                    { backgroundColor: priority === item.id ? item.soft : '#f8fafc' },
                    priority === item.id && { borderColor: item.color },
                  ]}
                >
                  <Text style={[styles.priorityText, priority === item.id && { color: item.color }]}>
                    {item.title}
                  </Text>
                </Pressable>
              ))}
            </View>

            <Pressable
              onPress={submitNote}
              style={({ pressed }) => [styles.button, !text.trim() && styles.buttonDisabled, pressed && styles.buttonPressed]}
            >
              <Text style={styles.buttonText}>{editingId ? 'Сохранить изменения' : 'Добавить'}</Text>
            </Pressable>
          </View>

          <TextInput
            onChangeText={setSearch}
            placeholder="Поиск по записям"
            placeholderTextColor="#94a3b8"
            style={styles.search}
            value={search}
          />

          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.filters}>
            {FILTERS.map((item) => (
              <Pressable
                key={item.id}
                onPress={() => setFilter(item.id)}
                style={[styles.filterChip, filter === item.id && styles.filterChipActive]}
              >
                <Text style={[styles.filterText, filter === item.id && styles.filterTextActive]}>{item.title}</Text>
              </Pressable>
            ))}
          </ScrollView>

          <View style={styles.listHeader}>
            <Text style={styles.sectionTitle}>Сохранено</Text>
            <Text style={styles.counter}>{filteredNotes.length}</Text>
          </View>

          {!isReady ? (
            <Text style={styles.emptyText}>Загружаю записи...</Text>
          ) : filteredNotes.length === 0 ? (
            <Text style={styles.emptyText}>{notes.length === 0 ? 'Пока нет записей.' : 'Ничего не найдено.'}</Text>
          ) : (
            filteredNotes.map((note) => {
              const typeMeta = getTypeMeta(note.type);
              const priorityMeta = getPriorityMeta(note.priority);

              return (
                <View key={note.id} style={[styles.noteCard, note.done && styles.noteDone]}>
                  <View style={styles.noteTop}>
                    <View style={[styles.typeBadge, { backgroundColor: typeMeta.soft }]}>
                      <Text style={[styles.typeBadgeText, { color: typeMeta.color }]}>
                        {typeMeta.icon} {typeMeta.title}
                      </Text>
                    </View>
                    <View style={[styles.priorityBadge, { backgroundColor: priorityMeta.soft }]}>
                      <Text style={[styles.priorityBadgeText, { color: priorityMeta.color }]}>{priorityMeta.title}</Text>
                    </View>
                  </View>

                  <Pressable onPress={() => openNoteLink(note)}>
                    <Text style={[styles.noteText, note.done && styles.doneText, note.type === 'link' && styles.linkText]}>
                      {note.text}
                    </Text>
                  </Pressable>

                  <View style={styles.noteFooter}>
                    <Text style={styles.date}>{formatDate(note.updatedAt)}</Text>
                    <View style={styles.actions}>
                      {note.type === 'task' ? (
                        <Pressable onPress={() => toggleDone(note.id)} hitSlop={10}>
                          <Text style={styles.doneButton}>{note.done ? 'Вернуть' : 'Готово'}</Text>
                        </Pressable>
                      ) : null}
                      <Pressable onPress={() => startEdit(note)} hitSlop={10}>
                        <Text style={styles.editText}>Править</Text>
                      </Pressable>
                      <Pressable onPress={() => deleteNote(note.id)} hitSlop={10}>
                        <Text style={styles.deleteText}>Удалить</Text>
                      </Pressable>
                    </View>
                  </View>
                </View>
              );
            })
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safeArea: { flex: 1, backgroundColor: '#0f172a' },
  screen: { flex: 1 },
  content: { alignSelf: 'center', maxWidth: 760, padding: 18, paddingBottom: 48, width: '100%' },
  hero: { backgroundColor: '#111827', borderRadius: 28, marginBottom: 14, padding: 22 },
  eyebrow: { color: '#93c5fd', fontSize: 13, fontWeight: '800', letterSpacing: 0.8, marginBottom: 8, textTransform: 'uppercase' },
  title: { color: '#ffffff', fontSize: 31, fontWeight: '900', lineHeight: 37 },
  subtitle: { color: '#cbd5e1', fontSize: 15, lineHeight: 22, marginTop: 10 },
  statsGrid: { flexDirection: 'row', gap: 10, marginBottom: 14 },
  statCard: { backgroundColor: '#ffffff', borderRadius: 20, flex: 1, padding: 14 },
  statValue: { color: '#0f172a', fontSize: 26, fontWeight: '900' },
  statLabel: { color: '#64748b', fontSize: 13, fontWeight: '700', marginTop: 2 },
  card: { backgroundColor: '#ffffff', borderRadius: 26, marginBottom: 14, padding: 16 },
  formHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  cardTitle: { color: '#0f172a', fontSize: 20, fontWeight: '900' },
  cancelText: { color: '#64748b', fontSize: 14, fontWeight: '800' },
  segmentRow: { flexDirection: 'row', gap: 8, marginBottom: 12 },
  segment: { alignItems: 'center', backgroundColor: '#f1f5f9', borderRadius: 14, flex: 1, paddingVertical: 11 },
  segmentText: { color: '#475569', fontSize: 14, fontWeight: '800' },
  segmentTextActive: { color: '#ffffff' },
  input: { backgroundColor: '#f8fafc', borderColor: '#e2e8f0', borderRadius: 18, borderWidth: 1, color: '#0f172a', fontSize: 16, lineHeight: 24, minHeight: 116, padding: 14 },
  smallLabel: { color: '#475569', fontSize: 13, fontWeight: '800', marginBottom: 8, marginTop: 12 },
  priorityRow: { flexDirection: 'row', gap: 8 },
  priorityPill: { borderColor: '#e2e8f0', borderRadius: 999, borderWidth: 1, paddingHorizontal: 12, paddingVertical: 9 },
  priorityText: { color: '#64748b', fontSize: 13, fontWeight: '800' },
  button: { alignItems: 'center', backgroundColor: '#2563eb', borderRadius: 18, marginTop: 14, paddingVertical: 15 },
  buttonDisabled: { backgroundColor: '#94a3b8' },
  buttonPressed: { transform: [{ scale: 0.99 }] },
  buttonText: { color: '#ffffff', fontSize: 16, fontWeight: '900' },
  search: { backgroundColor: '#ffffff', borderRadius: 18, color: '#0f172a', fontSize: 16, marginBottom: 10, paddingHorizontal: 16, paddingVertical: 14 },
  filters: { marginBottom: 14 },
  filterChip: { backgroundColor: '#1e293b', borderRadius: 999, marginRight: 8, paddingHorizontal: 15, paddingVertical: 10 },
  filterChipActive: { backgroundColor: '#2563eb' },
  filterText: { color: '#cbd5e1', fontSize: 14, fontWeight: '800' },
  filterTextActive: { color: '#ffffff' },
  listHeader: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 10 },
  sectionTitle: { color: '#ffffff', fontSize: 22, fontWeight: '900' },
  counter: { backgroundColor: '#dbeafe', borderRadius: 999, color: '#1d4ed8', fontSize: 14, fontWeight: '900', overflow: 'hidden', paddingHorizontal: 12, paddingVertical: 6 },
  emptyText: { color: '#cbd5e1', fontSize: 16, paddingVertical: 24, textAlign: 'center' },
  noteCard: { backgroundColor: '#ffffff', borderLeftColor: '#2563eb', borderLeftWidth: 5, borderRadius: 22, marginBottom: 12, padding: 16 },
  noteDone: { opacity: 0.68 },
  noteTop: { alignItems: 'center', flexDirection: 'row', justifyContent: 'space-between', marginBottom: 12 },
  typeBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  typeBadgeText: { fontSize: 13, fontWeight: '900' },
  priorityBadge: { borderRadius: 999, paddingHorizontal: 10, paddingVertical: 6 },
  priorityBadgeText: { fontSize: 12, fontWeight: '900' },
  noteText: { color: '#0f172a', fontSize: 17, fontWeight: '700', lineHeight: 25 },
  doneText: { textDecorationLine: 'line-through' },
  linkText: { color: '#0891b2', textDecorationLine: 'underline' },
  noteFooter: { gap: 12, marginTop: 14 },
  date: { color: '#94a3b8', fontSize: 13, fontWeight: '700' },
  actions: { flexDirection: 'row', flexWrap: 'wrap', gap: 14 },
  doneButton: { color: '#16a34a', fontSize: 14, fontWeight: '900' },
  editText: { color: '#2563eb', fontSize: 14, fontWeight: '900' },
  deleteText: { color: '#dc2626', fontSize: 14, fontWeight: '900' },
});
