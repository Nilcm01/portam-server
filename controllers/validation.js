const e = require('express');
const supabase = require('../config/supabase');
const { getMessage, getMessageWithData } = require('../messages/validation');


/*
    Validation:
    - user (PK, FK)         - int8
    - suport (PK, FK)       - int8
    - timestamp (PK)        - timestamp
    - station (PK, FK)      - int8
    - enter (PK)            - boolean   [currently not used, always true]
    - user_title (PK, FK)   - int8

    Suports:
    - uid (PK, UQ)          - int8
    - user (FK -> users.id) - int8
    - activation            - timestamp
    
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

    Zones:
    - id (PK, UQ)   - int8
    - name          - varchar
    - description   - varchar
*/

/*
    The validation process gets called with the suport UID and station ID:
        body: {
            suport: <suport_uid>,
            station: <station_id>
        }

    The process performs the following checks in order:
    
    1. Checks if the suport exists
        -> if not, error ERROR_SUPORT_NOT_FOUND
    2. Checks if the suport is active (activation is not null and is in the past)
        -> if not, error ERROR_SUPORT_INACTIVE
    3. Checks if the station exists and is available
        -> if not, error ERROR_STATION_NOT_AVAILABLE
    4. Checks if the user has an active user_title
        -> if not, error ERROR_NO_USER_TITLE_ACTIVE
    5. Checks if the user_title is not expired
        -> if so, error ERROR_USER_TITLE_EXPIRED
    6. Checks if the user_title is initialized (first_use is not null)
        -> if not, checks if the title could be initialized in this station
            -> checks if station has zones that match the num_zones of the user_title
            -> if not, error ERROR_CANNOT_INITIALIZE_USER_TITLE
            -> if so, sets first_use, zone_origin and user_title_zones
    7. Checks if the re-entry time has passed (if re_entry is not null)
        -> gets the most recent validation for this user_title (same user_title)
        -> if validation exists and is for the SAME station and (current_time - validation_time) < re_entry
            -> error ERROR_REENTRY_TIME_NOT_PASSED
        -> purpose: prevent users from sharing uni-personal titles by blocking re-entry to the same station
    8. Checks if the user_title is valid for the station's zones
        -> gets the zones of the station
        -> gets the zones of the user_title (from user_title_zones)
        -> checks if there's at least one zone in common
        -> if not, error ERROR_USER_TITLE_NOT_VALID_FOR_ZONE
    9. Checks if the link time has not passed (if link is not null)
        -> gets the most recent validation for this user_title (same user_title)
        -> if validation exists and (current_time - validation_time) < link and station is DIFFERENT from last validation
            -> the user_title is still valid for the station's zones (already checked in step 8)
            -> validation is free (no uses consumed), create validation record and return success
        -> purpose: allow users to use multiple public transport types in the same trip without paying again
        -> note: link time only applies to DIFFERENT stations to prevent multiple people sharing the same title at the same station
    10. Checks if the user_title has uses left (if uses_left is not null)
        -> if uses_left <= 0, error ERROR_NO_USES_LEFT
    
    - If all checks passed, creates validation record, decrements uses_left if applicable (and not null), and returns VALIDATION_SUCCESS.

    Message use examples:
    
    // Return error message
    const message = getMessage('ERROR_SUPORT_NOT_FOUND');
    return res.status(message.code).json(message);

    // Return success with additional data
    const successMessage = getMessageWithData('VALIDATION_SUCCESS', {
        validation_id: validationRecord.id,
        uses_left: updatedUsesLeft,
        free_validation: false
    });
    return res.status(successMessage.code).json(successMessage);
*/
const validation = async (req, res) => {
    try {
        const { suport, station } = req.body;

        // Check required parameters
        if (!suport || !station) {
            const message = getMessage('ERROR_MISSING_PARAMETERS');
            return res.status(message.code).json(message);
        }

        // 1. Check if the suport exists
        const { data: suportData, error: suportError } = await supabase
            .from('suports')
            .select('*')
            .eq('uid', suport)
            .single();

        if (suportError || !suportData) {
            const message = getMessage('ERROR_SUPORT_NOT_FOUND');
            return res.status(message.code).json(message);
        }

        // 2. Check if the suport is active
        if (!suportData.activation || new Date(suportData.activation) > new Date()) {
            const message = getMessage('ERROR_SUPORT_INACTIVE');
            return res.status(message.code).json(message);
        }

        // 3. Check if the station exists and is available
        const { data: stationData, error: stationError } = await supabase
            .from('stations')
            .select('*')
            .eq('id', station)
            .single();

        if (stationError || !stationData || !stationData.available) {
            const message = getMessage('ERROR_STATION_NOT_AVAILABLE');
            return res.status(message.code).json(message);
        }

        // 4. Check if the user has an active user_title
        const { data: userTitleData, error: userTitleError } = await supabase
            .from('user_titles')
            .select('*')
            .eq('user', suportData.user)
            .eq('active', true)
            .single();

        if (userTitleError || !userTitleData) {
            const message = getMessage('ERROR_NO_USER_TITLE_ACTIVE');
            return res.status(message.code).json(message);
        }

        // 5. Check if the user_title is not expired
        if (userTitleData.expiration && new Date(userTitleData.expiration) < new Date()) {
            const message = getMessage('ERROR_USER_TITLE_EXPIRED');
            return res.status(message.code).json(message);
        }

        // 6. Check if the user_title is initialized
        if (!userTitleData.first_use) {
            // Need to initialize the user_title
            // Get station zones (pick the first one as zone_origin)
            const { data: stationZones, error: stationZonesError } = await supabase
                .from('station_zones')
                .select('zone')
                .eq('station', station)
                .order('zone', { ascending: true });

            if (stationZonesError || !stationZones || stationZones.length === 0) {
                const message = getMessage('ERROR_CANNOT_INITIALIZE_USER_TITLE');
                return res.status(message.code).json(message);
            }

            // Set zone_origin as the first zone of the station
            const zoneOrigin = stationZones[0].zone;
            const numZones = userTitleData.num_zones;

            // Get all existing zones to validate zone IDs
            const { data: allZones, error: allZonesError } = await supabase
                .from('zones')
                .select('id')
                .order('id', { ascending: true });

            if (allZonesError || !allZones) {
                const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
                    internal: allZonesError ? allZonesError.message : 'No zones data returned from database'
                });
                return res.status(message.code).json(message);
            }

            // Create a set of existing zone IDs for quick lookup
            const existingZoneIds = new Set(allZones.map(z => z.id));

            // Calculate circular zones around zone_origin
            // Examples:
            // - num_zones 3, zone_origin 4 -> [2,3,4,5,6] (radius = 2)
            // - num_zones 2, zone_origin 2 -> [1,2,3] (radius = 1)
            // - num_zones 3, zone_origin 1 -> [0,1,2,3] (radius = 2, but zone -1 doesn't exist)
            const radius = numZones - 1;
            const userTitleZoneIds = [];

            // Generate zone IDs in a circular pattern around zone_origin
            for (let offset = -radius; offset <= radius; offset++) {
                const zoneId = zoneOrigin + offset;
                // Only add if the zone exists
                if (existingZoneIds.has(zoneId)) {
                    userTitleZoneIds.push(zoneId);
                }
            }

            // If we don't have enough zones (due to boundaries), we need to handle this
            // The user_title cannot be initialized if there aren't valid zones
            if (userTitleZoneIds.length === 0) {
                const message = getMessage('ERROR_CANNOT_INITIALIZE_USER_TITLE');
                return res.status(message.code).json(message);
            }

            const ct = new Date();
            const currentTime = ct.getFullYear() + '-' +
                String(ct.getMonth() + 1).padStart(2, '0') + '-' +
                String(ct.getDate()).padStart(2, '0') + ' ' +
                String(ct.getHours()).padStart(2, '0') + ':' +
                String(ct.getMinutes()).padStart(2, '0') + ':' +
                String(ct.getSeconds()).padStart(2, '0');

            // Update user_title with first_use and zone_origin
            const { error: updateError } = await supabase
                .from('user_titles')
                .update({
                    first_use: currentTime,
                    zone_origin: zoneOrigin
                })
                .eq('id', userTitleData.id);

            if (updateError) {
                const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
                    internal: `Failed to update user_title first_use and zone_origin: ${updateError.message}`
                });
                return res.status(message.code).json(message);
            }

            // Insert user_title_zones (one row per zone)
            const userTitleZones = userTitleZoneIds.map(zoneId => ({
                user_title: userTitleData.id,
                zone: zoneId
            }));

            const { error: zonesInsertError } = await supabase
                .from('user_title_zones')
                .insert(userTitleZones);

            if (zonesInsertError) {
                const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
                    internal: `Failed to insert user_title_zones: ${zonesInsertError.message}`
                });
                return res.status(message.code).json(message);
            }

            // Update local userTitleData
            userTitleData.first_use = currentTime;
            userTitleData.zone_origin = zoneOrigin;
        }

        // 7. Check if the re-entry time has passed
        if (userTitleData.re_entry !== null) {
            const { data: lastValidation, error: lastValidationError } = await supabase
                .from('validation')
                .select('*')
                .eq('user_title', userTitleData.id)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            if (lastValidation && !lastValidationError) {
                // Add 'Z' to force UTC interpretation if not present, ensuring consistent timezone handling
                const timestampStr = lastValidation.timestamp.endsWith('Z') ? lastValidation.timestamp : lastValidation.timestamp + 'Z';
                const lastValidationTime = new Date(timestampStr);
                const timeSinceLastValidation = (new Date() - lastValidationTime) / (1000 * 60); // minutes
                
                // Check if it's the same station and re-entry time hasn't passed
                // Convert both to numbers to ensure proper comparison
                const lastStationId = Number(lastValidation.station);
                const currentStationId = Number(station);
                
                if (lastStationId === currentStationId && timeSinceLastValidation < userTitleData.re_entry) {
                    const message = getMessage('ERROR_REENTRY_TIME_NOT_PASSED');
                    return res.status(message.code).json(message);
                }
            }
        }

        // 8. Check if the user_title is valid for the station's zones
        const { data: stationZones, error: stationZonesError } = await supabase
            .from('station_zones')
            .select('zone')
            .eq('station', station);

        if (stationZonesError) {
            const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
                internal: `Failed to fetch station zones: ${stationZonesError.message}`
            });
            return res.status(message.code).json(message);
        }

        const { data: userTitleZones, error: userTitleZonesError } = await supabase
            .from('user_title_zones')
            .select('zone')
            .eq('user_title', userTitleData.id);

        if (userTitleZonesError) {
            const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
                internal: `Failed to fetch user_title zones: ${userTitleZonesError.message}`
            });
            return res.status(message.code).json(message);
        }

        // Check if there's at least one zone in common
        const stationZoneIds = stationZones.map(sz => sz.zone);
        const userTitleZoneIds = userTitleZones.map(uz => uz.zone);
        const hasCommonZone = stationZoneIds.some(zoneId => userTitleZoneIds.includes(zoneId));

        if (!hasCommonZone) {
            const message = getMessage('ERROR_USER_TITLE_NOT_VALID_FOR_ZONE');
            return res.status(message.code).json(message);
        }

        // 9. Check if the link time has not passed
        let isFreeValidation = false;
        if (userTitleData.link !== null) {
            const { data: lastValidation, error: lastValidationError } = await supabase
                .from('validation')
                .select('*')
                .eq('user_title', userTitleData.id)
                .order('timestamp', { ascending: false })
                .limit(1)
                .single();

            if (lastValidation && !lastValidationError) {
                // Add 'Z' to force UTC interpretation if not present, ensuring consistent timezone handling
                const timestampStr = lastValidation.timestamp.endsWith('Z') ? lastValidation.timestamp : lastValidation.timestamp + 'Z';
                const lastValidationTime = new Date(timestampStr);
                const timeSinceLastValidation = (new Date() - lastValidationTime) / (1000 * 60); // minutes
                
                // Link time only applies if the station is DIFFERENT from the last validation
                // This prevents multiple people from using the same title to enter the same station
                // Convert both to numbers to ensure proper comparison
                const lastStationId = Number(lastValidation.station);
                const currentStationId = Number(station);
                
                if (timeSinceLastValidation < userTitleData.link && lastStationId !== currentStationId) {
                    // Validation is free
                    isFreeValidation = true;
                }
            }
        }

        // 10. Check if the user_title has uses left (only if not a free validation)
        if (!isFreeValidation && userTitleData.uses_left !== null) {
            if (userTitleData.uses_left <= 0) {
                const message = getMessage('ERROR_NO_USES_LEFT');
                return res.status(message.code).json(message);
            }
        }

        // All checks passed - create validation record
        const currentTime = new Date();
        const { data: validationRecord, error: validationInsertError } = await supabase
            .from('validation')
            .insert({
                user: suportData.user,
                suport: suport,
                timestamp: currentTime,
                station: station,
                enter: true,    // currently always true
                user_title: userTitleData.id
            })
            .select()
            .single();

        if (validationInsertError) {
            const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
                internal: `Failed to create validation record: ${validationInsertError.message}`
            });
            return res.status(message.code).json(message);
        }

        // Decrement uses_left if applicable (not null and not free validation)
        let updatedUsesLeft = userTitleData.uses_left;
        if (!isFreeValidation && userTitleData.uses_left !== null) {
            updatedUsesLeft = userTitleData.uses_left - 1;
            const { error: updateUsesError } = await supabase
                .from('user_titles')
                .update({ uses_left: updatedUsesLeft })
                .eq('id', userTitleData.id);

            if (updateUsesError) {
                const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
                    internal: `Failed to decrement uses_left: ${updateUsesError.message}`
                });
                return res.status(message.code).json(message);
            }
        }

        // Return success with additional data
        const successMessage = getMessageWithData('VALIDATION_SUCCESS', {
            validation_id: validationRecord.id,
            timestamp: validationRecord.timestamp,
            station_id: station,
            user_title_id: userTitleData.id,
            uses_left: updatedUsesLeft,
            expiration: userTitleData.expiration,
            link: isFreeValidation
        });

        return res.status(successMessage.code).json(successMessage);

    } catch (error) {
        console.error('Validation error:', error);
        const message = getMessageWithData('ERROR_INTERNAL_SERVER', {
            internal: `Unexpected error during validation: ${error.message}`
        });
        return res.status(message.code).json(message);
    }
};



module.exports = {
    validation          // POST      : /validation
};