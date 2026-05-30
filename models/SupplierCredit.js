const mongoose = require('mongoose');

// Check if model already exists to prevent overwrite error
if (mongoose.models && mongoose.models.SupplierCredit) {
    module.exports = mongoose.models.SupplierCredit;
} else {
    const supplierCreditSchema = new mongoose.Schema({
        supplier: {
            type: String,
            required: true,
            trim: true
        },
        productname: {
            type: String,
            required: true,
            trim: true
        },
        quantity: {
            type: Number,
            required: true,
            min: 1
        },
        costprice: {
            type: Number,
            required: true,
            min: 0
        },
        totalAmount: {
            type: Number,
            required: true,
            min: 0
        },
        amountPaid: {
            type: Number,
            default: 0,
            min: 0
        },
        balance: {
            type: Number,
            default: 0,
            min: 0
        },
        purchaseDate: {
            type: Date,
            default: Date.now
        },
        dueDate: {
            type: Date,
            required: true
        },
        status: {
            type: String,
            enum: ['Pending', 'Paid', 'Overdue', 'Partially Paid'],
            default: 'Pending'
        },
        attendant: {
            type: mongoose.Schema.Types.ObjectId,
            ref: 'Registration'
        },
        attendantName: {
            type: String,
            trim: true
        },
        notes: {
            type: String,
            trim: true
        }
    }, {
        timestamps: true
    });

    module.exports = mongoose.model('SupplierCredit', supplierCreditSchema);
}