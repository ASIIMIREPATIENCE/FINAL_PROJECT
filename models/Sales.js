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
        validate: {
            validator: function(v) {
                return /^(07[0-9]{8}|02[0-9]{8}|03[0-9]{8}|04[0-9]{8}|01[0-9]{8})$/i.test(v);
            },
            message: 'Enter a valid Ugandan phone number (07XXXXXXXX)'
        }
    },
    nin: {
        type: String,
        required: false,
        trim: true
    },
    paymentmethod: {
        type: String,
        enum: ['Cash', 'Mobile Money', 'Bank Transfer'],
        default: 'Cash',
        required: [true, 'Payment method is required']
    },
    productname: {
        type: String,
        required: [true, 'Product name is required'],
        trim: true
    },
    quantity: {
        type: Number,
        required: [true, 'Quantity is required'],
        min: [1, 'Quantity must be at least 1']
    },
    unitprice: {
        type: Number,
        required: [true, 'Unit price is required'],
        min: [0, 'Price cannot be negative']
    },
    subtotal: {
        type: Number,
        required: true,
        min: [0, 'Subtotal cannot be negative']
    },
    distance: {
        type: Number,
        default: 0,
        min: [0, 'Distance cannot be negative']
    },
    transportFee: {
        type: Number,
        default: 0,
        min: [0, 'Transport fee cannot be negative']
    },
    total: {
        type: Number,
        required: true,
        min: [0, 'Total cannot be negative']
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