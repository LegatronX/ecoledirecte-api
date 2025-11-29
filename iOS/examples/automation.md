# Exemples d'automatisation iOS

Ce document présente différentes façons d'automatiser la synchronisation de vos données EcoleDirecte sur iPhone.

## Table des matières

1. [Automatisations basiques](#automatisations-basiques)
2. [Automatisations avancées](#automatisations-avancées)
3. [Widgets](#widgets)
4. [Focus Modes](#focus-modes)
5. [Exemples complets](#exemples-complets)

---

## Automatisations basiques

### Synchronisation quotidienne le matin

Synchronisez automatiquement votre emploi du temps chaque matin au réveil.

**Configuration :**
1. Ouvrez **Raccourcis** > **Automatisation**
2. **+** > **Créer une automatisation personnelle**
3. **Heure de la journée** > **6h30** > **Tous les jours**
4. **Ajouter une action** > **Exécuter le raccourci** > **EcoleDirecte - Emploi du temps**
5. Désactivez "Demander avant d'exécuter"

### Synchronisation des devoirs le soir

Récupérez les nouveaux devoirs chaque soir pour préparer le lendemain.

**Configuration :**
1. **Heure de la journée** > **18h00** > **Tous les jours**
2. **Exécuter le raccourci** > **EcoleDirecte - Devoirs**

### Synchronisation le dimanche soir

Préparez votre semaine chaque dimanche.

**Configuration :**
1. **Heure de la journée** > **19h00** > **Dimanche**
2. Enchaîner les raccourcis :
   - EcoleDirecte - Connexion (pour renouveler le token)
   - EcoleDirecte - Emploi du temps
   - EcoleDirecte - Devoirs

---

## Automatisations avancées

### Synchronisation basée sur la localisation

Synchronisez quand vous quittez l'école.

**Configuration :**
1. **Lieu** > Sélectionnez votre école
2. **En partant**
3. Exécutez le raccourci de devoirs

### Synchronisation au démarrage de l'app Calendrier

**Configuration :**
1. **App** > **Calendrier**
2. **Est ouverte**
3. Exécutez le raccourci d'emploi du temps

### Notification intelligente des notes

Créez une automatisation qui vérifie les nouvelles notes.

```
[Exécuter le raccourci] EcoleDirecte - Notes

[Si] nouvelles notes trouvées
  [Afficher la notification]
    Titre: "Nouvelle note !"
    Corps: "[matière]: [note]/20"
    Son: Tri-tone
```

---

## Widgets

### Widget Scriptable pour les prochains cours

Créez un widget qui affiche vos prochains cours.

1. Installez [Scriptable](https://scriptable.app/)
2. Créez un nouveau script avec le code suivant :

```javascript
// Widget Prochains Cours EcoleDirecte
const EcoleDirecteClient = importModule("api-client");

async function createWidget() {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1a1a2e");
  
  const client = new EcoleDirecteClient();
  const hasCredentials = await client.loadCredentials();
  
  if (!hasCredentials) {
    const text = widget.addText("Non connecté");
    text.textColor = Color.white();
    return widget;
  }
  
  try {
    const today = new Date().toISOString().split('T')[0];
    const schedule = await client.getSchedule(today, today);
    
    // Titre
    const title = widget.addText("📚 Aujourd'hui");
    title.font = Font.boldSystemFont(16);
    title.textColor = Color.white();
    
    widget.addSpacer(8);
    
    // Filtrer les cours à venir
    const now = new Date();
    const upcomingCourses = schedule
      .filter(c => new Date(c.start_date.replace(' ', 'T')) > now)
      .slice(0, 3);
    
    if (upcomingCourses.length === 0) {
      const text = widget.addText("Pas de cours à venir");
      text.textColor = Color.gray();
    } else {
      for (const cours of upcomingCourses) {
        const row = widget.addStack();
        row.layoutHorizontally();
        
        // Heure
        const time = cours.start_date.split(' ')[1];
        const timeText = row.addText(time);
        timeText.font = Font.monospacedSystemFont(12);
        timeText.textColor = new Color("#00d4ff");
        
        row.addSpacer(8);
        
        // Matière
        const subject = row.addText(cours.text);
        subject.font = Font.systemFont(12);
        subject.textColor = Color.white();
        subject.lineLimit = 1;
        
        widget.addSpacer(4);
      }
    }
    
  } catch (error) {
    const text = widget.addText("Erreur de connexion");
    text.textColor = Color.red();
  }
  
  return widget;
}

const widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}

Script.complete();
```

3. Ajoutez un widget Scriptable sur votre écran d'accueil
4. Sélectionnez ce script

### Widget des devoirs à venir

```javascript
// Widget Devoirs EcoleDirecte
const EcoleDirecteClient = importModule("api-client");

async function createWidget() {
  const widget = new ListWidget();
  widget.backgroundColor = new Color("#1a1a2e");
  
  const client = new EcoleDirecteClient();
  const hasCredentials = await client.loadCredentials();
  
  if (!hasCredentials) {
    const text = widget.addText("Non connecté");
    text.textColor = Color.white();
    return widget;
  }
  
  try {
    const homework = await client.getHomework();
    
    // Titre
    const title = widget.addText("📝 Devoirs");
    title.font = Font.boldSystemFont(16);
    title.textColor = Color.white();
    
    widget.addSpacer(8);
    
    // Obtenir les 5 prochains devoirs
    const allHomework = [];
    for (const [date, devoirs] of Object.entries(homework)) {
      for (const devoir of devoirs) {
        if (!devoir.effectue) {
          allHomework.push({ ...devoir, date });
        }
      }
    }
    
    // Trier par date
    allHomework.sort((a, b) => a.date.localeCompare(b.date));
    
    const upcoming = allHomework.slice(0, 4);
    
    if (upcoming.length === 0) {
      const text = widget.addText("Aucun devoir à faire 🎉");
      text.textColor = Color.green();
    } else {
      for (const devoir of upcoming) {
        const row = widget.addStack();
        row.layoutHorizontally();
        
        // Date courte
        const dateObj = new Date(devoir.date);
        const dayName = dateObj.toLocaleDateString('fr-FR', { weekday: 'short' });
        const dateText = row.addText(dayName);
        dateText.font = Font.monospacedSystemFont(10);
        dateText.textColor = new Color("#ffaa00");
        
        row.addSpacer(6);
        
        // Icône si interrogation
        if (devoir.interrogation) {
          const icon = row.addText("⚠️");
          row.addSpacer(2);
        }
        
        // Matière
        const subject = row.addText(devoir.matiere);
        subject.font = Font.systemFont(11);
        subject.textColor = Color.white();
        subject.lineLimit = 1;
        
        widget.addSpacer(3);
      }
    }
    
  } catch (error) {
    const text = widget.addText("Erreur");
    text.textColor = Color.red();
  }
  
  return widget;
}

const widget = await createWidget();

if (config.runsInWidget) {
  Script.setWidget(widget);
} else {
  widget.presentSmall();
}

Script.complete();
```

---

## Focus Modes

### Mode École

Configurez un mode Focus "École" qui synchronise automatiquement vos données.

1. **Réglages** > **Concentration** > **+** > **Personnalisé**
2. Nommez-le "École"
3. Dans **Automatisation de la concentration** :
   - Ajoutez un horaire (ex: Lun-Ven, 8h-17h)
   - Ajoutez un lieu (votre école)

4. Dans **Raccourcis** > **Automatisation** :
   - **Quand** > **Mode École activé**
   - **Exécuter le raccourci** > EcoleDirecte - Emploi du temps

### Mode Devoirs

1. Créez un mode Focus "Devoirs"
2. À l'activation, synchronisez les devoirs et affichez la liste

---

## Exemples complets

### Routine du matin complète

```
Nom: Routine École du Matin
Déclencheur: 6h30 en semaine

Actions:
1. [Exécuter le raccourci] EcoleDirecte - Connexion
   # Renouvelle le token si nécessaire

2. [Exécuter le raccourci] EcoleDirecte - Emploi du temps
   # Synchronise le calendrier

3. [Obtenir les événements du calendrier]
   Calendrier: EcoleDirecte
   Date: Aujourd'hui
   → Variable: coursDuJour

4. [Compter] coursDuJour
   → Variable: nombreCours

5. [Si] nombreCours = 0
   [Alors]
     [Afficher la notification]
       Titre: "Pas de cours aujourd'hui 🎉"
   [Sinon]
     [Obtenir l'élément de la liste]
       Premier élément de coursDuJour
       → Variable: premierCours
     
     [Afficher la notification]
       Titre: "Emploi du temps synchronisé"
       Corps: "Premier cours: [premierCours] - [nombreCours] cours aujourd'hui"
```

### Alerte nouvelles notes

```
Nom: Vérification Notes
Déclencheur: Toutes les 2 heures (8h-18h)

Actions:
1. [Obtenir le fichier]
   Chemin: Raccourcis/ecoledirecte_last_grades.json
   → Variable: anciensResultats

2. [Exécuter le raccourci] EcoleDirecte - Notes
   → Variable: nouveauxResultats

3. [Comparer]
   anciensResultats ≠ nouveauxResultats
   
4. [Si] différent
   [Alors]
     # Trouver les nouvelles notes
     [Afficher la notification]
       Titre: "🎓 Nouvelle note !"
       Corps: "Ouvrez EcoleDirecte pour voir"
       Son: Tri-tone
     
     [Enregistrer le fichier]
       Nom: ecoledirecte_last_grades.json
       Contenu: nouveauxResultats
```

### Export iCal hebdomadaire

```
Nom: Export iCal Hebdomadaire
Déclencheur: Dimanche 20h

Actions:
1. [Exécuter le script Scriptable]
   Script: icalendar-generator.js

2. [Obtenir le fichier]
   Chemin: iCloud Drive/Scriptable/ecoledirecte_emploidutemps.ics
   → Variable: fichierICS

3. [Partager]
   Fichier: fichierICS
   # Vous pouvez l'envoyer par mail, AirDrop, etc.
```

---

## Conseils

### Performance
- Évitez de synchroniser trop fréquemment (max 4-5 fois par jour)
- Le token est valide ~24h, pas besoin de se reconnecter souvent

### Batterie
- Utilisez les déclencheurs "intelligents" (lieu, heure) plutôt que les vérifications périodiques
- Désactivez les automatisations pendant les vacances

### Sécurité
- Ne partagez jamais vos raccourcis contenant vos identifiants
- Le token est stocké localement et temporaire

### Dépannage
- Si une automatisation échoue, vérifiez d'abord la connexion
- Les erreurs 525 indiquent un token expiré → relancez la connexion
