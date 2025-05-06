// Charger les variables d'environnement depuis le fichier .env
require('dotenv').config();

const express = require('express');
const bodyParser = require('body-parser');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const OpenAI = require('openai');

// Initialisation de l'application Express
const app = express();
const port = process.env.PORT || 3005;

// Initialisation du client OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY, // Assurez-vous de définir cette variable d'environnement
});

// Middleware pour parser le JSON
app.use(bodyParser.json());
app.use(bodyParser.urlencoded({ extended: true }));

// Servir les fichiers statiques depuis le dossier 'public'
app.use(express.static('public'));

// Création et connexion à la base de données SQLite
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath, (err) => {
  if (err) {
    console.error('Erreur lors de la connexion à la base de données:', err.message);
  } else {
    console.log('Connexion réussie à la base de données SQLite');
    initDatabase();
  }
});

// Fonction pour initialiser la base de données
function initDatabase() {
  // Création de la table simplifiée
  db.run(`CREATE TABLE IF NOT EXISTS matrix_data (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    localisation TEXT NOT NULL,
    etape TEXT NOT NULL,
    defaut TEXT NOT NULL,
    categorie TEXT NOT NULL,
    sous_categorie TEXT NOT NULL,
    description TEXT NOT NULL,
    valeur INTEGER NOT NULL
  )`, (err) => {
    if (err) {
      console.error('Erreur lors de la création de la table:', err.message);
    } else {
      console.log('Table matrix_data créée ou déjà existante');
      
      // Vérifier si des données existent déjà
      db.get('SELECT COUNT(*) AS count FROM matrix_data', [], (err, row) => {
        if (err) {
          console.error('Erreur lors de la vérification des données:', err.message);
        } else if (row.count === 0) {
          // Insérer quelques données pour tester
          insertTestData();
        }
      });
    }
  });
}

// Insérer des données de test
function insertTestData() {
  console.log('Insertion des données de test...');
  
  const data = [
    // Défauts de la pâte - Pétrissage (début)
    ['Défauts de la pâte', 'Pétrissage (début)', 'Consistance ferme', 'Ingrédients', 'Farine', 'Riche en protéine', 3],
    ['Défauts de la pâte', 'Pétrissage (début)', 'Consistance ferme', 'Ingrédients', 'Farine', 'Fine', 1],
    ['Défauts de la pâte', 'Pétrissage (début)', 'Consistance ferme', 'Ingrédients', 'Farine', 'Excès amidon endommagé', 3],
    ['Défauts de la pâte', 'Pétrissage (début)', 'Consistance ferme', 'Process', 'Pétrissage', 'Pâte froide', 2],
    
    ['Défauts de la pâte', 'Pétrissage (début)', 'Consistance molle', 'Ingrédients', 'Farine', 'Pauvre en protéine', 2],
    ['Défauts de la pâte', 'Pétrissage (début)', 'Consistance molle', 'Ingrédients', 'Farine', 'Excès d\'humidité', 3],
    ['Défauts de la pâte', 'Pétrissage (début)', 'Consistance molle', 'Process', 'Pétrissage', 'Pâte chaude', 2],
    
    // Défauts du pain - Aspect extérieur
    ['Défauts du pain', 'Aspect extérieur', 'Couleur rouge', 'Ingrédients', 'Farine', 'Forte activité amylasique', 3],
    ['Défauts du pain', 'Aspect extérieur', 'Couleur rouge', 'Ingrédients', 'Additifs 1', 'Excès de farine de malt', 3],
    ['Défauts du pain', 'Aspect extérieur', 'Couleur rouge', 'Process', 'Cuisson', 'Four trop chaud', 2]
  ];
  
  // Préparer l'instruction SQL
  const stmt = db.prepare(`
    INSERT INTO matrix_data (localisation, etape, defaut, categorie, sous_categorie, description, valeur)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  // Insérer chaque ligne de données
  data.forEach(row => {
    stmt.run(row, (err) => {
      if (err) {
        console.error('Erreur lors de l\'insertion des données:', err.message);
      }
    });
  });
  
  // Finaliser l'instruction préparée
  stmt.finalize(() => {
    console.log('Données de test insérées avec succès');
  });
}

// API pour consulter les données de la matrice
app.get('/api/diagnostic', (req, res) => {
  const { localisation, etape, defaut } = req.query;
  
  // Rendu optionnel: aucun paramètre n'est requis
  // Enlever cette vérification qui renvoyait une erreur 400
  /* if (!localisation && !etape && !defaut) {
    return res.status(400).json({ 
      success: false, 
      message: 'Au moins un des paramètres (localisation, etape, defaut) est requis' 
    });
  } */
  
  // Ajouter des logs de débogage
  console.log("Paramètres reçus :", { localisation, etape, defaut });
  
  let query = `SELECT * FROM matrix_data WHERE 1=1`;
  const params = [];
  
  if (localisation) {
    query += ` AND localisation = ?`;
    params.push(localisation);
  }
  
  if (etape) {
    query += ` AND etape = ?`;
    params.push(etape);
  }
  
  if (defaut) {
    query += ` AND defaut = ?`;
    params.push(defaut);
  }
  
  query += ` ORDER BY valeur DESC`;
  
  // Afficher la requête pour le débogage
  console.log("Requête SQL:", query);
  console.log("Paramètres:", params);
  
  db.all(query, params, (err, rows) => {
    if (err) {
      console.error('Erreur lors de la récupération des données:', err.message);
      return res.status(500).json({ 
        success: false, 
        message: 'Erreur lors de la récupération des données' 
      });
    }
    
    console.log("Nombre de lignes trouvées:", rows.length);
    
    // Regrouper les résultats par défaut
    const resultats = {};
    
    rows.forEach(row => {
      const key = `${row.localisation}|${row.etape}|${row.defaut}`;
      
      if (!resultats[key]) {
        resultats[key] = {
          localisation: row.localisation,
          etape: row.etape,
          defaut: row.defaut,
          parametres: []
        };
      }
      
      resultats[key].parametres.push({
        categorie: row.categorie,
        sous_categorie: row.sous_categorie,
        description: row.description,
        valeur: row.valeur
      });
    });
    
    res.json({ 
      success: true, 
      data: Object.values(resultats)
    });
  });
});

// Route d'accueil
app.get('/', (req, res) => {
  res.json({
    message: 'API de diagnostic boulangerie',
    endpoints: [
      {
        method: 'GET',
        path: '/api/diagnostic',
        description: 'Consulter les diagnostics en fonction de la localisation, l\'étape et le défaut',
        parametres: [
          { nom: 'localisation', description: 'Localisation du défaut (ex: Défauts de la pâte, Défauts du pain)' },
          { nom: 'etape', description: 'Étape du process (ex: Pétrissage, Apprêt, Cuisson)' },
          { nom: 'defaut', description: 'Type de défaut observé (ex: Consistance ferme, Croûte épaisse)' }
        ]
      },
      {
        method: 'POST',
        path: '/api/assistant',
        description: 'Envoyer un message à l\'assistant OpenAI et obtenir une réponse',
        parametres: [
          { nom: 'message', description: 'Le texte à envoyer à l\'assistant OpenAI', location: 'body' },
          { nom: 'thread_id', description: 'ID optionnel d\'un thread existant pour continuer la conversation', location: 'body' }
        ],
        reponse: [
          { nom: 'success', description: 'Indique si la requête a réussi' },
          { nom: 'thread_id', description: 'ID du thread utilisé (nouveau ou existant) à conserver pour continuer la conversation' },
          { nom: 'response', description: 'Réponse textuelle de l\'assistant' }
        ]
      }
    ]
  });
});

// Route pour l'assistant OpenAI
app.post('/api/assistant', async (req, res) => {
  try {
    const { message, thread_id } = req.body;
    
    if (!message) {
      return res.status(400).json({ 
        success: false, 
        message: 'Le paramètre "message" est requis dans le corps de la requête' 
      });
    }
    
    console.log("Message reçu pour l'assistant:", message);
    
    // Utiliser un thread existant ou en créer un nouveau
    let thread;
    if (thread_id) {
      console.log("Utilisation du thread existant:", thread_id);
      try {
        // Vérifier si le thread existe
        thread = await openai.beta.threads.retrieve(thread_id);
      } catch (error) {
        console.error("Erreur lors de la récupération du thread:", error);
        return res.status(404).json({
          success: false,
          message: `Le thread avec l'ID ${thread_id} n'existe pas ou est inaccessible`
        });
      }
    } else {
      // Créer un nouveau thread
      console.log("Création d'un nouveau thread");
      thread = await openai.beta.threads.create();
    }
    
    // Ajouter un message au thread
    await openai.beta.threads.messages.create(thread.id, {
      role: "user",
      content: message
    });
    
    // Exécuter l'assistant sur le thread
    const run = await openai.beta.threads.runs.create(thread.id, {
      assistant_id: "asst_8u6FIsS4Nlg06BjMoMpYjTgr"
    });
    
    // Attendre que l'exécution soit terminée
    let runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
    
    // Vérifier l'état toutes les 500ms jusqu'à ce qu'il soit terminé
    while (runStatus.status !== "completed") {
      await new Promise(resolve => setTimeout(resolve, 500));
      runStatus = await openai.beta.threads.runs.retrieve(thread.id, run.id);
      
      // Gérer les erreurs potentielles
      if (runStatus.status === "failed") {
        return res.status(500).json({ 
          success: false, 
          message: 'L\'exécution de l\'assistant a échoué', 
          error: runStatus.last_error 
        });
      }
    }
    
    // Récupérer les messages du thread
    const messages = await openai.beta.threads.messages.list(thread.id);
    
    // Récupérer la dernière réponse de l'assistant
    const assistantMessages = messages.data.filter(msg => msg.role === "assistant");
    
    if (assistantMessages.length === 0) {
      return res.status(404).json({ 
        success: false, 
        message: 'Aucune réponse de l\'assistant n\'a été trouvée' 
      });
    }
    
    // Récupérer le contenu textuel de la dernière réponse
    const lastMessage = assistantMessages[0];
    const textContent = lastMessage.content
      .filter(content => content.type === "text")
      .map(content => content.text.value)
      .join("\n");
    
    res.json({ 
      success: true, 
      thread_id: thread.id,
      response: textContent
    });
    
  } catch (error) {
    console.error('Erreur lors de l\'appel à l\'assistant OpenAI:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Une erreur s\'est produite lors de l\'appel à l\'assistant OpenAI',
      error: error.message
    });
  }
});

// Middleware de gestion des erreurs
app.use((err, req, res, next) => {
  console.error('Erreur non gérée:', err.stack);
  res.status(500).json({ 
    success: false, 
    message: 'Une erreur interne s\'est produite' 
  });
});

// Démarrage du serveur
app.listen(port, () => {
  console.log(`Serveur démarré sur le port ${port}`);
}); 