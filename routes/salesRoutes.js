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
            cartItems,
            distance,
            addTransport
        } = req.body;

        // Parse cart items
        let cart = [];
        if (cartItems) {
            cart = JSON.parse(cartItems);
        }

        if (cart.length === 0) {
            const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            return res.render('new_sale', {
                items: items,
                error: 'Cart is empty. Add at least one product.',
                success: false
            });
        }

        const attendant = req.user;
        const attendantName = attendant ? attendant.fullname : 'Unknown Attendant';
        const attendantId = attendant ? attendant._id : null;
        const distanceKm = parseInt(distance) || 0;
        const needTransport = addTransport === 'true';

        // Calculate cart subtotal (sum of all products)
        let cartItemsWithSubtotals = [];
        let cartSubtotal = 0;
        
        for (const item of cart) {
            const itemSubtotal = parseInt(item.quantity) * parseFloat(item.unitPrice);
            cartSubtotal += itemSubtotal;
            cartItemsWithSubtotals.push({
                productName: item.productName,
                quantity: parseInt(item.quantity),
                unitPrice: parseFloat(item.unitPrice),
                subtotal: itemSubtotal
            });
        }
        
        // Calculate transport fee based on cart subtotal
        let transportFee = 0;
        let freeTransportApplied = false;
        
        if (needTransport && distanceKm > 0) {
            const isWithinFreeDistance = distanceKm <= 10;
            const isAboveFreeAmount = cartSubtotal >= 500000;
            
            if (isWithinFreeDistance && isAboveFreeAmount) {
                transportFee = 0;
                freeTransportApplied = true;
            } else {
                transportFee = 30000;
            }
        }
        
        // Grand total = cart subtotal + transport fee
        const grandTotal = cartSubtotal + transportFee;
        
        // Save each item as separate sale record with transport fee
        let allSales = [];
        let firstSale = null;
        
        for (let i = 0; i < cart.length; i++) {
            const item = cart[i];
            const product = await Stock.findOne({ productname: item.productName });
            
            if (!product) {
                const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
                return res.render('new_sale', {
                    items: items,
                    error: `Product "${item.productName}" not found`,
                    success: false
                });
            }
            
            const qty = parseInt(item.quantity);
            if (product.quantity < qty) {
                const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
                return res.render('new_sale', {
                    items: items,
                    error: `Insufficient stock for ${product.productname}. Only ${product.quantity} available.`,
                    success: false
                });
            }
            
            // Deduct from stock
            product.quantity -= qty;
            await product.save();
            
            const itemSubtotal = qty * parseFloat(item.unitPrice);
            
            const saleData = {
                customername,
                phonenumber,
                nin: nin || 'N/A',
                paymentmethod: paymentmethod || 'Cash',
                productname: item.productName,
                quantity: qty,
                unitprice: parseFloat(item.unitPrice),
                subtotal: itemSubtotal,
                distance: distanceKm,
                transportFee: i === 0 ? transportFee : 0,
                total: itemSubtotal + (i === 0 ? transportFee : 0),
                freeTransportApplied: freeTransportApplied,
                needTransport: needTransport,
                attendant: attendantId,
                attendantName: attendantName,
                Date: new Date(),
                items: [{
                    productName: item.productName,
                    quantity: qty,
                    price: parseFloat(item.unitPrice)
                }]
            };
            
            const newSale = new Sale(saleData);
            await newSale.save();
            allSales.push(newSale);
            if (i === 0) firstSale = newSale;
        }
        
        // Pass calculated totals to receipt - CORRECTED
        res.render('receipt', { 
            sale: firstSale,
            allSales: allSales,
            cartItems: cartItemsWithSubtotals,
            cartSubtotal: cartSubtotal,
            transportFee: transportFee,
            grandTotal: grandTotal,
            freeTransportApplied: freeTransportApplied,
            distance: distanceKm,
            needTransport: needTransport,
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

router.get('/receipt/:id', async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        
        if (!sale) {
            return res.redirect('/salesattendant');
        }
        
        // Find all sales with same customer and date (for multi-item receipts)
        const startOfDay = new Date(sale.Date);
        startOfDay.setHours(0, 0, 0, 0);
        const endOfDay = new Date(sale.Date);
        endOfDay.setHours(23, 59, 59, 999);
        
        const allCustomerSales = await Sale.find({
            customername: sale.customername,
            phonenumber: sale.phonenumber,
            Date: {
                $gte: startOfDay,
                $lte: endOfDay
            }
        });
        
        // Recalculate totals for receipt display
        let cartItems = [];
        let cartSubtotal = 0;
        
        for (const item of allCustomerSales) {
            const itemSubtotal = item.quantity * item.unitprice;
            cartSubtotal += itemSubtotal;
            cartItems.push({
                productName: item.productname,
                quantity: item.quantity,
                unitPrice: item.unitprice,
                subtotal: itemSubtotal
            });
        }
        
        // Get transport fee from the first sale (it's the same for all items in the cart)
        const transportFee = sale.transportFee || 0;
        const freeTransportApplied = sale.freeTransportApplied || false;
        const needTransport = sale.needTransport || false;
        const distanceKm = sale.distance || 0;
        const grandTotal = cartSubtotal + transportFee;
        
        res.render('receipt', { 
            sale: sale,
            allSales: allCustomerSales,
            cartItems: cartItems,
            cartSubtotal: cartSubtotal,
            transportFee: transportFee,
            grandTotal: grandTotal,
            freeTransportApplied: freeTransportApplied,
            distance: distanceKm,
            needTransport: needTransport,
            success: true 
        });
        
    } catch (error) {
        console.error(error);
        res.redirect('/salesattendant');
    }
});

module.exports = router;