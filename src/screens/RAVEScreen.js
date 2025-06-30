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
import { Asset } from 'expo-asset';

const RAVEScreen = () => {
  const dispatch = useDispatch();
  const ipAddress = useSelector((state) => state.server.ipAddress);
  const port = useSelector((state) => state.server.port);
  const recordings = useSelector((state) => state.recordings.recordings);
  
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

  // Sons par défaut - CORRECTION ICI
  const defaultSounds = [
    { 
      name: 'Sample 1', 
      asset: require('../assets/sounds/sample1.wav'),
      id: 'sample1'
    },
    { 
      name: 'Sample 2', 
      asset: require('../assets/sounds/sample2.wav'),
      id: 'sample2'
    },
    { 
      name: 'Sample 3', 
      asset: require('../assets/sounds/sample3.wav'),
      id: 'sample3'
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
  }, [recordings]);

  // Récupérer la liste des modèles disponibles
  const fetchModels = async () => {
    try {
      if (!ipAddress || !port) {
        Alert.alert('Erreur', 'Veuillez d\'abord vous connecter au serveur');
        return;
      }
      
      const response = await fetch(`http://${ipAddress}:${port}/getmodels`);
      if (!response.ok) {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
      
      const data = await response.json();
      console.log('Models received:', data);
      
      if (data && Array.isArray(data.models)) {
        setModels(data.models);
        if (data.models.length > 0) {
          setSelectedModel(data.models[0]);
        }
      } else {
        setModels([]);
        Alert.alert('Erreur', 'Les données des modèles sont invalides');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de récupérer la liste des modèles: ' + error.message);
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
      } else {
        throw new Error(`HTTP error! status: ${response.status}`);
      }
    } catch (error) {
      Alert.alert('Erreur', 'Impossible de sélectionner le modèle: ' + error.message);
      console.error('Erreur selectModel:', error);
    }
  };

  // Fonction pour convertir un asset en URI de fichier
  const getAssetUri = async (asset) => {
    try {
      const assetInfo = await Asset.fromModule(asset).downloadAsync();
      return assetInfo.localUri;
    } catch (error) {
      console.error('Erreur conversion asset:', error);
      throw error;
    }
  };

  // Upload du fichier audio vers le serveur - CORRECTION ICI
  const uploadAudio = async (audioData) => {
    if (!audioData) {
      Alert.alert('Erreur', 'Aucun fichier audio sélectionné');
      return;
    }

    if (!selectedModel) {
      Alert.alert('Erreur', 'Veuillez sélectionner un modèle');
      return;
    }

    setIsProcessing(true);
    
    try {
      let audioUri = audioData.uri;
      
      // Si c'est un son par défaut (asset), convertir en URI
      if (audioData.asset) {
        console.log('Conversion asset en URI...');
        audioUri = await getAssetUri(audioData.asset);
        console.log('URI convertie:', audioUri);
      }

      if (!audioUri) {
        throw new Error('URI audio invalide');
      }

      // Vérifier que le fichier existe
      const fileInfo = await FileSystem.getInfoAsync(audioUri);
      if (!fileInfo.exists) {
        throw new Error('Le fichier audio n\'existe pas');
      }

      console.log('Upload du fichier:', audioUri);
      console.log('Taille du fichier:', fileInfo.size);

      const formData = new FormData();
      formData.append('file', {
        uri: audioUri,
        type: 'audio/wav',
        name: 'audio.wav',
      });

      const uploadResponse = await fetch(`http://${ipAddress}:${port}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      console.log('Upload response status:', uploadResponse.status);

      if (uploadResponse.ok) {
        const responseText = await uploadResponse.text();
        console.log('Upload response:', responseText);
        
        // Télécharger automatiquement le fichier transformé
        await downloadTransformedAudio();
      } else {
        const errorText = await uploadResponse.text();
        throw new Error(`Upload failed: ${uploadResponse.status} - ${errorText}`);
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
      
      console.log('Téléchargement depuis:', downloadUrl);
      console.log('Vers:', fileUri);
      
      const downloadResult = await FileSystem.downloadAsync(downloadUrl, fileUri);
      
      console.log('Download result:', downloadResult);
      
      if (downloadResult.status === 200) {
        // Charger le son transformé
        const { sound } = await Audio.Sound.createAsync({ uri: downloadResult.uri });
        
        // Nettoyer l'ancien son transformé
        if (transformedSound) {
          await transformedSound.unloadAsync();
        }
        
        setTransformedSound(sound);
        Alert.alert('Succès', 'Audio transformé téléchargé avec succès');
      } else {
        throw new Error(`Download failed with status: ${downloadResult.status}`);
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
          
          // Auto-stop à la fin
          originalSound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setIsPlayingOriginal(false);
            }
          });
        }
      }
    } catch (error) {
      console.error('Erreur playOriginalAudio:', error);
      Alert.alert('Erreur', 'Impossible de lire l\'audio original');
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
          
          // Auto-stop à la fin
          transformedSound.setOnPlaybackStatusUpdate((status) => {
            if (status.didJustFinish) {
              setIsPlayingTransformed(false);
            }
          });
        }
      }
    } catch (error) {
      console.error('Erreur playTransformedAudio:', error);
      Alert.alert('Erreur', 'Impossible de lire l\'audio transformé');
    }
  };

  // Composant pour les sons par défaut - CORRECTION ICI
  const DefaultSoundsTab = () => (
    <ScrollView style={styles.tabContent}>
      <Text style={styles.sectionTitle}>Sons par défaut</Text>
      {defaultSounds.map((sound, index) => (
        <TouchableOpacity
          key={sound.id}
          style={[
            styles.soundItem,
            selectedAudio?.id === sound.id && styles.selectedItem
          ]}
          onPress={async () => {
            try {
              console.log('Sélection son par défaut:', sound.name);
              setSelectedAudio(sound);
              
              // Charger le son pour la prévisualisation
              const { sound: audioObject } = await Audio.Sound.createAsync(sound.asset);
              if (originalSound) {
                await originalSound.unloadAsync();
              }
              setOriginalSound(audioObject);
            } catch (error) {
              console.error('Erreur sélection son par défaut:', error);
              Alert.alert('Erreur', 'Impossible de charger le son par défaut');
            }
          }}
        >
          <Icon name="musical-notes" size={24} color="#4A90E2" />
          <Text style={styles.soundName}>{sound.name}</Text>
        </TouchableOpacity>
      ))}
    </ScrollView>
  );

  // Composant pour les enregistrements - AMÉLIORÉ
  const RecordingsTab = () => {
    console.log('=== RecordingsTab rendu ===');
    console.log('Recordings dans RecordingsTab:', recordings);
    
    return (
      <View style={styles.tabContent}>
        <Text style={styles.sectionTitle}>Mes enregistrements ({recordings?.length || 0})</Text>
        <FlatList
          data={recordings || []}
          keyExtractor={(item) => item.id.toString()}
          renderItem={({ item }) => {
            console.log('Rendu item:', item);
            return (
              <TouchableOpacity
                style={[
                  styles.soundItem,
                  selectedAudio?.id === item.id && styles.selectedItem
                ]}
                onPress={async () => {
                  try {
                    console.log('Sélection enregistrement:', item);
                    setSelectedAudio(item);
                    
                    // Vérifier que le fichier existe
                    const fileInfo = await FileSystem.getInfoAsync(item.uri);
                    if (!fileInfo.exists) {
                      Alert.alert('Erreur', 'Le fichier d\'enregistrement n\'existe plus');
                      return;
                    }
                    
                    const { sound: audioObject } = await Audio.Sound.createAsync({ uri: item.uri });
                    if (originalSound) {
                      await originalSound.unloadAsync();
                    }
                    setOriginalSound(audioObject);
                  } catch (error) {
                    console.error('Erreur chargement enregistrement:', error);
                    Alert.alert('Erreur', 'Impossible de charger l\'enregistrement');
                  }
                }}
              >
                <Icon name="mic" size={24} color="#4A90E2" />
                <Text style={styles.soundName}>{item.name}</Text>
                <Text style={styles.soundDuration}>
                  {item.duration ? `${Math.round(item.duration / 1000)}s` : ''}
                </Text>
              </TouchableOpacity>
            );
          }}
          ListEmptyComponent={() => (
            <View>
              <Text style={styles.emptyText}>Aucun enregistrement disponible</Text>
              <Text style={styles.debugText}>
                Allez dans l'onglet "Enregistrement" pour créer des clips audio
              </Text>
            </View>
          )}
        />
      </View>
    );
  };

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
            
            console.log('Document picker result:', result);
            
            if (!result.canceled && result.assets[0]) {
              const file = result.assets[0];
              const audioData = {
                id: 'file_' + Date.now(),
                name: file.name,
                uri: file.uri,
              };
              
              setSelectedAudio(audioData);
              
              // Charger le son pour la prévisualisation
              const { sound: audioObject } = await Audio.Sound.createAsync({ uri: file.uri });
              if (originalSound) {
                await originalSound.unloadAsync();
              }
              setOriginalSound(audioObject);
            }
          } catch (error) {
            Alert.alert('Erreur', 'Impossible de sélectionner le fichier: ' + error.message);
            console.error('Erreur sélection fichier:', error);
          }
        }}
      >
        <Icon name="folder-open" size={24} color="#4A90E2" />
        <Text style={styles.buttonText}>Sélectionner un fichier audio</Text>
      </TouchableOpacity>
      
      {selectedAudio && index === 2 && (
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

      {/* Status de connexion */}
      {(!ipAddress || !port) && (
        <View style={styles.warningBanner}>
          <Icon name="warning" size={20} color="#ff9800" />
          <Text style={styles.warningText}>
            Veuillez vous connecter au serveur dans l'onglet "Connexion"
          </Text>
        </View>
      )}

      {/* Sélection du modèle */}
      <View style={styles.modelSection}>
        <Text style={styles.sectionTitle}>
          Modèle sélectionné: {selectedModel || 'Aucun'}
        </Text>
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
        {models.length === 0 && (
          <TouchableOpacity style={styles.refreshButton} onPress={fetchModels}>
            <Icon name="refresh" size={20} color="#4A90E2" />
            <Text style={styles.refreshText}>Actualiser les modèles</Text>
          </TouchableOpacity>
        )}
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
          style={[
            styles.processButton, 
            (!selectedAudio || isProcessing || !selectedModel || !ipAddress) && styles.disabledButton
          ]}
          onPress={() => uploadAudio(selectedAudio)}
          disabled={!selectedAudio || isProcessing || !selectedModel || !ipAddress}
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