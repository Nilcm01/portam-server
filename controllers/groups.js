const e = require('express');
const supabase = require('../config/supabase');

/*
    Groups:
    - id (PK, UQ)   - int8
    - name          - varchar
    - description   - varchar
    - expiration    - int8 (number of days) [null = never expires or other special case]

*/


// Get all groups > GET: /groups
const getAllGroups = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('groups')
            .select('*');

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            groups: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get group by ID > GET: /groups/:id
const getGroupById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('groups')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            group: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Create new group > POST: /groups
const createGroup = async (req, res) => {
    const { name, description, expiration } = req.body;
    try {
        const { data, error } = await supabase
            .from('groups')
            .insert([{ name, description, expiration }])
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        res.status(201).json({
            success: true,
            group: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update group by ID > PUT: /groups/:id
const updateGroup = async (req, res) => {
    const { id } = req.params;
    const { name, description, expiration } = req.body;
    try {
        const { data, error } = await supabase
            .from('groups')
            .update({ name, description, expiration })
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            group: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete group by ID > DELETE: /groups/:id
const deleteGroup = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('groups')
            .delete()
            .eq('id', id)
            .select('*')
            .single();

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            group: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
    getAllGroups,       // GET      : /groups
    getGroupById,       // GET      : /groups/:id
    createGroup,       // POST     : /groups
    updateGroup,       // PUT      : /groups/:id
    deleteGroup        // DELETE   : /groups/:id
};