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

        // Get the logged-in user (attendant)
        const attendant = req.user;
        const attendantName = attendant ? attendant.fullname : 'Unknown Attendant';
        const attendantId = attendant ? attendant._id : null;

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
        
        // Transport calculation logic
        let transportFee = 0;
        const distanceKm = parseInt(distance) || 0;
        const transportRate = 30000;
        let freeTransportApplied = false;

        // Check if addTransport checkbox was checked
        const needTransport = addTransport === 'true';

        if (needTransport && distanceKm > 0) {
            // BOTH conditions must be TRUE for free transport
            const isWithinFreeDistance = distanceKm <= 10;
            const isAboveFreeAmount = subtotal >= 500000;

            if (isWithinFreeDistance && isAboveFreeAmount) {
                transportFee = 0;
                freeTransportApplied = true;
                console.log('✓ Free transport - Distance:', distanceKm, 'km, Subtotal: UGX', subtotal);
            } else {
                transportFee = transportRate;
                console.log('✗ Transport charged UGX', transportFee, '- Distance:', distanceKm, 'km, Subtotal: UGX', subtotal);
            }
        }

        const total = subtotal + transportFee;

        // Prepare sale data with attendant info
        const saleData = {
            customername,
            phonenumber,
            nin: nin || 'N/A',
            paymentmethod: paymentmethod || 'Cash',
            productname: productName,
            quantity: qty,
            unitprice: parseFloat(unitprice),
            subtotal: subtotal,
            distance: distanceKm,
            transportFee: transportFee,
            total: total,
            free_transport_applied: freeTransportApplied,
            attendant: attendantId,
            attendantName: attendantName,
            Date: new Date(),
            items: [{
                productName: productName,
                quantity: qty,
                price: parseFloat(unitprice),
                subtotal: subtotal
            }]
        };

        const newSale = new Sale(saleData);
        await newSale.save();
        
        // Render receipt page
        res.render('receipt', { 
            sale: newSale,
            success: true 
        });

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


// GET route - View receipt by ID
router.get('/receipt/:id', async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        
        if (!sale) {
            return res.redirect('/salesattendant');
        }
        
        res.render('receipt', { 
            sale: sale,
            success: true 
        });
        
    } catch (error) {
        console.error(error);
        res.redirect('/salesattendant');
    }
});



module.exports = router;