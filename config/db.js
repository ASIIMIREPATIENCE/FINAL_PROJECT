const mongoose = require('mongoose');

const connectDb = async () => {
    try {
        // Temporary hardcoded connection - replace with your actual database name
        await mongoose.connect('mongodb://localhost:27017/nyondo');
        console.log('MongoDB connected successfully to nyondo database');
    } catch (error) {
        console.log('Connection error:', error.message);
    }
};

module.exports = connectDb;