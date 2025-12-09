const express = require('express');
const router = express.Router();
const {
    register,
    login,
    checkSession
} = require('../controllers/auth');

// Routes for auth actions
router.post('/auth/register', register);
router.post('/auth/login', login);
router.post('/auth/check-session', checkSession);

module.exports = router;