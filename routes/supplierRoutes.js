const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');

// ========== AUTHENTICATION MIDDLEWARE ==========
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// GET route for Supplier Credit page
router.get('/supplier-credit', isAuthenticated, async (req, res) => {
    try {
        // Get all credit stock items and populate attendant
        let creditStockItems = await Stock.find({ paymentMethod: 'Credit' })
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        let totalOutstanding = 0;
        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);
        
        let dueWithin7Days = 0;
        let dueWithin7DaysCount = 0;
        let overdueTotal = 0;
        let overdueCount = 0;
        
        // Process each credit stock item
        creditStockItems = creditStockItems.map(item => {
            const totalOwed = item.costprice * item.quantity;
            const paid = item.amountPaid || 0;
            const balance = totalOwed - paid;
            
            if (balance > 0) {
                totalOutstanding += balance;
            }
            
            let dueDate = null;
            let status = 'Pending';
            
            if (item.Date) {
                dueDate = new Date(item.Date);
                dueDate.setDate(dueDate.getDate() + 30); // 30 days from purchase date
                
                if (balance <= 0) {
                    status = 'Paid';
                } else if (dueDate < today) {
                    status = 'Overdue';
                    overdueTotal += balance;
                    overdueCount++;
                } else if (dueDate <= sevenDaysFromNow) {
                    dueWithin7Days += balance;
                    dueWithin7DaysCount++;
                }
            }
            
            return {
                ...item.toObject(),
                totalOwed: totalOwed,
                paidAmount: paid,
                balance: balance,
                dueDate: dueDate,
                status: status,
                attendantName: item.attendantName || (item.attendant ? item.attendant.fullname : 'Unknown')
            };
        });
        
        const uniqueSuppliers = [...new Set(creditStockItems.map(item => item.supplier))];
        
        res.render('supplier_credit', {
            currentUser: req.user,
            creditStockItems: creditStockItems,
            totalOutstanding: totalOutstanding,
            uniqueSuppliers: uniqueSuppliers.length,
            dueWithin7Days: dueWithin7Days,
            dueWithin7DaysCount: dueWithin7DaysCount,
            overdueTotal: overdueTotal,
            overdueCount: overdueCount,
            suppliersWithCredit: uniqueSuppliers
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// GET route - Payment form
router.get('/payment/:id', isAuthenticated, async (req, res) => {
    try {
        const stockItem = await Stock.findById(req.params.id).populate('attendant', 'fullname');
        if (!stockItem) return res.redirect('/supplier-credit');
        
        const totalOwed = stockItem.costprice * stockItem.quantity;
        const paid = stockItem.amountPaid || 0;
        const balance = totalOwed - paid;
        const dueDate = new Date(stockItem.Date);
        dueDate.setDate(dueDate.getDate() + 30); // 30 days from purchase date
        
        res.render('payment_form', {
            currentUser: req.user,
            stockItem: stockItem,
            totalOwed: totalOwed,
            balance: balance,
            dueDate: dueDate
        });
        
    } catch (error) {
        console.error(error);
        res.redirect('/supplier-credit');
    }
});

// POST route - Record payment
router.post('/recordSupplierPayment', isAuthenticated, async (req, res) => {
    try {
        const { stockId, amountPaid } = req.body;
        
        const stockItem = await Stock.findById(stockId);
        if (!stockItem) {
            return res.redirect('/supplier-credit');
        }
        
        const currentPaid = stockItem.amountPaid || 0;
        const newPaid = currentPaid + Number(amountPaid);
        const totalOwed = stockItem.costprice * stockItem.quantity;
        
        // Get attendant info
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        
        // Update the amount paid
        await Stock.findByIdAndUpdate(stockId, {
            amountPaid: newPaid
        });
        
        console.log(`[${new Date().toLocaleString()}] Payment recorded by ${attendantName}: UGX ${amountPaid} for ${stockItem.productname}`);
        console.log(`   Total paid now: UGX ${newPaid} | Balance: UGX ${totalOwed - newPaid}`);
        
        res.redirect('/supplier-credit');
        
    } catch (error) {
        console.error(error);
        res.redirect('/supplier-credit');
    }
});

module.exports = router;