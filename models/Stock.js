const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
   productname: {
        type: String,
        required: true,
        trim: true,
    },
    category: {
        type: String,
        required: true,
        trim: true,
    },
    quantity: {
        type: Number,
        required: true
    },
    costprice: {
        type: Number,
        required: true
    },
    sellingprice: {
        type: Number,
        required: true
    },
    // Supplier Information
    supplier: {
        type: String,
        required: true,
        trim: true,
    },
    supplierEmail: {
        type: String,
        trim: true,
        lowercase: true
    },
    supplierPhone: {
        type: String,
        trim: true,
    },
    supplierCompany: {
        type: String,
        trim: true,
    },
    reorderlevel: {
        type: Number,
        required: true,
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Credit'],
        default: 'Cash'
    },
    Date: {
        type: Date,
        default: Date.now
    },
    amountPaid: {
        type: Number,
        default: 0
    },
    attendant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration',
    },
    attendantName: {
        type: String,
        trim: true
    }
});

module.exports = mongoose.model('Stock', stockSchema);