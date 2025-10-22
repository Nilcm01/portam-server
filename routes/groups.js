const express = require('express');
const router = express.Router();
const {
    getAllGroups,       // GET      : /groups
    getGroupById,       // GET      : /groups/:id
    createGroup,       // POST     : /groups
    updateGroup,       // PUT      : /groups/:id
    deleteGroup        // DELETE   : /groups/:id
} = require('../controllers/groups');

// Routes for group management
router.get('/', getAllGroups);
router.get('/:id', getGroupById);
router.post('/', createGroup);
router.put('/:id', updateGroup);
router.delete('/:id', deleteGroup);

module.exports = router;