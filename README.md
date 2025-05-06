# API de Diagnostic de Boulangerie

API Node.js avec Express et SQLite permettant de consulter des diagnostics boulangerie en fonction de trois paramètres : Localisation, Etape et Défaut.

## Installation

```bash
# Installer les dépendances
npm install

# Démarrer le serveur
node index.js
```

Le serveur démarrera sur le port 3000 par défaut (ou la valeur de la variable d'environnement PORT).

## Structure de la base de données

La base de données SQLite contient plusieurs tables :

1. **defauts** : Relation entre localisation, étape et défaut
   - `id` : Identifiant unique auto-incrémenté
   - `localisation` : Localisation du défaut (ex: "Défauts de la pâte", "Défauts du pain")
   - `etape` : Étape du process (ex: "Pétrissage", "Apprêt", "Cuisson")
   - `defaut` : Type de défaut (ex: "Consistance ferme", "Croûte épaisse")

2. **parametres** : Description des paramètres (colonnes de la matrice)
   - `id` : Identifiant unique auto-incrémenté
   - `numero` : Numéro de colonne
   - `categorie` : Catégorie principale (ex: "Ingrédients", "Process")
   - `sous_categorie` : Sous-catégorie (ex: "Farine", "Pétrissage")
   - `description` : Description détaillée (ex: "Riche en protéine", "Pâte chaude")

3. **defauts_parametres** : Relation entre défauts et paramètres avec valeurs
   - `defaut_id` : Identifiant du défaut
   - `parametre_id` : Identifiant du paramètre
   - `valeur` : Valeur d'importance/pertinence (1, 2 ou 3)

## Importation des données

À la première exécution, l'API importe automatiquement les données depuis le fichier `Matrice.csv` qui doit être présent à la racine du projet.

## Endpoint de l'API

### Consulter les diagnostics
- **URL** : `/api/diagnostic`
- **Méthode** : `GET`
- **Paramètres de requête** : 
  - `localisation` : Localisation du défaut (ex: "Défauts de la pâte", "Défauts du pain")
  - `etape` : Étape du process (ex: "Pétrissage", "Apprêt", "Cuisson")
  - `defaut` : Type de défaut (ex: "Consistance ferme", "Croûte épaisse")

**Note** : Au moins un des trois paramètres doit être fourni.

- **Exemple** : `/api/diagnostic?localisation=Défauts%20de%20la%20pâte&etape=Pétrissage`
- **Réponse réussie** :
  ```json
  {
    "success": true,
    "data": [
      {
        "id": 1,
        "localisation": "Défauts de la pâte",
        "etape": "Pétrissage (début)",
        "defaut": "Consistance ferme",
        "parametres": [
          {
            "categorie": "Ingrédients",
            "sous_categorie": "Farine",
            "description": "Riche en protéine",
            "valeur": 3
          },
          {
            "categorie": "Ingrédients",
            "sous_categorie": "Farine",
            "description": "Fine",
            "valeur": 1
          },
          ...
        ]
      },
      ...
    ]
  }
  ```

## Exemple d'utilisation

Pour consulter les diagnostics avec des valeurs spécifiques pour la localisation, l'étape, et le défaut :

```
GET /api/diagnostic?localisation=Défauts%20de%20la%20pâte&etape=Pétrissage%20(début)&defaut=Consistance%20ferme
```

Pour consulter tous les défauts liés à une étape spécifique :

```
GET /api/diagnostic?etape=Pétrissage%20(début)
```

Pour consulter tous les défauts d'une localisation spécifique :

```
GET /api/diagnostic?localisation=Défauts%20du%20pain
``` 