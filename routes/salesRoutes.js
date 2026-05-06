const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales');
const Stock = require('../models/Stock');

// const passport = require('passport');

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
            rate,
        } = req.body;

        console.log('Product Name received:', productName);

        // Find product by NAME - use findOne with productname field
        const product = await Stock.findOne({ productname: productName });
        
        if (!product) {
            const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            return res.render('new_sale', {
                items: items,
                error: 'Product not found'
            });
        }

        // Check sufficient quantity
        if (product.quantity < quantity) {
            const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            return res.render('new_sale', {
                items: items,
                error: 'Insufficient quantity in stock'
            });
        }

        // Deduct quantity sold from stock quantity
        product.quantity -= quantity;
        await product.save();

        // Calculate totals
        const subtotal = (quantity * unitprice);
        const transport = ((distance || 0) * (rate || 0));
        const total = (subtotal + transport);
        
        console.log('Sale data:', req.body);

        // Prepare sale data - Store the product NAME directly
        const saleData = {
            customername,
            phonenumber,
            nin: nin || 'N/A',
            paymentmethod,
            productname:productName,
            quantity: parseInt(quantity),
            unitprice: parseFloat(unitprice),
            distance: distance || 0,
            rate: rate || 0,
            subtotal: parseFloat(subtotal),
            transport: parseFloat(transport),
            total: parseFloat(total),
        };

        // Only add attendant if user is logged in
        if (req.user) {
            saleData.attendant = req.user._id;
        }

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
                    error: validationErrors.join(', ')
                });
            }
            
            res.render('new_sale', {
                items: items,
                error: error.message || 'An error occurred while processing the sale'
            });
        } catch (err) {
            res.render('new_sale', {
                items: [],
                error: 'An error occurred while processing the sale'
            });
        }
    }
});

module.exports = router;