const e = require('express');
const supabase = require('../config/supabase');

/*
    Users:
    - id (PK, UQ)   - int8
    - name          - varchar
    - surname       - varchar
    - gov_id        - varchar
    - email (UQ)    - varchar
    - phone         - varchar
    - birthdate     - date
    - password      - varchar (hashed)

    User_groups:
    - user (PK, FK -> users.id)     - int8
    - group (PK, FK -> groups.id)   - int8
    - expiration                    - date

    Groups:
    - id (PK, UQ)       - int8
    - name (UQ)         - varchar
    - description       - text
    - expiration        - int8 (days) (null = never expires)

    Suports:
    - uid (PK, UQ)          - int8
    - user (FK -> users.id) - int8
    - activation            - timestamp
*/


//// USER MANAGEMENT


// Get all users > GET: /users
const getAllUsers = async (req, res) => {
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*');

        if (error) throw error;

        // Remove passwords from user objects
        const usersWithoutPasswords = data.map(({ password, ...user }) => user);

        res.status(200).json({
            success: true,
            users: usersWithoutPasswords
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get user by ID > GET: /users/:id
const getUser = async (req, res) => {
    const { id } = req.params;
    // Return everyting but password
    try {
        const { data, error } = await supabase
            .from('users')
            .select('*')
            .eq('id', id)
            .single();

        // Remove password from user object
        const { password, ...userWithoutPassword } = data;

        res.status(200).json({
            success: true,
            user: userWithoutPassword
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/* Update user by ID > PUT: /users/:id

    {
        "name": "John",
        "surname": "Doe",
        "gov_id": "12345678A",
        "email": "john.doe@example.com",
        "phone": "+123456789",
        "birthdate": "1990-01-01"
    }
*/
const updateUser = async (req, res) => {
    const { id } = req.params;
    const { name, surname, gov_id, email, phone, birthdate } = req.body;
    try {
        const { data: userData, error: userError } = await supabase
            .from('users')
            .update({ name, surname, gov_id, email, phone, birthdate })
            .eq('id', id)
            .select('*')
            .single();

        if (userError) throw userError;

        res.status(200).json({
            success: true,
            user_id: userData.id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

/* Create new user > POST: /users/create

    {
        "name": "John",
        "surname": "Doe",
        "gov_id": "12345678A",
        "email": "john.doe@example.com",
        "phone": "+123456789",
        "birthdate": "1990-01-01",
        "groups": [1, 2, 3]  // Optional array of group IDs to assign the user to
    }
*/
const createUser = async (req, res) => {
    const { name, surname, gov_id, email, phone, birthdate, groups } = req.body;
    try {
        // Generate user ID
        // 12 digit random number
        let userId = '';
        do {
            userId = Math.floor(100000000000 + Math.random() * 900000000000).toString();
            // Check if userId already exists
            const { data: existingUser, error: existingError } = await supabase
                .from('users')
                .select('id')
                .eq('id', userId)
                .single();
            if (existingError && existingError.code !== 'PGRST116') {
                throw existingError;
            }
            if (!existingUser) break; // Unique ID found
        } while (true);

        // Insert user
        const { data: userData, error: userError } = await supabase
            .from('users')
            .insert([{ id: userId, name, surname, gov_id, email, phone, birthdate }])
            .select('*')
            .single();

        if (userError) throw userError;

        // If groups are provided, insert into user_groups
        if (groups && Array.isArray(groups) && groups.length > 0) {
            groups.forEach(async (groupId) => {

                // Get group expiration days
                const { data: groupData, error: groupError } = await supabase
                    .from('groups')
                    .select('expiration')
                    .eq('id', groupId)
                    .single();

                if (groupError) {
                    console.error(`Error fetching group ${groupId}:`, groupError.message);
                    return;
                }

                let expirationDate = null;
                if (groupData && groupData.expiration) {
                    const now = new Date();
                    now.setDate(now.getDate() + groupData.expiration);
                    expirationDate = now.toISOString();
                }

                const { error: userGroupError } = await supabase
                    .from('user_groups')
                    .insert([{
                        user: userData.id,
                        group: groupId,
                        expiration: expirationDate
                    }]);

                if (userGroupError) {
                    console.error(`Error assigning user to group ${groupId}:`, userGroupError.message);
                }

            });
        }

        res.status(201).json({
            success: true,
            user_id: userData.id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete user by ID > DELETE: /users/:id
const deleteUser = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('users')
            .delete()
            .eq('id', id)
            .select('*')
            .single();

        if (error) throw error;

        // Delete user from user_groups
        await supabase
            .from('user_groups')
            .delete()
            .eq('user', id);

        res.status(200).json({
            success: true,
            user_id: id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


//// USER_GROUP MANAGEMENT


// Add group to user > POST: /users/:id/groups
// { "groupId": 1, "manualExpiration": "2023-12-31" } (manualExpiration is optional)
const addGroupToUser = async (req, res) => {
    const { id } = req.params;
    const { groupId, manualExpiration } = req.body;

    /*
        If group is 16, 30 or 65:
        - get user's birthdate
        - calculate expiration date (>16, >30, <65) with user's birthdate
        - insert into user_groups with expiration date
        Else if group has expiration days:
        - get group expiration days
        - calculate expiration date (now + days)
        - insert into user_groups with expiration date
        Else:
        - insert into user_groups with null expiration date
    */

    try {
        // Get user birthdate
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('birthdate')
            .eq('id', id)
            .single();

        if (userError) throw userError;

        const birthdate = new Date(userData.birthdate);
        const now = new Date();

        // Get group expiration days
        const { data: groupData, error: groupError } = await supabase
            .from('groups')
            .select('expiration')
            .eq('id', groupId)
            .single();

        if (groupError) throw groupError;

        let expirationDate = null;

        // The expiration day has to be the day before the birthday + the years

        if (groupId === '16' && yearsOldToday(birthdate) < 16) {
            const dayBefore = dayBeforeSpecificBirthday(birthdate, 16);
            expirationDate = "" + dayBefore.getFullYear() + "-" + String(dayBefore.getMonth() + 1).padStart(2, '0') + "-" + String(dayBefore.getDate()).padStart(2, '0');
        } else if (groupId === '30' && yearsOldToday(birthdate) < 30) {
            const dayBefore = dayBeforeSpecificBirthday(birthdate, 30);
            expirationDate = "" + dayBefore.getFullYear() + "-" + String(dayBefore.getMonth() + 1).padStart(2, '0') + "-" + String(dayBefore.getDate()).padStart(2, '0');
        } else if (groupId === '65' && yearsOldToday(birthdate) >= 65) {
            expirationDate = null; // No expiration for seniors
        } else if (groupData.expiration && groupData.expiration > 0 && groupData.expiration !== null) {
            // Calculate expiration date based on group expiration days
            const expiration = new Date();
            expiration.setDate(now.getDate() + groupData.expiration);
            expirationDate = "" + expiration.getFullYear() + "-" + String(expiration.getMonth() + 1).padStart(2, '0') + "-" + String(expiration.getDate()).padStart(2, '0');
        }

        // If manualExpiration is provided, override calculated expirationDate
        if (manualExpiration) {
            expirationDate = manualExpiration;
        }

        // Insert into user_groups

        const { error: userGroupError } = await supabase
            .from('user_groups')
            .insert([{
                user: id,
                group: groupId,
                expiration: expirationDate ? expirationDate : null
            }]);

        if (userGroupError) throw userGroupError;

        res.status(201).json({
            success: true,
            user_id: id,
            group_id: groupId,
            expiration: expirationDate ? expirationDate : null
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Remove group from user > DELETE: /users/:id/groups/:groupId
const removeGroupFromUser = async (req, res) => {
    const { id, groupId } = req.params;
    try {
        const { data, error } = await supabase
            .from('user_groups')
            .delete()
            .eq('user', id)
            .eq('group', groupId)
            .select('*')
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            user_id: id,
            group_id: groupId
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// List user groups > GET: /users/:id/groups
const listUserGroups = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('user_groups')
            .select('*')
            .eq('user', id);

        if (error) throw error;

        res.status(200).json({
            success: true,
            user_id: id,
            groups: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


//// SUPORT FUNCTIONS


// Get all suports from user > GET: /users/:id/suports
const listUserSuports = async (req, res) => {
    const { id } = req.params;
    try {
        const { data, error } = await supabase
            .from('suports')
            .select('*')
            .eq('user', id);

        if (error) throw error;

        res.status(200).json({
            success: true,
            user_id: id,
            suports: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get specific suport from user > GET: /users/:id/suports/:uid
const getUserSuport = async (req, res) => {
    const { id, uid } = req.params;
    try {
        const { data, error } = await supabase
            .from('suports')
            .select('*')
            .eq('user', id)
            .eq('uid', uid)
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            suport: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Add suport to user > POST: /users/:id/suports
// { "uid": 123456789012 }
const addSuportToUser = async (req, res) => {
    const { id } = req.params;
    const { uid } = req.body;

    /*
        - Check if suport with uid already exists
        - If does not exist, create new suport with current timestamp
        - If exists, check if belongs to user
            - If belongs to user, return error
            - If does not belong to user, assign to user with current timestamp
    */

    try {
        // Check if suport with uid already exists
        const { data: existingSuport, error: existingError } = await supabase
            .from('suports')
            .select('*')
            .eq('uid', uid)
            .single();

        if (existingError && existingError.code !== 'PGRST116') {
            throw existingError;
        }

        const now = new Date();
        const nowStr = "" + now.getFullYear() + "-" + String(now.getMonth() + 1).padStart(2, '0') + "-" + String(now.getDate()).padStart(2, '0') + " " + String(now.getHours()).padStart(2, '0') + ":" + String(now.getMinutes()).padStart(2, '0') + ":" + String(now.getSeconds()).padStart(2, '0');

        // If suport does not exist
        if (!existingSuport) {
            // Create new suport
            const { data: newSuport, error: newError } = await supabase
                .from('suports')
                .insert([{ uid, user: id, activation: nowStr }])
                .select('*')
                .single();

            if (newError) throw newError;

            res.status(201).json({
                success: true,
                suport: newSuport
            });
        } else {
            // Suport exists

            if (existingSuport.user == id) { // Assigned to this user
                return res.status(400).json({
                    success: false,
                    error: 'Suport already assigned to this user'
                });
            } else if (existingSuport.user !== null) { // Assigned to another user
                return res.status(400).json({
                    success: false,
                    error: 'Suport already assigned to another user'
                });
            } else { // Not assigned to any user
                // Assign suport to user
                const { data: updatedSuport, error: updateError } = await supabase
                    .from('suports')
                    .update({ user: id, activation: now })
                    .eq('uid', uid)
                    .select('*')
                    .single();

                if (updateError) throw updateError;

                res.status(200).json({
                    success: true,
                    suport: updatedSuport
                });
            }
        }
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Remove suport from user > DELETE: /users/:id/suports/:uid
const removeSuportFromUser = async (req, res) => {
    const { id, uid } = req.params;
    try {
        const { data, error } = await supabase
            .from('suports')
            .update({ user: null, activation: null })
            .eq('user', id)
            .eq('uid', uid)
            .select('*')
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            uid: uid
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


//// LOCAL FUNCTIONS


// Calculate the age on this exact day given a birthdate
function yearsOldToday(birthdate) {
    const now = new Date();
    let age = now.getFullYear() - birthdate.getFullYear();
    const monthDiff = now.getMonth() - birthdate.getMonth();
    if (monthDiff < 0 || (monthDiff === 0 && now.getDate() < birthdate.getDate())) {
        age--;
    }
    return age;
};

// Calculate the date before the birthday on which a certain years old will be reached
function dayBeforeSpecificBirthday(birthdate, yearsOld) {
    return new Date(
        birthdate.getFullYear() + yearsOld,
        birthdate.getMonth(),
        birthdate.getDate() - 1
    );
};


module.exports = {
    getAllUsers,            // GET      : /users
    getUser,                // GET      : /users/:id
    updateUser,             // PUT      : /users/:id
    createUser,             // POST     : /users/create
    deleteUser,             // DELETE   : /users/:id
    addGroupToUser,         // POST     : /users/:id/groups
    removeGroupFromUser,    // DELETE   : /users/:id/groups/:groupId
    listUserGroups,         // GET      : /users/:id/groups
    listUserSuports,        // GET      : /users/:id/suports
    getUserSuport,          // GET      : /users/:id/suports/:uid
    addSuportToUser,        // POST     : /users/:id/suports
    removeSuportFromUser    // DELETE   : /users/:id/suports/:uid
};