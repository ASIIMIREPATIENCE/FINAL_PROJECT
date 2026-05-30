const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales');
const Stock = require('../models/Stock');

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// ============================================================
// DISPLAY SALES ATTENDANT DASHBOARD
// ============================================================
router.get('/salesattendant', isAuthenticated, async (req, res) => {
    try {
        const stockItems = await Stock.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        const allSales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 })
            .limit(50);
        
        const transformedStock = stockItems.map(item => ({
            ...item.toObject(),
            attendantName: item.attendantName || (item.attendant ? item.attendant.fullname : 'Unknown')
        }));
        
        res.render('sales_dashboard', { 
            stockItems: transformedStock,
            allSales: allSales,
            success: req.query.success || false,
            error: req.query.error || null,
            currentUser: req.user
        });
    } catch (error) {
        console.error(error);
        res.render('sales_dashboard', { 
            stockItems: [],
            allSales: [],
            success: false,
            error: error.message,
            currentUser: req.user
        });
    }
});

// ============================================================
// DISPLAY NEW SALE PAGE
// ============================================================
router.get("/sale", isAuthenticated, async (req, res) => {
    try {
        const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
        
        res.render('new_sale', { 
            items: items,
            error: req.query.error || null,
            currentUser: req.user
        });
    } catch (error) {
        console.log('error', error.message);
        res.render('new_sale', { 
            items: [],
            error: 'Failed to load products',
            currentUser: req.user
        });
    }
});

// ============================================================
// PROCESS NEW SALE SUBMISSION
// ============================================================
router.post('/postSale', isAuthenticated, async (req, res) => {
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

        let cart = JSON.parse(cartItems);

        if (cart.length === 0) {
            return res.redirect('/sale?error=Cart is empty');
        }

        const attendantName = req.user ? req.user.fullname : 'Unknown Attendant';
        const attendantId = req.user ? req.user._id : null;
        
        const distanceKm = parseInt(distance) || 0;
        const needTransport = addTransport === 'true';

        let cartItemsWithDetails = [];
        let cartSubtotal = 0;
        
        for (const item of cart) {
            const product = await Stock.findOne({ productname: item.productName });
            
            if (!product) {
                return res.redirect(`/sale?error=Product "${item.productName}" not found`);
            }
            
            const qty = parseInt(item.quantity);
            if (product.quantity < qty) {
                return res.redirect(`/sale?error=Insufficient stock for ${product.productname}`);
            }
            
            product.quantity -= qty;
            await product.save();
            
            const itemSubtotal = qty * parseFloat(item.unitPrice);
            cartSubtotal += itemSubtotal;
            
            cartItemsWithDetails.push({
                productname: item.productName,
                quantity: qty,
                unitprice: parseFloat(item.unitPrice),
                subtotal: itemSubtotal
            });
        }
        
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
        
        const grandTotal = cartSubtotal + transportFee;
        
        const saleData = {
            customername,
            phonenumber,
            nin: nin || 'N/A',
            paymentmethod: paymentmethod || 'Cash',
            items: cartItemsWithDetails,
            cartSubtotal: cartSubtotal,
            distance: distanceKm,
            transportFee: transportFee,
            grandTotal: grandTotal,
            freeTransportApplied: freeTransportApplied,
            needTransport: needTransport,
            attendantName: attendantName,
            attendant: attendantId,
            Date: new Date()
        };
        
        const newSale = new Sale(saleData);
        await newSale.save();
        
        res.redirect(`/receipt/${newSale._id}`);
        
    } catch (error) {
        console.log('Error details:', error);
        res.redirect(`/sale?error=${encodeURIComponent(error.message)}`);
    }
});

// ============================================================
// VIEW SALE RECEIPT
// ============================================================
router.get('/receipt/:id', isAuthenticated, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id).populate('attendant', 'fullname');
        
        if (!sale) {
            return res.redirect('/salesattendant?error=Sale not found');
        }
        
        res.render('receipt', { 
            sale: sale,
            edited: req.query.edited || false,
            currentUser: req.user
        });
        
    } catch (error) {
        console.error(error);
        res.redirect('/salesattendant?error=' + encodeURIComponent(error.message));
    }
});

// ============================================================
// SHOW EDIT SALE FORM
// ============================================================
router.get('/editSale/:id', isAuthenticated, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id);
        
        if (!sale) {
            return res.redirect('/salesattendant?error=Sale not found');
        }
        
        if (sale.voided) {
            return res.redirect('/salesattendant?error=Cannot edit a voided sale');
        }
        
        const items = await Stock.find().lean();
        
        res.render('edit_sale', { 
            sale: sale,
            items: items,
            error: req.query.error || null,
            currentUser: req.user
        });
    } catch (error) {
        console.error('Error loading edit sale form:', error);
        res.redirect('/salesattendant?error=' + encodeURIComponent(error.message));
    }
});

// ============================================================
// UPDATE SALE - EDIT EXISTING SALE
// ============================================================
router.post('/updateSale/:id', isAuthenticated, async (req, res) => {
    try {
        const { customername, phonenumber, nin, paymentmethod, cartItems, distance, addTransport } = req.body;
        
        const sale = await Sale.findById(req.params.id);
        if (!sale) return res.redirect('/salesattendant?error=Sale not found');
        if (sale.voided) return res.redirect('/salesattendant?error=Cannot edit a voided sale');
        
        let cart = [];
        if (cartItems) {
            try {
                cart = JSON.parse(cartItems);
            } catch (e) {
                return res.redirect(`/editSale/${req.params.id}?error=Invalid cart data`);
            }
        }
        
        if (cart.length === 0) {
            return res.redirect(`/editSale/${req.params.id}?error=Cart cannot be empty`);
        }
        
        const attendantName = req.user ? req.user.fullname : 'Unknown Attendant';
        const attendantId = req.user ? req.user._id : null;
        const distanceKm = parseInt(distance) || 0;
        const needTransport = addTransport === 'true';
        
        // STEP 1: RESTORE ALL ORIGINAL STOCK (add back everything that was sold)
        for (const item of sale.items) {
            const product = await Stock.findOne({ productname: item.productname });
            if (product) {
                product.quantity += item.quantity;
                await product.save();
            }
        }
        
        // STEP 2: PROCESS NEW CART AND DEDUCT NEW QUANTITIES
        let cartItemsWithDetails = [];
        let cartSubtotal = 0;
        
        for (const item of cart) {
            const product = await Stock.findOne({ productname: item.productName });
            
            if (!product) {
                return res.redirect(`/editSale/${req.params.id}?error=Product "${item.productName}" not found`);
            }
            
            const qty = parseInt(item.quantity);
            
            // Check if we have enough stock for the NEW sale
            if (product.quantity < qty) {
                return res.redirect(`/editSale/${req.params.id}?error=Insufficient stock for ${product.productname}. Only ${product.quantity} available, but you need ${qty}.`);
            }
            
            // Deduct the new quantity
            product.quantity -= qty;
            await product.save();
            
            const itemSubtotal = qty * parseFloat(item.unitPrice);
            cartSubtotal += itemSubtotal;
            
            cartItemsWithDetails.push({
                productname: item.productName,
                quantity: qty,
                unitprice: parseFloat(item.unitPrice),
                subtotal: itemSubtotal
            });
        }
        
        // Calculate transport fee
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
        
        const grandTotal = cartSubtotal + transportFee;
        
        // Update sale record
        sale.customername = customername;
        sale.phonenumber = phonenumber;
        sale.nin = nin || 'N/A';
        sale.paymentmethod = paymentmethod || 'Cash';
        sale.items = cartItemsWithDetails;
        sale.cartSubtotal = cartSubtotal;
        sale.distance = distanceKm;
        sale.transportFee = transportFee;
        sale.grandTotal = grandTotal;
        sale.freeTransportApplied = freeTransportApplied;
        sale.needTransport = needTransport;
        sale.attendantName = attendantName;
        sale.attendant = attendantId;
        sale.edited = true;
        sale.editedBy = attendantName;
        sale.editedAt = new Date();
        
        await sale.save();
        
        res.redirect(`/receipt/${sale._id}?edited=true`);
        
    } catch (error) {
        console.error('Error updating sale:', error);
        res.redirect(`/editSale/${req.params.id}?error=${encodeURIComponent(error.message)}`);
    }
});

// ============================================================
// DELETE SALE - Permanently remove sale and restore stock
// ============================================================
router.post('/deleteSale/:id', isAuthenticated, async (req, res) => {
    try {
        console.log('=== DELETE SALE ATTEMPT ===');
        console.log('Sale ID:', req.params.id);
        
        const sale = await Sale.findById(req.params.id);
        
        if (!sale) {
            return res.redirect('/salesattendant?error=Sale not found');
        }
        
        // Restore ALL stock quantities before deleting
        for (const item of sale.items) {
            const product = await Stock.findOne({ productname: item.productname });
            if (product) {
                product.quantity += item.quantity;
                await product.save();
                console.log(`Restored ${item.quantity} of ${item.productname}`);
            }
        }
        
        // Permanently delete the sale
        await Sale.findByIdAndDelete(req.params.id);
        
        console.log('Sale deleted successfully!');
        res.redirect('/salesattendant?success=deleted');
        
    } catch (error) {
        console.error('Error deleting sale:', error);
        res.redirect('/salesattendant?error=' + encodeURIComponent(error.message));
    }
});

module.exports = router;