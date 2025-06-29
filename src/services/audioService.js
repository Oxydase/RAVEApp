import { Audio } from 'expo-av';
import * as FileSystem from 'expo-file-system';

class AudioService {
  constructor() {
    this.recording = null;
    this.sound = null;
    this.setupAudio();
  }

  async setupAudio() {
    try {
      await Audio.requestPermissionsAsync();
      await Audio.setAudioModeAsync({
        allowsRecordingIOS: true,
        playsInSilentModeIOS: true,
      });
    } catch (error) {
      console.error('Erreur configuration audio:', error);
    }
  }

  // Démarrer l'enregistrement
  async startRecording() {
    try {
      if (this.recording) {
        await this.recording.stopAndUnloadAsync();
      }

      this.recording = new Audio.Recording();
      await this.recording.prepareToRecordAsync(
        Audio.RECORDING_OPTIONS_PRESET_HIGH_QUALITY
      );
      await this.recording.startAsync();
      
      return { success: true };
    } catch (error) {
      console.error('Erreur démarrage enregistrement:', error);
      return { success: false, message: error.message };
    }
  }

  // Arrêter l'enregistrement
  async stopRecording() {
    try {
      if (!this.recording) {
        return { success: false, message: 'Aucun enregistrement en cours' };
      }

      await this.recording.stopAndUnloadAsync();
      const uri = this.recording.getURI();
      const status = await this.recording.getStatusAsync();
      
      this.recording = null;
      
      return {
        success: true,
        uri: uri,
        duration: status.durationMillis,
      };
    } catch (error) {
      console.error('Erreur arrêt enregistrement:', error);
      return { success: false, message: error.message };
    }
  }

  // Lire un fichier audio
  async playSound(uri) {
    try {
      if (this.sound) {
        await this.sound.unloadAsync();
      }

      const { sound } = await Audio.Sound.createAsync({ uri });
      this.sound = sound;
      
      await this.sound.playAsync();
      return { success: true };
    } catch (error) {
      console.error('Erreur lecture audio:', error);
      return { success: false, message: error.message };
    }
  }

  // Pause/Resume du son
  async pauseSound() {
    try {
      if (this.sound) {
        await this.sound.pauseAsync();
      }
    } catch (error) {
      console.error('Erreur pause audio:', error);
    }
  }

  async resumeSound() {
    try {
      if (this.sound) {
        await this.sound.playAsync();
      }
    } catch (error) {
      console.error('Erreur resume audio:', error);
    }
  }

  // Arrêter le son
  async stopSound() {
    try {
      if (this.sound) {
        await this.sound.stopAsync();
        await this.sound.unloadAsync();
        this.sound = null;
      }
    } catch (error) {
      console.error('Erreur arrêt audio:', error);
    }
  }

  // Sauvegarder un enregistrement
  async saveRecording(tempUri, fileName) {
    try {
      const documentsDirectory = FileSystem.documentDirectory;
      const recordingsDirectory = `${documentsDirectory}recordings/`;
      
      // Créer le dossier recordings s'il n'existe pas
      const dirInfo = await FileSystem.getInfoAsync(recordingsDirectory);
      if (!dirInfo.exists) {
        await FileSystem.makeDirectoryAsync(recordingsDirectory);
      }

      const finalUri = `${recordingsDirectory}${fileName}.m4a`;
      await FileSystem.moveAsync({
        from: tempUri,
        to: finalUri,
      });

      return { success: true, uri: finalUri };
    } catch (error) {
      console.error('Erreur sauvegarde:', error);
      return { success: false, message: error.message };
    }
  }

  // Supprimer un enregistrement
  async deleteRecording(uri) {
    try {
      await FileSystem.deleteAsync(uri);
      return { success: true };
    } catch (error) {
      console.error('Erreur suppression:', error);
      return { success: false, message: error.message };
    }
  }

  // Nettoyer les ressources
  cleanup() {
    if (this.recording) {
      this.recording.stopAndUnloadAsync();
      this.recording = null;
    }
    if (this.sound) {
      this.sound.unloadAsync();
      this.sound = null;
    }
  }
}

export default new AudioService();