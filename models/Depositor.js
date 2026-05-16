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
    // Optional: Track deposit history as an array
    depositHistory: [{
        amount: Number,
        date: {
            type: Date,
            default: Date.now
        },
        attendant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Registration'
        },
        attendantName: String,
        paymentMethod: {
            type: String,
            enum: ['Cash', 'Bank Transfer', 'Mobile Money'],
            default: 'Cash'
        },
        balanceAfter: Number
    }]
});

module.exports = mongoose.model('Depositor', depositorSchema);