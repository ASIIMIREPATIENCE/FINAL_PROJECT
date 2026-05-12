// 
const mongoose = require('mongoose');

const stockSchema = new mongoose.Schema({
   productname: {
        type: String,
        required: true,
        trim: true,
    },
    category:{
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
    supplier: {
        type: String,
        required: true,
        trim: true,
    },
    reorderlevel: {
        type: Number,
        required: true,
        trim: true,
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
    // Add these 2 fields for payment tracking
    amountPaid: {
        type: Number,
        default: 0
    }
});

module.exports = mongoose.model('Stock', stockSchema);