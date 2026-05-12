const mongoose = require('mongoose');

const depositorSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true
    },
    nin: {
        type: String,
        required: true,
        trim: true,
        unique: true
    },
    employer: {
        type: String,
        trim: true
    },
    joinDate: {
        type: Date,
        default: Date.now
    },
    currentBalance: {
        type: Number,
        default: 0
    },
    totalDeposits: {
        type: Number,
        default: 0
    },
    totalWithdrawals: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Depositor', depositorSchema);