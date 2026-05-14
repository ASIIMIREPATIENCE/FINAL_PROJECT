const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales'); 
const Stock = require('../models/Stock'); 
const Registration = require('../models/Registration');
const SupplierCredit = require('../models/Supplier');
const Depositor = require('../models/Depositor'); 

router.get("/admin", async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        const stockItems = await Stock.find();
        const depositors = await Depositor.find();
        
        // Get credit stock items (same logic as supplier-credit page)
        let creditStockItems = await Stock.find({ paymentMethod: 'Credit' });
        
        // Process each credit stock item
        creditStockItems = creditStockItems.map(item => {
            const totalOwed = (item.costprice || 0) * (item.quantity || 0);
            const paid = item.amountPaid || 0;
            const balance = totalOwed - paid;
            
            let dueDate = null;
            let status = 'Pending';
            const today = new Date();
            
            if (item.Date) {
                dueDate = new Date(item.Date);
                dueDate.setDate(dueDate.getDate() + 30);
                
                if (balance <= 0) {
                    status = 'Paid';
                } else if (dueDate < today) {
                    status = 'Overdue';
                }
            }
            
            return {
                ...item.toObject(),
                balance: balance,
                dueDate: dueDate,
                status: status,
                supplier: item.supplier
            };
        });
        
        // Calculate Stock Value
        let totalStockValue = 0;
        for (let i = 0; i < stockItems.length; i++) {
            totalStockValue += (stockItems[i].quantity || 0) * (stockItems[i].sellingprice || 0);
        }
        
        // Calculate Today's Sales
        const today = new Date().toDateString();
        let todaysSalesTotal = 0;
        for (let i = 0; i < sales.length; i++) {
            if (sales[i].Date && new Date(sales[i].Date).toDateString() === today) {
                todaysSalesTotal += sales[i].total || 0;
            }
        }
        
        // Calculate Outstanding Credit (from credit stock items)
        let outstandingCredit = 0;
        for (let i = 0; i < creditStockItems.length; i++) {
            if (creditStockItems[i].balance > 0) {
                outstandingCredit += creditStockItems[i].balance;
            }
        }
        
        // Calculate Total Deposits
        let totalDeposits = 0;
        for (let i = 0; i < depositors.length; i++) {
            totalDeposits += depositors[i].currentBalance || 0;
        }
        
        res.render('admin_dashboard', { 
            sales, 
            stockItems,
            creditStockItems,  // Pass credit stock items to template
            depositors,
            totalStockValue: totalStockValue.toLocaleString(),
            todaysSalesTotal: todaysSalesTotal.toLocaleString(),
            outstandingCredit: outstandingCredit.toLocaleString(),
            totalDeposits: totalDeposits.toLocaleString()
        });
        
    } catch (error) {
        console.log(error.message);
        res.render('admin_dashboard', { 
            sales: [], 
            stockItems: [],
            creditStockItems: [],
            depositors: [],
            totalStockValue: '0',
            todaysSalesTotal: '0',
            outstandingCredit: '0',
            totalDeposits: '0'
        });
    }
});

router.get("/manager", (req, res) => {
    res.render('manager_dashboard');
});

router.get("/salesattendant", async (req, res) => {
    try {
        console.log("=== /salesattendant route hit ===");
        
        // Fetch data
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
            
        const stockItems = await Stock.find();
        
        console.log("Sales count:", sales.length);
        console.log("Stock items count:", stockItems.length);
        
        // Render template with data
        return res.render('sales_dashboard', { 
            sales: sales, 
            stockItems: stockItems 
        });
        
    } catch (error) {
        console.error("ERROR in /salesattendant:", error.message);
        console.error(error.stack);
        return res.render('sales_dashboard', { 
            sales: [], 
            stockItems: [] 
        });
    }
});

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

router.get('/users', async (req, res) => {
    try {
        const users = await Registration.find();
        res.render('user_mgt', { users: users });
    } catch (error) {
        console.log(error);
        res.render('user_mgt', { users: [] });
    }
});

module.exports = router;