import React, { useState, useEffect } from 'react';
import {
  StyleSheet,
  Text,
  View,
  Image,
  FlatList,
  TouchableOpacity,
  Pressable,
  Modal,
  Button,
  Dimensions,
  Platform,
  Alert,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { StatusBar } from 'expo-status-bar';
import * as ImagePicker from 'expo-image-picker';
import * as FileSystem from 'expo-file-system/legacy';

// Obtenemos el ancho de la pantalla para calcular el tamaño de las imágenes
const { width } = Dimensions.get('window');
const numColumns = 3; // Queremos 3 columnas
const spacing = 4; // Espacio pequeño entre imágenes
const itemSize = (width - spacing * (numColumns + 1)) / numColumns;

type PhotoItem = { id: string; uri: string };
const PHOTO_MANIFEST = FileSystem.documentDirectory + 'photos.json';

export default function App() {

  // En esta parte del codigo le agregamos funcionalidad para que tome fotos y las guarde en la galeria
  const takePhotoAsync = async () => {
    // 1. Pedir permisos
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert(
        'Permisos requeridos',
        'Se necesitan permisos para acceder a la cámara.'
      );
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
        addPhoto(dest);
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
    // (En escenarios de selección rápida o Fast Refresh se podría repetir)
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

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar style="auto" />
      <Text style={styles.title}>Galería de Fotos</Text>

      {/* Botón para agregar nuevas fotos */}
      <View style={styles.buttonRow}>
        <Pressable
          style={({ pressed }) => [styles.addButton, pressed && styles.addButtonPressed]}
          onPress={pickImageAsync}
          accessibilityLabel="Agregar foto desde galería"
        >
          <Text style={styles.addButtonText}>Galería</Text>
        </Pressable>
        <Pressable
          style={({ pressed }) => [styles.cameraButton, pressed && styles.addButtonPressed]}
          onPress={takePhotoAsync}
          accessibilityLabel="Tomar foto con cámara"
        >
          <Text style={styles.addButtonText}>Cámara</Text>
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
            <Button title="Cerrar" onPress={closeModal} />
          </View>
        </Modal>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    // Agregamos padding superior si es Android para evitar la barra de estado
    paddingTop: Platform.OS === 'android' ? 25 : 0,
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    textAlign: 'center',
    marginVertical: 20,
    color: '#333',
  },
  buttonRow: {
    flexDirection: 'row',
    gap: 12,
    marginHorizontal: 20,
    marginBottom: 20,
    justifyContent: 'space-between',
  },
  listContainer: {
    paddingHorizontal: spacing, // Espacio en los bordes de la lista
  },
  row: {
    justifyContent: 'flex-start', // Alinea las imágenes al inicio
  },
  photo: {
    width: itemSize,
    height: itemSize,
    margin: spacing / 2, // Espacio alrededor de cada foto
    backgroundColor: '#e1e1e1', // Color mientras carga la imagen
    borderRadius: 8,
  },
  // --- Estilos del Modal ---
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'black',
  },
  modalImage: {
    width: '100%',
    height: '80%', // Ocupa el 80% de la altura
  },
  addButton: {
    flex: 1,
    backgroundColor: '#47d81bff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  cameraButton: {
    flex: 1,
    backgroundColor: '#000000ff',
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 8,
    textDecorationStyle: 'dotted',
    alignItems: 'center',
    justifyContent: 'center',
  },
  addButtonPressed: {
    opacity: 0.85,
  },
  addButtonText: {
    color: '#ffffff',
    fontSize: 16,
    fontWeight: '600',
  },
  // El botón de cerrar en el modal se ve mejor con un estilo
  // (El <Button> de React Native es difícil de estilizar,
  // pero para el modal, se puede agregar un View alrededor
  // con un color de fondo si se desea)
});