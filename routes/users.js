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
    listUserGroups,
    listAvailableGroups,
    listUserSuports,
    getUserSuport,
    addSuportToUser,
    removeSuportFromUser
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
router.get('/users/:id/groups/available', listAvailableGroups);
router.get('/users/:id/suports', listUserSuports);
router.get('/users/:id/suports/:uid', getUserSuport);
router.post('/users/:id/suports', addSuportToUser);
router.delete('/users/:id/suports/:uid', removeSuportFromUser);

module.exports = router;