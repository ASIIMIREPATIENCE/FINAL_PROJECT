const express = require("express");
const router = express.Router();
const Stock = require('../models/Stock');

// ========== AUTHENTICATION MIDDLEWARE ==========
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// GET route - Display stock page with all stock items
router.get('/addStock', isAuthenticated, async (req, res) => {
    try {
        // Populate the attendant field to get full user details
        const stockItems = await Stock.find()
            .populate('attendant', 'fullname') // This populates the attendant with fullname
            .sort({ Date: -1 });
        
        // Transform the data to ensure attendantName is available
        const transformedStock = stockItems.map(item => ({
            ...item.toObject(),
            attendantName: item.attendantName || (item.attendant ? item.attendant.fullname : 'Unknown')
        }));
        
        res.render('stock', { 
            stockItems: transformedStock,
            currentUser: req.user 
        });
    } catch (error) {
        console.error(error);
        res.render('stock', { 
            stockItems: [],
            currentUser: req.user 
        });
    }
});

// GET route - Show edit form
router.get('/editStock/:id', isAuthenticated, async (req, res) => {
    try {
        const item = await Stock.findById(req.params.id).populate('attendant', 'fullname');
        res.render('stock_edit', { 
            item: item,
            currentUser: req.user 
        });
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

// POST route - Add new stock item (with duplicate check)
router.post('/postStock', isAuthenticated, async (req, res) => {
    try {
        const { productname, category, quantity, costprice, sellingprice, supplier, reorderlevel, paymentMethod } = req.body;
        
        // Get attendant info
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        const attendantId = req.user ? req.user._id : null;
        
        // Check if product with same name, costprice, and sellingprice already exists
        const existingStock = await Stock.findOne({
            productname: productname,
            costprice: Number(costprice),
            sellingprice: Number(sellingprice)
        });
        
        if (existingStock) {
            // Update existing stock by adding to quantity
            existingStock.quantity += Number(quantity);
            existingStock.category = category;
            existingStock.supplier = supplier;
            existingStock.reorderlevel = Number(reorderlevel);
            existingStock.paymentMethod = paymentMethod || 'Cash';
            
            await existingStock.save();
            console.log(`[${new Date().toLocaleString()}] Stock updated by ${attendantName}:`, productname, "New quantity:", existingStock.quantity);
        } else {
            // Create new stock entry
            const newStock = new Stock({
                productname,
                category,
                quantity: Number(quantity),
                costprice: Number(costprice),
                sellingprice: Number(sellingprice),
                supplier,
                reorderlevel: Number(reorderlevel),
                paymentMethod: paymentMethod || 'Cash',
                Date: new Date(),
                attendant: attendantId,
                attendantName: attendantName  // Store the name directly
            });
            
            await newStock.save();
            console.log(`[${new Date().toLocaleString()}] New stock added by ${attendantName}:`, productname);
        }
        
        res.redirect('/addStock');
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

// DELETE route - Delete stock item
router.post('/deleteStock/:id', isAuthenticated, async (req, res) => {
    try {
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        await Stock.findByIdAndDelete(req.params.id);
        console.log(`[${new Date().toLocaleString()}] Stock deleted by ${attendantName} with ID:`, req.params.id);
        res.redirect('/addStock');
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

// EDIT route - Update stock item
router.post('/editStock/:id', isAuthenticated, async (req, res) => {
    try {
        const { quantity, costprice, sellingprice, supplier, reorderlevel, paymentMethod } = req.body;
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        
        await Stock.findByIdAndUpdate(req.params.id, {
            quantity: Number(quantity),
            costprice: Number(costprice),
            sellingprice: Number(sellingprice),
            supplier,
            reorderlevel: Number(reorderlevel),
            paymentMethod: paymentMethod || 'Cash'
        });
        
        console.log(`[${new Date().toLocaleString()}] Stock updated by ${attendantName} with ID:`, req.params.id);
        res.redirect('/addStock');
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

module.exports = router;