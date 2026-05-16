// 
const mongoose = require('mongoose');

const supplierCreditSchema = new mongoose.Schema({
    supplierName: {
        type: String,
        required: true,
        trim: true
    },
    stockId: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Stock',
        required: false
    },
    amount: {
        type: Number,
        required: true
    },
    remainingBalance: {
        type: Number,
        default: 0
    },
    creditDate: {
        type: Date,
        default: Date.now
    },
    dueDate: {
        type: Date,
        required: true
    },
    notes: {
        type: String,
        trim: true
    },
    status: {
        type: String,
        enum: ['Pending', 'Partial', 'Paid', 'Overdue'],
        default: 'Pending'
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Bank Transfer', 'Mobile Money'],
        default: 'Cash'
    },
    paymentReference: {
        type: String,
        trim: true
    },
    paidDate: {
        type: Date
    }
});

module.exports = mongoose.model('SupplierCredit', supplierCreditSchema);