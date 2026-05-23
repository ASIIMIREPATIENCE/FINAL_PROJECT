// 
const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({
    customername: {
        type: String,
        required: [true, 'Customer name is required'],
        trim: true
    },
    phonenumber: {
        type: String,
        required: [true, 'Phone number is required'],
        trim: true,
        match: /^\+256[0-9]{9}$/,
    },
    nin: {
        type: String,
        required: false,
        trim: true,
        match: /^(CF|CM).{12}$/
    },
    paymentmethod: {
        type: String,
        enum: ['Cash', 'Mobile Money', 'Bank Transfer','Deposit Scheme'],
        default: 'Cash',
        required: [true]
    },
    // Array of items purchased in this transaction
    items: [{
        productname: {
            type: String,
            required: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        unitprice: {
            type: Number,
            required: true,
            min: 0
        },
        subtotal: {
            type: Number,
            required: true
        }
    }],
    // Totals for the entire transaction
    cartSubtotal: {
        type: Number,
        required: true,
        min: 0
    },
    distance: {
        type: Number,
        default: 0,
        min: [0]
    },
    transportFee: {
        type: Number,
        default: 0,
        min: [0]
    },
    grandTotal: {
        type: Number,
        required: true,
        min: 0
    },
    freeTransportApplied: {
        type: Boolean,
        default: false
    },
    needTransport: {
        type: Boolean,
        default: false
    },
    Date: {
        type: Date,
        default: Date.now
    },
    attendant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration',
        required: false
    },
    attendantName: {
        type: String,
        required: false,
        trim: true
    }

});

module.exports = mongoose.model('Sales', salesSchema);