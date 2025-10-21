const express = require('express');
const router = express.Router();
const {
    getAllUsers,
    getUser,
    updateUser,
    createUser,
    deleteUser,
    addGroupToUser,
    removeGroupFromUser,
    listUserGroups
} = require('../controllers/users');

// Routes for user management
router.get('/users', getAllUsers);
router.get('/users/:id', getUser);
router.put('/users/:id', updateUser);
router.post('/users/create', createUser);
router.delete('/users/:id', deleteUser);
router.post('/users/:id/groups', addGroupToUser);
router.delete('/users/:id/groups/:groupId', removeGroupFromUser);
router.get('/users/:id/groups', listUserGroups);

module.exports = router;