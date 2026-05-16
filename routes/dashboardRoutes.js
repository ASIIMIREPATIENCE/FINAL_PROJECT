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
        
        // Group sales by transaction (same date, customer name, phone number)
        const groupedTransactions = {};
        
        for (const sale of sales) {
            const key = `${sale.Date ? new Date(sale.Date).toDateString() : ''}_${sale.customername}_${sale.phonenumber}`;
            
            if (!groupedTransactions[key]) {
                groupedTransactions[key] = {
                    Date: sale.Date,
                    customername: sale.customername,
                    phonenumber: sale.phonenumber,
                    products: [],
                    grandTotal: 0,
                    attendantName: sale.attendantName,
                    paymentmethod: sale.paymentmethod,
                    transportFee: 0
                };
            }
            
            groupedTransactions[key].products.push(sale.productname);
            groupedTransactions[key].grandTotal += sale.total;
            
            if (sale.transportFee > 0) {
                groupedTransactions[key].transportFee = sale.transportFee;
            }
        }
        
        const groupedSales = Object.values(groupedTransactions);
        
        // Get credit stock items
        let creditStockItems = await Stock.find({ paymentMethod: 'Credit' });
        
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
        for (let i = 0; i < groupedSales.length; i++) {
            if (groupedSales[i].Date && new Date(groupedSales[i].Date).toDateString() === today) {
                todaysSalesTotal += groupedSales[i].grandTotal;
            }
        }
        
        // Calculate Outstanding Credit
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
            allSales: groupedSales,  // ← Pass grouped sales
            stockItems,
            creditStockItems,
            depositors,
            totalStockValue: totalStockValue.toLocaleString(),
            todaysSalesTotal: todaysSalesTotal.toLocaleString(),
            outstandingCredit: outstandingCredit.toLocaleString(),
            totalDeposits: totalDeposits.toLocaleString()
        });
        
    } catch (error) {
        console.log(error.message);
        res.render('admin_dashboard', { 
            allSales: [], 
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

router.get("/manager", async (req, res) => {
    try {
        // Get current user from session
        const currentUser = req.user || { fullname: 'Store Manager' };
        
        // Get all stock items
        const stockItems = await Stock.find().sort({ Date: -1 });
        
        // Get all sales
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        // Group sales by transaction (same as admin route)
        const groupedTransactions = {};
        
        for (const sale of sales) {
            const key = `${sale.Date ? new Date(sale.Date).toDateString() : ''}_${sale.customername}_${sale.phonenumber}`;
            
            if (!groupedTransactions[key]) {
                groupedTransactions[key] = {
                    Date: sale.Date,
                    customername: sale.customername,
                    phonenumber: sale.phonenumber,
                    products: [],
                    grandTotal: 0,
                    attendantName: sale.attendantName,
                    paymentmethod: sale.paymentmethod
                };
            }
            
            groupedTransactions[key].products.push(sale.productname);
            groupedTransactions[key].grandTotal += sale.total;
        }
        
        const allSales = Object.values(groupedTransactions);
        
        // Get credit stock items (for supplier credit table)
        let creditStockItems = await Stock.find({ paymentMethod: 'Credit' });
        
        // Process credit stock items
        let uniqueSuppliers = new Set();
        creditStockItems = creditStockItems.map(item => {
            const totalOwed = (item.costprice || 0) * (item.quantity || 0);
            const paid = item.amountPaid || 0;
            const balance = totalOwed - paid;
            
            if (item.supplier) {
                uniqueSuppliers.add(item.supplier);
            }
            
            let dueDate = null;
            let status = 'Pending';
            
            if (item.Date) {
                dueDate = new Date(item.Date);
                dueDate.setDate(dueDate.getDate() + 30);
                
                if (balance <= 0) {
                    status = 'Paid';
                } else if (dueDate < new Date()) {
                    status = 'Overdue';
                }
            }
            
            return {
                ...item.toObject(),
                balance: balance,
                dueDate: dueDate,
                status: status
            };
        });
        
        // Calculate total stock value
        let totalStockValue = 0;
        for (let i = 0; i < stockItems.length; i++) {
            totalStockValue += (stockItems[i].quantity || 0) * (stockItems[i].sellingprice || 0);
        }
        
        // Calculate Today's Sales using grouped sales
        const today = new Date().toDateString();
        let todaySales = 0;
        for (let i = 0; i < allSales.length; i++) {
            if (allSales[i].Date && new Date(allSales[i].Date).toDateString() === today) {
                todaySales += allSales[i].grandTotal;
            }
        }
        
        // Count low stock items
        let lowStockCount = 0;
        for (let i = 0; i < stockItems.length; i++) {
            if (stockItems[i].reorderlevel && stockItems[i].quantity <= stockItems[i].reorderlevel) {
                lowStockCount++;
            }
        }
        
        // Get unique credit suppliers count
        const creditSuppliersCount = uniqueSuppliers.size;
        
        // Get top selling products
        const topProducts = await Sale.aggregate([
            {
                $group: {
                    _id: '$productname',
                    totalSold: { $sum: '$quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);
        
        res.render('manager_dashboard', {
            currentUser: currentUser,
            stockItems: stockItems,
            allSales: allSales,  // ← Pass grouped sales
            creditStockItems: creditStockItems,
            totalStockValue: totalStockValue.toLocaleString(),
            todaySales: todaySales.toLocaleString(),
            lowStockCount: lowStockCount,
            creditSuppliersCount: creditSuppliersCount,
            topProducts: topProducts
        });
        
    } catch (error) {
        console.error("Error in /manager route:", error.message);
        console.error(error.stack);
        
        res.render('manager_dashboard', {
            currentUser: { fullname: 'Store Manager' },
            stockItems: [],
            allSales: [],  // ← Empty array for grouped sales
            creditStockItems: [],
            totalStockValue: '0',
            todaySales: '0',
            lowStockCount: 0,
            creditSuppliersCount: 0,
            topProducts: []
        });
    }
});

router.get("/salesattendant", async (req, res) => {
    try {
        console.log("=== /salesattendant route hit ===");
        
        // Fetch sales
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        const stockItems = await Stock.find();
        
        // Group sales by transaction (same as admin route)
        const groupedTransactions = {};
        
        for (const sale of sales) {
            const key = `${sale.Date ? new Date(sale.Date).toDateString() : ''}_${sale.customername}_${sale.phonenumber}`;
            
            if (!groupedTransactions[key]) {
                groupedTransactions[key] = {
                    Date: sale.Date,
                    customername: sale.customername,
                    phonenumber: sale.phonenumber,
                    products: [],
                    grandTotal: 0,
                    attendantName: sale.attendantName,
                    paymentmethod: sale.paymentmethod
                };
            }
            
            groupedTransactions[key].products.push(sale.productname);
            groupedTransactions[key].grandTotal += sale.total;
        }
        
        const allSales = Object.values(groupedTransactions);
        
        console.log("Sales count:", sales.length);
        console.log("Grouped sales count:", allSales.length);
        console.log("Stock items count:", stockItems.length);
        
        // Render template with grouped sales
        return res.render('sales_dashboard', { 
            allSales: allSales,  // ← Pass grouped sales as allSales
            stockItems: stockItems 
        });
        
    } catch (error) {
        console.error("ERROR in /salesattendant:", error.message);
        console.error(error.stack);
        return res.render('sales_dashboard', { 
            allSales: [], 
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



module.exports = router;