import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  Alert,
  ActivityIndicator,
  ScrollView,
  FlatList,
} from 'react-native';
import { useSelector, useDispatch } from 'react-redux';
import { Audio } from 'expo-av';
import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { TabView, SceneMap, TabBar } from 'react-native-tab-view';
import Icon from 'react-native-vector-icons/Ionicons';
import { Platform } from 'react-native';

const RAVEScreen = () => {
  const dispatch = useDispatch();
  const ipAddress = useSelector((state) => state.server.ipAddress);
    const port = useSelector((state) => state.server.port);
  
  // États locaux
  const [index, setIndex] = useState(0);
  const [models, setModels] = useState([]);
  const [selectedModel, setSelectedModel] = useState('');
  const [selectedAudio, setSelectedAudio] = useState(null);
  const [originalSound, setOriginalSound] = useState(null);
  const [transformedSound, setTransformedSound] = useState(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [isPlayingOriginal, setIsPlayingOriginal] = useState(false);
  const [isPlayingTransformed, setIsPlayingTransformed] = useState(false);

  // Routes pour les tabs
  const [routes] = useState([
    { key: 'default', title: 'Sons par défaut' },
    { key: 'recordings', title: 'Enregistrements' },
    { key: 'files', title: 'Fichiers' },
  ]);

  // Sons par défaut (utilisation des assets Expo)
  const defaultSounds = [
    { 
      name: 'Sample 1', 
      uri: require('../assets/sounds/sample1.wav'),
      localUri: '../assets/sounds/sample1.wav'
    },
    { 
      name: 'Sample 2', 
      uri: require('../assets/sounds/sample2.wav'),
      localUri: '../assets/sounds/sample2.wav'
    },
    { 
      name: 'Sample 3', 
      uri: require('../assets/sounds/sample3.wav'),
      localUri: '../assets/sounds/sample3.wav'
    },
  ];

  useEffect(() => {
    fetchModels();
    return () => {
      // Cleanup audio lors du démontage du composant
      if (originalSound) {
        originalSound.unloadAsync();
      }
      if (transformedSound) {
        transformedSound.unloadAsync();
      }
    };
  }, []);

  // Récupérer la liste des modèles disponibles
  const fetchModels = async () => {
    try {
      const response = await fetch(`http://${ipAddress}:${port}/getmodels`);
      const modelList = await response.json();
      setModels(modelList);
      if (modelList.length > 0) {
        setSelectedModel(modelList[0]);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer la liste des modèles');
      console.error('Erreur fetchModels:', error);
    }
  };

  // Sélectionner un modèle
  const selectModel = async (modelName) => {
    try {
      const response = await fetch(`http://${ipAddress}:${port}/selectModel/${modelName}`);
      if (response.ok) {
        setSelectedModel(modelName);
        Alert.alert('Succès', `Modèle ${modelName} sélectionné`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner le modèle');
      console.error('Erreur selectModel:', error);
    }
  };

  // Upload du fichier audio vers le serveur
  const uploadAudio = async (audioUri) => {
    if (!audioUri) {
      Alert.alert('Erreur', 'Aucun fichier audio sélectionné');
      return;
    }

    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('audio', {
        uri: audioUri,
        type: 'audio/wav',
        name: 'audio.wav',
      });

      const response = await fetch(`http://${ipAddress}:${port}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        // Télécharger automatiquement le fichier transformé
        await downloadTransformedAudio();
      } else {
        Alert.alert('Erreur', 'Échec de l\'upload du fichier audio');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de l\'upload: ' + error.message);
      console.error('Erreur uploadAudio:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  // Télécharger le fichier audio transformé
  const downloadTransformedAudio = async () => {
    try {
      const downloadUrl = `http://${ipAddress}:${port}/download`;
      const fileUri = FileSystem.documentDirectory + 'transformed_audio.wav';
      
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
      
      if (downloadResult.status === 200) {
        // Charger le son transformé
        const { sound } = await Audio.Sound.createAsync({ uri: downloadResult.uri });
        setTransformedSound(sound);
        Alert.alert('Succès', 'Audio transformé téléchargé avec succès');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors du téléchargement: ' + error.message);
      console.error('Erreur downloadTransformedAudio:', error);
    }
  };

  // Lire l'audio original
  const playOriginalAudio = async () => {
    try {
      if (originalSound) {
        if (isPlayingOriginal) {
          await originalSound.pauseAsync();
          setIsPlayingOriginal(false);
        } else {
          await originalSound.playAsync();
          setIsPlayingOriginal(true);
        }
      }
    } catch (error) {
      console.error('Erreur playOriginalAudio:', error);
    }
  };

  // Lire l'audio transformé
  const playTransformedAudio = async () => {
    try {
      if (transformedSound) {
        if (isPlayingTransformed) {
          await transformedSound.pauseAsync();
          setIsPlayingTransformed(false);
        } else {
          await transformedSound.playAsync();
          setIsPlayingTransformed(true);
        }
      }
    } catch (error) {
      console.error('Erreur playTransformedAudio:', error);
    }
  };

  // Composant pour les sons par défaut
  const DefaultSoundsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Sons par défaut</Text>
      {defaultSounds.map((sound, index) => (
        <TouchableOpacity
          key={index}
          style={[
            styles.soundItem,
            selectedAudio?.name === sound.name && styles.selectedItem
          ]}
          onPress={async () => {
            setSelectedAudio(sound);
            // Charger le son pour la prévisualisation
            const { sound: audioObject } = await Audio.Sound.createAsync(sound.uri);
            if (originalSound) {
              await originalSound.unloadAsync();
            }
            setOriginalSound(audioObject);
          }}
        >
          <Icon name="musical-notes" size={24} color="#4A90E2" />
          <Text style={styles.soundName}>{sound.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Composant pour les enregistrements
  const RecordingsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Mes enregistrements</Text>
      <FlatList
        data={recordings}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <TouchableOpacity
            style={[
              styles.soundItem,
              selectedAudio?.id === item.id && styles.selectedItem
            ]}
            onPress={async () => {
              setSelectedAudio(item);
              // Charger le son pour la prévisualisation
              const { sound: audioObject } = await Audio.Sound.createAsync({ uri: item.uri });
              if (originalSound) {
                await originalSound.unloadAsync();
              }
              setOriginalSound(audioObject);
            }}
          >
            <Icon name="mic" size={24} color="#4A90E2" />
            <Text style={styles.soundName}>{item.name}</Text>
          </TouchableOpacity>
        )}
        ListEmptyComponent={() => (
          <Text style={styles.emptyText}>Aucun enregistrement disponible</Text>
        )}
      />
    </ScrollView>
  );

  // Composant pour les fichiers du téléphone
  const FilesTab = () => (
    <View style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Fichiers du téléphone</Text>
      <TouchableOpacity
        style={styles.selectFileButton}
        onPress={async () => {
          try {
            const result = await DocumentPicker.getDocumentAsync({
              type: 'audio/*',
              copyToCacheDirectory: true,
            });
            
            if (!result.canceled && result.assets[0]) {
              const file = result.assets[0];
              setSelectedAudio({
                name: file.name,
                uri: file.uri,
              });
              
              // Charger le son pour la prévisualisation
              const { sound: audioObject } = await Audio.Sound.createAsync({ uri: file.uri });
              if (originalSound) {
                await originalSound.unloadAsync();
              }
              setOriginalSound(audioObject);
            }
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de sélectionner le fichier');
            console.error('Erreur sélection fichier:', error);
          }
        }}
      >
        <Icon name="folder-open" size={24} color="#4A90E2" />
        <Text style={styles.buttonText}>Sélectionner un fichier audio</Text>
      </TouchableOpacity>
      
      {selectedAudio && (
        <View style={styles.selectedFileInfo}>
          <Icon name="checkmark-circle" size={24} color="#4CAF50" />
          <Text style={styles.selectedFileName}>{selectedAudio.name}</Text>
        </View>
      )}
    </View>
  );

  const renderScene = SceneMap({
    default: DefaultSoundsTab,
    recordings: RecordingsTab,
    files: FilesTab,
  });

  const renderTabBar = (props) => (
    <TabBar
      {...props}
      indicatorStyle={styles.tabIndicator}
      style={styles.tabBar}
      labelStyle={styles.tabLabel}
      activeColor="#4A90E2"
      inactiveColor="#666"
    />
  );

  return (
    <View style={styles.container}>
      <Text style={styles.title}>RAVE - Transfert de Timbre</Text>

      {/* Sélection du modèle */}
      <View style={styles.modelSection}>
        <Text style={styles.sectionTitle}>Modèle sélectionné: {selectedModel}</Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          {models.map((model, modelIndex) => (
            <TouchableOpacity
              key={modelIndex}
              style={[
                styles.modelButton,
                selectedModel === model && styles.selectedModel
              ]}
              onPress={() => selectModel(model)}
            >
              <Text style={[
                styles.modelText,
                selectedModel === model && styles.selectedModelText
              ]}>
                {model}
              </Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      {/* Tabs pour la sélection audio */}
      <TabView
        navigationState={{ index, routes }}
        renderScene={renderScene}
        onIndexChange={setIndex}
        renderTabBar={renderTabBar}
        style={styles.tabView}
      />

      {/* Contrôles audio */}
      <View style={styles.controlsSection}>
        <View style={styles.audioControls}>
          <TouchableOpacity
            style={styles.playButton}
            onPress={playOriginalAudio}
            disabled={!originalSound}
          >
            <Icon 
              name={isPlayingOriginal ? "pause" : "play"} 
              size={24} 
              color={originalSound ? "#4A90E2" : "#ccc"} 
            />
            <Text style={styles.playButtonText}>Original</Text>
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={playTransformedAudio}
            disabled={!transformedSound}
          >
            <Icon 
              name={isPlayingTransformed ? "pause" : "play"} 
              size={24} 
              color={transformedSound ? "#4A90E2" : "#ccc"} 
            />
            <Text style={styles.playButtonText}>Transformé</Text>
          </TouchableOpacity>
        </View>

        {/* Bouton de traitement */}
        <TouchableOpacity
          style={[styles.processButton, (!selectedAudio || isProcessing) && styles.disabledButton]}
          onPress={() => uploadAudio(selectedAudio?.uri)}
          disabled={!selectedAudio || isProcessing}
        >
          {isProcessing ? (
            <ActivityIndicator size="small" color="#fff" />
          ) : (
            <Icon name="flash" size={24} color="#fff" />
          )}
          <Text style={styles.processButtonText}>
            {isProcessing ? 'Traitement en cours...' : 'Transformer l\'audio'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
    padding: 16,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    textAlign: 'center',
    marginBottom: 20,
    color: '#333',
  },
  modelSection: {
    marginBottom: 20,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: '600',
    marginBottom: 10,
    color: '#333',
  },
  modelButton: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    marginRight: 10,
    backgroundColor: '#e0e0e0',
    borderRadius: 20,
    borderWidth: 1,
    borderColor: '#ccc',
  },
  selectedModel: {
    backgroundColor: '#4A90E2',
    borderColor: '#4A90E2',
  },
  modelText: {
    color: '#666',
    fontWeight: '500',
  },
  selectedModelText: {
    color: '#fff',
  },
  tabView: {
    flex: 1,
    marginBottom: 20,
  },
  tabBar: {
    backgroundColor: '#fff',
    elevation: 2,
    shadowOpacity: 0.1,
  },
  tabIndicator: {
    backgroundColor: '#4A90E2',
  },
  tabLabel: {
    fontSize: 14,
    fontWeight: '600',
  },
  tabContent: {
    flex: 1,
    padding: 16,
    backgroundColor: '#fff',
  },
  soundItem: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    marginBottom: 8,
    backgroundColor: '#f9f9f9',
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#e0e0e0',
  },
  selectedItem: {
    backgroundColor: '#e3f2fd',
    borderColor: '#4A90E2',
  },
  soundName: {
    marginLeft: 12,
    fontSize: 16,
    color: '#333',
  },
  selectFileButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 20,
    backgroundColor: '#f0f8ff',
    borderRadius: 8,
    borderWidth: 2,
    borderColor: '#4A90E2',
    borderStyle: 'dashed',
  },
  buttonText: {
    marginLeft: 12,
    fontSize: 16,
    color: '#4A90E2',
    fontWeight: '500',
  },
  selectedFileInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 16,
    padding: 12,
    backgroundColor: '#e8f5e8',
    borderRadius: 8,
  },
  selectedFileName: {
    marginLeft: 8,
    fontSize: 14,
    color: '#2e7d32',
    fontWeight: '500',
  },
  emptyText: {
    textAlign: 'center',
    color: '#999',
    fontSize: 16,
    marginTop: 20,
  },
  controlsSection: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    elevation: 2,
    shadowOpacity: 0.1,
  },
  audioControls: {
    flexDirection: 'row',
    justifyContent: 'space-around',
    marginBottom: 20,
  },
  playButton: {
    alignItems: 'center',
    padding: 12,
    borderRadius: 8,
    backgroundColor: '#f5f5f5',
    minWidth: 100,
  },
  playButtonText: {
    marginTop: 4,
    fontSize: 12,
    color: '#666',
  },
  processButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: '#4A90E2',
    padding: 16,
    borderRadius: 8,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  processButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
});

export default RAVEScreen;