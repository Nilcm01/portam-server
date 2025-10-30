const express = require('express');
const router = express.Router();
const {
    getAllTitles,            // GET      : /titles
    getTitleById,            // GET      : /titles/:id
    createTitle,             // POST     : /titles
    updateTitle,             // PUT      : /titles/:id
    deleteTitle,             // DELETE   : /titles/:id

    getAllUserTitles,        // GET      : /titles/user/:userId
    getUserTitleById,        // GET      : /titles/user/:userId/:userTitleId
    assignTitleToUser,       // POST     : /titles/user/:userId
    removeTitleFromUser,     // DELETE   : /titles/user/:userId/:userTitleId

    setFirstUseForUserTitle  // POST     : /titles/user/:userId/:userTitleId/first_use
} = require('../controllers/titles');

// Routes for titles management
router.get('/titles', getAllTitles);
router.get('/titles/:id', getTitleById);
router.post('/titles', createTitle);
router.put('/titles/:id', updateTitle);
router.delete('/titles/:id', deleteTitle);

// Routes for user titles management
router.get('/titles/user/:userId', getAllUserTitles);
router.get('/titles/user/:userId/:userTitleId', getUserTitleById);
router.post('/titles/user/:userId', assignTitleToUser);
router.delete('/titles/user/:userId/:userTitleId', removeTitleFromUser);

router.post('/titles/user/:userId/:userTitleId/first_use', setFirstUseForUserTitle);


module.exports = router;