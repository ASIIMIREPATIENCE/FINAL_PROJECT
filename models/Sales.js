
const mongoose = require('mongoose');

const salesSchema = new mongoose.Schema({
    customername: {
        type: String,
        required: true,
        trim: true,
    },
    phonenumber: {
        type: String,
        required: true,
        trim: true,
    },
    nin: {
        type: String,
        required: false,
        trim: true,
    },
    paymentmethod: {
        type: String,
        enum: ['Cash', 'Mobile Money'],
        default: 'Cash'
    },
    productname: {
        type: String,
        required: true,
        trim: true,
    },
    quantity: {
        type: Number,
        required: true
    },
    unitprice: {
        type: Number,
        required: true
    },
    subtotal: {
        type: Number,
        required: true
    },
    distance: {
        type: Number,
        default: 0
    },
    transportFee: {
        type: Number,
        default: 0
    },
    total: {
        type: Number,
        required: true
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
    }
});

module.exports = mongoose.model('Sales', salesSchema);