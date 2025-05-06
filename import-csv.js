const fs = require('fs');
const path = require('path');
const sqlite3 = require('sqlite3').verbose();
const csv = require('csv-parser');

// Chemin vers la base de données
const dbPath = path.resolve(__dirname, 'database.db');
const db = new sqlite3.Database(dbPath);

// Supprimer les données existantes
db.run('DELETE FROM matrix_data', [], function(err) {
  if (err) {
    console.error('Erreur lors de la suppression des données:', err.message);
    return;
  }
  
  console.log('Anciennes données supprimées, début de l\'importation...');
  importData();
});

function importData() {
  // Structure pour stocker les données à importer
  const data = [];
  
  // Variables pour stocker les entêtes
  let headers = [];
  let categories = [];
  let sousCategories = [];
  let descriptions = [];
  
  // Ligne actuelle
  let currentLine = 0;
  
  // Lire le fichier CSV
  fs.createReadStream('Matrice.csv')
    .pipe(csv({ 
      separator: ',', 
      headers: false,
      skipLines: 0
    }))
    .on('data', (row) => {
      const values = Object.values(row);
      
      // Première ligne: numéros de colonnes
      if (currentLine === 0) {
        headers = values;
        currentLine++;
        return;
      }
      
      // Deuxième ligne: catégories
      if (currentLine === 1) {
        categories = values;
        currentLine++;
        return;
      }
      
      // Troisième ligne: sous-catégories
      if (currentLine === 2) {
        sousCategories = values;
        currentLine++;
        return;
      }
      
      // Quatrième ligne: descriptions des paramètres
      if (currentLine === 3) {
        descriptions = values;
        currentLine++;
        return;
      }
      
      // Lignes de données (à partir de la ligne 5)
      if (currentLine >= 4 && values[0] && values[1] && values[2]) {
        const localisation = values[0].trim();
        const etape = values[1].trim();
        const defaut = values[2].trim();
        
        // Parcourir toutes les colonnes à partir de la colonne 3
        for (let i = 3; i < values.length; i++) {
          const valeur = parseInt(values[i]);
          
          // Si la valeur est un nombre entre 1 et 3, l'ajouter aux données
          if (!isNaN(valeur) && valeur >= 1 && valeur <= 3 && headers[i] && categories[i] && sousCategories[i] && descriptions[i]) {
            data.push({
              localisation,
              etape,
              defaut,
              categorie: categories[i].trim(),
              sousCategorie: sousCategories[i].trim(),
              description: descriptions[i].trim(),
              valeur
            });
          }
        }
      }
      
      currentLine++;
    })
    .on('end', () => {
      console.log(`Lecture du CSV terminée. ${data.length} éléments trouvés.`);
      
      // Utiliser une transaction pour accélérer l'insertion
      db.serialize(() => {
        db.run('BEGIN TRANSACTION');
        
        const stmt = db.prepare(`
          INSERT INTO matrix_data 
          (localisation, etape, defaut, categorie, sous_categorie, description, valeur)
          VALUES (?, ?, ?, ?, ?, ?, ?)
        `);
        
        // Insérer les données
        let insertCount = 0;
        data.forEach(item => {
          stmt.run(
            item.localisation,
            item.etape,
            item.defaut,
            item.categorie,
            item.sousCategorie,
            item.description,
            item.valeur,
            function(err) {
              if (err) {
                console.error('Erreur d\'insertion:', err.message);
              } else {
                insertCount++;
              }
            }
          );
        });
        
        stmt.finalize();
        
        db.run('COMMIT', [], function(err) {
          if (err) {
            console.error('Erreur lors de la validation de la transaction:', err.message);
          } else {
            console.log(`Importation terminée. ${insertCount} éléments insérés.`);
          }
          
          // Fermer la base de données
          db.close();
        });
      });
    })
    .on('error', (err) => {
      console.error('Erreur lors de la lecture du CSV:', err.message);
      db.close();
    });
} 