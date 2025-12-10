const express = require('express');
const router = express.Router();
const {
    getAllTitles,            // GET      : /titles
    getTitleById,            // GET      : /titles/:id
    createTitle,             // POST     : /titles
    updateTitle,             // PUT      : /titles/:id
    deleteTitle,             // DELETE   : /titles/:id

    getAllUserTitles,        // GET      : /titles/user/:userId
    getActiveUserTitle,      // GET      : /titles/user/:userId/active
    getUserTitleById,        // GET      : /titles/user/:userId/:userTitleId
    listTitlesForUser,       // GET      : /titles/user/:userId/available
    assignTitleToUser,       // POST     : /titles/user/:userId
    removeTitleFromUser,     // DELETE   : /titles/user/:userId/:userTitleId
    activateTitleForUser     // POST     : /titles/user/:userId/:userTitleId/activate
} = require('../controllers/titles');

// Routes for titles management
router.get('/titles', getAllTitles);
router.get('/titles/:id', getTitleById);
router.post('/titles', createTitle);
router.put('/titles/:id', updateTitle);
router.delete('/titles/:id', deleteTitle);

// Routes for user titles management
router.get('/titles/user/:userId', getAllUserTitles);
router.get('/titles/user/:userId/active', getActiveUserTitle);
router.get('/titles/user/:userId/available', listTitlesForUser);
router.post('/titles/user/:userId', assignTitleToUser);
router.get('/titles/user/:userId/:userTitleId', getUserTitleById);
router.delete('/titles/user/:userId/:userTitleId', removeTitleFromUser);
router.post('/titles/user/:userId/:userTitleId/activate', activateTitleForUser);


module.exports = router;