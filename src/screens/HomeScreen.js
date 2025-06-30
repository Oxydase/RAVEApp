import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Alert,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
} from 'react-native';
import { useDispatch, useSelector } from 'react-redux';
import { Ionicons } from '@expo/vector-icons';

import {
  setServerConfig,
  setConnectionStatus,
  setAvailableModels,
  setSelectedModel,
  setLoading,
  setError,
} from '../store/slices/serverSlice';
import serverService from '../services/serverService';

const HomeScreen = () => {
  const dispatch = useDispatch();
  const { 
    ipAddress, 
    port, 
    isConnected, 
    availableModels, 
    selectedModel,
    isLoading,
    error 
  } = useSelector((state) => state.server);

  // États locaux pour stocker temporairement les valeurs IP et port dans les champs de saisie
  const [localIpAddress, setLocalIpAddress] = useState(ipAddress);
  const [localPort, setLocalPort] = useState(port);

  useEffect(() => {
    // Au montage du composant, si on a une config serveur sauvegardée mais pas encore connecté,
    // essayer automatiquement d'établir la connexion au serveur
    if (ipAddress && port && !isConnected) {
      handleTestConnection();
    }
  }, []);

  // Fonction pour tester la connexion au serveur avec l'adresse IP et le port fournis
  const handleTestConnection = async () => {
    // Validation des champs IP et port
    if (!localIpAddress.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer une adresse IP');
      return;
    }

    if (!localPort.trim()) {
      Alert.alert('Erreur', 'Veuillez entrer un port');
      return;
    }

    // Affiche le loader et réinitialise les erreurs
    dispatch(setLoading(true));
    dispatch(setError(null));

    // Configure le service avec les paramètres IP et port entrés
    serverService.setServerConfig(localIpAddress.trim(), localPort.trim());

    try {
      // Teste la connexion au serveur via le service
      const connectionResult = await serverService.testConnection();
      
      if (connectionResult.success) {
        // Si connexion réussie, sauvegarde la configuration dans le store Redux
        dispatch(setServerConfig({
          ipAddress: localIpAddress.trim(),
          port: localPort.trim(),
        }));
        
        // Met à jour le statut de connexion
        dispatch(setConnectionStatus(true));
        
        // Récupère la liste des modèles disponibles depuis le serveur
        const modelsResult = await serverService.getModels();
        
        if (modelsResult.success) {
          // Stocke les modèles dans le store Redux
          dispatch(setAvailableModels(modelsResult.data));
          // Sélectionne automatiquement le premier modèle de la liste
          if (modelsResult.data.length > 0) {
            const firstModel = modelsResult.data[0];
            dispatch(setSelectedModel(firstModel));
            await serverService.selectModel(firstModel);
          }
        }
        
        Alert.alert('Succès', 'Connexion établie avec le serveur !');
      } else {
        // En cas d'échec de connexion, met à jour le store et affiche une alerte
        dispatch(setConnectionStatus(false));
        dispatch(setError(connectionResult.message));
        Alert.alert('Erreur de connexion', connectionResult.message);
      }
    } catch (error) {
      // Gestion des erreurs réseau ou autres exceptions
      dispatch(setConnectionStatus(false));
      dispatch(setError(error.message));
      Alert.alert('Erreur', 'Impossible de se connecter au serveur');
    } finally {
      // Cache le loader, quelle que soit l'issue
      dispatch(setLoading(false));
    }
  };

  // Fonction pour changer de modèle sélectionné sur le serveur
  const handleModelSelection = async (modelName) => {
    if (modelName === selectedModel) return; // Si déjà sélectionné, ne rien faire

    dispatch(setLoading(true));
    
    try {
      // Appelle le service pour changer le modèle côté serveur
      const result = await serverService.selectModel(modelName);
      
      if (result.success) {
        // Met à jour le modèle sélectionné dans le store
        dispatch(setSelectedModel(modelName));
        Alert.alert('Succès', `Modèle "${modelName}" sélectionné`);
      } else {
        Alert.alert('Erreur', 'Impossible de sélectionner le modèle');
      }
    } catch (error) {
      Alert.alert('Erreur', 'Erreur lors de la sélection du modèle');
    } finally {
      dispatch(setLoading(false));
    }
  };

  // Rend la liste des modèles disponibles sous forme de boutons sélectionnables
  const renderModelSelector = () => {
    if (!isConnected || !Array.isArray(availableModels) || availableModels.length === 0) {
      return null; // Ne rien afficher si pas connecté ou pas de modèles
    }

    return (
      <View style={styles.modelSection}>
        <Text style={styles.sectionTitle}>Modèles disponibles :</Text>
        {availableModels.map((model) => (
          <TouchableOpacity
            key={model}
            style={[
              styles.modelButton,
              selectedModel === model && styles.selectedModelButton
            ]}
            onPress={() => handleModelSelection(model)}
            disabled={isLoading}
          >
            <Text
              style={[
                styles.modelButtonText,
                selectedModel === model && styles.selectedModelButtonText
              ]}
            >
              {model}
            </Text>
            {selectedModel === model && (
              <Ionicons name="checkmark-circle" size={20} color="#fff" />
            )}
          </TouchableOpacity>
        ))}
      </View>
    );
  };

  // Composant principal retourné, affichant la configuration, le statut et les modèles
  return (
    <KeyboardAvoidingView 
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
      <ScrollView contentContainerStyle={styles.scrollContent}>
        <View style={styles.header}>
          <Ionicons 
            name="server-outline" 
            size={60} 
            color={isConnected ? "#4CAF50" : "#2196F3"} 
          />
          <Text style={styles.title}>Configuration Serveur</Text>
          <Text style={[
            styles.statusText,
            { color: isConnected ? "#4CAF50" : "#F44336" }
          ]}>
            {isConnected ? "🟢 Connecté" : "🔴 Déconnecté"}
          </Text>
        </View>

        <View style={styles.form}>
          <View style={styles.inputContainer}>
            <Text style={styles.label}>Adresse IP du serveur :</Text>
            <TextInput
              style={styles.input}
              value={localIpAddress}
              onChangeText={setLocalIpAddress}
              placeholder="192.168.1.100"
              placeholderTextColor="#999"
              keyboardType="default"
              autoCapitalize="none"
              autoCorrect={false}
            />
          </View>

          <View style={styles.inputContainer}>
            <Text style={styles.label}>Port :</Text>
            <TextInput
              style={styles.input}
              value={localPort}
              onChangeText={setLocalPort}
              placeholder="5000"
              placeholderTextColor="#999"
              keyboardType="numeric"
            />
          </View>

          <TouchableOpacity
            style={[styles.connectButton, isLoading && styles.disabledButton]}
            onPress={handleTestConnection}
            disabled={isLoading}
          >
            {isLoading ? (
              <ActivityIndicator color="#fff" size="small" />
            ) : (
              <>
                <Ionicons name="wifi-outline" size={20} color="#fff" />
                <Text style={styles.connectButtonText}>
                  {isConnected ? "Reconnecter" : "Tester la connexion"}
                </Text>
              </>
            )}
          </TouchableOpacity>

          {error && (
            <View style={styles.errorContainer}>
              <Ionicons name="alert-circle-outline" size={20} color="#F44336" />
              <Text style={styles.errorText}>{error}</Text>
            </View>
          )}
        </View>

        {/* Affiche le sélecteur de modèles si connecté */}
        {renderModelSelector()}

        {/* Message d'information affiché uniquement si connecté */}
        {isConnected && (
          <View style={styles.infoContainer}>
            <Ionicons name="information-circle-outline" size={24} color="#2196F3" />
            <Text style={styles.infoText}>
              Serveur connecté ! Vous pouvez maintenant utiliser les fonctions d'enregistrement et de transfert RAVE.
            </Text>
          </View>
        )}
      </ScrollView>
    </KeyboardAvoidingView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  scrollContent: {
    flexGrow: 1,
    padding: 20,
  },
  header: {
    alignItems: 'center',
    marginBottom: 30,
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
    color: '#333',
    marginTop: 10,
    marginBottom: 5,
  },
  statusText: {
    fontSize: 16,
    fontWeight: '600',
  },
  form: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  inputContainer: {
    marginBottom: 20,
  },
  label: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  input: {
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 16,
    backgroundColor: '#f9f9f9',
  },
  connectButton: {
    backgroundColor: '#2196F3',
    borderRadius: 8,
    padding: 15,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 10,
  },
  disabledButton: {
    backgroundColor: '#ccc',
  },
  connectButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
    marginLeft: 8,
  },
  errorContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
    backgroundColor: '#ffebee',
    borderRadius: 5,
  },
  errorText: {
    color: '#F44336',
    marginLeft: 8,
    flex: 1,
  },
  modelSection: {
    backgroundColor: '#fff',
    borderRadius: 10,
    padding: 20,
    marginBottom: 20,
    shadowColor: '#000',
    shadowOffset: {
      width: 0,
      height: 2,
    },
    shadowOpacity: 0.1,
    shadowRadius: 3.84,
    elevation: 5,
  },
  sectionTitle: {
    fontSize: 18,
    fontWeight: 'bold',
    color: '#333',
    marginBottom: 15,
  },
  modelButton: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 12,
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    marginBottom: 10,
    backgroundColor: '#f9f9f9',
  },
  selectedModelButton: {
    backgroundColor: '#2196F3',
    borderColor: '#2196F3',
  },
  modelButtonText: {
    fontSize: 16,
    color: '#333',
  },
  selectedModelButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  infoContainer: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: '#e3f2fd',
    padding: 15,
    borderRadius: 8,
    marginTop: 10,
  },
  infoText: {
    color: '#1976d2',
    marginLeft: 10,
    flex: 1,
    lineHeight: 20,
  },
});

export default HomeScreen;