const e = require('express');
const supabase = require('../config/supabase');

/*
    Stations:
    - id (PK, UQ)   - int8
    - name          - varchar
    - name_short    - varchar
    - available     - boolean

    Station_zones:
    - station (PK, FK)  - int8
    - zone (PK, FK)     - int8

    Format to use:
    {
        id: 10,
        name: "Station Name",
        name_short: "Stn Nm",
        available: true,
        zones: [1, 2, 3]
    }
*/

// Get all stations > GET: /stations
const getAllStations = async (req, res) => {
    try {
        const { data: dataStations, error: errorStations } = await supabase
            .from('stations')
            .select('*');

        if (errorStations) throw errorStations;

        const { data: dataStationZones, error: errorStationZones } = await supabase
            .from('station_zones')
            .select('*');

        if (errorStationZones) throw errorStationZones;

        // Merge zones into stations
        const stations = mergeZonesIntoStations(dataStations, dataStationZones);

        res.status(200).json({
            success: true,
            stations: stations
        });

    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Get station by id > GET: /stations/:id
const getStation = async (req, res) => {
    const { id } = req.params;
    try {
        const { data: stationData, error: stationError } = await supabase
            .from('stations')
            .select('*')
            .eq('id', id)
            .single();

        if (stationError) throw stationError;

        const { data: stationZonesData, error: stationZonesError } = await supabase
            .from('station_zones')
            .select('*')
            .eq('station', id);

        if (stationZonesError) throw stationZonesError;

        const station = mergeZonesIntoStations([stationData], stationZonesData)[0];

        res.status(200).json({
            success: true,
            station: station
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Create new station > POST: /stations
const createStation = async (req, res) => {
    const { id, name, name_short, available, zones } = req.body;
    try {
        // Check if station with same id already exists
        const { data: existingStation, error: fetchError } = await supabase
            .from('stations')
            .select('*')
            .eq('id', id)
            .single();

        if (fetchError && fetchError.code !== 'PGRST116') throw fetchError; // PGRST116: No rows found

        if (existingStation) {
            return res.status(400).json({
                success: false,
                error: 'Station with this ID already exists'
            });
        }

        // Insert new station
        const { data: insertedData, error: insertError } = await supabase
            .from('stations')
            .insert([{ id, name, name_short, available }])
            .select();

        if (insertError) throw insertError;

        const newStation = insertedData[0];

        // Insert station zones
        if (zones && Array.isArray(zones) && zones.length > 0) {
            const stationZonesToInsert = zones.map(zoneId => ({
                station: id,
                zone: zoneId
            }));

            const { error: stationZonesInsertError } = await supabase
                .from('station_zones')
                .insert(stationZonesToInsert);

            if (stationZonesInsertError) throw stationZonesInsertError;
        }

        // Fetch the complete station with zones
        const { data: stationZonesData, error: stationZonesFetchError } = await supabase
            .from('station_zones')
            .select('*')
            .eq('station', id);

        if (stationZonesFetchError) throw stationZonesFetchError;

        const station = mergeZonesIntoStations([newStation], stationZonesData)[0];

        res.status(201).json({
            success: true,
            station: station
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Update station by id > PUT: /stations/:id
const updateStation = async (req, res) => {
    const { id } = req.params;
    const { name, name_short, available, zones } = req.body;
    try {
        // Build update object only with provided fields
        const updateFields = {};
        if (name !== undefined && name !== null) updateFields.name = name;
        if (name_short !== undefined && name_short !== null) updateFields.name_short = name_short;
        if (available !== undefined && available !== null) updateFields.available = available;

        // Only update if there are fields to update
        let updatedStation;
        if (Object.keys(updateFields).length > 0) {
            const { data: updatedData, error: updateError } = await supabase
                .from('stations')
                .update(updateFields)
                .eq('id', id)
                .select();

            if (updateError) throw updateError;
            updatedStation = updatedData[0];
        } else {
            // If no fields to update, just fetch the current station
            const { data: currentData, error: fetchError } = await supabase
                .from('stations')
                .select('*')
                .eq('id', id)
                .single();

            if (fetchError) throw fetchError;
            updatedStation = currentData;
        }

        // Update station zones
        if (zones && Array.isArray(zones)) {
            // Delete existing zones
            const { error: deleteError } = await supabase
                .from('station_zones')
                .delete()
                .eq('station', id);

            if (deleteError) throw deleteError;

            // Insert new zones
            if (zones.length > 0) {
                const stationZonesToInsert = zones.map(zoneId => ({
                    station: id,
                    zone: zoneId
                }));

                const { error: insertError } = await supabase
                    .from('station_zones')
                    .insert(stationZonesToInsert);

                if (insertError) throw insertError;
            }
        }

        // Fetch the complete station with zones
        const { data: stationZonesData, error: stationZonesFetchError } = await supabase
            .from('station_zones')
            .select('*')
            .eq('station', id);

        if (stationZonesFetchError) throw stationZonesFetchError;

        const station = mergeZonesIntoStations([updatedStation], stationZonesData)[0];

        res.status(200).json({
            success: true,
            station: station
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};

// Delete station by id > DELETE: /stations/:id
const deleteStation = async (req, res) => {
    const { id } = req.params;
    try {
        // Check if station exists (handle 0 rows gracefully)
        const { data: existingStation, error: fetchError } = await supabase
            .from('stations')
            .select('*')
            .eq('id', id)
            .maybeSingle();

        if (fetchError) throw fetchError;

        if (!existingStation) {
            return res.status(404).json({
                success: false,
                error: 'Station not found'
            });
        }

        // Delete station zones first due to foreign key constraint
        const { error: deleteZonesError } = await supabase
            .from('station_zones')
            .delete()
            .eq('station', id);

        if (deleteZonesError) throw deleteZonesError;

        // Delete the station
        const { error: deleteStationError } = await supabase
            .from('stations')
            .delete()
            .eq('id', id);

        if (deleteStationError) throw deleteStationError;

        res.status(200).json({
            success: true,
            message: id
        });
    } catch (error) {
        res.status(500).json({
            success: false,
            error: error.message
        });
    }
};


//// Helper functions

// Helper function to merge zones into stations
const mergeZonesIntoStations = (stations, stationZones) => {
    return stations.map(station => {
        const zones = stationZones
            .filter(sz => sz.station === station.id)
            .map(sz => sz.zone);
        return { ...station, zones };
    });
};


module.exports = {
    getAllStations,            // GET   : /stations
    getStation,                // GET   : /stations/:id
    createStation,             // POST  : /stations
    updateStation,             // PUT   : /stations/:id
    deleteStation              // DELETE: /stations/:id
};