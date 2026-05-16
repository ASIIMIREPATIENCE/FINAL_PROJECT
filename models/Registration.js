// 
// models/Registration.js
const mongoose = require('mongoose');
const passportLocalMongoose = require('passport-local-mongoose').default || require('passport-local-mongoose');

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
        required: true,
        unique: true,
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
        trim: true,
        enum: ['admin', 'store_manager', 'sales_attendant'],
        default: 'sales_attendant'
    },
    Date: {
        type: Date,
        default: Date.now
    }
});

if (typeof passportLocalMongoose === 'function') {
    registrationSchema.plugin(passportLocalMongoose, {
        usernameField: 'email' 
    });
} else {
    console.error('Error: passport-local-mongoose is not properly installed');
    console.error('Run: npm install passport-local-mongoose');
    process.exit(1);
}

module.exports = mongoose.model('Registration', registrationSchema);