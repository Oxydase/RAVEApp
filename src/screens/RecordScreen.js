import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  Alert,
  FlatList,
  TextInput,
  Modal,
  ActivityIndicator,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import {
  addRecording,
  removeRecording,
  setCurrentRecording,
  setRecordingStatus,
  setPlayingStatus,
} from '../store/slices/recordingsSlice';
import audioService from '../services/audioService';

const RecordScreen = () => {
  const dispatch = useDispatch();
  const { recordings, isRecording, isPlaying } = useSelector((state) => state.recordings);

  const [recordingDuration, setRecordingDuration] = useState(0);
  const [currentPlayingId, setCurrentPlayingId] = useState(null);
  const [showSaveModal, setShowSaveModal] = useState(false);
  const [recordingName, setRecordingName] = useState('');
  const [tempRecording, setTempRecording] = useState(null);
  const [recordingTimer, setRecordingTimer] = useState(null);

  useEffect(() => {
    return () => {
      // Nettoyage lors du démontage du composant
      if (recordingTimer) {
        clearInterval(recordingTimer);
      }
      audioService.cleanup();
    };
  }, []);

  // Démarrer l'enregistrement
  const startRecording = async () => {
    try {
      const result = await audioService.startRecording();
      
      if (result.success) {
        dispatch(setRecordingStatus(true));
        setRecordingDuration(0);
        
        // Démarrer le timer pour afficher la durée
        const timer = setInterval(() => {
          setRecordingDuration(prev => prev + 1);
        }, 1000);
        setRecordingTimer(timer);
      } else {
        Alert.alert('Erreur', 'Impossible de démarrer l\'enregistrement');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors du démarrage de l\'enregistrement');
    }
  };

  // Arrêter l'enregistrement
  const stopRecording = async () => {
    try {
      const result = await audioService.stopRecording();
      
      if (result.success) {
        dispatch(setRecordingStatus(false));
        
        if (recordingTimer) {
          clearInterval(recordingTimer);
          setRecordingTimer(null);
        }
        
        // Sauvegarder temporairement l'enregistrement
        setTempRecording({
          uri: result.uri,
          duration: result.duration,
        });
        
        // Ouvrir le modal pour nommer l'enregistrement
        setShowSaveModal(true);
      } else {
        Alert.alert('Erreur', 'Impossible d\'arrêter l\'enregistrement');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de l\'arrêt de l\'enregistrement');
    }
  };

  // Sauvegarder l'enregistrement
  const saveRecording = async () => {
    if (!recordingName.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un nom pour l\'enregistrement');
      return;
    }

    if (!tempRecording) {
      Alert.alert('Erreur', 'Aucun enregistrement à sauvegarder');
      return;
    }

    try {
      const fileName = `${recordingName.trim()}_${Date.now()}`;
      const result = await audioService.saveRecording(tempRecording.uri, fileName);
      
      if (result.success) {
        const newRecording = {
          id: Date.now().toString(),
          name: recordingName.trim(),
          uri: result.uri,
          duration: tempRecording.duration,
          createdAt: new Date().toISOString(),
        };
        
        dispatch(addRecording(newRecording));
        
        // Réinitialiser les états
        setShowSaveModal(false);
        setRecordingName('');
        setTempRecording(null);
        setRecordingDuration(0);
        
        Alert.alert('Succès', 'Enregistrement sauvegardé !');
      } else {
        Alert.alert('Erreur', 'Impossible de sauvegarder l\'enregistrement');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la sauvegarde');
    }
  };

  // Annuler la sauvegarde
  const cancelSave = () => {
    setShowSaveModal(false);
    setRecordingName('');
    setTempRecording(null);
    setRecordingDuration(0);
  };

  // Lire un enregistrement
  const playRecording = async (recording) => {
    try {
      if (currentPlayingId === recording.id && isPlaying) {
        // Arrêter la lecture
        await audioService.stopSound();
        setCurrentPlayingId(null);
        dispatch(setPlayingStatus(false));
      } else {
        // Démarrer la lecture
        await audioService.stopSound(); // Arrêter tout autre son en cours
        const result = await audioService.playSound(recording.uri);
        
        if (result.success) {
          setCurrentPlayingId(recording.id);
          dispatch(setPlayingStatus(true));
          
          // Arrêter automatiquement après la durée de l'enregistrement
          setTimeout(() => {
            setCurrentPlayingId(null);
            dispatch(setPlayingStatus(false));
          }, recording.duration || 5000);
        } else {
          Alert.alert('Erreur', 'Impossible de lire l\'enregistrement');
        }
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la lecture');
    }
  };

  // Supprimer un enregistrement
  const deleteRecording = (recording) => {
    Alert.alert(
      'Confirmer la suppression',
      `Êtes-vous sûr de vouloir supprimer "${recording.name}" ?`,
      [
        { text: 'Annuler', style: 'cancel' },
        {
          text: 'Supprimer',
          style: 'destructive',
          onPress: async () => {
            try {
              await audioService.deleteRecording(recording.uri);
              dispatch(removeRecording(recording.id));
              
              if (currentPlayingId === recording.id) {
                setCurrentPlayingId(null);
                dispatch(setPlayingStatus(false));
              }
            } catch (error) {
              Alert.alert('Erreur', 'Impossible de supprimer l\'enregistrement');
            }
          },
        },
      ]
    );
  };

  // Formater la durée en mm:ss
  const formatDuration = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  // Rendu d'un élément de la liste
  const renderRecordingItem = ({ item }) => (
    <View style={styles.recordingItem}>
      <View style={styles.recordingInfo}>
        <Text style={styles.recordingName}>{item.name}</Text>
        <Text style={styles.recordingDetails}>
          {formatDuration(Math.floor((item.duration || 0) / 1000))} • {' '}
          {new Date(item.createdAt).toLocaleDateString()}
        </Text>
      </View>
      
      <View style={styles.recordingActions}>
        <TouchableOpacity
          style={[
            styles.actionButton,
            styles.playButton,
            currentPlayingId === item.id && isPlaying && styles.playingButton
          ]}
          onPress={() => playRecording(item)}
        >
          <Ionicons
            name={currentPlayingId === item.id && isPlaying ? "pause" : "play"}
            size={20}
            color="#fff"
          />
        </TouchableOpacity>
        
        <TouchableOpacity
          style={[styles.actionButton, styles.deleteButton]}
          onPress={() => deleteRecording(item)}
        >
          <Ionicons name="trash-outline" size={20} color="#fff" />
        </TouchableOpacity>
      </View>
    </View>
  );

  return (
    <View style={styles.container}>
      {/* Section d'enregistrement */}
      <View style={styles.recordSection}>
        <View style={styles.recordingIndicator}>
          {isRecording && (
            <View style={styles.recordingDot} />
          )}
          <Text style={styles.durationText}>
            {formatDuration(recordingDuration)}
          </Text>
        </View>
        
        <TouchableOpacity
          style={[
            styles.recordButton,
            isRecording && styles.recordingButton
          ]}
          onPress={isRecording ? stopRecording : startRecording}
        >
          <Ionicons
            name={isRecording ? "stop" : "mic"}
            size={40}
            color="#fff"
          />
        </TouchableOpacity>
        
        <Text style={styles.recordButtonText}>
          {isRecording ? "Appuyer pour arrêter" : "Appuyer pour enregistrer"}
        </Text>
      </View>

      {/* Liste des enregistrements */}
      <View style={styles.listSection}>
        <Text style={styles.sectionTitle}>
          Mes enregistrements ({recordings.length})
        </Text>
        {recordings.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="musical-notes-outline" size={60} color="#ccc" />
            <Text style={styles.emptyStateText}>
              Aucun enregistrement
            </Text>
            <Text style={styles.emptyStateSubtext}>
              Appuyez sur le bouton d'enregistrement pour commencer
            </Text>
          </View>
        ) : (
          <FlatList
            data={recordings}
            renderItem={renderRecordingItem}
            keyExtractor={(item) => item.id}
            showsVerticalScrollIndicator={false}
          />
        )}
      </View>

      {/* Modal de sauvegarde */}
      <Modal
        visible={showSaveModal}
        transparent
        animationType="slide"
        onRequestClose={cancelSave}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            <Text style={styles.modalTitle}>Sauvegarder l'enregistrement</Text>
            
            <TextInput
              style={styles.modalInput}
              value={recordingName}
              onChangeText={setRecordingName}
              placeholder="Nom de l'enregistrement"
              placeholderTextColor="#999"
              autoFocus
            />
            
            <View style={styles.modalActions}>
              <TouchableOpacity
                style={[styles.modalButton, styles.cancelButton]}
                onPress={cancelSave}
              >
                <Text style={styles.cancelButtonText}>Annuler</Text>
              </TouchableOpacity>
              
              <TouchableOpacity
                style={[styles.modalButton, styles.saveButton]}
                onPress={saveRecording}
              >
                <Text style={styles.saveButtonText}>Sauvegarder</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  recordSection: {
    backgroundColor: '#fff',
    padding: 30,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  recordingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 20,
  },
  recordingDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: '#F44336',
    marginRight: 8,
    shadowColor: '#F44336',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.5,
    shadowRadius: 4,
    elevation: 3,
  },
  durationText: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    fontFamily: Platform.OS === 'ios' ? 'Menlo' : 'monospace',
  },
  recordButton: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: '#2196F3',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 4,
    },
    shadowOpacity: 0.3,
    shadowRadius: 4.65,
    elevation: 8,
  },
  recordingButton: {
    backgroundColor: '#F44336',
  },
  recordButtonText: {
    fontSize: 16,
    color: '#666',
    textAlign: 'center',
  },
  listSection: {
    flex: 1,
    padding: 20,
  },
  sectionTitle: {
    fontSize: 20,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: 50,
  },
  emptyStateText: {
    fontSize: 18,
    color: '#999',
    marginTop: 15,
    marginBottom: 5,
  },
  emptyStateSubtext: {
    fontSize: 14,
    color: '#ccc',
    textAlign: 'center',
    paddingHorizontal: 40,
  },
  recordingItem: {
    backgroundColor: '#fff',
    padding: 15,
    borderRadius: 10,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 1,
    },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },
  recordingInfo: {
    flex: 1,
  },
  recordingName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 4,
  },
  recordingDetails: {
    fontSize: 12,
    color: '#666',
  },
  recordingActions: {
    flexDirection: 'row',
    gap: 8,
  },
  actionButton: {
    width: 40,
    height: 40,
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playButton: {
    backgroundColor: '#4CAF50',
  },
  playingButton: {
    backgroundColor: '#FF9800',
  },
  deleteButton: {
    backgroundColor: '#F44336',
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalContent: {
    backgroundColor: '#fff',
    padding: 25,
    borderRadius: 15,
    width: '80%',
    alignItems: 'center',
  },
  modalTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 20,
  },
  modalInput: {
    width: '100%',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    marginBottom: 20,
  },
  modalActions: {
    flexDirection: 'row',
    gap: 15,
  },
  modalButton: {
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    minWidth: 80,
    alignItems: 'center',
  },
  cancelButton: {
    backgroundColor: '#f5f5f5',
  },
  saveButton: {
    backgroundColor: '#2196F3',
  },
  cancelButtonText: {
    color: '#666',
    fontWeight: '600',
  },
  saveButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
});

export default RecordScreen;