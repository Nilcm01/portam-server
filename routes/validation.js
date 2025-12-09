const express = require('express');
const router = express.Router();
const {
    validation,         // POST      : /validation
    history             // GET       : /validation/history/:userId
} = require('../controllers/validation');

// Routes for validation management
router.post('/validation', validation);
router.get('/validation/history/:userId', history);

module.exports = router;