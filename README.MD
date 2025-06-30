# RAVE App - Transfert de Timbre Audio

Application mobile React Native permettant de transformer des enregistrements audio en utilisant des modèles de réseaux de neurones RAVE  développés à l'IRCAM.

## Concept

Cette application permet de réaliser un transfert de timbre audio.

### Modèles disponibles
- **Jazz** - Transfert vers des sonorités jazz
- **Darbouka** - Transfert vers des percussions darbouka
- **Parole** - Transfert vers de la voix humaine
- **Chats** - Transfert vers des miaulements de chat
- **Chiens** - Transfert vers des aboiements de chien

## Architecture

L'application est composée de :
- **Client React Native** : Interface mobile pour l'enregistrement et la lecture
- **Serveur Python Flask** : Traitement des modèles RAVE via ONNX
- **Redux Store** : Gestion d'état globale de l'application

## Fonctionnalités

### Vue Home
- Configuration de la connexion au serveur (IP et port)
- Test de connexion avec notification utilisateur

### Vue Record
- Enregistrement audio avec le microphone
- Lecture/pause des enregistrements
- Sauvegarde nommée des clips audio
- Gestion des enregistrements (liste, suppression, réécoute)

### Vue RAVE
- Sélection de source audio :
  - Sons par défaut (assets de l'app)
  - Enregistrements personnels
  - Fichiers du téléphone
- Envoi au serveur pour transformation
- Téléchargement et lecture du résultat transformé
- Comparaison audio original/transformé

## Installation et Démarrage

### Prérequis
- Node.js (v16 ou supérieur)
- npm ou yarn
- Expo CLI
- Python 3.8+ avec Anaconda/Miniconda
- ffmpeg

### 1. Installation du Serveur Python

```bash
# Cloner le repository du serveur
git clone https://github.com/gnvIRCAM/RAVE-ONNX-Server.git
cd RAVE-ONNX-Server

# Activer l'environnement conda
source path/to/miniconda3/bin/activate
conda activate your_env_name

# Installer les dépendances
pip install -r requirements.txt

# Installer ffmpeg
# Sur Ubuntu/Debian :
sudo apt-get install ffmpeg
# Sur macOS :
brew install ffmpeg
# Sur Windows : suivre https://ffmpeg.org/download.html
```

### 2. Démarrage du Serveur

```bash
cd RAVE-ONNX-Server
python server.py
```

Le serveur démarre sur `http://localhost:5000` (l'IP et le port s'affichent dans le terminal).

### 3. Installation de l'App React Native

```bash
# Cloner le repository de l'app
git clone https://github.com/Oxydase/RAVEApp.git
cd RAVEApp

# Installer les dépendances
npm install
# ou
yarn install
```

### 4. Configuration

1. Modifier l'adresse IP du serveur dans l'app si nécessaire
2. S'assurer que le téléphone et le serveur sont sur le même réseau

### 5. Démarrage de l'App

```bash
# Démarrer le serveur de développement Expo
npx expo start

# Scanner le QR code avec l'app Expo Go
# ou utiliser un émulateur Android/iOS
```

## API du Serveur

Le serveur Flask expose les endpoints suivants :

| Endpoint | Méthode | Description |
|----------|---------|-------------|
| `/` | GET | Test de connexion |
| `/upload` | POST | Upload d'un fichier audio (.wav, .m4a) |
| `/download` | GET | Téléchargement du fichier transformé |
| `/getmodels` | GET | Liste des modèles disponibles (JSON) |
| `/selectModel/<modelname>` | GET | Sélection du modèle à utiliser |

## Technologies Utilisées

### Frontend (React Native)
- **React Navigation** - Navigation par tabs avec swipe
- **Redux & Redux Persist** - Gestion d'état et persistance
- **Expo Audio** - Enregistrement et lecture audio
- **Expo FileSystem** - Gestion des fichiers
- **React Native Tab View** - Interface à onglets



## Structure du Projet

```
RAVEApp/
├── src/
│   ├── screens/        # Vues principales (Home, Record, RAVE)
│   ├── store/          # Configuration Redux
│   └── assets/         # Sons par défaut
├── package.json
└── README.md
```

## Configuration Redux

L'application utilise Redux pour :
- Gestion de la connexion serveur
- État des enregistrements audio
- Paramètres de l'application
- Persistance des données avec Redux Persist

## Déploiement

L'application est publiée sur Expo pour être accessible via QR Code :

```bash
npx expo publish
```