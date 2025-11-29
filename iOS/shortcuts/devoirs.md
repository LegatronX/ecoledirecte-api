# Raccourci Devoirs vers Rappels

Ce raccourci permet de récupérer les devoirs à faire depuis EcoleDirecte et de les exporter vers l'application Rappels iOS.

## Fonctionnement

1. Lecture du token sauvegardé
2. Récupération du cahier de texte via l'API
3. Création de rappels avec dates d'échéance

## Prérequis

- Avoir exécuté le raccourci de connexion au préalable
- Avoir autorisé l'accès aux Rappels dans les réglages

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

4. [Obtenir le contenu de l'URL]
   URL: https://api.ecoledirecte.com/v3/Eleves/[eleveId]/cahierdetexte.awp?verbe=get
   Méthode: POST
   En-têtes:
     User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15
     X-Token: [token]
     Content-Type: application/x-www-form-urlencoded
   Corps: data={}
   → Variable: reponse

5. [Obtenir les valeurs du dictionnaire]
   Clé: code
   → Variable: responseCode

6. [Si] responseCode ≠ 200
   [Alors]
     [Afficher l'alerte] "Erreur de connexion. Veuillez vous reconnecter."
     [Arrêter le raccourci]

7. [Obtenir les valeurs du dictionnaire]
   Clé: data
   → Variable: devoirsParDate

8. [Obtenir les clés du dictionnaire] devoirsParDate
   → Variable: dates

9. [Répéter avec chaque élément de] dates
   → Variable répétition: dateDevoir
   
   [Obtenir les valeurs du dictionnaire]
     Clé: [dateDevoir]
     → Variable: devoirsDuJour
   
   [Répéter avec chaque élément de] devoirsDuJour
     → Variable répétition: devoir
     
     [Obtenir les valeurs du dictionnaire]
       Clé: matiere → matiere
       Clé: idDevoir → idDevoir
       Clé: effectue → estEffectue
       Clé: interrogation → estInterrogation
     
     [Si] estEffectue = false
     [Alors]
       # Récupérer les détails du devoir
       [Obtenir le contenu de l'URL]
         URL: https://api.ecoledirecte.com/v3/Eleves/[eleveId]/cahierdetexte/[dateDevoir].awp?verbe=get
         Méthode: POST
         En-têtes:
           X-Token: [token]
         Corps: data={}
         → Variable: detailsJour
       
       [Obtenir les valeurs du dictionnaire]
         Chemin: data.matieres
         → Variable: matieres
       
       # Trouver le bon devoir
       [Répéter avec chaque élément de] matieres
         [Obtenir les valeurs du dictionnaire]
           Clé: aFaire.idDevoir
           → Variable: idDevoirDetail
         
         [Si] idDevoirDetail = idDevoir
           [Obtenir les valeurs du dictionnaire]
             Clé: aFaire.contenu → contenuB64
           
           [Décoder en Base64] contenuB64
             → Variable: contenuHTML
           
           # Nettoyer le HTML
           [Remplacer le texte]
             Texte: <[^>]+>
             Remplacement: (vide)
             Expression régulière: Oui
             Dans: contenuHTML
             → Variable: contenuTexte
           
           [Date] dateDevoir
             Format: yyyy-MM-dd
             → Variable: dateEcheance
           
           # Ajouter icône si interrogation
           [Si] estInterrogation = true
             [Texte] "📝 [matiere] - INTERROGATION"
               → Variable: titreRappel
           [Sinon]
             [Texte] "📚 [matiere]"
               → Variable: titreRappel
           
           [Créer un rappel]
             Titre: [titreRappel]
             Notes: [contenuTexte]
             Date d'échéance: [dateEcheance]
             Heure de rappel: 18:00
             Liste: EcoleDirecte
   
   [Fin des répétitions]

10. [Afficher la notification]
    "Devoirs synchronisés !"
```

## Configuration de la liste de rappels

Pour une meilleure organisation, créez une liste dédiée :

1. Ouvrez l'app **Rappels**
2. En bas, appuyez sur **Ajouter une liste**
3. Nommez-la "EcoleDirecte"
4. Choisissez une couleur et une icône

## Marquer les devoirs comme faits

Ce raccourci supplémentaire permet de synchroniser les devoirs effectués :

```
1. [Obtenir les rappels]
   Liste: EcoleDirecte
   Terminés: Non
   → Variable: rappelsNonTermines

2. [Obtenir les rappels]
   Liste: EcoleDirecte
   Terminés: Oui
   Depuis: [7 derniers jours]
   → Variable: rappelsTermines

3. [Répéter avec chaque élément de] rappelsTermines
   # Extraire l'idDevoir depuis les notes ou le titre
   # Envoyer la requête PUT pour marquer comme effectué
   
   [Obtenir le contenu de l'URL]
     URL: https://api.ecoledirecte.com/v3/Eleves/[eleveId]/cahierdetexte.awp?verbe=put
     Méthode: POST
     En-têtes:
       X-Token: [token]
     Corps: data={"idDevoirsEffectues":[[idDevoir]],"idDevoirsNonEffectues":[]}
```

## Éviter les doublons

Avant de créer un rappel, vérifiez s'il existe déjà :

```
[Rechercher des rappels]
  Liste: EcoleDirecte
  Titre contient: [matiere]
  Date d'échéance: [dateEcheance]
  → Variable: rappelsExistants

[Si] Nombre d'éléments dans rappelsExistants = 0
  [Créer un rappel]
  ...
```

## Priorité des rappels

Configurez la priorité selon le type de devoir :

```
[Si] estInterrogation = true
  Priorité: Haute (!!!)
[Sinon Si] matiere contient "MATH"
  Priorité: Moyenne (!!)
[Sinon]
  Priorité: Aucune
```

## Sous-tâches pour les devoirs longs

Pour les devoirs avec plusieurs éléments, créez des sous-tâches :

```
# Si le contenu contient des tirets ou numéros
[Si] contenuTexte correspond à "^[•\-\d]"
  [Diviser le texte] par retour à la ligne
    → Variable: lignes
  
  [Créer un rappel]
    Titre: [titreRappel]
    Date: [dateEcheance]
  
  [Répéter avec chaque élément de] lignes
    [Ajouter au rappel]
      Sous-tâche: [ligne]
```

## Widgets recommandés

Ajoutez un widget Rappels sur votre écran d'accueil pour voir vos devoirs :

1. Appui long sur l'écran d'accueil
2. Appuyez sur **+** en haut
3. Cherchez **Rappels**
4. Choisissez la taille moyenne ou grande
5. Configurez-le pour afficher la liste "EcoleDirecte"

## Exemple de résultat

| Rappel | Date | Priorité |
|--------|------|----------|
| 📝 MATHEMATIQUES - INTERROGATION | Lun 15 | Haute |
| 📚 FRANÇAIS | Mar 16 | Normale |
| 📚 HISTOIRE-GEO | Mer 17 | Normale |

## Automatisation recommandée

- **Tous les soirs à 17h** : synchroniser les nouveaux devoirs
- **Chaque dimanche à 19h** : vue d'ensemble de la semaine
- **Au départ du WiFi école** : mise à jour automatique
