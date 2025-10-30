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
                String(currentDate.getDate()).padStart(2, '0') + "T" +
                String(currentDate.getHours()).padStart(2, '0') + ":" +
                String(currentDate.getMinutes()).padStart(2, '0') + ":" +
                String(currentDate.getSeconds()).padStart(2, '0') + "Z";
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
                active: true,
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


// Set first use for user title > POST: /titles/user/:userId/:userTitleId/first_use
// TODO
const setFirstUseForUserTitle = () => {};


module.exports = {
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
};