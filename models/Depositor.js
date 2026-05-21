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
    currentBalance: {
        type: Number,
        default: 0,
    },
    totalDeposits: {
        type: Number,
        default: 0,
    },
    depositHistory: [{
        amount: {
            type: Number,
            default: 0,
        },
        date: {
            type: Date,
            default: Date.now,
        },
        attendant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Registration',
        },
        attendantName: {
            type: String,
            trim: true,
        },
        paymentMethod: {
            type: String,
            enum: ['Cash', 'Bank Transfer', 'Mobile Money'],
            default: 'Cash',
        },
        balanceAfter: {
            type: Number,
            default: 0,
        },
        // New fields for item purchases
        items: [{
            productname: {
                type: String,
                trim: true,
            },
            quantity: {
                type: Number,
                default: 0,
            },
            unitprice: {
                type: Number,
                default: 0,
            },
            subtotal: {
                type: Number,
                default: 0,
            }
        }],
        cartSubtotal: {
            type: Number,
            default: 0,
        },
        distance: {
            type: Number,
            default: 0,
        },
        transportFee: {
            type: Number,
            default: 0,
        },
        grandTotal: {
            type: Number,
            default: 0,
        },
        freeTransportApplied: {
            type: Boolean,
            default: false,
        },
        needTransport: {
            type: Boolean,
            default: false,
        },
        paymentStatus: {
            type: String,
            enum: ['pending', 'partial', 'completed'],
            default: 'pending',
        },
        amountPaid: {
            type: Number,
            default: 0,
        },
        remainingBalance: {
            type: Number,
            default: 0,
        }
    }]
});

module.exports = mongoose.model('Depositor', depositorSchema);