const express = require('express');
const router = express.Router();
const {
    getAllZones,            // GET      : /zones
    getZoneById,            // GET      : /zones/:id
    createZone,             // POST     : /zones
    updateZone,             // PUT      : /zones/:id
    deleteZone              // DELETE   : /zones/:id
} = require('../controllers/zones');

// Routes for zones management
router.get('/zones', getAllZones);
router.get('/zones/:id', getZoneById);
router.post('/zones', createZone);
router.put('/zones/:id', updateZone);
router.delete('/zones/:id', deleteZone);

module.exports = router;