import { Ionicons } from '@expo/vector-icons'; // Íconos
import * as FileSystem from 'expo-file-system/legacy';
import * as ImagePicker from 'expo-image-picker';
import { StatusBar } from 'expo-status-bar';
import { useEffect, useState } from 'react';
import {
  Alert,
  Dimensions,
  FlatList,
  Image,
  Modal,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TouchableOpacity,
  View
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

// Obtenemos el ancho de la pantalla para calcular el tamaño de las imágenes
const { width } = Dimensions.get('window');
const numColumns = 3; // Queremos 3 columnas
const spacing = 4; // Espacio pequeño entre imágenes
const itemSize = (width - spacing * (numColumns + 1)) / numColumns;

type PhotoItem = { id: string; uri: string };
const PHOTO_MANIFEST = FileSystem.documentDirectory + 'photos.json';

export default function App() {
  const [darkMode, setDarkMode] = useState(false);

  // En esta parte del codigo le agregamos funcionalidad para que tome fotos y las guarde en la galeria
  const takePhotoAsync = async () => {
    // 1. Pedir permisos
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permisos requeridos', 'Se necesitan permisos para acceder a la cámara.');
      return;
    }

    // 2. Abrir la cámara
    let result = await ImagePicker.launchCameraAsync({
      mediaTypes: ['images'], // Solo imágenes (API nueva)
      allowsEditing: true, // Permitir edición básica
      quality: 1, // Máxima calidad
    });

    // 3. Manejar el resultado
    if (!result.canceled) {
      const capturedUri = result.assets[0].uri;
      try {
        const dest = FileSystem.documentDirectory + `photo_${Date.now()}.jpg`;
        await FileSystem.copyAsync({ from: capturedUri, to: dest });
        addPhoto(dest); // Lógica original (persistimos en documentos)
      } catch (e) {
        Alert.alert('Error', 'No se pudo guardar la foto tomada.');
      }
    }
  };

  // Estado para guardar la lista de fotos.
  // Empezamos con algunas fotos de ejemplo.
  const [photos, setPhotos] = useState<PhotoItem[]>([
    { id: '1', uri: 'https://picsum.photos/id/237/200/200' },
    { id: '2', uri: 'https://picsum.photos/id/238/200/200' },
    { id: '3', uri: 'https://picsum.photos/id/239/200/200' },
    { id: '4', uri: 'https://picsum.photos/id/240/200/200' },
    { id: '5', uri: 'https://picsum.photos/id/241/200/200' },
    { id: '6', uri: 'https://picsum.photos/id/242/200/200' },
  ]);

  // Estado para la imagen seleccionada que se mostrará en el modal
  const [selectedImage, setSelectedImage] = useState<PhotoItem | null>(null);
  // Estado para controlar la visibilidad del modal
  const [modalVisible, setModalVisible] = useState(false);

  // Cargar fotos persistidas (si existen)
  useEffect(() => {
    (async () => {
      try {
        const data = await FileSystem.readAsStringAsync(PHOTO_MANIFEST);
        const parsed: PhotoItem[] = JSON.parse(data);
        if (Array.isArray(parsed) && parsed.length) {
          // Evitar duplicados si el estado ya contiene fotos (Fast Refresh preserva estado)
          setPhotos(prev => {
            const existingIds = new Set(prev.map(p => p.id));
            const newOnes = parsed.filter(p => !existingIds.has(p.id));
            return newOnes.length ? [...newOnes, ...prev] : prev;
          });
        }
      } catch (e) {
        // No existe manifest todavía
      }
    })();
  }, []);

  const persistPhotos = async (list: PhotoItem[]) => {
    try {
      await FileSystem.writeAsStringAsync(PHOTO_MANIFEST, JSON.stringify(list));
    } catch (e) {
      console.warn('Error guardando fotos:', e);
    }
  };

  const addPhoto = (uri: string) => {
    // Generar un ID más robusto evitando colisiones en mismo ms
    let id = Date.now().toString();
    // Si ya existe, añadir sufijo aleatorio
    setPhotos(prev => {
      while (prev.some(p => p.id === id)) {
        id = `${Date.now()}_${Math.random().toString(36).slice(2,8)}`;
      }
      const newPhoto: PhotoItem = { id, uri };
      const updated = [newPhoto, ...prev];
      persistPhotos(updated);
      return updated;
    });
  };

  /**
   * Función para abrir el selector de imágenes del dispositivo
   */
  const pickImageAsync = async () => {
    // 1. Pedir permisos
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos requeridos',
        'Se necesitan permisos para acceder a tu galería de fotos.'
      );
      return;
    }

    // 2. Abrir el selector de imágenes
    let result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'], // Solo imágenes (API nueva)
      allowsEditing: true, // Permitir edición básica
      quality: 1, // Máxima calidad
    });

    // 3. Manejar el resultado
    if (!result.canceled) {
      const newImageUri = result.assets[0].uri;
      // Intentamos copiar a documentos para persistencia completa
      try {
        const extMatch = newImageUri.match(/\.[a-zA-Z0-9]+(?=$|\?)/);
        const ext = extMatch ? extMatch[0] : '.jpg';
        const dest = FileSystem.documentDirectory + `gallery_${Date.now()}${ext}`;
        await FileSystem.copyAsync({ from: newImageUri, to: dest });
        addPhoto(dest);
      } catch (e) {
        // Si falla (p.ej. content://), conservamos el URI original
        addPhoto(newImageUri);
      }
    }
  };

  /**
   * Función que se llama al presionar una imagen de la cuadrícula
   * @param {object} item - El objeto de la foto (ej. { id: '1', uri: '...' })
   */
  const handleImagePress = (item: PhotoItem) => {
    setSelectedImage(item);
    setModalVisible(true);
  };

  /**
   * Función para cerrar el modal
   */
  const closeModal = () => {
    setModalVisible(false);
    setSelectedImage(null);
  };

  /**
   * Componente para renderizar cada item de la foto en la cuadrícula
   */
  const renderPhotoItem = ({ item }: { item: PhotoItem }) => (
    <TouchableOpacity onPress={() => handleImagePress(item)}>
      <Image source={{ uri: item.uri }} style={styles.photo} />
    </TouchableOpacity>
  );
  // Funcion para eliminar una foto
  const deletePhoto = (id: string) => {
    setPhotos(prev => {
      const updated = prev.filter(p => p.id !== id);
      persistPhotos(updated); // guardar cambios
      return updated;
    });
    closeModal(); // cerrar modal después de borrar
  };

  return (
    <SafeAreaView style={[styles.container, darkMode && styles.containerDark]}>
      <StatusBar style="auto" />
      <Text style={[styles.title, darkMode && styles.titleDark]}>Galería de Fotos</Text>

      {/* Botón para agregar nuevas fotos */}
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={pickImageAsync}
          accessibilityLabel="Agregar foto desde galería"
        >
          <Ionicons name="images" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Galería</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.cameraButton, pressed && styles.addButtonPressed]}
          onPress={takePhotoAsync}
          accessibilityLabel="Tomar foto con cámara"
        >
          <Ionicons name="camera" size={18} color="#fff" />
          <Text style={styles.addButtonText}>Cámara</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.modeButton, pressed && styles.addButtonPressed]}
          onPress={() => setDarkMode(!darkMode)}
          accessibilityLabel="Cambiar modo de color"
        >
          <Ionicons name={darkMode ? 'sunny' : 'moon'} size={18} color="#fff" />
          <Text style={styles.addButtonText}>{darkMode ? 'Claro' : 'Oscuro'}</Text>
        </Pressable>
      </View>

      {/* Cuadrícula de fotos */}
      <FlatList
        data={photos}
        renderItem={renderPhotoItem}
        keyExtractor={(item) => item.id}
        numColumns={numColumns}
        contentContainerStyle={styles.listContainer}
        columnWrapperStyle={styles.row}
      />

      {/* Modal para ver la imagen en pantalla completa */}
      {selectedImage && (
        <Modal
          animationType="slide"
          transparent={false}
          visible={modalVisible}
          onRequestClose={closeModal} // Permite cerrar con el botón "atrás" en Android
        >
          <View style={styles.modalContainer}>
            <Image
              source={{ uri: selectedImage.uri }}
              style={styles.modalImage}
              resizeMode="contain"
            />
            <View style={styles.modalButtons}>
              <Pressable style={styles.deleteButton} onPress={() => deletePhoto(selectedImage.id)}>
                <Text style={styles.deleteButtonText}>Eliminar</Text>
              </Pressable>

              <Pressable style={styles.closeButton} onPress={closeModal}>
                <Text style={styles.closeButtonText}>Cerrar</Text>
              </Pressable>
            </View>
          </View>
        </Modal>
      )}
    </SafeAreaView>
    
  );

    
}

const styles = StyleSheet.create({
  // --- Layout general ---
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    // Agregamos padding superior si es Android para evitar la barra de estado
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  containerDark: {
    backgroundColor: '#121212',
  },

  // --- Encabezado ---
  title: {
    fontSize: 26,
    fontWeight: '700',
    textAlign: 'center',
    marginVertical: 16,
    color: '#222',
    letterSpacing: 0.5,
  },
  titleDark: {
    color: '#fff',
  },

  // --- Botones superiores ---
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 16,
    justifyContent: 'space-between',
  },
  addButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#4CAF50',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    // Sombra iOS
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    // Sombra Android
    elevation: 3,
  },
  cameraButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#2196F3',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  modeButton: {
    flex: 1,
    flexDirection: 'row',
    gap: 6,
    backgroundColor: '#9C27B0',
    paddingVertical: 12,
    paddingHorizontal: 10,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOpacity: 0.18,
    shadowRadius: 4,
    shadowOffset: { width: 0, height: 2 },
    elevation: 3,
  },
  addButtonPressed: {
    opacity: 0.85,
    transform: [{ scale: 0.98 }],
  },
  addButtonText: {
    color: '#fff',
    fontSize: 15,
    fontWeight: '600',
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },

  // --- Lista / cuadrícula ---
  listContainer: {
    paddingHorizontal: spacing, // Espacio en los bordes de la lista
    paddingBottom: 24,
  },
  row: {
    justifyContent: 'flex-start', // Alinea las imágenes al inicio
  },
  photo: {
    width: itemSize,
    height: itemSize,
    margin: spacing / 2, // Espacio alrededor de cada foto
    backgroundColor: '#e1e1e1', // Placeholder mientras carga
    borderRadius: 12,
    // Sombra sutil para las tarjetas
    shadowColor: '#000',
    shadowOpacity: 0.12,
    shadowRadius: 3,
    shadowOffset: { width: 0, height: 1 },
    elevation: 2,
  },

  // --- Estilos del Modal ---
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    // Fondo semitransparente más agradable
    backgroundColor: 'rgba(0,0,0,0.9)',
    paddingHorizontal: 12,
  },
  modalImage: {
    width: '92%',
    height: '72%', // Ocupa el 72% de la altura
    borderRadius: 12,
  },
  closeButton: {
    marginTop: 18,
    backgroundColor: '#fff',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },
  closeButtonText: {
    color: '#000',
    fontWeight: '600',
    fontSize: 16,
  },
  modalButtons: {
    flexDirection: 'row',
    gap: 16,
    marginTop: 20,
  },

  deleteButton: {
    marginTop: 18,
    backgroundColor: '#E53935',
    paddingVertical: 10,
    paddingHorizontal: 20,
    borderRadius: 8,
  },

  deleteButtonText: {
    color: '#fff',
    fontWeight: '700',
    fontSize: 16,
  },

});
