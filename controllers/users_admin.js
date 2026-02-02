const e = require('express');
const supabase = require('../config/supabase');
import bcrypt from 'bcrypt';
import crypto from 'crypto';

/*
    Users_Admin:
    - id (PK, UQ)   - string (UUID)
    - name          - string
    - password      - string

*/

// Get all users_admin > GET: /users_admin
const getAllUsersAdmin = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users_admin')
            .select('*');

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            users_admin: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get user_admin by ID > GET: /users_admin/:id
const getUserAdminById = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('users_admin')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            user_admin: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Register new user_admin > POST: /users_admin
const registerUserAdmin = async (req, res) => {
    const { id, name, password } = req.body;
    try {
        const passwordHash = await bcrypt.hash(password, 12);

        const { data, error } = await supabase
            .from('users_admin')
            .insert([{ 
                id, 
                name, 
                password: passwordHash
            }]);

        if (error) {
            throw error;
        }

        res.status(201).json({
            success: true,
            user_admin: data[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update user_admin > PUT: /users_admin/:id
// Allows updating name and/or password
const updateUserAdmin = async (req, res) => {
    const { id } = req.params;
    const { name, password } = req.body;
    try {
        const updates = { name };
        if (password) {
            updates.password = await bcrypt.hash(password, 12);
        }

        const { data, error } = await supabase
            .from('users_admin')
            .update(updates)
            .eq('id', id);

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            user_admin: data[0]
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete user_admin > DELETE: /users_admin/:id
const deleteUserAdmin = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('users_admin')
            .delete()
            .eq('id', id);

        if (error) {
            throw error;
        }

        res.status(200).json({
            success: true,
            message: `User admin with ID ${id} deleted`
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Login user_admin > POST: /users_admin/login
const loginUserAdmin = async (req, res) => {
    const { id, password } = req.body;
    try {
        const { data, error } = await supabase
            .from('users_admin')
            .select('*')
            .eq('id', id)
            .single();

        if (error) {
            throw error;
        }

        const validPassword = await bcrypt.compare(password, data.password);
        if (!validPassword) {
            return res.status(401).json({
                success: false,
                error: 'Invalid credentials'
            });
        }

        res.status(200).json({
            success: true,
            message: 'Login successful',
            user_admin: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


module.exports = {
    getAllUsersAdmin,       // GET      : /users_admin
    getUserAdminById,       // GET      : /users_admin/:id
    registerUserAdmin,      // POST     : /users_admin
    updateUserAdmin,        // PUT      : /users_admin/:id
    deleteUserAdmin,        // DELETE   : /users_admin/:id
    loginUserAdmin          // POST     : /users_admin/login
};