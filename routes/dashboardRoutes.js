const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales'); 
const Stock = require('../models/Stock'); 
const Registration = require('../models/Registration');
const SupplierCredit = require('../models/Supplier');
const Depositor = require('../models/Depositor'); 

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================

/**
 * Middleware to check if user is authenticated
 * Redirects to login page if not authenticated
 */
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

/**
 * GET /admin
 * Displays the admin dashboard with:
 * - Stock inventory overview
 * - Supplier credit summary
 * - Deposit scheme summary
 * - Recent sales transactions
 * - Statistics cards (Stock Value, Today's Sales, Supplier Credit, Total Deposits)
 */
router.get("/admin", isAuthenticated, async (req, res) => {
    // Role-based access control - only admin allowed
    if (!req.user || req.user.role !== 'admin') {
        return res.redirect('/userlogin');
    }
    
    try {
        // Fetch all sales with attendant details
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        // Fetch all stock items and depositors
        const stockItems = await Stock.find();
        const depositors = await Depositor.find();
        
        // Transform sales data for template display
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
        
        // Process credit stock items for supplier credit table
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
                dueDate.setDate(dueDate.getDate() + 30); // 30 days credit period
                
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
        
        // Calculate total value of all stock (quantity * selling price)
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
        
        // Calculate total outstanding credit from all credit purchases
        let outstandingCredit = 0;
        for (let i = 0; i < creditStockItems.length; i++) {
            if (creditStockItems[i].balance > 0) {
                outstandingCredit += creditStockItems[i].balance;
            }
        }
        
        // Calculate total deposits from all depositors
        let totalDeposits = 0;
        for (let i = 0; i < depositors.length; i++) {
            totalDeposits += depositors[i].currentBalance || 0;
        }
        
        // Render admin dashboard with all data
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
        // Render dashboard with empty data on error
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

/**
 * GET /manager
 * Displays the store manager dashboard with:
 * - Stock inventory with low stock alerts
 * - Top selling products
 * - Supplier credit summary
 * - Recent sales
 * - Statistics cards (Stock Value, Today's Sales, Credit Suppliers, Low Stock Items)
 */
router.get("/manager", isAuthenticated, async (req, res) => {
    // Role-based access control - only store manager allowed
    if (!req.user || req.user.role !== 'store_manager') {
        return res.redirect('/userlogin');
    }
    
    try {
        // Fetch all stock items sorted by date
        const stockItems = await Stock.find().sort({ Date: -1 });
        
        // Fetch all sales with attendant details
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        // Transform sales data for template
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
        
        // Process credit stock items for supplier credit table
        let creditStockItems = await Stock.find({ paymentMethod: 'Credit' });
        
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
                dueDate.setDate(dueDate.getDate() + 30); // 30 days credit period
                
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
        
        // Calculate today's total sales
        const today = new Date().toDateString();
        let todaySales = 0;
        for (let i = 0; i < allSales.length; i++) {
            if (allSales[i].Date && new Date(allSales[i].Date).toDateString() === today) {
                todaySales += allSales[i].grandTotal || 0;
            }
        }
        
        // Count products with low stock (quantity <= reorder level)
        let lowStockCount = 0;
        for (let i = 0; i < stockItems.length; i++) {
            if (stockItems[i].reorderlevel && stockItems[i].quantity <= stockItems[i].reorderlevel) {
                lowStockCount++;
            }
        }
        
        // Count unique suppliers with credit
        const creditSuppliersCount = uniqueSuppliers.size;
        
        // Get top 5 selling products using aggregation pipeline
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
        
        // Render manager dashboard with all data
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
        
        // Render dashboard with empty data on error
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
// Access: Users with role 'sales_attendant', 'store_manager', or 'admin'
// ============================================================

/**
 * GET /salesattendant
 * Displays the sales attendant dashboard with:
 * - Today's sales statistics
 * - Low stock alerts
 * - Recent sales transactions
 * - Quick sale button
 * - Stock inventory for reference
 * 
 * Accessible by: sales_attendant, store_manager, admin
 */
router.get("/salesattendant", isAuthenticated, async (req, res) => {
    // Role-based access control - allow sales_attendant, store_manager, and admin
    if (!req.user || (req.user.role !== 'sales_attendant' && req.user.role !== 'store_manager' && req.user.role !== 'admin')) {
        return res.redirect('/userlogin');
    }
    
    try {
        console.log("=== /salesattendant route hit ===");
        
        // Fetch all sales with attendant details
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        // Fetch all stock items
        const stockItems = await Stock.find();
        
        // Transform sales data for template display
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
                // Critical: quantity <= half of reorder level
                if (stockItems[i].quantity <= stockItems[i].reorderlevel / 2) {
                    criticalStockCount++;
                } 
                // Low stock: quantity <= reorder level but above critical
                else if (stockItems[i].quantity <= stockItems[i].reorderlevel) {
                    lowStockCount++;
                }
            }
        }
        
        console.log("Sales count:", allSales.length);
        console.log("Stock items count:", stockItems.length);
        
        // Render sales attendant dashboard
        return res.render('sales_dashboard', { 
            currentUser: req.user,
            allSales: allSales,
            stockItems: stockItems,
            attendantName: req.user ? req.user.fullname : 'Sales Attendant',
            todaysSalesTotal: todaysSalesTotal,
            todaysTransactions: todaysTransactions,
            lowStockCount: lowStockCount,
            criticalStockCount: criticalStockCount
        });
        
    } catch (error) {
        console.error("ERROR in /salesattendant:", error.message);
        
        // Render dashboard with empty data on error
        return res.render('sales_dashboard', { 
            currentUser: req.user,
            allSales: [], 
            stockItems: [],
            attendantName: 'Sales Attendant',
            todaysSalesTotal: 0,
            todaysTransactions: 0,
            lowStockCount: 0,
            criticalStockCount: 0
        });
    }
});

module.exports = router;