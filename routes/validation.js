const express = require('express');
const router = express.Router();
const {
    validation          // POST      : /validation
} = require('../controllers/validation');

// Routes for validation management
router.post('/validation', validation);


module.exports = router;