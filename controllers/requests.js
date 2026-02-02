const e = require('express');
const supabase = require('../config/supabase');

/*
    Requests:
    - id (PK, UQ)   - string (UUID)
    - created_at    - timestamp
    - user          - int8 (FK -> users.id)
    - group         - int8 (FK -> groups.id)
    - evaluated     - boolean
    - evaluated_at  - timestamp [null = not evaluated yet]
    - evaluated_by  - string (UUID) (FK -> users.id) [null = not evaluated yet]
    - approved      - boolean [null = not evaluated yet]

*/

// Get all requests > GET: /requests
const getAllRequests = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('requests')
            .select('*');

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            requests: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get request by ID > GET: /requests/:id
const getRequestById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('requests')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            request: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Create new request > POST: /requests
const createRequest = async (req, res) => {
    /*
        Expected body:
        {
            "user": int8,
            "group": int8
        }
    */
    const { user, group } = req.body;
    try {
        const ct = new Date();
        const currentTime = ct.getFullYear() + '-' +
            String(ct.getMonth() + 1).padStart(2, '0') + '-' +
            String(ct.getDate()).padStart(2, '0') + ' ' +
            String(ct.getHours()).padStart(2, '0') + ':' +
            String(ct.getMinutes()).padStart(2, '0') + ':' +
            String(ct.getSeconds()).padStart(2, '0');

        const { data, error } = await supabase
            .from('requests')
            .insert([
                { user, group, created_at: currentTime }
            ])
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json({
            success: true,
            request: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Approve request by ID > PUT: /requests/:id/approve
const approveRequest = async (req, res) => {
    const { id } = req.params;
    const { evaluated_by } = req.body; // ID of the user who evaluates
    try {
        const ct = new Date();
        const evaluatedAt = ct.getFullYear() + '-' +
            String(ct.getMonth() + 1).padStart(2, '0') + '-' +
            String(ct.getDate()).padStart(2, '0') + ' ' +
            String(ct.getHours()).padStart(2, '0') + ':' +
            String(ct.getMinutes()).padStart(2, '0') + ':' +
            String(ct.getSeconds()).padStart(2, '0');

        const { data, error } = await supabase
            .from('requests')
            .update({
                evaluated: true,
                evaluated_at: evaluatedAt,
                evaluated_by: evaluated_by,
                approved: true
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            request: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Reject request by ID > PUT: /requests/:id/reject
const rejectRequest = async (req, res) => {
    const { id } = req.params;
    const { evaluated_by } = req.body; // ID of the user who evaluates
    try {
        const ct = new Date();
        const evaluatedAt = ct.getFullYear() + '-' +
            String(ct.getMonth() + 1).padStart(2, '0') + '-' +
            String(ct.getDate()).padStart(2, '0') + ' ' +
            String(ct.getHours()).padStart(2, '0') + ':' +
            String(ct.getMinutes()).padStart(2, '0') + ':' +
            String(ct.getSeconds()).padStart(2, '0');

        const { data, error } = await supabase
            .from('requests')
            .update({
                evaluated: true,
                evaluated_at: evaluatedAt,
                evaluated_by: evaluated_by,
                approved: false
            })
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            request: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


module.exports = {
    getAllRequests,     // GET      : /requests
    getRequestById,     // GET      : /requests/:id
    createRequest,      // POST     : /requests
    approveRequest,     // PUT      : /requests/:id/approve
    rejectRequest       // PUT      : /requests/:id/reject
};