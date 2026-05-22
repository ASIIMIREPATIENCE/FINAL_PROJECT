const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales');
const Stock = require('../models/Stock');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
// This function checks if the user is logged in before allowing access
// If not logged in, they are redirected to the home page
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// ============================================================
// DISPLAY NEW SALE PAGE
// URL: /sale
// ============================================================
// This route shows the sales form where attendants can add items to cart
// and complete a sale transaction
router.get("/sale", isAuthenticated, async (req, res) => {
    try {
        // Fetch all products that have stock available (quantity > 0)
        // .lean() returns plain JavaScript objects instead of Mongoose documents (faster)
        const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
        
        // Render the new_sale page with the product list and other data
        res.render('new_sale', { 
            items: items,                              // List of available products
            success: req.query.success === 'true',     // Check if a success message should be shown
            error: null,                               // No error initially
            currentUser: req.user                      // Pass the logged-in user to the template
        });
    } catch (error) {
        // If something goes wrong, log the error and render page with empty items
        console.log('error', error.message);
        res.render('new_sale', { 
            items: [],                                 // Empty product list on error
            error: 'Failed to load products',          // Show error message
            currentUser: req.user
        });
    }
});

// ============================================================
// PROCESS SALE SUBMISSION
// URL: /postSale
// ============================================================
// This route handles the form submission when a sale is completed
// It processes cart items, updates stock, calculates transport, and saves the sale
router.post('/postSale', isAuthenticated, async (req, res) => {
    try {
        // Extract all the data sent from the form
        const {
            customername,      // Name of the customer
            phonenumber,       // Customer's phone number
            nin,               // National ID (optional)
            paymentmethod,     // Cash, Mobile Money, or Bank Transfer
            cartItems,         // JSON string containing all items in cart
            distance,          // Distance in km (for transport calculation)
            addTransport       // Whether transport delivery is needed ('true' or 'false')
        } = req.body;

        // Parse the cart items from JSON string to JavaScript array
        let cart = [];
        if (cartItems) {
            cart = JSON.parse(cartItems);
        }

        // Check if cart has at least one item
        if (cart.length === 0) {
            const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            return res.render('new_sale', {
                items: items,
                error: 'Cart is empty. Add at least one product.',
                success: false,
                currentUser: req.user
            });
        }

        // Get attendant information from the logged-in user
        const attendant = req.user;
        const attendantName = attendant ? attendant.fullname : 'Unknown Attendant';
        const attendantId = attendant ? attendant._id : null;
        
        // Parse distance and transport flag
        const distanceKm = parseInt(distance) || 0;
        const needTransport = addTransport === 'true';

        // ============================================================
        // PROCESS EACH ITEM IN THE CART
        // ============================================================
        let cartItemsWithDetails = [];  // Will store detailed item information
        let cartSubtotal = 0;           // Running total of all items
        
        // Loop through each item in the cart
        for (const item of cart) {
            // Find the product in the stock database
            const product = await Stock.findOne({ productname: item.productName });
            
            // Check if product exists
            if (!product) {
                const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
                return res.render('new_sale', {
                    items: items,
                    error: `Product "${item.productName}" not found`,
                    success: false,
                    currentUser: req.user
                });
            }
            
            // Check if enough quantity is available in stock
            const qty = parseInt(item.quantity);
            if (product.quantity < qty) {
                const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
                return res.render('new_sale', {
                    items: items,
                    error: `Insufficient stock for ${product.productname}. Only ${product.quantity} available.`,
                    success: false,
                    currentUser: req.user
                });
            }
            
            // DEDUCT THE QUANTITY FROM STOCK
            product.quantity -= qty;
            await product.save();
            
            // Calculate subtotal for this item (quantity × unit price)
            const itemSubtotal = qty * parseFloat(item.unitPrice);
            cartSubtotal += itemSubtotal;  // Add to running total
            
            // Store item details for the sale record
            cartItemsWithDetails.push({
                productname: item.productName,
                quantity: qty,
                unitprice: parseFloat(item.unitPrice),
                subtotal: itemSubtotal
            });
        }
        
        // ============================================================
        // CALCULATE TRANSPORT FEE
        // ============================================================
        // Transport is free if:
        //   1. Customer needs transport (needTransport = true)
        //   2. Distance > 0 km
        //   3. Cart subtotal is ≥ 500,000 UGX
        //   4. Distance is ≤ 10 km
        // Otherwise, transport fee is 30,000 UGX
        let transportFee = 0;
        let freeTransportApplied = false;
        
        if (needTransport && distanceKm > 0) {
            const isWithinFreeDistance = distanceKm <= 10;
            const isAboveFreeAmount = cartSubtotal >= 500000;
            
            if (isWithinFreeDistance && isAboveFreeAmount) {
                transportFee = 0;           // Free transport!
                freeTransportApplied = true;
            } else {
                transportFee = 30000;        // Charged transport
            }
        }
        
        // Calculate the grand total (items + transport)
        const grandTotal = cartSubtotal + transportFee;
        
        // ============================================================
        // CREATE AND SAVE THE SALE RECORD
        // ============================================================
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
            attendantName: attendantName,     // Store attendant's name
            attendant: attendantId,           // Store attendant's ID (reference)
            Date: new Date()                  // Current date and time
        };
        
        // Create a new Sale document and save to database
        const newSale = new Sale(saleData);
        await newSale.save();
        
        // Redirect to the receipt page for this sale
        // The receipt will show all the sale details
        res.redirect(`/receipt/${newSale._id}`);
        
    } catch (error) {
        // ============================================================
        // ERROR HANDLING
        // ============================================================
        console.log('Error details:', error);
        
        try {
            const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            
            // Check if it's a validation error (from Mongoose schema)
            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => err.message);
                return res.render('new_sale', {
                    items: items,
                    error: validationErrors.join(', '),  // Show all validation errors
                    success: false,
                    currentUser: req.user
                });
            }
            
            // Generic error - show the error message
            res.render('new_sale', {
                items: items,
                error: error.message || 'An error occurred while processing the sale',
                success: false,
                currentUser: req.user
            });
        } catch (err) {
            // Fallback error rendering
            res.render('new_sale', {
                items: [],
                error: 'An error occurred while processing the sale',
                success: false,
                currentUser: req.user
            });
        }
    }
});

// ============================================================
// VIEW SALE RECEIPT
// URL: /receipt/:id
// ============================================================
// This route displays the receipt for a specific sale
// The :id in the URL is the sale's unique identifier
router.get('/receipt/:id', isAuthenticated, async (req, res) => {
    try {
        // Find the sale by its ID and populate the attendant's full name
        const sale = await Sale.findById(req.params.id).populate('attendant', 'fullname');
        
        // If sale doesn't exist, redirect to sales attendant dashboard
        if (!sale) {
            return res.redirect('/salesattendant');
        }
        
        // Render the receipt page with all sale data
        res.render('receipt', { 
            sale: sale,                              // The sale record
            cartItems: sale.items,                   // Items purchased
            cartSubtotal: sale.cartSubtotal,         // Subtotal before transport
            transportFee: sale.transportFee,         // Transport fee charged
            grandTotal: sale.grandTotal,             // Final total
            freeTransportApplied: sale.freeTransportApplied,  // Whether free transport was applied
            distance: sale.distance,                 // Distance in km
            needTransport: sale.needTransport,       // Whether transport was needed
            success: true,                           // Success flag
            currentUser: req.user                    // Current logged-in user
        });
        
    } catch (error) {
        // If something goes wrong, redirect to sales attendant dashboard
        console.error(error);
        res.redirect('/salesattendant');
    }
});

module.exports = router;