const express = require('express');
const cors = require('cors');
require('dotenv').config();

// Import routes
const authRoutes = require('./routes/auth');
const groupsRoutes = require('./routes/groups');
const stationsRoutes = require('./routes/stations');
const titlesRoutes = require('./routes/titles');
const usersRoutes = require('./routes/users');
const validationRoutes = require('./routes/validation');
const zonesRoutes = require('./routes/zones');


// Initialize Express app
const app = express();
//const PORT = process.env.PORT || 3000;
const VERSION = '1.1.0';

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Test route
const now = new Date();
const dateISO = now.getFullYear() + '-' +
    String(now.getMonth() + 1).padStart(2, '0') + '-' +
    String(now.getDate()).padStart(2, '0') + 'T' +
    String(now.getHours()).padStart(2, '0') + ':' +
    String(now.getMinutes()).padStart(2, '0') + ':' +
    String(now.getSeconds()).padStart(2, '0');
app.get('/', (req, res) => {
    res.json({
        message: 'Welcome to PORTA\'M Server API',
        version: VERSION,
        timestamp: dateISO
    });
});


// Use routes
app.use('/api', authRoutes);
app.use('/api', groupsRoutes);
app.use('/api', stationsRoutes);
app.use('/api', titlesRoutes);
app.use('/api', usersRoutes);
app.use('/api', validationRoutes);
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
/**app.listen(PORT, () => {
    console.log(`[P'M SERVER] Server is running on port ${PORT}`);
    console.log(`[P'M SERVER] Health check available at http://localhost:${PORT}/health`);
    console.log(`[P'M SERVER] API endpoints available at http://localhost:${PORT}/api/`);
});/**/

module.exports = app;