const express = require('express');
const router = express.Router();
const SupplierCredit = require('../models/SupplierCredit'); 
const Stock = require('../models/Stock');

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}


router.get('/supplier-credit', isAuthenticated, async (req, res) => {
    try {
        // Get credit records from SupplierCredit collection
        let creditItems = await SupplierCredit.find()
            .populate('attendant', 'fullname')
            .sort({ purchaseDate: -1 });
        
        let totalOutstanding = 0;
        const today = new Date();
        const sevenDaysFromNow = new Date();
        sevenDaysFromNow.setDate(today.getDate() + 7);
        
        let dueWithin7Days = 0;
        let dueWithin7DaysCount = 0;
        let overdueTotal = 0;
        let overdueCount = 0;
        
        creditItems = creditItems.map(item => {
            const balance = item.balance;
            
            if (balance > 0) {
                totalOutstanding += balance;
            }
            
            let dueDate = item.dueDate;
            let status = item.status;
            
            if (balance <= 0) {
                status = 'Paid';
            } else if (dueDate && dueDate < today) {
                status = 'Overdue';
                overdueTotal += balance;
                overdueCount++;
            } else if (dueDate && dueDate <= sevenDaysFromNow) {
                dueWithin7Days += balance;
                dueWithin7DaysCount++;
            }
            
            return {
                _id: item._id,
                productname: item.productname,
                supplier: item.supplier,
                quantity: item.quantity,
                costprice: item.costprice,
                totalOwed: item.totalAmount,
                paidAmount: item.amountPaid,
                balance: balance,
                purchaseDate: item.purchaseDate,
                dueDate: dueDate,
                status: status,
                attendantName: item.attendantName || (item.attendant ? item.attendant.fullname : 'Unknown')
            };
        });
        
        const uniqueSuppliers = [...new Set(creditItems.map(item => item.supplier))];
        
        res.render('supplier_credit', {
            currentUser: req.user,
            creditStockItems: creditItems,
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


// Payement form for supplier credit

router.get('/payment/:id', isAuthenticated, async (req, res) => {
    try {
        const creditItem = await SupplierCredit.findById(req.params.id).populate('attendant', 'fullname');
        
        if (!creditItem) return res.redirect('/supplier-credit');
        
        res.render('payment_form', {
            currentUser: req.user,
            stockItem: {
                _id: creditItem._id,
                productname: creditItem.productname,
                supplier: creditItem.supplier
            },
            totalOwed: creditItem.totalAmount,
            balance: creditItem.balance,
            dueDate: creditItem.dueDate
        });
        
    } catch (error) {
        console.error(error);
        res.redirect('/supplier-credit');
    }
});


router.post('/recordSupplierPayment', isAuthenticated, async (req, res) => {
    try {
        const { stockId, amountPaid } = req.body;
        
        const creditItem = await SupplierCredit.findById(stockId);
        if (!creditItem) {
            return res.redirect('/supplier-credit');
        }
        
        const newPaid = creditItem.amountPaid + Number(amountPaid);
        const newBalance = creditItem.totalAmount - newPaid;
        
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        
        await SupplierCredit.findByIdAndUpdate(stockId, {
            amountPaid: newPaid,
            balance: newBalance,
            status: newBalance <= 0 ? 'Paid' : (newPaid > 0 ? 'Partially Paid' : 'Pending')
        });
        
        console.log(`[${new Date().toLocaleString()}] Payment recorded by ${attendantName}: UGX ${amountPaid} for ${creditItem.productname}`);
        
        res.redirect('/supplier-credit');
        
    } catch (error) {
        console.error(error);
        res.redirect('/supplier-credit');
    }
});

module.exports = router;