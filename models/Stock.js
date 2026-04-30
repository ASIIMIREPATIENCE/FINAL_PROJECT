
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
        type: String,
        required: true,
        trim: true,
    },
   
   
    
    Dateadded: {
        type: Date,
        default: Date.now
    }
    });

module.exports = mongoose.model('Stock',stockSchema);