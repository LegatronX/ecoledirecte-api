# Solution iPhone pour EcoleDirecte

> Solution permettant d'accéder aux données EcoleDirecte depuis un iPhone et de les exporter automatiquement vers diverses applications (Calendrier, Rappels, etc.)

## Introduction

Cette solution utilise les **Raccourcis iOS** (Shortcuts) pour interagir avec l'API EcoleDirecte et exporter vos données vers les applications natives de votre iPhone.

## Fonctionnalités

- 🔐 **Connexion sécurisée** à EcoleDirecte
- 📅 **Export automatique** de l'emploi du temps vers le Calendrier iOS
- 📝 **Export des devoirs** vers l'app Rappels
- 🔄 **Automatisation** quotidienne possible
- 📊 **Consultation des notes** avec notifications

## Prérequis

- iPhone avec iOS 14.0 ou supérieur
- Application **Raccourcis** (installée par défaut)
- Identifiants EcoleDirecte valides

## Installation

### Étape 1 : Télécharger les raccourcis

Téléchargez les raccourcis en cliquant sur les liens ci-dessous depuis votre iPhone :

1. **[EcoleDirecte - Connexion](./shortcuts/connexion.md)** - Raccourci de base pour l'authentification
2. **[EcoleDirecte - Emploi du temps](./shortcuts/emploi-du-temps.md)** - Export vers le Calendrier
3. **[EcoleDirecte - Devoirs](./shortcuts/devoirs.md)** - Export vers Rappels

### Étape 2 : Configuration initiale

1. Ouvrez l'application **Raccourcis**
2. Exécutez le raccourci **"EcoleDirecte - Connexion"**
3. Entrez vos identifiants EcoleDirecte
4. Le token sera sauvegardé automatiquement

### Étape 3 : Automatisation (optionnel)

Pour synchroniser automatiquement vos données chaque jour :

1. Ouvrez **Raccourcis** > **Automatisation**
2. Appuyez sur **+** > **Créer une automatisation personnelle**
3. Sélectionnez **Heure de la journée**
4. Choisissez l'heure (ex: 7h00)
5. Ajoutez l'action **Exécuter le raccourci**
6. Sélectionnez **"EcoleDirecte - Emploi du temps"**

## Structure des fichiers

```
iOS/
├── README.md                    # Ce fichier
├── shortcuts/
│   ├── connexion.md            # Documentation raccourci connexion
│   ├── emploi-du-temps.md      # Documentation raccourci EDT
│   └── devoirs.md              # Documentation raccourci devoirs
├── scripts/
│   ├── icalendar-generator.js  # Générateur de fichiers iCal
│   └── api-client.js           # Client API pour Scriptable
└── examples/
    └── automation.md           # Exemples d'automatisation
```

## Utilisation avec Scriptable

Pour des fonctionnalités avancées, vous pouvez utiliser l'application [Scriptable](https://scriptable.app/) qui permet d'exécuter du JavaScript sur iPhone.

Voir le dossier `scripts/` pour les scripts disponibles.

## Dépannage

### Le token est expiré (erreur 525)
Exécutez à nouveau le raccourci de connexion pour obtenir un nouveau token.

### Erreur de double authentification (code 250)
Suivez les instructions du QCM comme décrit dans la [documentation API](../README.md#-concernant-la-connexion-qcm).

### Les événements ne s'affichent pas dans le Calendrier
Vérifiez que vous avez autorisé l'accès au Calendrier dans **Réglages** > **Confidentialité** > **Calendriers**.

## Contribution

Si vous souhaitez améliorer cette solution, n'hésitez pas à ouvrir une issue ou une pull request.

## Avertissement

Cette solution utilise l'API non officielle d'EcoleDirecte. Elle n'est pas affiliée à Aplim et peut cesser de fonctionner en cas de modification de l'API.
