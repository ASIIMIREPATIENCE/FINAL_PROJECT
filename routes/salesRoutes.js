// 

const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales');
const Stock = require('../models/Stock');

router.get("/sale", async (req, res) => {
    try {
        const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
        res.render('new_sale', { 
            items: items,
            success: req.query.success === 'true',
            error: null
        });
    } catch (error) {
        console.log('error', error.message);
        res.render('new_sale', { 
            items: [],
            error: 'Failed to load products'
        });
    }
});

router.post('/postSale', async (req, res) => {
    try {
        const {
            customername,
            phonenumber,
            nin,
            paymentmethod,
            productName,
            quantity,
            unitprice,
            distance,
            addTransport
        } = req.body;

        console.log('Product Name received:', productName);

        // Find product by NAME
        const product = await Stock.findOne({ productname: productName });
        
        if (!product) {
            const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            return res.render('new_sale', {
                items: items,
                error: 'Product not found',
                success: false
            });
        }

        // Check sufficient quantity
        const qty = parseInt(quantity);
        if (product.quantity < qty) {
            const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            return res.render('new_sale', {
                items: items,
                error: `Insufficient quantity in stock. Only ${product.quantity} available.`,
                success: false
            });
        }

        // Deduct quantity sold from stock quantity
        product.quantity -= qty;
        await product.save();

        // Calculate totals
        const subtotal = qty * parseFloat(unitprice);
        
       // Transport calculation logic - BOTH conditions must be met for free
let transport = 0;
const distanceKm = parseInt(distance) || 0;
const transportRate = 30000;

// BOTH conditions must be TRUE for free transport
const isWithinFreeDistance = distanceKm <= 10;      // Condition 1: Distance <= 10km
const isAboveFreeAmount = subtotal >= 500000;    // Condition 2: Total >= 500,000

if (isWithinFreeDistance && isAboveFreeAmount) {
    transport = 0;  // Free transport
    console.log('✓ Free transport - Distance:', distanceKm, 'km, Total: UGX', subtotal);
} 
else if (distanceKm > 0) {
    transport = transportRate;  // Charge 30,000
    console.log('✗ Transport charged UGX', transport, '- Distance:', distanceKm, 'km, Total: UGX', subtotal);
}

const total = subtotal + transport;

        // Prepare sale data - NO attendant field
        const saleData = {
            customername,
            phonenumber,
            nin: nin || 'N/A',
            paymentmethod,
            productname: productName,
            quantity: qty,
            unitprice: parseFloat(unitprice),
            distance: distanceKm,
            rate: transport > 0 ? transportRate : 0,
            subtotal: subtotal,
            transport: transport,
            total: total,
            date: new Date(),
            free_transport_applied: transport === 0  && distanceKm > 0
        };

        const newSale = new Sale(saleData);
        await newSale.save();
        
        res.redirect('/sale?success=true');

    } catch (error) {
        console.log('Error details:', error);
        
        try {
            const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            
            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => err.message);
                return res.render('new_sale', {
                    items: items,
                    error: validationErrors.join(', '),
                    success: false
                });
            }
            
            res.render('new_sale', {
                items: items,
                error: error.message || 'An error occurred while processing the sale',
                success: false
            });
        } catch (err) {
            res.render('new_sale', {
                items: [],
                error: 'An error occurred while processing the sale',
                success: false
            });
        }
    }
});

module.exports = router;