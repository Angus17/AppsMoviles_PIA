import { Ionicons } from '@expo/vector-icons';
import { ResizeMode, Video } from 'expo-av';
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import { Alert, Dimensions, FlatList, Image, Modal, Platform, Pressable, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Métricas de grilla
const { width } = Dimensions.get('window');
const numColumns = 3;
const spacing = 4;
const itemSize = (width - spacing * (numColumns + 1)) / numColumns;

type MediaItem = { id: string; uri: string; kind: 'image' | 'video' };
const PHOTO_MANIFEST = FileSystem.documentDirectory + 'photos.json';

// Compatibilidad de mediaTypes entre API nueva y antigua (MediaTypeOptions)
const hasNewMediaTypeApi = (ImagePicker as any).MediaType && (ImagePicker as any).MediaType.image;
const LIBRARY_MEDIA_TYPES = hasNewMediaTypeApi
  ? [(ImagePicker as any).MediaType.image, (ImagePicker as any).MediaType.video]
  : ImagePicker.MediaTypeOptions.All;

const cameraMediaType = (mode: 'image' | 'video') => {
  if (hasNewMediaTypeApi) {
    return mode === 'video' ? (ImagePicker as any).MediaType.video : (ImagePicker as any).MediaType.image;
  }
    return mode === 'video' ? ImagePicker.MediaTypeOptions.Videos : ImagePicker.MediaTypeOptions.Images;
};

export default function App() {
  const [darkMode, setDarkMode] = useState(false);
  const [items, setItems] = useState<MediaItem[]>([]);
  const [selected, setSelected] = useState<MediaItem | null>(null);
  const [modalVisible, setModalVisible] = useState(false);

  // Cargar manifest inicial
  useEffect(() => {
    (async () => {
      try {
        const data = await FileSystem.readAsStringAsync(PHOTO_MANIFEST);
        const parsed: any[] = JSON.parse(data);
        if (Array.isArray(parsed)) {
          setItems(parsed.map(p => ({ id: p.id, uri: p.uri, kind: p.kind === 'video' ? 'video' : 'image' })));
        }
      } catch {
        // primera vez sin archivo
      }
    })();
  }, []);

  const persist = async (list: MediaItem[]) => {
    try { await FileSystem.writeAsStringAsync(PHOTO_MANIFEST, JSON.stringify(list)); } catch (e) { console.warn('Persist error', e); }
  };

  const addMedia = (uri: string, kind: 'image' | 'video') => {
    let id = Date.now().toString();
    setItems(prev => {
      while (prev.some(p => p.id === id)) id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      const newItem: MediaItem = { id, uri, kind };
      const updated = [newItem, ...prev];
      persist(updated);
      return updated;
    });
  };

  const pickFromLibrary = async () => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Acceso a la galería denegado'); return; }
    const result = await ImagePicker.launchImageLibraryAsync({ mediaTypes: LIBRARY_MEDIA_TYPES, quality: 1 });
    if (!result.canceled) {
      const asset = result.assets[0];
      const extMatch = asset.uri.match(/\.[a-zA-Z0-9]+(?=$|\?)/);
      const ext = extMatch ? extMatch[0] : (asset.type === 'video' ? '.mp4' : '.jpg');
      try {
        const dest = FileSystem.documentDirectory + `lib_${Date.now()}${ext}`;
        await FileSystem.copyAsync({ from: asset.uri, to: dest });
        addMedia(dest, asset.type === 'video' ? 'video' : 'image');
      } catch {
        addMedia(asset.uri, asset.type === 'video' ? 'video' : 'image');
      }
    }
  };

  const capture = async (mode: 'image' | 'video') => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') { Alert.alert('Permisos requeridos', 'Acceso a la cámara denegado'); return; }
    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: cameraMediaType(mode),
      quality: 1,
      videoMaxDuration: 30,
    });
    if (!result.canceled) {
      const asset = result.assets[0];
      const extMatch = asset.uri.match(/\.[a-zA-Z0-9]+(?=$|\?)/);
      const ext = extMatch ? extMatch[0] : (mode === 'video' ? '.mp4' : '.jpg');
      try {
        const dest = FileSystem.documentDirectory + `${mode}_${Date.now()}${ext}`;
        await FileSystem.copyAsync({ from: asset.uri, to: dest });
        addMedia(dest, mode);
      } catch {
        addMedia(asset.uri, mode);
      }
    }
  };

  const openCaptureChooser = () => {
    Alert.alert('Capturar Multimedia\n', 'Elige tipo', [
      { text: 'Video', onPress: () => capture('video') },
      { text: 'Foto', onPress: () => capture('image') },
      { text: 'Cancelar', style: 'cancel' }
    ]);
  };

  const handlePress = (item: MediaItem) => { setSelected(item); setModalVisible(true); };
  const closeModal = () => { setModalVisible(false); setSelected(null); };
  const deleteItem = (id: string) => {
    setItems(prev => { const updated = prev.filter(p => p.id !== id); persist(updated); return updated; });
    closeModal();
  };

  const renderItem = ({ item }: { item: MediaItem }) => (
    <TouchableOpacity onPress={() => handlePress(item)}>
      {item.kind === 'video' ? (
        <View style={[styles.photo, styles.videoThumb]}>
          <Ionicons name="videocam" size={28} color="#fff" />
          <Text style={styles.videoLabel}>Video</Text>
        </View>
      ) : (
        <Image source={{ uri: item.uri }} style={styles.photo} />
      )}
    </TouchableOpacity>
  );

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      <StatusBar style="auto" />
      <Text style={[styles.title, darkMode && styles.titleDark]}>Galería de Fotos</Text>
      <View style={styles.buttonRow}>
        <Pressable style={({ pressed }) => [styles.addButton, darkMode && styles.addButtonDark, pressed && styles.addButtonPressed]} onPress={pickFromLibrary}>
          <Ionicons name="images" size={18} color={darkMode ? '#111' : '#fff'} />
          <Text style={[styles.addButtonText, darkMode && styles.buttonTextDark]}>Galería</Text>
        </Pressable>
        <Pressable style={({ pressed }) => [styles.modeButton, darkMode && styles.modeButtonDark, pressed && styles.addButtonPressed]} onPress={() => setDarkMode(!darkMode)}>
          <Ionicons name={darkMode ? 'sunny' : 'moon'} size={18} color={darkMode ? '#111' : '#fff'} />
          <Text style={[styles.addButtonText, darkMode && styles.buttonTextDark]}>{darkMode ? 'Claro' : 'Oscuro'}</Text>
        </Pressable>
      </View>
      <FlatList data={items} renderItem={renderItem} keyExtractor={i => i.id} numColumns={numColumns} contentContainerStyle={styles.listContainer} columnWrapperStyle={styles.row} />
      {selected && (
        <Modal animationType="slide" transparent={false} visible={modalVisible} onRequestClose={closeModal}>
          <View style={styles.modalContainer}>
            {selected.kind === 'video' ? (
              <Video
                source={{ uri: selected.uri }}
                style={styles.modalImage}
                resizeMode={ResizeMode.CONTAIN}
                useNativeControls
                shouldPlay={false}
              />
            ) : (
              <Image source={{ uri: selected.uri }} style={styles.modalImage} resizeMode="contain" />
            )}
            <View style={styles.modalButtons}>
              <Pressable style={styles.deleteButton} onPress={() => deleteItem(selected.id)}>
                <Text style={styles.deleteButtonText}>Eliminar</Text>
              </Pressable>
              <Pressable style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
      <Pressable style={({ pressed }) => [styles.fabCamera, darkMode && styles.fabCameraDark, pressed && styles.fabPressed]} onPress={openCaptureChooser} accessibilityLabel="Capturar foto o video">
        <Ionicons name="camera" size={24} color={darkMode ? '#111' : '#fff'} />
      </Pressable>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#f5f5f5', paddingTop: Platform.OS === 'android' ? 25 : 0 },
  containerDark: { backgroundColor: '#121212' },
  title: { fontSize: 26, fontWeight: '700', textAlign: 'center', marginVertical: 16, color: '#222', letterSpacing: 0.5 },
  titleDark: { color: '#fff' },
  buttonRow: { flexDirection: 'row', gap: 12, marginHorizontal: 20, marginBottom: 16, justifyContent: 'space-between' },
  addButton: { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: '#4CAF50', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  addButtonDark: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#4CAF50' },
  modeButton: { flex: 1, flexDirection: 'row', gap: 6, backgroundColor: '#9C27B0', paddingVertical: 12, paddingHorizontal: 10, borderRadius: 10, alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.18, shadowRadius: 4, shadowOffset: { width: 0, height: 2 }, elevation: 3 },
  modeButtonDark: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#9C27B0' },
  addButtonPressed: { opacity: 0.85, transform: [{ scale: 0.98 }] },
  addButtonText: { color: '#fff', fontSize: 15, fontWeight: '600', textTransform: 'uppercase', letterSpacing: 0.5 },
  buttonTextDark: { color: '#111' },
  fabCamera: { position: 'absolute', right: 20, bottom: 30, width: 56, height: 56, borderRadius: 28, backgroundColor: '#2196F3', alignItems: 'center', justifyContent: 'center', shadowColor: '#000', shadowOpacity: 0.2, shadowRadius: 5, shadowOffset: { width: 0, height: 3 }, elevation: 5 },
  fabCameraDark: { backgroundColor: '#fff', borderWidth: 2, borderColor: '#2196F3' },
  fabPressed: { opacity: 0.9, transform: [{ scale: 0.98 }] },
  listContainer: { paddingHorizontal: spacing, paddingBottom: 24 },
  row: { justifyContent: 'flex-start' },
  photo: { width: itemSize, height: itemSize, margin: spacing / 2, backgroundColor: '#e1e1e1', borderRadius: 12, shadowColor: '#000', shadowOpacity: 0.12, shadowRadius: 3, shadowOffset: { width: 0, height: 1 }, elevation: 2 },
  videoThumb: { backgroundColor: '#00000088', alignItems: 'center', justifyContent: 'center', padding: 4, borderRadius: 12 },
  videoLabel: { marginTop: 4, color: '#fff', fontSize: 12, fontWeight: '600' },
  modalContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', backgroundColor: 'rgba(0,0,0,0.9)', paddingHorizontal: 12 },
  modalImage: { width: '92%', height: '72%', borderRadius: 12 },
  closeButton: { marginTop: 18, backgroundColor: '#fff', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  closeButtonText: { color: '#000', fontWeight: '600', fontSize: 16 },
  modalButtons: { flexDirection: 'row', gap: 16, marginTop: 20 },
  deleteButton: { marginTop: 18, backgroundColor: '#E53935', paddingVertical: 10, paddingHorizontal: 20, borderRadius: 8 },
  deleteButtonText: { color: '#fff', fontWeight: '700', fontSize: 16 },
});
