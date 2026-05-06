
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
    distance: {
        type: Number,
        required: false
    },
    rate: {
        type: Number,
        required: false
    },
    total: {
        type: Number,
        required: true,
        default:1500,
    },
    Date: {
        type: Date,
        default: Date.now
    },
      attendant:{
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Registration'
    }
    });

module.exports = mongoose.model('Sales',salesSchema);