const mongoose = require('mongoose');

const stockTransactionSchema = new mongoose.Schema({
    productname: {
        type: String,
        required: true,
        trim: true
    },
    category: {
        type: String,
        required: true,
        trim: true
    },
    transactionType: {
        type: String,
        enum: ['ADD_NEW', 'UPDATE_QUANTITY', 'DELETE'],
        required: true
    },
    previousQuantity: {
        type: Number,
        default: 0
    },
    addedQuantity: {
        type: Number,
        default: 0
    },
    newQuantity: {
        type: Number,
        default: 0
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
        trim: true
    },
    supplierEmail: {
        type: String,
        trim: true
    },
    supplierPhone: {
        type: String,
        trim: true
    },
    supplierCompany: {
        type: String,
        trim: true
    },
    reorderlevel: {
        type: Number
    },
    paymentMethod: {
        type: String,
        enum: ['Cash', 'Credit'],
        default: 'Cash'
    },
    attendant: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration'
    },
    attendantName: {
        type: String,
        trim: true
    },
    Date: {
        type: Date,
        default: Date.now
    },
    notes: {
        type: String,
        trim: true
    }
});

module.exports = mongoose.model('StockTransaction', stockTransactionSchema);