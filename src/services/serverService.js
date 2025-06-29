class ServerService {
  constructor() {
    this.baseUrl = '';
  }

  setServerConfig(ipAddress, port) {
    this.baseUrl = `http://${ipAddress}:${port}`;
  }

  // Test de connexion au serveur
  async testConnection() {
    try {
      const response = await fetch(`${this.baseUrl}/`, {
        method: 'GET',
        timeout: 5000,
      });
      
      if (response.ok) {
        const text = await response.text();
        return { success: true, message: text };
      } else {
        throw new Error(`Erreur ${response.status}`);
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Récupérer la liste des modèles disponibles
  async getModels() {
    try {
      const response = await fetch(`${this.baseUrl}/getmodels`);
      if (response.ok) {
        const models = await response.json();
        return { success: true, data: models };
      } else {
        throw new Error(`Erreur ${response.status}`);
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Sélectionner un modèle
  async selectModel(modelName) {
    try {
      const response = await fetch(`${this.baseUrl}/selectModel/${modelName}`, {
        method: 'GET',
      });
      
      if (response.ok) {
        return { success: true };
      } else {
        throw new Error(`Erreur ${response.status}`);
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Upload d'un fichier audio
  async uploadAudio(fileUri, fileName) {
    try {
      const formData = new FormData();
      formData.append('file', {
        uri: fileUri,
        type: 'audio/wav', // ou 'audio/m4a'
        name: fileName,
      });

      const response = await fetch(`${this.baseUrl}/upload`, {
        method: 'POST',
        body: formData,
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      if (response.ok) {
        const result = await response.text();
        return { success: true, message: result };
      } else {
        throw new Error(`Erreur upload ${response.status}`);
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  // Télécharger le fichier transformé
  async downloadTransformedAudio() {
    try {
      const response = await fetch(`${this.baseUrl}/download`);
      
      if (response.ok) {
        const blob = await response.blob();
        return { success: true, data: blob };
      } else {
        throw new Error(`Erreur download ${response.status}`);
      }
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

export default new ServerService();