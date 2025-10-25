const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const groupsRoutes = require('./routes/groups');
const stationsRoutes = require('./routes/stations');
const usersRoutes = require('./routes/users');
const zonesRoutes = require('./routes/zones');


// Initialize Express app
const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to PORTA\'M Server API',
        timestamp: new Date().toISOString()
    });
});


// Use routes
app.use('/api', groupsRoutes);
app.use('/api', stationsRoutes);
app.use('/api', usersRoutes);
app.use('/api', zonesRoutes);


// Health check
app.get('/health', (req, res) => {
    res.json({
        status: 'OK',
        timestamp: new Date().toISOString()
    });
});


// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).json({
        success: false,
        error: 'Something went wrong!'
    });
});

// 404 handler
app.use('*', (req, res) => {
    res.status(404).json({
        success: false,
        error: 'Route not found'
    });
});

// Start server
app.listen(PORT, () => {
    console.log(`[P'M SERVER] Server is running on port ${PORT}`);
    console.log(`[P'M SERVER] Health check available at http://localhost:${PORT}/health`);
    console.log(`[P'M SERVER] API endpoints available at http://localhost:${PORT}/api/`);
});

module.exports = app;