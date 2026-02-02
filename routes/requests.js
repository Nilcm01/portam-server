const express = require('express');
const router = express.Router();
const {
    getAllRequests,     // GET      : /requests
    getRequestById,     // GET      : /requests/:id
    createRequest,      // POST     : /requests
    approveRequest,     // PUT      : /requests/:id/approve
    rejectRequest       // PUT      : /requests/:id/reject
} = require('../controllers/requests');

// Routes for request management
router.get('/requests/', getAllRequests);
router.get('/requests/:id', getRequestById);
router.post('/requests/', createRequest);
router.put('/requests/:id/approve', approveRequest);
router.put('/requests/:id/reject', rejectRequest);

module.exports = router;