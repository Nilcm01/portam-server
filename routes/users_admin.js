const express = require('express');
const router = express.Router();
const {
    getAllUsersAdmin,       // GET      : /users_admin
    getUserAdminById,       // GET      : /users_admin/:id
    registerUserAdmin,      // POST     : /users_admin
    updateUserAdmin,        // PUT      : /users_admin/:id
    deleteUserAdmin,        // DELETE   : /users_admin/:id
    loginUserAdmin          // POST     : /users_admin/login
} = require('../controllers/users_admin');

// Routes for users_admin management
router.get('/users_admin', getAllUsersAdmin);
router.get('/users_admin/:id', getUserAdminById);
router.post('/users_admin', registerUserAdmin);
router.put('/users_admin/:id', updateUserAdmin);
router.delete('/users_admin/:id', deleteUserAdmin);
router.post('/users_admin/login', loginUserAdmin);

module.exports = router;