const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose');

const registrationSchema = new mongoose.Schema({
    fullname: {
        type: String,
        required: true,
        trim: true,
    },
    email: {
        type: String,
        required: true,
        unique: true,
        lowercase: true,
        trim: true,
    },
    phonenumber: {
        type: String,
        required: true,
        trim: true,
    },
    address: {
        type: String,
        required: true,
        trim: true,
    },
    nin: {
        type: String,
        default: 'N/A',
        trim: true,
    },
    nextOfKinName: {
        type: String,
        required: true,
        trim: true,
    },
    nextOfKinPhone: {
        type: String,
        required: true,
        trim: true,
    },
    nextOfKinRelationship: {
        type: String,
        required: true,
        trim: true,
    },
    role: {
        type: String,
        enum: ['admin', 'store_manager', 'sales_attendant'],
        default: 'sales_attendant'
    },
    Date: {
        type: Date,
        default: Date.now
    },
});

// THIS IS THE ONLY PLUGIN - NO pre('save') hooks
registrationSchema.plugin(passportLocalMongoose, {
    usernameField: 'email'
});

module.exports = mongoose.model('Registration', registrationSchema);