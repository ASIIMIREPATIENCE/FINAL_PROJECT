const mongoose = require('mongoose');

const depositorSchema = new mongoose.Schema({
    fullName: {
        type: String,
        required: true,
        trim: true,
    },
    phoneNumber: {
        type: String,
        required: true,
        trim: true,
    },
    nin: {
        type: String,
        required: true,
        unique: true,
        trim: true,
    },
    employer: {
        type: String,
        default: '',
        trim: true,
    },
    joinDate: {
        type: Date,
        default: Date.now,
    },
    items: [{
        productname: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            default: 1,
        },
        unitprice: {
            type: Number,
            required: true,
        },
        subtotal: {
            type: Number,
            required: true,
        }
    }],
    itemsSubtotal: {
        type: Number,
        default: 0,
    },
    needTransport: {
        type: Boolean,
        default: false,
    },
    distance: {
        type: Number,
        default: 0,
    },
    transportFee: {
        type: Number,
        default: 0,
    },
    totalAmountOwed: {
        type: Number,
        default: 0,
    },
    totalPaid: {
        type: Number,
        default: 0,
    },
    remainingBalance: {
        type: Number,
        default: 0,
    },
    depositHistory: [{
        date: {
            type: Date,
            default: Date.now,
        },
        amountPaid: {
            type: Number,
            required: true,
        },
        totalOwedAtTime: {
            type: Number,
            required: true,
        },
        balanceAfter: {
            type: Number,
            required: true,
        },
        paymentMethod: {
            type: String,
            enum: ['Cash', 'Bank Transfer', 'Mobile Money'],
            default: 'Cash',
        },
        attendant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Registration',
        },
        attendantName: {
            type: String,
            trim: true,
        },
        notes: {
            type: String,
            trim: true,
        }
    }],
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled'],
        default: 'active',
    }
});

module.exports = mongoose.model('Depositor', depositorSchema);