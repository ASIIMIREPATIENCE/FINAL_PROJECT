const mongoose = require('mongoose');

const transactionSchema = new mongoose.Schema({
    depositorId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Depositor',
        required: true
    },
    depositorName: {
        type: String,
        required: true
    },
    type: {
        type: String,
        enum: ['Deposit', 'Withdrawal'],
        required: true
    },
    amount: {
        type: Number,
        required: true
    },
    balanceAfter: {
        type: Number,
        required: true
    },
    date: {
        type: Date,
        default: Date.now
    },
    processedBy: {
        type: String,
        default: 'Admin'
    }
});

module.exports = mongoose.model('Transaction', transactionSchema);