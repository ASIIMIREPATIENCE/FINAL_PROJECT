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
        enum: ['Cash', 'Mobile Money', 'Bank Transfer'],
        default: 'Cash',
        required: [true]
    },
    productname: {
        type: String,
        required: [true],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true],
        min: [1]
    },
    unitprice: {
        type: Number,
        required: [true],
        min: [0]
    },
    subtotal: {
        type: Number,
        required: true,
        min: [0]
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
    total: {
        type: Number,
        required: true,
        min: [0,]
    },
    free_transport_applied: {
        type: Boolean,
        default: false
    },
    items: {
        type: Array,
        default: []
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
        required: false
    }
});

module.exports = mongoose.model('Sales', salesSchema);