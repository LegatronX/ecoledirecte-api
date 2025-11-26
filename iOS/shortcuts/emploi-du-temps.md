# Raccourci Emploi du Temps vers Calendrier

Ce raccourci permet de récupérer l'emploi du temps depuis EcoleDirecte et de l'exporter vers le Calendrier iOS.

## Fonctionnement

1. Lecture du token sauvegardé
2. Récupération de l'emploi du temps via l'API
3. Création d'événements dans le Calendrier iOS

## Prérequis

- Avoir exécuté le raccourci de connexion au préalable
- Avoir autorisé l'accès au Calendrier dans les réglages

## Instructions de création manuelle

### Actions du raccourci

```
1. [Obtenir le fichier]
   Chemin: Raccourcis/ecoledirecte_credentials.json
   → Variable: credentials

2. [Obtenir les valeurs du dictionnaire]
   Clé: token
   → Variable: token

3. [Obtenir les valeurs du dictionnaire]
   Clé: eleveId
   → Variable: eleveId

4. [Date] Date actuelle
   → Variable: aujourdhui

5. [Ajuster la date] Ajouter 7 jours à aujourdhui
   → Variable: dansSeptJours

6. [Formater la date] aujourdhui
   Format: yyyy-MM-dd
   → Variable: dateDebut

7. [Formater la date] dansSeptJours
   Format: yyyy-MM-dd
   → Variable: dateFin

8. [Texte]
   data={"dateDebut":"[dateDebut]","dateFin":"[dateFin]","avecTrous":false}
   → Variable: bodyData

9. [Obtenir le contenu de l'URL]
   URL: https://api.ecoledirecte.com/v3/E/[eleveId]/emploidutemps.awp?verbe=get
   Méthode: POST
   En-têtes:
     User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15
     X-Token: [token]
     Content-Type: application/x-www-form-urlencoded
   Corps: [bodyData]
   → Variable: reponse

10. [Obtenir les valeurs du dictionnaire]
    Clé: code
    → Variable: responseCode

11. [Si] responseCode ≠ 200
    [Alors]
      [Afficher l'alerte] "Erreur de connexion. Veuillez vous reconnecter."
      [Arrêter le raccourci]

12. [Obtenir les valeurs du dictionnaire]
    Clé: data
    → Variable: cours

13. [Répéter avec chaque élément de] cours
    
    [Obtenir les valeurs du dictionnaire]
      Clé: text → matiere
      Clé: start_date → dateDebut
      Clé: end_date → dateFin
      Clé: salle → salle
      Clé: prof → professeur
      Clé: isAnnule → estAnnule
    
    [Si] estAnnule = false
    [Alors]
      [Date] dateDebut
        Format: yyyy-MM-dd HH:mm
        → Variable: debutCours
      
      [Date] dateFin
        Format: yyyy-MM-dd HH:mm
        → Variable: finCours
      
      [Texte] 
        "Salle: [salle]\nProfesseur: [professeur]"
        → Variable: notes
      
      [Créer un événement]
        Titre: [matiere]
        Emplacement: [salle]
        Date de début: [debutCours]
        Date de fin: [finCours]
        Notes: [notes]
        Calendrier: EcoleDirecte (ou votre calendrier choisi)
    
    [Fin de la répétition]

14. [Afficher la notification] 
    "Emploi du temps synchronisé !"
```

## Configuration du calendrier

Pour éviter les doublons, il est recommandé de créer un calendrier dédié :

1. Ouvrez l'app **Calendrier**
2. Appuyez sur **Calendriers** en bas
3. Appuyez sur **Ajouter un calendrier**
4. Nommez-le "EcoleDirecte"
5. Choisissez une couleur distinctive

Dans le raccourci, sélectionnez ce calendrier pour l'action "Créer un événement".

## Éviter les doublons

Pour éviter de créer des doublons lors de synchronisations répétées, ajoutez cette vérification :

```
1. [Rechercher des événements calendrier]
   Titre contient: [matiere]
   Date de début: [debutCours]
   Calendrier: EcoleDirecte
   → Variable: evenementsExistants

2. [Si] Nombre d'éléments dans evenementsExistants = 0
   [Alors]
     [Créer un événement]
     ...
```

## Personnalisation des couleurs

Vous pouvez modifier la couleur des événements selon la matière :

```
[Si] matiere contient "MATH"
  [Alors] couleur = Bleu
[Si] matiere contient "FRANÇAIS" ou matiere contient "FRANC"
  [Alors] couleur = Rouge
[Si] matiere contient "ANGLAIS"
  [Alors] couleur = Vert
...
```

## Gestion des cours annulés

Les cours annulés (`isAnnule = true`) peuvent être :

1. **Ignorés** (comportement par défaut)
2. **Affichés barrés** dans le calendrier
3. **Créés avec un préfixe** "[ANNULÉ]"

Pour la 3ème option, modifiez le titre :
```
[Si] estAnnule = true
  [Texte] "[ANNULÉ] [matiere]"
    → Variable: titreFinal
[Sinon]
  → Variable: titreFinal = matiere
```

## Exemple de résultat

Après exécution, votre calendrier affichera :

| Événement | Horaire | Lieu |
|-----------|---------|------|
| 📚 MATHEMATIQUES | 08:00 - 09:00 | Salle 12 |
| 🇬🇧 ANGLAIS LV1 | 09:00 - 10:00 | Salle 24 |
| 💻 NUMERIQUE SC.INFORM. | 10:15 - 11:15 | Salle Info |

## Automatisation recommandée

Configurez une automatisation pour exécuter ce raccourci :

- **Chaque matin à 6h30** : pour avoir l'EDT à jour au réveil
- **Chaque dimanche à 18h** : pour préparer la semaine
- **À chaque connexion WiFi maison** : synchronisation automatique
