const express = require('express');
const router = express.Router();

module.exports = function(db) {
  // POST: Créer une nouvelle inspection
  router.post('/', (req, res) => {
    const { localisation, etape, defaut } = req.body;
    
    // Validation des données
    if (!localisation || !etape || !defaut) {
      return res.status(400).json({ 
        success: false, 
        message: 'Les paramètres localisation, etape et defaut sont requis' 
      });
    }
    
    // Insertion dans la base de données
    const query = `INSERT INTO inspections (localisation, etape, defaut) VALUES (?, ?, ?)`;
    db.run(query, [localisation, etape, defaut], function(err) {
      if (err) {
        console.error('Erreur lors de l\'insertion:', err.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Erreur lors de l\'enregistrement des données' 
        });
      }
      
      res.status(201).json({ 
        success: true, 
        message: 'Inspection enregistrée avec succès',
        data: {
          id: this.lastID,
          localisation,
          etape,
          defaut
        }
      });
    });
  });

  // GET: Récupérer toutes les inspections
  router.get('/', (req, res) => {
    const query = `SELECT * FROM inspections ORDER BY date_creation DESC`;
    
    db.all(query, [], (err, rows) => {
      if (err) {
        console.error('Erreur lors de la récupération des données:', err.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Erreur lors de la récupération des données' 
        });
      }
      
      res.json({ 
        success: true, 
        data: rows 
      });
    });
  });

  // GET: Filtrer les inspections par localisation, etape ou defaut
  router.get('/filter', (req, res) => {
    const { localisation, etape, defaut } = req.query;
    let query = `SELECT * FROM inspections WHERE 1=1`;
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
    
    query += ` ORDER BY date_creation DESC`;
    
    db.all(query, params, (err, rows) => {
      if (err) {
        console.error('Erreur lors de la récupération des données:', err.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Erreur lors de la récupération des données' 
        });
      }
      
      res.json({ 
        success: true, 
        data: rows 
      });
    });
  });

  // GET: Récupérer une inspection par ID
  router.get('/:id', (req, res) => {
    const { id } = req.params;
    const query = `SELECT * FROM inspections WHERE id = ?`;
    
    db.get(query, [id], (err, row) => {
      if (err) {
        console.error('Erreur lors de la récupération des données:', err.message);
        return res.status(500).json({ 
          success: false, 
          message: 'Erreur lors de la récupération des données' 
        });
      }
      
      if (!row) {
        return res.status(404).json({
          success: false,
          message: 'Inspection non trouvée'
        });
      }
      
      res.json({ 
        success: true, 
        data: row 
      });
    });
  });

  return router;
}; 