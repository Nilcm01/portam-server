const express = require('express');
const router = express.Router();
const {
    getAllGroups,       // GET      : /groups
    getGroupById,       // GET      : /groups/:id
    createGroup,        // POST     : /groups
    updateGroup,        // PUT      : /groups/:id
    deleteGroup         // DELETE   : /groups/:id
} = require('../controllers/groups');

// Routes for group management
router.get('/groups/', getAllGroups);
router.get('/groups/:id', getGroupById);
router.post('/groups/', createGroup);
router.put('/groups/:id', updateGroup);
router.delete('/groups/:id', deleteGroup);

module.exports = router;