const express = require("express");
const router = express.Router();
const Stock = require('../models/Stock');
const StockTransaction = require('../models/StockTransaction');

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
// DISPLAY STOCK MANAGEMENT PAGE
// URL: /addStock
// ============================================================
// This route shows the stock management page with:
// - Form to add new stock
// - Current stock inventory table
// - Stock transaction history (audit trail)
router.get('/addStock', isAuthenticated, async (req, res) => {
    try {
        // Fetch all stock items from database, sorted by date (newest first)
        // Also populate the attendant field to get the person who added each item
        const stockItems = await Stock.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        // Fetch stock transaction history for the audit trail
        // Limited to 100 most recent transactions for performance
        const stockTransactions = await StockTransaction.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 })
            .limit(100);
        
        // Transform stock items to ensure attendant name is always available
        const transformedStock = stockItems.map(item => ({
            ...item.toObject(),
            attendantName: item.attendantName || (item.attendant ? item.attendant.fullname : 'Unknown')
        }));
        
        // Render the stock management page with all data
        res.render('stock', { 
            stockItems: transformedStock,           // List of all stock items
            stockTransactions: stockTransactions,   // Transaction history
            currentUser: req.user                   // Current logged-in user
        });
    } catch (error) {
        console.error(error);
        res.render('stock', { 
            stockItems: [],
            stockTransactions: [],
            currentUser: req.user 
        });
    }
});

// ============================================================
// SHOW EDIT STOCK FORM
// URL: /editStock/:id
// ============================================================
// This route displays the edit form for a specific stock item
router.get('/editStock/:id', isAuthenticated, async (req, res) => {
    try {
        // Find the stock item by its ID
        const item = await Stock.findById(req.params.id).populate('attendant', 'fullname');
        
        // ✅ ADD THIS NULL CHECK RIGHT HERE
        if (!item) {
            console.log(`[${new Date().toLocaleString()}] Edit form requested for non-existent stock ID: ${req.params.id}`);
            
            // If using flash messages (optional)
            if (req.flash) {
                req.flash('error', 'Stock item not found - it may have been deleted');
            }
            
            return res.redirect('/addStock');
        }
        
        // Render the edit form with the item data
        res.render('stock_edit', { 
            item: item,
            currentUser: req.user 
        });
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

// ============================================================
// ADD NEW STOCK ITEM
// URL: /postStock
// ============================================================
// This route adds new stock to the inventory
// If a product with the same name and prices exists, it adds to quantity instead
// Also creates a transaction record for the audit trail
router.post('/postStock', isAuthenticated, async (req, res) => {
    try {
        // Extract all form data including supplier information
        const { 
            productname,           // Name of the product
            category,             // Product category (Cement, Pipes, etc.)
            quantity,             // Quantity being added
            costprice,            // Cost price per unit
            sellingprice,         // Selling price per unit
            supplier,             // Supplier name
            supplierEmail,        // Supplier email address
            supplierPhone,        // Supplier phone number
            supplierCompany,      // Supplier company name
            reorderlevel,         // Minimum stock level before reorder
            paymentMethod         // Payment method (Cash or Credit)
        } = req.body;
        
        // Get attendant information from the logged-in user
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        const attendantId = req.user ? req.user._id : null;
        
        // ============================================================
        // CHECK FOR EXISTING PRODUCT
        // ============================================================
        // Look for a product with the same name, cost price, and selling price
        // If found, we'll add to its quantity instead of creating a duplicate
        const existingStock = await Stock.findOne({
            productname: productname,
            costprice: Number(costprice),
            sellingprice: Number(sellingprice)
        });
        
        if (existingStock) {
            // ============================================================
            // UPDATE EXISTING STOCK
            // ============================================================
            // Record old quantity for transaction history
            const oldQuantity = existingStock.quantity;
            const addedQty = Number(quantity);
            const newQty = oldQuantity + addedQty;
            
            // Update all fields of the existing stock item
            existingStock.quantity = newQty;
            existingStock.category = category;
            existingStock.supplier = supplier;
            existingStock.supplierEmail = supplierEmail;
            existingStock.supplierPhone = supplierPhone;
            existingStock.supplierCompany = supplierCompany;
            existingStock.reorderlevel = Number(reorderlevel);
            existingStock.paymentMethod = paymentMethod || 'Cash';
            
            await existingStock.save();
            
            // ============================================================
            // CREATE TRANSACTION RECORD FOR THE UPDATE
            // ============================================================
            const transaction = new StockTransaction({
                productname: productname,
                category: category,
                transactionType: 'UPDATE_QUANTITY',   // Type of transaction
                previousQuantity: oldQuantity,
                addedQuantity: addedQty,
                newQuantity: newQty,
                costprice: Number(costprice),
                sellingprice: Number(sellingprice),
                supplier: supplier,
                supplierEmail: supplierEmail,
                supplierPhone: supplierPhone,
                supplierCompany: supplierCompany,
                reorderlevel: Number(reorderlevel),
                paymentMethod: paymentMethod || 'Cash',
                attendant: attendantId,
                attendantName: attendantName,
                Date: new Date(),
                notes: `Added ${addedQty} units to existing stock`
            });
            
            await transaction.save();
            console.log(`[${new Date().toLocaleString()}] Stock updated by ${attendantName}:`, productname, "Old:", oldQuantity, "Added:", addedQty, "New:", newQty);
        } else {
            // ============================================================
            // CREATE NEW STOCK ENTRY
            // ============================================================
            const newStock = new Stock({
                productname,
                category,
                quantity: Number(quantity),
                costprice: Number(costprice),
                sellingprice: Number(sellingprice),
                supplier,
                supplierEmail,
                supplierPhone,
                supplierCompany,
                reorderlevel: Number(reorderlevel),
                paymentMethod: paymentMethod || 'Cash',
                Date: new Date(),
                attendant: attendantId,
                attendantName: attendantName
            });
            
            await newStock.save();
            
            // ============================================================
            // CREATE TRANSACTION RECORD FOR NEW STOCK
            // ============================================================
            const transaction = new StockTransaction({
                productname: productname,
                category: category,
                transactionType: 'ADD_NEW',          // Type of transaction
                previousQuantity: 0,
                addedQuantity: Number(quantity),
                newQuantity: Number(quantity),
                costprice: Number(costprice),
                sellingprice: Number(sellingprice),
                supplier: supplier,
                supplierEmail: supplierEmail,
                supplierPhone: supplierPhone,
                supplierCompany: supplierCompany,
                reorderlevel: Number(reorderlevel),
                paymentMethod: paymentMethod || 'Cash',
                attendant: attendantId,
                attendantName: attendantName,
                Date: new Date(),
                notes: `New product added to inventory`
            });
            
            await transaction.save();
            console.log(`[${new Date().toLocaleString()}] New stock added by ${attendantName}:`, productname);
        }
        
        // Redirect back to the stock management page
        res.redirect('/addStock');
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

// ============================================================
// DELETE STOCK ITEM
// URL: /deleteStock/:id
// ============================================================
// This route permanently deletes a stock item from the database
// Also creates a transaction record for the audit trail
router.post('/deleteStock/:id', isAuthenticated, async (req, res) => {
    try {
        // Get attendant information
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        const attendantId = req.user ? req.user._id : null;
        
        // Find the item before deleting it (so we can record its details)
        const deletedItem = await Stock.findById(req.params.id);
        
        if (deletedItem) {
            // ============================================================
            // CREATE TRANSACTION RECORD FOR DELETION
            // ============================================================
            const transaction = new StockTransaction({
                productname: deletedItem.productname,
                category: deletedItem.category,
                transactionType: 'DELETE',            // Type of transaction
                previousQuantity: deletedItem.quantity,
                addedQuantity: 0,
                newQuantity: 0,
                costprice: deletedItem.costprice,
                sellingprice: deletedItem.sellingprice,
                supplier: deletedItem.supplier,
                supplierEmail: deletedItem.supplierEmail,
                supplierPhone: deletedItem.supplierPhone,
                supplierCompany: deletedItem.supplierCompany,
                reorderlevel: deletedItem.reorderlevel,
                paymentMethod: deletedItem.paymentMethod,
                attendant: attendantId,
                attendantName: attendantName,
                Date: new Date(),
                notes: `Product deleted from inventory`
            });
            
            await transaction.save();
        }
        
        // Delete the item from the database
        await Stock.findByIdAndDelete(req.params.id);
        console.log(`[${new Date().toLocaleString()}] Stock deleted by ${attendantName} with ID:`, req.params.id);
        
        res.redirect('/addStock');
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

// ============================================================
// UPDATE STOCK ITEM (EDIT)
// URL: /editStock/:id
// ============================================================
// This route updates an existing stock item's information
// Also creates a transaction record for the audit trail
router.post('/editStock/:id', isAuthenticated, async (req, res) => {
    try {
        // Extract updated data from the form
        const { 
            quantity, 
            costprice, 
            sellingprice, 
            supplier, 
            supplierEmail, 
            supplierPhone, 
            supplierCompany,
            reorderlevel, 
            paymentMethod 
        } = req.body;
        
        // Get attendant information
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        const attendantId = req.user ? req.user._id : null;
        
        // Find the existing item to get old quantity and product info
        const existingItem = await Stock.findById(req.params.id);
        
        // CHECK IF ITEM EXISTS
        if (!existingItem) {
            console.log(`[${new Date().toLocaleString()}] Edit failed - Stock item not found: ${req.params.id}`);
            
            // If using flash messages
            if (req.flash) {
                req.flash('error', 'Stock item not found - it may have been deleted');
            }
            
            return res.redirect('/addStock');
        }
        
        const oldQuantity = existingItem.quantity || 0;
        const newQuantity = Number(quantity);
        
        // Update the stock item in the database
        await Stock.findByIdAndUpdate(req.params.id, {
            quantity: newQuantity,
            costprice: Number(costprice),
            sellingprice: Number(sellingprice),
            supplier,
            supplierEmail,
            supplierPhone,
            supplierCompany,
            reorderlevel: Number(reorderlevel),
            paymentMethod: paymentMethod || 'Cash'
        });
        
        // ============================================================
        // CREATE TRANSACTION RECORD FOR THE EDIT
        // ============================================================
        const transaction = new StockTransaction({
            productname: existingItem.productname,
            category: existingItem.category,
            transactionType: 'UPDATE_QUANTITY',      // Type of transaction
            previousQuantity: oldQuantity,
            addedQuantity: newQuantity - oldQuantity, // Change in quantity (negative if decreased)
            newQuantity: newQuantity,
            costprice: Number(costprice),
            sellingprice: Number(sellingprice),
            supplier: supplier,
            supplierEmail: supplierEmail,
            supplierPhone: supplierPhone,
            supplierCompany: supplierCompany,
            reorderlevel: Number(reorderlevel),
            paymentMethod: paymentMethod || 'Cash',
            attendant: attendantId,
            attendantName: attendantName,
            Date: new Date(),
            notes: `Stock quantity updated from ${oldQuantity} to ${newQuantity}`
        });
        
        await transaction.save();
        
        console.log(`[${new Date().toLocaleString()}] Stock updated by ${attendantName} with ID: ${req.params.id}`);
        res.redirect('/addStock');
        
    } catch (error) {
        console.error('Error editing stock:', error);
        
        // If using flash messages
        if (req.flash) {
            req.flash('error', 'Error updating stock: ' + error.message);
        }
        
        res.redirect('/addStock');
    }
});

module.exports = router;