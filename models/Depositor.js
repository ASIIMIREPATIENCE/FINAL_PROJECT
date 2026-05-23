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
    // Pickup fields
    pickupStatus: {
        type: String,
        enum: ['pending', 'ready', 'picked_up', 'cancelled'],
        default: 'pending'
    },
    pickupDate: {
        type: Date,
        default: null
    },
    pickedUpBy: {
        type: String,
        trim: true
    },
    pickupNotes: {
        type: String,
        trim: true
    },
    pickupHistory: [{
        action: {
            type: String,
            enum: ['marked_ready', 'picked_up', 'cancelled'],
            required: true
        },
        date: {
            type: Date,
            default: Date.now
        },
        attendant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Registration',
        },
        attendantName: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true
        }
    }],
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
        },
        transportFee: {
            type: Number,
            default: 0,
        }
    }],
    status: {
        type: String,
        enum: ['active', 'completed', 'cancelled', 'picked_up'],
        default: 'active',
    }
});

module.exports = mongoose.model('Depositor', depositorSchema);