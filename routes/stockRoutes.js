const express = require("express");
const router = express.Router();
const Stock = require('../models/Stock');
const StockTransaction = require('../models/StockTransaction');
const SupplierCredit = require('../models/SupplierCredit'); // ADD THIS LINE

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
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
router.get('/addStock', isAuthenticated, async (req, res) => {
    try {
        const stockItems = await Stock.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
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

// ============================================================
// SHOW EDIT STOCK FORM
// URL: /editStock/:id
// ============================================================
router.get('/editStock/:id', isAuthenticated, async (req, res) => {
    try {
        const item = await Stock.findById(req.params.id);
        
        if (!item) {
            console.log(`[${new Date().toLocaleString()}] Edit form requested for non-existent stock ID: ${req.params.id}`);
            if (req.flash) {
                req.flash('error', 'Stock item not found - it may have been deleted');
            }
            return res.redirect('/addStock');
        }
        
        res.render('stock_edit', { 
            item: item,
            currentUser: req.user
        });
    } catch (error) {
        console.error('Error loading edit form:', error);
        if (req.flash) {
            req.flash('error', 'Error loading edit form');
        }
        res.redirect('/addStock');
    }
});

// ============================================================
// ADD NEW STOCK ITEM
// URL: /postStock
// ============================================================
router.post('/postStock', isAuthenticated, async (req, res) => {
    try {
        const { 
            productname, category, quantity, costprice, sellingprice,
            supplier, supplierEmail, supplierPhone, supplierCompany,
            reorderlevel, paymentMethod
        } = req.body;
        
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        const attendantId = req.user ? req.user._id : null;
        
        const existingStock = await Stock.findOne({
            productname: productname,
            costprice: Number(costprice),
            sellingprice: Number(sellingprice)
        });
        
        if (existingStock) {
            const oldQuantity = existingStock.quantity;
            const addedQty = Number(quantity);
            const newQty = oldQuantity + addedQty;
            
            existingStock.quantity = newQty;
            existingStock.category = category;
            existingStock.supplier = supplier;
            existingStock.supplierEmail = supplierEmail;
            existingStock.supplierPhone = supplierPhone;
            existingStock.supplierCompany = supplierCompany;
            existingStock.reorderlevel = Number(reorderlevel);
            existingStock.paymentMethod = paymentMethod || 'Cash';
            
            await existingStock.save();
            
            const transaction = new StockTransaction({
                productname, category,
                transactionType: 'UPDATE_QUANTITY',
                previousQuantity: oldQuantity,
                addedQuantity: addedQty,
                newQuantity: newQty,
                costprice: Number(costprice),
                sellingprice: Number(sellingprice),
                supplier, supplierEmail, supplierPhone, supplierCompany,
                reorderlevel: Number(reorderlevel),
                paymentMethod: paymentMethod || 'Cash',
                attendant: attendantId,
                attendantName: attendantName,
                Date: new Date(),
                notes: `Added ${addedQty} units to existing stock`
            });
            
            await transaction.save();
            console.log(`[${new Date().toLocaleString()}] Stock updated by ${attendantName}:`, productname);
        } else {
            const newStock = new Stock({
                productname, category,
                quantity: Number(quantity),
                originalQuantity: Number(quantity),
                costprice: Number(costprice),
                sellingprice: Number(sellingprice),
                supplier, supplierEmail, supplierPhone, supplierCompany,
                reorderlevel: Number(reorderlevel),
                paymentMethod: paymentMethod || 'Cash',
                Date: new Date(),
                attendant: attendantId,
                attendantName: attendantName
            });
            
            await newStock.save();
            
            const transaction = new StockTransaction({
                productname, category,
                transactionType: 'ADD_NEW',
                previousQuantity: 0,
                addedQuantity: Number(quantity),
                newQuantity: Number(quantity),
                costprice: Number(costprice),
                sellingprice: Number(sellingprice),
                supplier, supplierEmail, supplierPhone, supplierCompany,
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
        
        // ============================================================
        // CREATE SEPARATE SUPPLIER CREDIT RECORD (IF PAYMENT METHOD IS CREDIT)
        // ============================================================
        if (paymentMethod === 'Credit') {
            const totalAmount = Number(costprice) * Number(quantity);
            const dueDate = new Date();
            dueDate.setDate(dueDate.getDate() + 30);
            
            const supplierCredit = new SupplierCredit({
                supplier: supplier,
                productname: productname,
                quantity: Number(quantity),
                costprice: Number(costprice),
                totalAmount: totalAmount,
                amountPaid: 0,
                balance: totalAmount,
                purchaseDate: new Date(),
                dueDate: dueDate,
                attendant: attendantId,
                attendantName: attendantName,
                notes: `Credit purchase of ${quantity} ${productname}`
            });
            
            await supplierCredit.save();
            console.log(`[${new Date().toLocaleString()}] Supplier credit recorded: UGX ${totalAmount} for ${productname}`);
        }
        
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
router.post('/deleteStock/:id', isAuthenticated, async (req, res) => {
    try {
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        const attendantId = req.user ? req.user._id : null;
        
        const deletedItem = await Stock.findById(req.params.id);
        
        if (deletedItem) {
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

// ============================================================
// UPDATE STOCK ITEM (EDIT)
// URL: /editStock/:id
// ============================================================
router.post('/editStock/:id', isAuthenticated, async (req, res) => {
    try {
        const { 
            quantity, costprice, sellingprice, supplier, 
            supplierEmail, supplierPhone, supplierCompany,
            reorderlevel, paymentMethod
        } = req.body;
        
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        const attendantId = req.user ? req.user._id : null;
        
        const existingItem = await Stock.findById(req.params.id);
        
        if (!existingItem) {
            console.log(`[${new Date().toLocaleString()}] Edit failed - Stock item not found: ${req.params.id}`);
            if (req.flash) {
                req.flash('error', 'Stock item not found - it may have been deleted');
            }
            return res.redirect('/addStock');
        }
        
        const oldQuantity = existingItem.quantity || 0;
        const newQuantity = Number(quantity);
        
        await Stock.findByIdAndUpdate(req.params.id, {
            quantity: newQuantity,
            costprice: Number(costprice),
            sellingprice: Number(sellingprice),
            supplier, supplierEmail, supplierPhone, supplierCompany,
            reorderlevel: Number(reorderlevel),
            paymentMethod: paymentMethod || 'Cash'
        });
        
        const transaction = new StockTransaction({
            productname: existingItem.productname,
            category: existingItem.category,
            transactionType: 'UPDATE_QUANTITY',
            previousQuantity: oldQuantity,
            addedQuantity: newQuantity - oldQuantity,
            newQuantity: newQuantity,
            costprice: Number(costprice),
            sellingprice: Number(sellingprice),
            supplier, supplierEmail, supplierPhone, supplierCompany,
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
        if (req.flash) {
            req.flash('error', 'Error updating stock: ' + error.message);
        }
        res.redirect('/addStock');
    }
});

// ============================================================
// SHOW EDIT TRANSACTION FORM
// URL: /editTransactionForm/:id
// ============================================================
router.get('/editTransactionForm/:id', isAuthenticated, async (req, res) => {
    try {
        const transaction = await StockTransaction.findById(req.params.id);
        
        if (!transaction) {
            if (req.flash) {
                req.flash('error', 'Transaction not found');
            }
            return res.redirect('/addStock');
        }
        
        res.render('transaction_edit', { 
            transaction: transaction,
            currentUser: req.user
        });
    } catch (error) {
        console.error('Error loading edit transaction form:', error);
        if (req.flash) {
            req.flash('error', 'Error loading transaction');
        }
        res.redirect('/addStock');
    }
});

// ============================================================
// EDIT TRANSACTION - Updates stock based on edited transaction
// URL: /editTransaction/:id
// ============================================================
router.post('/editTransaction/:id', isAuthenticated, async (req, res) => {
    try {
        const { 
            addedQuantity, costprice, sellingprice, supplier, 
            supplierEmail, supplierPhone, supplierCompany,
            reorderlevel, paymentMethod, notes
        } = req.body;
        
        const transaction = await StockTransaction.findById(req.params.id);
        if (!transaction) {
            if (req.flash) {
                req.flash('error', 'Transaction not found');
            }
            return res.redirect('/addStock');
        }
        
        const stockItem = await Stock.findOne({ 
            productname: transaction.productname,
            costprice: transaction.costprice,
            sellingprice: transaction.sellingprice
        });
        
        if (!stockItem) {
            if (req.flash) {
                req.flash('error', 'Stock item not found');
            }
            return res.redirect('/addStock');
        }
        
        const newAddedQuantity = Number(addedQuantity);
        const newQuantityValue = transaction.previousQuantity + newAddedQuantity;
        const finalQuantity = (stockItem.quantity - transaction.addedQuantity) + newAddedQuantity;
        
        if (finalQuantity < 0) {
            if (req.flash) {
                req.flash('error', 'Cannot edit: Would result in negative stock');
            }
            return res.redirect('/addStock');
        }
        
        stockItem.quantity = finalQuantity;
        stockItem.costprice = Number(costprice);
        stockItem.sellingprice = Number(sellingprice);
        stockItem.supplier = supplier;
        stockItem.supplierEmail = supplierEmail;
        stockItem.supplierPhone = supplierPhone;
        stockItem.supplierCompany = supplierCompany;
        stockItem.reorderlevel = Number(reorderlevel);
        stockItem.paymentMethod = paymentMethod || 'Cash';
        await stockItem.save();
        
        transaction.addedQuantity = newAddedQuantity;
        transaction.newQuantity = newQuantityValue;
        transaction.costprice = Number(costprice);
        transaction.sellingprice = Number(sellingprice);
        transaction.supplier = supplier;
        transaction.supplierEmail = supplierEmail;
        transaction.supplierPhone = supplierPhone;
        transaction.supplierCompany = supplierCompany;
        transaction.reorderlevel = Number(reorderlevel);
        transaction.paymentMethod = paymentMethod || 'Cash';
        transaction.notes = notes || transaction.notes;
        await transaction.save();
        
        console.log(`[${new Date().toLocaleString()}] Transaction ${transaction._id} edited`);
        
        if (req.flash) {
            req.flash('success', 'Transaction edited and stock updated successfully!');
        }
        res.redirect('/addStock');
        
    } catch (error) {
        console.error('Error editing transaction:', error);
        if (req.flash) {
            req.flash('error', 'Error editing transaction: ' + error.message);
        }
        res.redirect('/addStock');
    }
});

// ============================================================
// DELETE TRANSACTION - Removes transaction effect from stock
// URL: /deleteTransaction/:id
// ============================================================
router.post('/deleteTransaction/:id', isAuthenticated, async (req, res) => {
    try {
        const transaction = await StockTransaction.findById(req.params.id);
        if (!transaction) {
            return res.status(404).json({ success: false, message: 'Transaction not found' });
        }
        
        const stockItem = await Stock.findOne({ 
            productname: transaction.productname,
            costprice: transaction.costprice,
            sellingprice: transaction.sellingprice
        });
        
        if (!stockItem) {
            return res.status(404).json({ success: false, message: 'Stock item not found' });
        }
        
        const newQuantity = stockItem.quantity - transaction.addedQuantity;
        
        if (newQuantity < 0) {
            return res.status(400).json({ success: false, message: 'Cannot delete: Would result in negative stock' });
        }
        
        stockItem.quantity = newQuantity;
        await stockItem.save();
        
        await StockTransaction.findByIdAndDelete(req.params.id);
        
        console.log(`[${new Date().toLocaleString()}] Transaction ${transaction._id} deleted`);
        res.json({ success: true, message: 'Transaction deleted and stock updated!' });
        
    } catch (error) {
        console.error('Error deleting transaction:', error);
        res.status(500).json({ success: false, message: error.message });
    }
});

// DEBUG: Check credit items before and after sale
router.get('/debug-credit', isAuthenticated, async (req, res) => {
    const creditItems = await Stock.find({ paymentMethod: 'Credit' });
    
    const debug = creditItems.map(item => ({
        productname: item.productname,
        originalQuantity: item.originalQuantity,
        currentQuantity: item.quantity,
        costprice: item.costprice,
        amountPaid: item.amountPaid,
        totalOwed: (item.originalQuantity || item.quantity) * item.costprice,
        balance: ((item.originalQuantity || item.quantity) * item.costprice) - (item.amountPaid || 0)
    }));
    
    res.json(debug);
});

module.exports = router;