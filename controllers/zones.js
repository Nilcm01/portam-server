const e = require('express');
const supabase = require('../config/supabase');

/*
    Zones:
    - id (PK, UQ)   - int8
    - name          - varchar
    - description   - varchar
*/


// Get all zones > GET: /zones
const getAllZones = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('zones')
            .select('*');

        if (error) throw error;

        res.status(200).json({
            success: true,
            zones: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get zone by id > GET: /zones/:id
const getZoneById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('zones')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            zone: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Create new zone > POST: /zones
const createZone = async (req, res) => {
    const { name, description } = req.body;
    try {
        const { data, error } = await supabase
            .from('zones')
            .insert([{ name, description }])
            .select('*')
            .single();

        if (error) throw error;

        res.status(201).json({
            success: true,
            zone: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update zone by id > PUT: /zones/:id
const updateZone = async (req, res) => {
    const { id } = req.params;
    const { name, description } = req.body;
    try {
        const { data, error } = await supabase
            .from('zones')
            .update({ name, description })
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            zone: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete zone by id > DELETE: /zones/:id
const deleteZone = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('zones')
            .delete()
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            zone: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


module.exports = {
    getAllZones,            // GET      : /zones
    getZoneById,            // GET      : /zones/:id
    createZone,             // POST     : /zones
    updateZone,             // PUT      : /zones/:id
    deleteZone              // DELETE   : /zones/:id
};