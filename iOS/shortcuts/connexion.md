# Raccourci de Connexion EcoleDirecte

Ce raccourci permet de se connecter à l'API EcoleDirecte et de sauvegarder le token d'authentification pour les autres raccourcis.

## Fonctionnement

1. Récupération du cookie GTK (requis depuis le 24/03/2025)
2. Envoi des identifiants à l'API
3. Sauvegarde du token dans les fichiers Raccourcis

## Instructions de création manuelle

### Actions du raccourci

```
1. [Demander une entrée] - Type: Texte
   → Variable: identifiant
   Invite: "Entrez votre identifiant EcoleDirecte"

2. [Demander une entrée] - Type: Texte
   → Variable: motdepasse
   Invite: "Entrez votre mot de passe"

3. [Obtenir le contenu de l'URL]
   URL: https://api.ecoledirecte.com/v3/login.awp?gtk=1&v=4.75.0
   Méthode: GET
   En-têtes:
     User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15

4. [Obtenir les valeurs du dictionnaire]
   Clé: GTK (depuis les cookies de la réponse)
   → Variable: gtkCookie

5. [Obtenir le contenu de l'URL]
   URL: https://api.ecoledirecte.com/v3/login.awp?v=4.75.0
   Méthode: POST
   En-têtes:
     User-Agent: Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15
     X-Gtk: [gtkCookie]
     Content-Type: application/x-www-form-urlencoded
   Corps de la requête: data={"identifiant":"[identifiant]","motdepasse":"[motdepasse]","isRelogin":false,"uuid":""}

6. [Obtenir les valeurs du dictionnaire]
   Clé: token
   → Variable: token

7. [Obtenir les valeurs du dictionnaire]
   Chemin: data.accounts[0].id
   → Variable: eleveId

8. [Si] token n'est pas vide
   [Alors]
     [Définir la variable] edToken = token
     [Définir la variable] edEleveId = eleveId
     [Enregistrer le fichier] 
       Nom: ecoledirecte_credentials.json
       Contenu: {"token":"[token]","eleveId":"[eleveId]"}
     [Afficher la notification] "Connexion réussie !"
   [Sinon]
     [Obtenir les valeurs du dictionnaire] Clé: message
     [Afficher l'alerte] "Erreur: [message]"
```

## Gestion de la double authentification (QCM)

Si le code de réponse est 250, vous devez gérer le QCM :

```
1. [Obtenir les valeurs du dictionnaire]
   Clé: code
   → Variable: responseCode

2. [Si] responseCode = 250
   [Alors]
     [Obtenir le contenu de l'URL]
       URL: https://api.ecoledirecte.com/v3/connexion/doubleauth.awp
       Méthode: POST
       En-têtes:
         X-Token: [token]
       Corps: data={}
     
     [Obtenir les valeurs du dictionnaire]
       Clé: data.question
       → Variable: questionB64
     
     [Décoder en Base64] questionB64
       → Variable: question
     
     [Obtenir les valeurs du dictionnaire]
       Clé: data.propositions
       → Variable: propositions
     
     [Répéter avec chaque élément] propositions
       [Décoder en Base64]
       [Ajouter à la liste] propositionsDecodees
     
     [Choisir dans la liste] propositionsDecodees
       Invite: [question]
       → Variable: reponseChoisie
     
     [Encoder en Base64] reponseChoisie
       → Variable: reponseB64
     
     [Obtenir le contenu de l'URL]
       URL: https://api.ecoledirecte.com/v3/connexion/doubleauth.awp
       Méthode: POST
       En-têtes:
         X-Token: [token]
       Corps: data={"choix":"[reponseB64]"}
     
     [Obtenir les valeurs du dictionnaire]
       Clés: data.cn, data.cv
       → Variables: cn, cv
     
     # Refaire le login avec cn et cv
     [Obtenir le contenu de l'URL]
       URL: https://api.ecoledirecte.com/v3/login.awp?v=4.75.0
       Méthode: POST
       Corps: data={"identifiant":"[identifiant]","motdepasse":"[motdepasse]","isRelogin":false,"uuid":"","fa":[{"cn":"[cn]","cv":"[cv]"}]}
```

## Variables sauvegardées

Le raccourci sauvegarde les informations suivantes dans un fichier `ecoledirecte_credentials.json` :

| Variable | Description |
|----------|-------------|
| `token` | Token d'authentification (valide ~24h) |
| `eleveId` | Identifiant de l'élève |

## Erreurs courantes

| Code | Description | Solution |
|------|-------------|----------|
| 250 | Double authentification requise | Répondez au QCM |
| 505 | Identifiants incorrects | Vérifiez login/mot de passe |
| 517 | Version API invalide | Mettez à jour le paramètre `v=` |
| 520 | Token invalide | Reconnectez-vous |
| 525 | Token expiré | Reconnectez-vous |

## Sécurité

⚠️ **Important** : Le mot de passe n'est pas stocké. Seul le token (temporaire) est sauvegardé.

Pour plus de sécurité, vous pouvez stocker le token dans le Trousseau iCloud en utilisant l'action "Enregistrer dans le trousseau" de Scriptable.
