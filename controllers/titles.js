const e = require('express');
const supabase = require('../config/supabase');

/*
    Titles:
    - id (PK, UQ)   - int8
    - name          - varchar
    - description   - varchar
    - uses          - int8 [null -> unlimited]
    - expiration    - int8 (days) [null -> no expiration]
    - available     - timestamp (when title is available for purchase)
    - unavailable   - timestamp (when title is no longer available for purchase)
    - price         - float4
    - num_zones     - int8
    - link          - int8 (minutes) [null -> always pays] [since validation, all validations within this time are free]
    - re_entry      - int8 (minutes) [null -> instant re-entry] [min time to validate again]

    Title_groups:
    - title (PK) [FK->Titles]   - int8
    - group (PK) [FK->Groups]   - int8

    Title_groups_excluded:
    - title (PK) [FK->Titles]   - int8
    - group (PK) [FK->Groups]   - int8

    User_titles:
    - id (PK, UQ)       - int8
    - user (FK)         - int8
    - title (FK)        - int8
    - uses_left         - int8 [null -> unlimited]
    - first_use         - timestamp [null -> no first use]
    - expiration        - timestamp [null -> no expiration]
    - re_entry          - int8 (minutes) [null -> instant re-entry] [min time to validate again]
    - zone_origin (FK)  - int8 [null -> still to be defined, pending first use]
    - active            - boolean
    - link              - int8 (minutes) [null -> always pays] [since validation, all validations within this time are free]
    - num_zones         - int8

    User_title_zones:
    - user_title (PK, FK)   - int8
    - zone (PK, FK)         - int8

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


    -- FORMATS --

    Title:
    {
        id: 10,
        name: "Title Name",
        description: "Description of the title",
        uses: 10,
        expiration: 30,
        available: "2024-01-01T00:00:00Z",
        unavailable: "2024-12-31T23:59:59Z",
        price: 15.50,
        num_zones: 3,
        link: 60,
        re_entry: 15,
        groups: [1, 2, 3],    |-> Only these can access it      |-> One or the other
        excluded_groups: []   |-> All but these can access it   |
    }

    User Title:
    {
        id: 100,
        user: 50,
        title: 10,
        uses_left: 5,                       -> null means unlimited
        first_use: "2024-06-01T12:00:00Z",  -> null means no first use yet
        expiration: "2024-12-31T23:59:59Z", -> null means no expiration
        re_entry: 15,                       -> null means instant re-entry
        zone_origin: 1,                     -> null means still to be defined, pending first use
        active: true,
        link: 60,                           -> null means always pays
        num_zones: 3,
        zones: [0, 1, 2, 3]                 -> null means still to be defined, pending first use
    }
*/



//// TITLES ////


// Get all titles > GET: /titles
const getAllTitles = async (req, res) => {
    try {
        // General titles fetch
        const { data, error } = await supabase
            .from('titles')
            .select('*');

        if (error) throw error;

        // Attatch groups and excluded_groups to each title
        for (let title of data) {
            const { data: groupsData, error: groupsError } = await supabase
                .from('title_groups')
                .select('group')
                .eq('title', title.id);

            if (groupsError) throw groupsError;

            const { data: excludedGroupsData, error: excludedGroupsError } = await supabase
                .from('title_groups_excluded')
                .select('group')
                .eq('title', title.id);

            if (excludedGroupsError) throw excludedGroupsError;

            title.groups = groupsData.map(g => g.group);
            title.excluded_groups = excludedGroupsData.map(g => g.group);
        }

        res.status(200).json({
            success: true,
            titles: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get title by id > GET: /titles/:id
const getTitleById = async (req, res) => {
    const { id } = req.params;
    try {
        // General title fetch
        const { data, error } = await supabase
            .from('titles')
            .select('*')
            .eq('id', id)
            .single();

        if (error) throw error;

        // Attatch groups and excluded_groups to the title
        const { data: groupsData, error: groupsError } = await supabase
            .from('title_groups')
            .select('group')
            .eq('title', data.id);

        if (groupsError) throw groupsError;

        const { data: excludedGroupsData, error: excludedGroupsError } = await supabase
            .from('title_groups_excluded')
            .select('group')
            .eq('title', data.id);

        if (excludedGroupsError) throw excludedGroupsError;

        data.groups = groupsData.map(g => g.group);
        data.excluded_groups = excludedGroupsData.map(g => g.group);

        res.status(200).json({
            success: true,
            title: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Create new title > POST: /titles
// All fields required except uses, expiration, link, re_entry, groups and excluded_groups
const createTitle = async (req, res) => {
    const { id, name, description, uses, expiration, available, unavailable, price, num_zones, link, re_entry, groups, excluded_groups } = req.body;

    try {
        // Check if all required fields are present
        if (!id || !name || !description || available === undefined || unavailable === undefined || price === undefined || num_zones === undefined) {
            return res.status(400).json({
                success: false,
                error: 'Missing required fields.'
            });
        }

        // Check if title with same id already exists
        // If so, return error
        const { data: existingTitle, error: fetchError } = await supabase
            .from('titles')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError === null) {
            return res.status(400).json({
                success: false,
                error: `Title with id ${id} already exists.`
            });
        }

        if (fetchError && fetchError.code !== 'PGRST116') {
            throw fetchError;
        }

        // If groups and excluded_groups are both provided or both are filled arrays, send error
        if ((groups && excluded_groups) || (Array.isArray(groups) && Array.isArray(excluded_groups) && groups.length && excluded_groups.length)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot provide both groups and excluded_groups.'
            });
        }

        // Check if groups exist
        if (groups && Array.isArray(groups)) {
            for (let groupId of groups) {
                const { data: groupData, error: groupError } = await supabase
                    .from('groups')
                    .select('*')
                    .eq('id', groupId)
                    .single();
                if (groupError) {
                    return res.status(400).json({
                        success: false,
                        error: `Group with id ${groupId} does not exist.`
                    });
                }
            }
        }

        // Check if excluded_groups exist
        if (excluded_groups && Array.isArray(excluded_groups)) {
            for (let groupId of excluded_groups) {
                const { data: groupData, error: groupError } = await supabase
                    .from('groups')
                    .select('*')
                    .eq('id', groupId)
                    .single();
                if (groupError) {
                    return res.status(400).json({
                        success: false,
                        error: `Group with id ${groupId} does not exist.`
                    });
                }
            }
        }

        // Insert new title

        const { data, error } = await supabase
            .from('titles')
            .insert([{
                id,
                name,
                description,
                uses,
                expiration,
                available,
                unavailable,
                price,
                num_zones,
                link,
                re_entry
            }])
            .select();

        if (error) throw error;

        // Insert title groups if provided
        if (groups && Array.isArray(groups)) {
            for (let groupId of groups) {
                const { error: groupError } = await supabase
                    .from('title_groups')
                    .insert([{
                        title: id,
                        group: groupId
                    }]);
                if (groupError) throw groupError;
            }
        }

        // Insert title excluded groups if provided
        if (excluded_groups && Array.isArray(excluded_groups)) {
            for (let groupId of excluded_groups) {
                const { error: excludedGroupError } = await supabase
                    .from('title_groups_excluded')
                    .insert([{
                        title: id,
                        group: groupId
                    }]);
                if (excludedGroupError) throw excludedGroupError;
            }
        }

        // Fetch complete title with groups
        const { data: groupsData, error: groupsError } = await supabase
            .from('title_groups')
            .select('group')
            .eq('title', id);

        if (groupsError) throw groupsError;

        const { data: excludedGroupsData, error: excludedGroupsError } = await supabase
            .from('title_groups_excluded')
            .select('group')
            .eq('title', id);

        if (excludedGroupsError) throw excludedGroupsError;

        const newTitle = {
            ...data[0],
            groups: groupsData.map(g => g.group),
            excluded_groups: excludedGroupsData.map(g => g.group)
        };

        res.status(201).json({
            success: true,
            title: newTitle
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update title by id > PUT: /titles/:id
// Only provided fields will be updated
const updateTitle = async (req, res) => {
    const { id } = req.params;
    const { name, description, uses, expiration, available, unavailable, price, num_zones, link, re_entry, groups, excluded_groups } = req.body;

    try {
        // Check if title exists
        const { data: existingTitle, error: fetchError } = await supabase
            .from('titles')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError) {
            return res.status(404).json({
                success: false,
                error: `Title with id ${id} does not exist.`
            });
        }

        // If groups and excluded_groups are both provided or both are filled arrays, send error
        if ((groups && excluded_groups) || (Array.isArray(groups) && Array.isArray(excluded_groups) && groups.length && excluded_groups.length)) {
            return res.status(400).json({
                success: false,
                error: 'Cannot provide both groups and excluded_groups.'
            });
        }

        // Check if groups exist
        if (groups && Array.isArray(groups)) {
            for (let groupId of groups) {
                const { data: groupData, error: groupError } = await supabase
                    .from('groups')
                    .select('*')
                    .eq('id', groupId)
                    .single();
                if (groupError) {
                    return res.status(400).json({
                        success: false,
                        error: `Group with id ${groupId} does not exist.`
                    });
                }
            }
        }

        // Check if excluded_groups exist
        if (excluded_groups && Array.isArray(excluded_groups)) {
            for (let groupId of excluded_groups) {
                const { data: groupData, error: groupError } = await supabase
                    .from('groups')
                    .select('*')
                    .eq('id', groupId)
                    .single();
                if (groupError) {
                    return res.status(400).json({
                        success: false,
                        error: `Group with id ${groupId} does not exist.`
                    });
                }
            }
        }

        // Build update object only with provided fields
        const updateFields = {};
        if (name !== undefined) updateFields.name = name;
        if (description !== undefined) updateFields.description = description;
        if (uses !== undefined) updateFields.uses = uses;
        if (expiration !== undefined) updateFields.expiration = expiration;
        if (available !== undefined) updateFields.available = available;
        if (unavailable !== undefined) updateFields.unavailable = unavailable;
        if (price !== undefined) updateFields.price = price;
        if (num_zones !== undefined) updateFields.num_zones = num_zones;
        if (link !== undefined) updateFields.link = link;
        if (re_entry !== undefined) updateFields.re_entry = re_entry;

        // Update title
        let updatedTitle;
        if (Object.keys(updateFields).length > 0) {
            const { data: updatedData, error: updateError } = await supabase
                .from('titles')
                .update(updateFields)
                .eq('id', id)
                .select();

            if (updateError) throw updateError;
            updatedTitle = updatedData[0];
        } else {
            updatedTitle = existingTitle;
        }

        // If groups or excluded_groups are provided, update them
        if (groups || excluded_groups) {
            // First, remove existing groups and excluded_groups
            const { error: deleteGroupsError } = await supabase
                .from('title_groups')
                .delete()
                .eq('title', id);
            if (deleteGroupsError) throw deleteGroupsError;

            const { error: deleteExcludedGroupsError } = await supabase
                .from('title_groups_excluded')
                .delete()
                .eq('title', id);
            if (deleteExcludedGroupsError) throw deleteExcludedGroupsError;

            // Then, insert new groups if provided
            if (groups && Array.isArray(groups)) {
                for (let groupId of groups) {
                    const { error: groupError } = await supabase
                        .from('title_groups')
                        .insert([{
                            title: id,
                            group: groupId
                        }]);
                    if (groupError) throw groupError;
                }
            }

            // Insert new excluded_groups if provided
            if (excluded_groups && Array.isArray(excluded_groups)) {
                for (let groupId of excluded_groups) {
                    const { error: excludedGroupError } = await supabase
                        .from('title_groups_excluded')
                        .insert([{
                            title: id,
                            group: groupId
                        }]);
                    if (excludedGroupError) throw excludedGroupError;
                }
            }
        }

        // Fetch complete updated title with groups
        const { data: groupsData, error: groupsError } = await supabase
            .from('title_groups')
            .select('group')
            .eq('title', id);

        if (groupsError) throw groupsError;

        const { data: excludedGroupsData, error: excludedGroupsError } = await supabase
            .from('title_groups_excluded')
            .select('group')
            .eq('title', id);

        if (excludedGroupsError) throw excludedGroupsError;

        const completeUpdatedTitle = {
            ...updatedTitle,
            groups: groupsData.map(g => g.group),
            excluded_groups: excludedGroupsData.map(g => g.group)
        };

        res.status(200).json({
            success: true,
            title: completeUpdatedTitle
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete title by id > DELETE: /titles/:id
const deleteTitle = async (req, res) => {
    const { id } = req.params;
    try {
        // Delete title
        const { data, error } = await supabase
            .from('titles')
            .delete()
            .eq('id', id)
            .select()
            .single();

        if (error) throw error;

        // Delete associated groups and excluded_groups
        const { error: deleteGroupsError } = await supabase
            .from('title_groups')
            .delete()
            .eq('title', id);
        if (deleteGroupsError) throw deleteGroupsError;

        const { error: deleteExcludedGroupsError } = await supabase
            .from('title_groups_excluded')
            .delete()
            .eq('title', id);
        if (deleteExcludedGroupsError) throw deleteExcludedGroupsError;

        res.status(200).json({
            success: true,
            title: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


//// USER TITLES ////


// Get all user titles from a user > GET: /titles/user/:userId
const getAllUserTitles = async (req, res) => {
    const { userId } = req.params;
    try {
        // Fetch all user titles for the user
        const { data, error } = await supabase
            .from('user_titles')
            .select('*')
            .eq('user', userId);

        if (error) throw error;

        // For each user_title, get the title's name and description
        for (let userTitle of data) {
            const { data: titleData, error: titleError } = await supabase
                .from('titles')
                .select('name, description')
                .eq('id', userTitle.title)
                .single();

            if (titleError) throw titleError;

            userTitle.title_name = titleData.name;
            userTitle.title_description = titleData.description;
        }

        res.status(200).json({
            success: true,
            titles: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get the active user title > GET: /titles/user/:userId/active
const getActiveUserTitle = async (req, res) => {
    const { userId } = req.params;
    
    try {
        // Fetch active user title for the user
        const { data, error } = await supabase
            .from('user_titles')
            .select('*')
            .eq('user', userId)
            .eq('active', true)
            .single();
        if (error) {
            if (error.code === 'PGRST116') {
                return res.status(404).json({
                    success: false,
                    error: 'No active title found for this user.'
                });
            } else {
                throw error;
            }
        }
        res.status(200).json({
            success: true,
            title: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
}

// Get user title by id > GET: /titles/user/:userId/:userTitleId
const getUserTitleById = async (req, res) => {
    const { userId, userTitleId } = req.params;
    try {
        // Fetch user title by id
        const { data, error } = await supabase
            .from('user_titles')
            .select('*')
            .eq('user', userId)
            .eq('id', userTitleId)
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            title: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// List titles available for user to purchase > GET: /titles/user/:userId/available
const listTitlesForUser = async (req, res) => {
    const { userId } = req.params;
    try {
        // Fetch user data to verify user exists
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();
        if (userError || !userData) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }
        
        // Fetch all groups the user belongs to
        const { data: userGroupsData, error: userGroupsError } = await supabase
            .from('user_groups')
            .select('group')
            .eq('user', userId);
        if (userGroupsError) throw userGroupsError;

        // Extract user's group IDs into an array
        const userGroupIds = userGroupsData.map(ug => ug.group);

        // Fetch all titles
        const { data: allTitles, error: titlesError } = await supabase
            .from('titles')
            .select('*');
        if (titlesError) throw titlesError;
        
        // Filter titles based on user's groups and title availability
        const availableTitles = [];
        const currentTime = new Date();
        
        for (let title of allTitles) {
            // Check availability dates
            const availableDate = new Date(title.available);
            const unavailableDate = new Date(title.unavailable);
            if (currentTime < availableDate || currentTime > unavailableDate) {
                continue; // Title not currently available
            }
            
            // Check group restrictions
            const { data: titleGroups, error: titleGroupsError } = await supabase
                .from('title_groups')
                .select('group')
                .eq('title', title.id);
            if (titleGroupsError) throw titleGroupsError;
            
            const { data: excludedGroups, error: excludedGroupsError } = await supabase
                .from('title_groups_excluded')
                .select('group')
                .eq('title', title.id);
            if (excludedGroupsError) throw excludedGroupsError;
            
            const allowedGroupIds = titleGroups.map(g => g.group);
            const excludedGroupIds = excludedGroups.map(g => g.group);
            
            // Determine if user can access the title
            let canAccess = true;
            
            // If there are specific allowed groups, check if user belongs to at least one
            if (allowedGroupIds.length > 0) {
                const hasAllowedGroup = userGroupIds.some(userGroupId => allowedGroupIds.includes(userGroupId));
                if (!hasAllowedGroup) {
                    canAccess = false; // User doesn't belong to any of the allowed groups
                }
            }
            
            // If there are excluded groups, check if user belongs to any of them
            if (excludedGroupIds.length > 0) {
                const hasExcludedGroup = userGroupIds.some(userGroupId => excludedGroupIds.includes(userGroupId));
                if (hasExcludedGroup) {
                    canAccess = false; // User belongs to at least one excluded group
                }
            }
            
            if (canAccess) {
                availableTitles.push(title);
            }
        }
        
        res.status(200).json({
            success: true,
            titles: availableTitles
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
        console.error(error);
    }
}

// Assign title to user > POST: /titles/user/:userId
/*
    Request body:
    { title: 10 }

    Parameters to insert into de database:
        user: 50,
        title: 10,
        uses_left: 5,                       -> null means unlimited
        expiration: "2024-12-31T23:59:59Z", -> null means no expiration
        re_entry: 15,                       -> null means instant re-entry
        active: true,
        link: 60,                           -> null means always pays
        num_zones: 3
        -- All data except for user and title are set by the data from the title
*/
const assignTitleToUser = async (req, res) => {
    const { title } = req.body;
    const { userId } = req.params;

    try {

        // 1. Check if user exists
        const { data: userData, error: userError } = await supabase
            .from('users')
            .select('id')
            .eq('id', userId)
            .single();

        if (userError || !userData) {
            return res.status(404).json({
                success: false,
                error: 'User not found'
            });
        }

        // 2. Check if title exists
        const { data: titleData, error: titleError } = await supabase
            .from('titles')
            .select('*')
            .eq('id', title)
            .single();

        if (titleError || !titleData) {
            return res.status(404).json({
                success: false,
                error: 'Title not found'
            });
        }

        // 3. Get title data to fill in the rest of the fields
        const uses_left = titleData.uses;
        const re_entry = titleData.re_entry;
        const link = titleData.link;
        const num_zones = titleData.num_zones;
        // Expiration date is calculated based on current date + title expiration days
        let expiration = null;
        if (titleData.expiration !== null && titleData.expiration !== undefined) {
            const currentDate = new Date();
            currentDate.setDate(currentDate.getDate() + titleData.expiration);
            expiration = "" + currentDate.getFullYear() + "-" +
                String(currentDate.getMonth() + 1).padStart(2, '0') + "-" +
                String(currentDate.getDate()).padStart(2, '0');
        }

        // 4. Generate random id for user title
        let utid;
        do {
            // Generate random 12-digit id
            utid = Math.floor(100000000000 + Math.random() * 900000000000).toString();
            const { data: existingUserTitle, error: fetchError } = await supabase
                .from('user_titles')
                .select('*')
                .eq('id', utid)
                .single();

            if (fetchError && fetchError.code === 'PGRST116') break; // Unique id found
        } while (true);

        // 5. Insert user title
        const { error: insertError } = await supabase
            .from('user_titles')
            .insert({
                id: utid,
                user: userId,
                title: title,
                uses_left: uses_left,
                expiration: expiration,
                re_entry: re_entry,
                active: false,
                link: link,
                num_zones: num_zones
            });

        if (insertError) {
            return res.status(500).json({
                success: false,
                error: insertError.message
            });
        }

        res.status(201).json({
            success: true,
            message: {
                id: utid,
                user: userId,
                title: title,
                uses_left: uses_left,
                expiration: expiration,
                re_entry: re_entry,
                active: true,
                link: link,
                num_zones: num_zones
            }
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Remove title from user > DELETE: /titles/user/:userId/:userTitleId
const removeTitleFromUser = async (req, res) => {
    const { userId, userTitleId } = req.params;
    try {
        // Delete user title
        const { data, error } = await supabase
            .from('user_titles')
            .delete()
            .eq('id', userTitleId)
            .eq('user', userId)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            title: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Activate title from user > POST: /titles/user/:userId/:userTitleId/activate
// Every user can only have one active title at a time
const activateTitleForUser = async (req, res) => {
    const { userId, userTitleId } = req.params;
    try {
        // Deactivate any currently active title for the user
        const { error: deactivateError } = await supabase
            .from('user_titles')
            .update({ active: false })
            .eq('user', userId)
            .eq('active', true);

        if (deactivateError) throw deactivateError;

        // Activate the specified title
        const { data, error } = await supabase
            .from('user_titles')
            .update({ active: true })
            .eq('id', userTitleId)
            .eq('user', userId)
            .select()
            .single();

        if (error) throw error;

        res.status(200).json({
            success: true,
            title: data
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

module.exports = {
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
};