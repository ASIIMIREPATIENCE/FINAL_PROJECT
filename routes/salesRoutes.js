// // const express = require("express");
// // const router = express.Router();
// // const Sale = require('../models/Sales');
// // const Stock = require('../models/Stock');

// // router.get("/sale", async (req, res) => {
// //     try {
// //         const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
// //         res.render('new_sale', { 
// //             items: items,
// //             success: req.query.success === 'true',
// //             error: null
// //         });
// //     } catch (error) {
// //         console.log('error', error.message);
// //         res.render('new_sale', { 
// //             items: [],
// //             error: 'Failed to load products'
// //         });
// //     }
// // });

// // // router.post('/postSale', async (req, res) => {
// // //     try {
// // //         const {
// // //             customername,
// // //             phonenumber,
// // //             nin,
// // //             paymentmethod,
// // //             cartItems,
// // //             distance,
// // //             addTransport
// // //         } = req.body;

// // //         // Parse cart items
// // //         let cart = [];
// // //         if (cartItems) {
// // //             cart = JSON.parse(cartItems);
// // //         }

// // //         if (cart.length === 0) {
// // //             const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
// // //             return res.render('new_sale', {
// // //                 items: items,
// // //                 error: 'Cart is empty. Add at least one product.',
// // //                 success: false
// // //             });
// // //         }

// // //         const attendant = req.user;
// // //         const attendantName = attendant ? attendant.fullname : 'Unknown Attendant';
// // //         const attendantId = attendant ? attendant._id : null;
// // //         const distanceKm = parseInt(distance) || 0;
// // //         const needTransport = addTransport === 'true';

// // //         // Calculate cart subtotal (sum of all products)
// // //         let cartItemsWithSubtotals = [];
// // //         let cartSubtotal = 0;
        
// // //         for (const item of cart) {
// // //             const itemSubtotal = parseInt(item.quantity) * parseFloat(item.unitPrice);
// // //             cartSubtotal += itemSubtotal;
// // //             cartItemsWithSubtotals.push({
// // //                 productName: item.productName,
// // //                 quantity: parseInt(item.quantity),
// // //                 unitPrice: parseFloat(item.unitPrice),
// // //                 subtotal: itemSubtotal
// // //             });
// // //         }
        
// // //         // Calculate transport fee based on cart subtotal
// // //         let transportFee = 0;
// // //         let freeTransportApplied = false;
        
// // //         if (needTransport && distanceKm > 0) {
// // //             const isWithinFreeDistance = distanceKm <= 10;
// // //             const isAboveFreeAmount = cartSubtotal >= 500000;
            
// // //             if (isWithinFreeDistance && isAboveFreeAmount) {
// // //                 transportFee = 0;
// // //                 freeTransportApplied = true;
// // //             } else {
// // //                 transportFee = 30000;
// // //             }
// // //         }
        
// // //         // Grand total = cart subtotal + transport fee
// // //         const grandTotal = cartSubtotal + transportFee;
        
// // //         // Save each item as separate sale record with transport fee
// // //         let allSales = [];
// // //         let firstSale = null;
        
// // //         for (let i = 0; i < cart.length; i++) {
// // //             const item = cart[i];
// // //             const product = await Stock.findOne({ productname: item.productName });
            
// // //             if (!product) {
// // //                 const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
// // //                 return res.render('new_sale', {
// // //                     items: items,
// // //                     error: `Product "${item.productName}" not found`,
// // //                     success: false
// // //                 });
// // //             }
            
// // //             const qty = parseInt(item.quantity);
// // //             if (product.quantity < qty) {
// // //                 const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
// // //                 return res.render('new_sale', {
// // //                     items: items,
// // //                     error: `Insufficient stock for ${product.productname}. Only ${product.quantity} available.`,
// // //                     success: false
// // //                 });
// // //             }
            
// // //             // Deduct from stock
// // //             product.quantity -= qty;
// // //             await product.save();
            
// // //             const itemSubtotal = qty * parseFloat(item.unitPrice);
            
// // //             const saleData = {
// // //                 customername,
// // //                 phonenumber,
// // //                 nin: nin || 'N/A',
// // //                 paymentmethod: paymentmethod || 'Cash',
// // //                 productname: item.productName,
// // //                 quantity: qty,
// // //                 unitprice: parseFloat(item.unitPrice),
// // //                 subtotal: itemSubtotal,
// // //                 distance: distanceKm,
// // //                 transportFee: i === 0 ? transportFee : 0,
// // //                 total: itemSubtotal + (i === 0 ? transportFee : 0),
// // //                 freeTransportApplied: freeTransportApplied,
// // //                 needTransport: needTransport,
// // //                 attendant: attendantId,
// // //                 attendantName: attendantName,
// // //                 Date: new Date(),
// // //                 items: [{
// // //                     productName: item.productName,
// // //                     quantity: qty,
// // //                     price: parseFloat(item.unitPrice)
// // //                 }]
// // //             };
            
// // //             const newSale = new Sale(saleData);
// // //             await newSale.save();
// // //             allSales.push(newSale);
// // //             if (i === 0) firstSale = newSale;
// // //         }
        
// // //         // Pass calculated totals to receipt - CORRECTED
// // //         res.render('receipt', { 
// // //             sale: firstSale,
// // //             allSales: allSales,
// // //             cartItems: cartItemsWithSubtotals,
// // //             cartSubtotal: cartSubtotal,
// // //             transportFee: transportFee,
// // //             grandTotal: grandTotal,
// // //             freeTransportApplied: freeTransportApplied,
// // //             distance: distanceKm,
// // //             needTransport: needTransport,
// // //             success: true 
// // //         });
        
// // //     } catch (error) {
// // //         console.log('Error details:', error);
        
// // //         try {
// // //             const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            
// // //             if (error.name === 'ValidationError') {
// // //                 const validationErrors = Object.values(error.errors).map(err => err.message);
// // //                 return res.render('new_sale', {
// // //                     items: items,
// // //                     error: validationErrors.join(', '),
// // //                     success: false
// // //                 });
// // //             }
            
// // //             res.render('new_sale', {
// // //                 items: items,
// // //                 error: error.message || 'An error occurred while processing the sale',
// // //                 success: false
// // //             });
// // //         } catch (err) {
// // //             res.render('new_sale', {
// // //                 items: [],
// // //                 error: 'An error occurred while processing the sale',
// // //                 success: false
// // //             });
// // //         }
// // //     }
// // // });
// // router.post('/postSale', async (req, res) => {
// //     try {
// //         const {
// //             customername,
// //             phonenumber,
// //             nin,
// //             paymentmethod,
// //             cartItems,
// //             distance,
// //             addTransport
// //         } = req.body;

// //         // Parse cart items
// //         let cart = [];
// //         if (cartItems) {
// //             cart = JSON.parse(cartItems);
// //         }

// //         if (cart.length === 0) {
// //             const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
// //             return res.render('new_sale', {
// //                 items: items,
// //                 error: 'Cart is empty. Add at least one product.',
// //                 success: false
// //             });
// //         }

// //         const attendant = req.user;
// //         const attendantName = attendant ? attendant.fullname : 'Unknown Attendant';
// //         const attendantId = attendant ? attendant._id : null;
// //         const distanceKm = parseInt(distance) || 0;
// //         const needTransport = addTransport === 'true';

// //         // Process cart items and update stock
// //         let cartItemsWithDetails = [];
// //         let cartSubtotal = 0;
        
// //         for (const item of cart) {
// //             const product = await Stock.findOne({ productname: item.productName });
            
// //             if (!product) {
// //                 const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
// //                 return res.render('new_sale', {
// //                     items: items,
// //                     error: `Product "${item.productName}" not found`,
// //                     success: false
// //                 });
// //             }
            
// //             const qty = parseInt(item.quantity);
// //             if (product.quantity < qty) {
// //                 const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
// //                 return res.render('new_sale', {
// //                     items: items,
// //                     error: `Insufficient stock for ${product.productname}. Only ${product.quantity} available.`,
// //                     success: false
// //                 });
// //             }
            
// //             // Deduct from stock
// //             product.quantity -= qty;
// //             await product.save();
            
// //             const itemSubtotal = qty * parseFloat(item.unitPrice);
// //             cartSubtotal += itemSubtotal;
            
// //             cartItemsWithDetails.push({
// //                 productname: item.productName,
// //                 quantity: qty,
// //                 unitprice: parseFloat(item.unitPrice),
// //                 subtotal: itemSubtotal
// //             });
// //         }
        
// //         // Calculate transport fee
// //         let transportFee = 0;
// //         let freeTransportApplied = false;
        
// //         if (needTransport && distanceKm > 0) {
// //             const isWithinFreeDistance = distanceKm <= 10;
// //             const isAboveFreeAmount = cartSubtotal >= 500000;
            
// //             if (isWithinFreeDistance && isAboveFreeAmount) {
// //                 transportFee = 0;
// //                 freeTransportApplied = true;
// //             } else {
// //                 transportFee = 30000;
// //             }
// //         }
        
// //         // Grand total
// //         const grandTotal = cartSubtotal + transportFee;
        
// //         // Create SINGLE sale record
// //         const saleData = {
// //             customername,
// //             phonenumber,
// //             nin: nin || 'N/A',
// //             paymentmethod: paymentmethod || 'Cash',
// //             items: cartItemsWithDetails,
// //             cartSubtotal: cartSubtotal,
// //             distance: distanceKm,
// //             transportFee: transportFee,
// //             grandTotal: grandTotal,
// //             freeTransportApplied: freeTransportApplied,
// //             needTransport: needTransport,
// //             Date: new Date()
// //         };
        
// //         const newSale = new Sale(saleData);
// //         await newSale.save();
        
// //         // Pass to receipt
// //         res.render('receipt', { 
// //             sale: newSale,
// //             cartItems: cartItemsWithDetails,
// //             cartSubtotal: cartSubtotal,
// //             transportFee: transportFee,
// //             grandTotal: grandTotal,
// //             freeTransportApplied: freeTransportApplied,
// //             distance: distanceKm,
// //             needTransport: needTransport,
// //             success: true 
// //         });
        
// //     } catch (error) {
// //         console.log('Error details:', error);
        
// //         try {
// //             const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            
// //             if (error.name === 'ValidationError') {
// //                 const validationErrors = Object.values(error.errors).map(err => err.message);
// //                 return res.render('new_sale', {
// //                     items: items,
// //                     error: validationErrors.join(', '),
// //                     success: false
// //                 });
// //             }
            
// //             res.render('new_sale', {
// //                 items: items,
// //                 error: error.message || 'An error occurred while processing the sale',
// //                 success: false
// //             });
// //         } catch (err) {
// //             res.render('new_sale', {
// //                 items: [],
// //                 error: 'An error occurred while processing the sale',
// //                 success: false
// //             });
// //         }
// //     }
// // });



// // // 
// // router.get('/receipt/:id', async (req, res) => {
// //     try {
// //         const sale = await Sale.findById(req.params.id);
        
// //         if (!sale) {
// //             return res.redirect('/salesattendant');
// //         }
        
// //         res.render('receipt', { 
// //             sale: sale,
// //             cartItems: sale.items,
// //             cartSubtotal: sale.cartSubtotal,
// //             transportFee: sale.transportFee,
// //             grandTotal: sale.grandTotal,
// //             freeTransportApplied: sale.freeTransportApplied,
// //             distance: sale.distance,
// //             needTransport: sale.needTransport,
// //             success: true 
// //         });
        
// //     } catch (error) {
// //         console.error(error);
// //         res.redirect('/salesattendant');
// //     }
// // });

// // module.exports = router;

// const express = require("express");
// const router = express.Router();
// const Sale = require('../models/Sales');
// const Stock = require('../models/Stock');

// router.get("/sale", async (req, res) => {
//     try {
//         const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
//         res.render('new_sale', { 
//             items: items,
//             success: req.query.success === 'true',
//             error: null
//         });
//     } catch (error) {
//         console.log('error', error.message);
//         res.render('new_sale', { 
//             items: [],
//             error: 'Failed to load products'
//         });
//     }
// });

// router.post('/postSale', async (req, res) => {
//     try {
//         const {
//             customername,
//             phonenumber,
//             nin,
//             paymentmethod,
//             cartItems,
//             distance,
//             addTransport
//         } = req.body;

//         // Parse cart items
//         let cart = [];
//         if (cartItems) {
//             cart = JSON.parse(cartItems);
//         }

//         if (cart.length === 0) {
//             const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
//             return res.render('new_sale', {
//                 items: items,
//                 error: 'Cart is empty. Add at least one product.',
//                 success: false
//             });
//         }

//         // Get attendant info from logged-in user
//         const attendant = req.user;
//         const attendantName = attendant ? attendant.fullname : 'Unknown Attendant';
//         const attendantId = attendant ? attendant._id : null;
//         const distanceKm = parseInt(distance) || 0;
//         const needTransport = addTransport === 'true';

//         // Process cart items and update stock
//         let cartItemsWithDetails = [];
//         let cartSubtotal = 0;
        
//         for (const item of cart) {
//             const product = await Stock.findOne({ productname: item.productName });
            
//             if (!product) {
//                 const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
//                 return res.render('new_sale', {
//                     items: items,
//                     error: `Product "${item.productName}" not found`,
//                     success: false
//                 });
//             }
            
//             const qty = parseInt(item.quantity);
//             if (product.quantity < qty) {
//                 const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
//                 return res.render('new_sale', {
//                     items: items,
//                     error: `Insufficient stock for ${product.productname}. Only ${product.quantity} available.`,
//                     success: false
//                 });
//             }
            
//             // Deduct from stock
//             product.quantity -= qty;
//             await product.save();
            
//             const itemSubtotal = qty * parseFloat(item.unitPrice);
//             cartSubtotal += itemSubtotal;
            
//             cartItemsWithDetails.push({
//                 productname: item.productName,
//                 quantity: qty,
//                 unitprice: parseFloat(item.unitPrice),
//                 subtotal: itemSubtotal
//             });
//         }
        
//         // Calculate transport fee
//         let transportFee = 0;
//         let freeTransportApplied = false;
        
//         if (needTransport && distanceKm > 0) {
//             const isWithinFreeDistance = distanceKm <= 10;
//             const isAboveFreeAmount = cartSubtotal >= 500000;
            
//             if (isWithinFreeDistance && isAboveFreeAmount) {
//                 transportFee = 0;
//                 freeTransportApplied = true;
//             } else {
//                 transportFee = 30000;
//             }
//         }
        
//         // Grand total
//         const grandTotal = cartSubtotal + transportFee;
        
//         // Create SINGLE sale record WITH attendant information
//         const saleData = {
//             customername,
//             phonenumber,
//             nin: nin || 'N/A',
//             paymentmethod: paymentmethod || 'Cash',
//             items: cartItemsWithDetails,
//             cartSubtotal: cartSubtotal,
//             distance: distanceKm,
//             transportFee: transportFee,
//             grandTotal: grandTotal,
//             freeTransportApplied: freeTransportApplied,
//             needTransport: needTransport,
//             attendantName: attendantName,      // ✅ Added: Save attendant's name
//             attendant: attendantId,            // ✅ Added: Save attendant's ObjectId
//             Date: new Date()
//         };
        
//         const newSale = new Sale(saleData);
//         await newSale.save();
        
//         // Pass to receipt
//         res.render('receipt', { 
//             sale: newSale,
//             cartItems: cartItemsWithDetails,
//             cartSubtotal: cartSubtotal,
//             transportFee: transportFee,
//             grandTotal: grandTotal,
//             freeTransportApplied: freeTransportApplied,
//             distance: distanceKm,
//             needTransport: needTransport,
//             success: true 
//         });
        
//     } catch (error) {
//         console.log('Error details:', error);
        
//         try {
//             const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            
//             if (error.name === 'ValidationError') {
//                 const validationErrors = Object.values(error.errors).map(err => err.message);
//                 return res.render('new_sale', {
//                     items: items,
//                     error: validationErrors.join(', '),
//                     success: false
//                 });
//             }
            
//             res.render('new_sale', {
//                 items: items,
//                 error: error.message || 'An error occurred while processing the sale',
//                 success: false
//             });
//         } catch (err) {
//             res.render('new_sale', {
//                 items: [],
//                 error: 'An error occurred while processing the sale',
//                 success: false
//             });
//         }
//     }
// });

// router.get('/receipt/:id', async (req, res) => {
//     try {
//         const sale = await Sale.findById(req.params.id).populate('attendant', 'fullname');
        
//         if (!sale) {
//             return res.redirect('/sale');
//         }
        
//         res.render('receipt', { 
//             sale: sale,
//             cartItems: sale.items,
//             cartSubtotal: sale.cartSubtotal,
//             transportFee: sale.transportFee,
//             grandTotal: sale.grandTotal,
//             freeTransportApplied: sale.freeTransportApplied,
//             distance: sale.distance,
//             needTransport: sale.needTransport,
//             success: true 
//         });
        
//     } catch (error) {
//         console.error(error);
//         res.redirect('/salesattendant');
//     }
// });

// module.exports = router;
const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales');
const Stock = require('../models/Stock');

// ========== AUTHENTICATION MIDDLEWARE ==========
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// ========== SALE ROUTES ==========
router.get("/sale", isAuthenticated, async (req, res) => {
    try {
        const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
        res.render('new_sale', { 
            items: items,
            success: req.query.success === 'true',
            error: null,
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
                success: false,
                currentUser: req.user
            });
        }

        // Get attendant info from logged-in user
        const attendant = req.user;
        const attendantName = attendant ? attendant.fullname : 'Unknown Attendant';
        const attendantId = attendant ? attendant._id : null;
        const distanceKm = parseInt(distance) || 0;
        const needTransport = addTransport === 'true';

        // Process cart items and update stock
        let cartItemsWithDetails = [];
        let cartSubtotal = 0;
        
        for (const item of cart) {
            const product = await Stock.findOne({ productname: item.productName });
            
            if (!product) {
                const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
                return res.render('new_sale', {
                    items: items,
                    error: `Product "${item.productName}" not found`,
                    success: false,
                    currentUser: req.user
                });
            }
            
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
            
            // Deduct from stock
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
        
        // Grand total
        const grandTotal = cartSubtotal + transportFee;
        
        // Create sale record WITH attendant information
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
        
        // Redirect to receipt page (this preserves the session)
        res.redirect(`/receipt/${newSale._id}`);
        
    } catch (error) {
        console.log('Error details:', error);
        
        try {
            const items = await Stock.find({ quantity: { $gt: 0 } }).lean();
            
            if (error.name === 'ValidationError') {
                const validationErrors = Object.values(error.errors).map(err => err.message);
                return res.render('new_sale', {
                    items: items,
                    error: validationErrors.join(', '),
                    success: false,
                    currentUser: req.user
                });
            }
            
            res.render('new_sale', {
                items: items,
                error: error.message || 'An error occurred while processing the sale',
                success: false,
                currentUser: req.user
            });
        } catch (err) {
            res.render('new_sale', {
                items: [],
                error: 'An error occurred while processing the sale',
                success: false,
                currentUser: req.user
            });
        }
    }
});

router.get('/receipt/:id', isAuthenticated, async (req, res) => {
    try {
        const sale = await Sale.findById(req.params.id).populate('attendant', 'fullname');
        
        if (!sale) {
            return res.redirect('/salesattendant');
        }
        
        res.render('receipt', { 
            sale: sale,
            cartItems: sale.items,
            cartSubtotal: sale.cartSubtotal,
            transportFee: sale.transportFee,
            grandTotal: sale.grandTotal,
            freeTransportApplied: sale.freeTransportApplied,
            distance: sale.distance,
            needTransport: sale.needTransport,
            success: true,
            currentUser: req.user
        });
        
    } catch (error) {
        console.error(error);
        res.redirect('/salesattendant');
    }
});

module.exports = router;