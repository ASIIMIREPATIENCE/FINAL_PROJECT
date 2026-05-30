const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales'); 
const Stock = require('../models/Stock'); 
const Registration = require('../models/Registration');
const Depositor = require('../models/Depositor'); 
const SupplierCredit = require('../models/SupplierCredit');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated && req.isAuthenticated()) {
        return next();
    }
    res.redirect('/userlogin');
}

// ============================================================
// ADMIN DASHBOARD ROUTE
// Access: Only users with role 'admin'
// ============================================================

router.get("/admin", isAuthenticated, async (req, res) => {
    if (!req.user || req.user.role !== 'admin') {
        return res.redirect('/userlogin');
    }
    
    try {
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        const stockItems = await Stock.find();
        const depositors = await Depositor.find();
        
        // FIXED: Get credit data from SupplierCredit collection, NOT from Stock
        const supplierCredits = await SupplierCredit.find()
            .populate('attendant', 'fullname')
            .sort({ purchaseDate: -1 });
        
        const allSales = sales.map(sale => ({
            _id: sale._id,
            Date: sale.Date,
            customername: sale.customername,
            phonenumber: sale.phonenumber,
            items: sale.items || [],
            grandTotal: sale.grandTotal || 0,
            paymentmethod: sale.paymentmethod,
            transportFee: sale.transportFee || 0,
            attendantName: sale.attendantName || (sale.attendant ? sale.attendant.fullname : 'Unknown')
        }));
        
        // Process credit items from SupplierCredit collection
        let creditStockItems = supplierCredits.map(item => {
            const balance = item.balance;
            
            let dueDate = item.dueDate;
            let status = item.status;
            const today = new Date();
            
            if (balance <= 0) {
                status = 'Paid';
            } else if (dueDate && dueDate < today) {
                status = 'Overdue';
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
                dueDate: dueDate,
                status: status,
                attendantName: item.attendantName || (item.attendant ? item.attendant.fullname : 'Unknown')
            };
        });
        
        // Calculate total outstanding credit from SupplierCredit
        let outstandingCredit = 0;
        for (let i = 0; i < supplierCredits.length; i++) {
            if (supplierCredits[i].balance > 0) {
                outstandingCredit += supplierCredits[i].balance;
            }
        }
        
        // Calculate total stock value
        let totalStockValue = 0;
        for (let i = 0; i < stockItems.length; i++) {
            totalStockValue += (stockItems[i].quantity || 0) * (stockItems[i].sellingprice || 0);
        }
        
        // Calculate today's total sales
        const today = new Date().toDateString();
        let todaysSalesTotal = 0;
        for (let i = 0; i < allSales.length; i++) {
            if (allSales[i].Date && new Date(allSales[i].Date).toDateString() === today) {
                todaysSalesTotal += allSales[i].grandTotal || 0;
            }
        }
        
        // Calculate total deposits
        let totalDeposits = 0;
        for (let i = 0; i < depositors.length; i++) {
            totalDeposits += depositors[i].currentBalance || 0;
        }
        
        res.render('admin_dashboard', { 
            currentUser: req.user,
            allSales: allSales,
            stockItems: stockItems,
            creditStockItems: creditStockItems,
            depositors: depositors,
            totalStockValue: totalStockValue.toLocaleString(),
            todaysSalesTotal: todaysSalesTotal.toLocaleString(),
            outstandingCredit: outstandingCredit.toLocaleString(),
            totalDeposits: totalDeposits.toLocaleString()
        });
        
    } catch (error) {
        console.log(error.message);
        res.render('admin_dashboard', { 
            currentUser: req.user,
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

// ============================================================
// MANAGER DASHBOARD ROUTE
// Access: Only users with role 'store_manager'
// ============================================================

router.get("/manager", isAuthenticated, async (req, res) => {
    if (!req.user || req.user.role !== 'store_manager') {
        return res.redirect('/userlogin');
    }
    
    try {
        const stockItems = await Stock.find().sort({ Date: -1 });
        
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        // FIXED: Get credit data from SupplierCredit collection
        const supplierCredits = await SupplierCredit.find()
            .populate('attendant', 'fullname')
            .sort({ purchaseDate: -1 });
        
        const allSales = sales.map(sale => ({
            _id: sale._id,
            Date: sale.Date,
            customername: sale.customername,
            phonenumber: sale.phonenumber,
            items: sale.items,
            grandTotal: sale.grandTotal,
            paymentmethod: sale.paymentmethod,
            attendantName: sale.attendantName || (sale.attendant ? sale.attendant.fullname : 'Unknown')
        }));
        
        // Process credit items from SupplierCredit collection
        let creditStockItems = supplierCredits.map(item => {
            const balance = item.balance;
            
            let dueDate = item.dueDate;
            let status = item.status;
            
            if (balance <= 0) {
                status = 'Paid';
            } else if (dueDate && dueDate < new Date()) {
                status = 'Overdue';
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
                dueDate: dueDate,
                status: status,
                attendantName: item.attendantName || (item.attendant ? item.attendant.fullname : 'Unknown')
            };
        });
        
        // Get unique suppliers
        let uniqueSuppliers = new Set();
        supplierCredits.forEach(item => {
            if (item.supplier) {
                uniqueSuppliers.add(item.supplier);
            }
        });
        
        // Calculate total stock value
        let totalStockValue = 0;
        for (let i = 0; i < stockItems.length; i++) {
            totalStockValue += (stockItems[i].quantity || 0) * (stockItems[i].sellingprice || 0);
        }
        
        // Calculate today's total sales
        const today = new Date().toDateString();
        let todaySales = 0;
        for (let i = 0; i < allSales.length; i++) {
            if (allSales[i].Date && new Date(allSales[i].Date).toDateString() === today) {
                todaySales += allSales[i].grandTotal || 0;
            }
        }
        
        // Count low stock items
        let lowStockCount = 0;
        for (let i = 0; i < stockItems.length; i++) {
            if (stockItems[i].reorderlevel && stockItems[i].quantity <= stockItems[i].reorderlevel) {
                lowStockCount++;
            }
        }
        
        const creditSuppliersCount = uniqueSuppliers.size;
        
        const topProducts = await Sale.aggregate([
            { $unwind: '$items' },
            {
                $group: {
                    _id: '$items.productname',
                    totalSold: { $sum: '$items.quantity' }
                }
            },
            { $sort: { totalSold: -1 } },
            { $limit: 5 }
        ]);
        
        res.render('manager_dashboard', {
            currentUser: req.user,
            stockItems: stockItems,
            allSales: allSales,
            creditStockItems: creditStockItems,
            totalStockValue: totalStockValue.toLocaleString(),
            todaySales: todaySales.toLocaleString(),
            lowStockCount: lowStockCount,
            creditSuppliersCount: creditSuppliersCount,
            topProducts: topProducts
        });
        
    } catch (error) {
        console.error("Error in /manager route:", error.message);
        res.render('manager_dashboard', {
            currentUser: req.user,
            stockItems: [],
            allSales: [],
            creditStockItems: [],
            totalStockValue: '0',
            todaySales: '0',
            lowStockCount: 0,
            creditSuppliersCount: 0,
            topProducts: []
        });
    }
});

// ============================================================
// SALES ATTENDANT DASHBOARD ROUTE
// ============================================================

router.get("/salesattendant", isAuthenticated, async (req, res) => {
    if (!req.user || (req.user.role !== 'sales_attendant' && req.user.role !== 'store_manager' && req.user.role !== 'admin')) {
        return res.redirect('/userlogin');
    }
    
    try {
        console.log("=== /salesattendant route hit ===");
        
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        const stockItems = await Stock.find();
        
        const allSales = sales.map(sale => ({
            _id: sale._id,
            Date: sale.Date,
            customername: sale.customername,
            phonenumber: sale.phonenumber,
            items: sale.items || [],
            grandTotal: sale.grandTotal || 0,
            paymentmethod: sale.paymentmethod,
            attendantName: sale.attendantName || (sale.attendant ? sale.attendant.fullname : 'Unknown')
        }));
        
        // Calculate today's sales statistics
        const today = new Date().toDateString();
        let todaysSalesTotal = 0;
        let todaysTransactions = 0;
        
        for (let i = 0; i < allSales.length; i++) {
            if (allSales[i].Date && new Date(allSales[i].Date).toDateString() === today) {
                todaysSalesTotal += allSales[i].grandTotal || 0;
                todaysTransactions++;
            }
        }
        
        // Count low stock and critical stock items
        let lowStockCount = 0;
        let criticalStockCount = 0;
        for (let i = 0; i < stockItems.length; i++) {
            if (stockItems[i].reorderlevel) {
                if (stockItems[i].quantity <= stockItems[i].reorderlevel / 2) {
                    criticalStockCount++;
                } else if (stockItems[i].quantity <= stockItems[i].reorderlevel) {
                    lowStockCount++;
                }
            }
        }
        
        console.log("Sales count:", allSales.length);
        console.log("Stock items count:", stockItems.length);
        
        return res.render('sales_dashboard', { 
            currentUser: req.user,
            allSales: allSales,
            stockItems: stockItems,
            attendantName: req.user ? req.user.fullname : 'Sales Attendant',
            todaysSalesTotal: todaysSalesTotal,
            todaysTransactions: todaysTransactions,
            lowStockCount: lowStockCount,
            criticalStockCount: criticalStockCount,
            success: req.query.success || false,
            error: req.query.error || null
        });
        
    } catch (error) {
        console.error("ERROR in /salesattendant:", error.message);
        return res.render('sales_dashboard', { 
            currentUser: req.user,
            allSales: [], 
            stockItems: [],
            attendantName: 'Sales Attendant',
            todaysSalesTotal: 0,
            todaysTransactions: 0,
            lowStockCount: 0,
            criticalStockCount: 0,
            success: false,
            error: error.message
        });
    }
});

module.exports = router;