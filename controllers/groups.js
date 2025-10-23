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
    const { id, name, description, expiration } = req.body;
    let newId;
    try {
        // If id is provided, check if it already exists
        if (id) {
            const { data: existingGroup, error: fetchError } = await supabase
                .from('groups')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError && fetchError.code !== 'PGRST116') { // PGRST116: No rows found
                throw fetchError;
            }

            if (existingGroup) {
                return res.status(400).json({
                    success: false,
                    error: 'Group with the provided ID already exists.'
                });
            }
        }

        // If it is not provided, generate a new random id and check uniqueness
        // If a collision occurs (very unlikely), repeat until unique
        else {
            newId = id;
            if (!newId) {
                let isUnique = false;
                while (!isUnique) {
                    newId = Math.floor(Math.random() * 100000); // Random int between 0 and 99999
                    const { data: existingGroup, error: fetchError } = await supabase
                        .from('groups')
                        .select('*')
                        .eq('id', newId)
                        .single();

                    if (fetchError && fetchError.code === 'PGRST116') { // PGRST116: No rows found
                        isUnique = true;
                    }
                }
            }
        }

        // Insert the new group
        const finalId = id || newId;
        let finalExpiration = expiration;
        if (expiration === undefined || expiration === null || expiration === "null"
            || expiration === 0 || expiration === '0'
            || expiration === '') {
            finalExpiration = null; // Default to null if not provided
        }

        const { data, error } = await supabase
            .from('groups')
            .insert([{ id: finalId, name, description, expiration: finalExpiration }])
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
        let finalExpiration = expiration;
        if (expiration === undefined || expiration === null || expiration === "null"
            || expiration === 0 || expiration === '0'
            || expiration === '') {
            finalExpiration = null; // Default to null if not provided
        }

        const { data, error } = await supabase
            .from('groups')
            .update({ name, description, expiration: finalExpiration })
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
    createGroup,        // POST     : /groups
    updateGroup,        // PUT      : /groups/:id
    deleteGroup         // DELETE   : /groups/:id
};