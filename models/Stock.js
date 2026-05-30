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
        required: true,
        min: 0
    },
     originalQuantity: {
         type: Number, default: 0 
        },
    costprice: {
        type: Number,
        required: true,
        min: 0
    },
    sellingprice: {
        type: Number,
        required: true,
        min: 0
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
        required: false
    },
    supplierPhone: {
        type: String,
        trim: true,
        match: /^\+256[0-9]{9}$/,
        required: true
    },
    supplierCompany: {
        type: String,
        trim: true,
        required: true
    },
    reorderlevel: {
        type: Number,
        required: true,
        min: 0
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