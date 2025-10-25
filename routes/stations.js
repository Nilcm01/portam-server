const express = require('express');
const router = express.Router();
const {
    getAllStations,            // GET   : /stations
    getStation,                // GET   : /stations/:id
    createStation,             // POST  : /stations
    updateStation,             // PUT   : /stations/:id
    deleteStation              // DELETE: /stations/:id
} = require('../controllers/stations');

// Routes for station management
router.get('/stations/', getAllStations);
router.get('/stations/:id', getStation);
router.post('/stations/', createStation);
router.put('/stations/:id', updateStation);
router.delete('/stations/:id', deleteStation);

module.exports = router;