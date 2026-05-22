const express = require("express");
const router = express.Router();
const Stock = require('../models/Stock');
const StockTransaction = require('../models/StockTransaction');

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
        const stockItems = await Stock.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        // Get stock transaction history
        const stockTransactions = await StockTransaction.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 })
            .limit(100);
        
        const transformedStock = stockItems.map(item => ({
            ...item.toObject(),
            attendantName: item.attendantName || (item.attendant ? item.attendant.fullname : 'Unknown')
        }));
        
        res.render('stock', { 
            stockItems: transformedStock,
            stockTransactions: stockTransactions,
            currentUser: req.user 
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
        const { 
            productname, 
            category, 
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
        
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        const attendantId = req.user ? req.user._id : null;
        
        // Check if product with same name, costprice, and sellingprice already exists
        const existingStock = await Stock.findOne({
            productname: productname,
            costprice: Number(costprice),
            sellingprice: Number(sellingprice)
        });
        
        if (existingStock) {
            // RECORD OLD QUANTITY BEFORE UPDATE
            const oldQuantity = existingStock.quantity;
            const addedQty = Number(quantity);
            const newQty = oldQuantity + addedQty;
            
            // Update existing stock
            existingStock.quantity = newQty;
            existingStock.category = category;
            existingStock.supplier = supplier;
            existingStock.supplierEmail = supplierEmail;
            existingStock.supplierPhone = supplierPhone;
            existingStock.supplierCompany = supplierCompany;
            existingStock.reorderlevel = Number(reorderlevel);
            existingStock.paymentMethod = paymentMethod || 'Cash';
            
            await existingStock.save();
            
            // CREATE TRANSACTION RECORD for quantity update
            const transaction = new StockTransaction({
                productname: productname,
                category: category,
                transactionType: 'UPDATE_QUANTITY',
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
            // Create new stock entry
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
            
            // CREATE TRANSACTION RECORD for new stock
            const transaction = new StockTransaction({
                productname: productname,
                category: category,
                transactionType: 'ADD_NEW',
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
        const attendantId = req.user ? req.user._id : null;
        
        const deletedItem = await Stock.findById(req.params.id);
        
        if (deletedItem) {
            // CREATE TRANSACTION RECORD for deletion
            const transaction = new StockTransaction({
                productname: deletedItem.productname,
                category: deletedItem.category,
                transactionType: 'DELETE',
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
        
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        const attendantId = req.user ? req.user._id : null;
        
        const existingItem = await Stock.findById(req.params.id);
        const oldQuantity = existingItem ? existingItem.quantity : 0;
        const newQuantity = Number(quantity);
        
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
        
        // CREATE TRANSACTION RECORD for edit
        const transaction = new StockTransaction({
            productname: existingItem.productname,
            category: existingItem.category,
            transactionType: 'UPDATE_QUANTITY',
            previousQuantity: oldQuantity,
            addedQuantity: newQuantity - oldQuantity,
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
        
        console.log(`[${new Date().toLocaleString()}] Stock updated by ${attendantName} with ID:`, req.params.id);
        res.redirect('/addStock');
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

module.exports = router;