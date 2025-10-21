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
        } else if (groupId === '65' && yearsOldToday(birthdate) < 65) {
            const dayBefore = dayBeforeSpecificBirthday(birthdate, 65);
            expirationDate = "" + dayBefore.getFullYear() + "-" + String(dayBefore.getMonth() + 1).padStart(2, '0') + "-" + String(dayBefore.getDate()).padStart(2, '0');
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


//// SUPPORT FUNCTIONS


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
    listUserGroups          // GET      : /users/:id/groups
};