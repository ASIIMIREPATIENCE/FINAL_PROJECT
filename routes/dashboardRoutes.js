// const express = require("express");
// const router = express.Router();
// const Sale = require('../models/Sales'); 
// const Stock = require('../models/Stock'); 
// const Registration = require('../models/Registration');
// const SupplierCredit = require('../models/Supplier');
// const Depositor = require('../models/Depositor'); 

// router.get("/admin", async (req, res) => {
//     try {
//         // Get all sales using the NEW schema structure (same as manager)
//         const sales = await Sale.find()
//             .populate('attendant', 'fullname')
//             .sort({ Date: -1 });
        
//         const stockItems = await Stock.find();
//         const depositors = await Depositor.find();
        
//         // Use sales directly since each sale already contains all items (same as manager)
//         const allSales = sales.map(sale => ({
//             _id: sale._id,
//             Date: sale.Date,
//             customername: sale.customername,
//             phonenumber: sale.phonenumber,
//             items: sale.items || [],  // Array of products in this sale
//             grandTotal: sale.grandTotal || 0,
//             paymentmethod: sale.paymentmethod,
//             transportFee: sale.transportFee || 0,
//             attendantName: sale.attendantName || (sale.attendant ? sale.attendant.fullname : 'Unknown')
//         }));
        
//         // Get credit stock items
//         let creditStockItems = await Stock.find({ paymentMethod: 'Credit' });
        
//         creditStockItems = creditStockItems.map(item => {
//             const totalOwed = (item.costprice || 0) * (item.quantity || 0);
//             const paid = item.amountPaid || 0;
//             const balance = totalOwed - paid;
            
//             let dueDate = null;
//             let status = 'Pending';
//             const today = new Date();
            
//             if (item.Date) {
//                 dueDate = new Date(item.Date);
//                 dueDate.setDate(dueDate.getDate() + 30);
                
//                 if (balance <= 0) {
//                     status = 'Paid';
//                 } else if (dueDate < today) {
//                     status = 'Overdue';
//                 }
//             }
            
//             return {
//                 ...item.toObject(),
//                 balance: balance,
//                 dueDate: dueDate,
//                 status: status,
//                 supplier: item.supplier
//             };
//         });
        
//         // Calculate Stock Value
//         let totalStockValue = 0;
//         for (let i = 0; i < stockItems.length; i++) {
//             totalStockValue += (stockItems[i].quantity || 0) * (stockItems[i].sellingprice || 0);
//         }
        
//         // Calculate Today's Sales using grandTotal (same as manager)
//         const today = new Date().toDateString();
//         let todaysSalesTotal = 0;
//         for (let i = 0; i < allSales.length; i++) {
//             if (allSales[i].Date && new Date(allSales[i].Date).toDateString() === today) {
//                 todaysSalesTotal += allSales[i].grandTotal || 0;
//             }
//         }
        
//         // Calculate Outstanding Credit
//         let outstandingCredit = 0;
//         for (let i = 0; i < creditStockItems.length; i++) {
//             if (creditStockItems[i].balance > 0) {
//                 outstandingCredit += creditStockItems[i].balance;
//             }
//         }
        
//         // Calculate Total Deposits
//         let totalDeposits = 0;
//         for (let i = 0; i < depositors.length; i++) {
//             totalDeposits += depositors[i].currentBalance || 0;
//         }
        
//         res.render('admin_dashboard', { 
//             allSales: allSales,  // ← Now using the same format as manager
//             stockItems: stockItems,
//             creditStockItems: creditStockItems,
//             depositors: depositors,
//             totalStockValue: totalStockValue.toLocaleString(),
//             todaysSalesTotal: todaysSalesTotal.toLocaleString(),
//             outstandingCredit: outstandingCredit.toLocaleString(),
//             totalDeposits: totalDeposits.toLocaleString()
//         });
        
//     } catch (error) {
//         console.log(error.message);
//         res.render('admin_dashboard', { 
//             allSales: [], 
//             stockItems: [],
//             creditStockItems: [],
//             depositors: [],
//             totalStockValue: '0',
//             todaysSalesTotal: '0',
//             outstandingCredit: '0',
//             totalDeposits: '0'
//         });
//     }
// });

// router.get("/manager", async (req, res) => {
//     try {
//         // Get current user from session
//         const currentUser = req.user || { fullname: 'Store Manager' };
        
//         // Get all stock items
//         const stockItems = await Stock.find().sort({ Date: -1 });
        
//         // Get all sales using the NEW schema structure
//         const sales = await Sale.find()
//             .populate('attendant', 'fullname')
//             .sort({ Date: -1 });
        
//         // Use sales directly since each sale already contains all items
//         const allSales = sales.map(sale => ({
//             _id: sale._id,
//             Date: sale.Date,
//             customername: sale.customername,
//             phonenumber: sale.phonenumber,
//             items: sale.items,  // Array of products in this sale
//             grandTotal: sale.grandTotal,
//             paymentmethod: sale.paymentmethod,
//             attendantName: sale.attendantName || (sale.attendant ? sale.attendant.fullname : 'Unknown')
//         }));
        
//         // Get credit stock items (for supplier credit table)
//         let creditStockItems = await Stock.find({ paymentMethod: 'Credit' });
        
//         // Process credit stock items
//         let uniqueSuppliers = new Set();
//         creditStockItems = creditStockItems.map(item => {
//             const totalOwed = (item.costprice || 0) * (item.quantity || 0);
//             const paid = item.amountPaid || 0;
//             const balance = totalOwed - paid;
            
//             if (item.supplier) {
//                 uniqueSuppliers.add(item.supplier);
//             }
            
//             let dueDate = null;
//             let status = 'Pending';
            
//             if (item.Date) {
//                 dueDate = new Date(item.Date);
//                 dueDate.setDate(dueDate.getDate() + 30);
                
//                 if (balance <= 0) {
//                     status = 'Paid';
//                 } else if (dueDate < new Date()) {
//                     status = 'Overdue';
//                 }
//             }
            
//             return {
//                 ...item.toObject(),
//                 balance: balance,
//                 dueDate: dueDate,
//                 status: status
//             };
//         });
        
//         // Calculate total stock value
//         let totalStockValue = 0;
//         for (let i = 0; i < stockItems.length; i++) {
//             totalStockValue += (stockItems[i].quantity || 0) * (stockItems[i].sellingprice || 0);
//         }
        
//         // Calculate Today's Sales using grandTotal
//         const today = new Date().toDateString();
//         let todaySales = 0;
//         for (let i = 0; i < allSales.length; i++) {
//             if (allSales[i].Date && new Date(allSales[i].Date).toDateString() === today) {
//                 todaySales += allSales[i].grandTotal || 0;
//             }
//         }
        
//         // Count low stock items
//         let lowStockCount = 0;
//         for (let i = 0; i < stockItems.length; i++) {
//             if (stockItems[i].reorderlevel && stockItems[i].quantity <= stockItems[i].reorderlevel) {
//                 lowStockCount++;
//             }
//         }
        
//         // Get unique credit suppliers count
//         const creditSuppliersCount = uniqueSuppliers.size;
        
//         // Get top selling products from the items array
//         const topProducts = await Sale.aggregate([
//             { $unwind: '$items' },
//             {
//                 $group: {
//                     _id: '$items.productname',
//                     totalSold: { $sum: '$items.quantity' }
//                 }
//             },
//             { $sort: { totalSold: -1 } },
//             { $limit: 5 }
//         ]);
        
//         res.render('manager_dashboard', {
//             currentUser: currentUser,
//             stockItems: stockItems,
//             allSales: allSales,
//             creditStockItems: creditStockItems,
//             totalStockValue: totalStockValue.toLocaleString(),
//             todaySales: todaySales.toLocaleString(),
//             lowStockCount: lowStockCount,
//             creditSuppliersCount: creditSuppliersCount,
//             topProducts: topProducts
//         });
        
//     } catch (error) {
//         console.error("Error in /manager route:", error.message);
//         console.error(error.stack);
        
//         res.render('manager_dashboard', {
//             currentUser: { fullname: 'Store Manager' },
//             stockItems: [],
//             allSales: [],
//             creditStockItems: [],
//             totalStockValue: '0',
//             todaySales: '0',
//             lowStockCount: 0,
//             creditSuppliersCount: 0,
//             topProducts: []
//         });
//     }
// });

// router.get("/salesattendant", async (req, res) => {
//     try {
//         console.log("=== /salesattendant route hit ===");
        
//         // Get all sales using the NEW schema structure (same as manager)
//         const sales = await Sale.find()
//             .populate('attendant', 'fullname')
//             .sort({ Date: -1 });
        
//         const stockItems = await Stock.find();
        
//         // Use sales directly since each sale already contains all items (same as manager)
//         const allSales = sales.map(sale => ({
//             _id: sale._id,
//             Date: sale.Date,
//             customername: sale.customername,
//             phonenumber: sale.phonenumber,
//             items: sale.items || [],  // Array of products in this sale
//             grandTotal: sale.grandTotal || 0,
//             paymentmethod: sale.paymentmethod,
//             attendantName: sale.attendantName || (sale.attendant ? sale.attendant.fullname : 'Unknown')
//         }));
        
//         // Calculate today's sales total
//         const today = new Date().toDateString();
//         let todaysSalesTotal = 0;
//         let todaysTransactions = 0;
        
//         for (let i = 0; i < allSales.length; i++) {
//             if (allSales[i].Date && new Date(allSales[i].Date).toDateString() === today) {
//                 todaysSalesTotal += allSales[i].grandTotal || 0;
//                 todaysTransactions++;
//             }
//         }
        
//         // Count low stock items
//         let lowStockCount = 0;
//         let criticalStockCount = 0;
//         for (let i = 0; i < stockItems.length; i++) {
//             if (stockItems[i].reorderlevel) {
//                 if (stockItems[i].quantity <= stockItems[i].reorderlevel / 2) {
//                     criticalStockCount++;
//                 } else if (stockItems[i].quantity <= stockItems[i].reorderlevel) {
//                     lowStockCount++;
//                 }
//             }
//         }
        
//         console.log("Sales count:", allSales.length);
//         console.log("Stock items count:", stockItems.length);
        
//         // Get current attendant name from session
//         const attendantName = req.user ? req.user.fullname : 'Sales Attendant';
        
//         // Render template with sales data
//         return res.render('sales_dashboard', { 
//             allSales: allSales,
//             stockItems: stockItems,
//             attendantName: attendantName,
//             todaysSalesTotal: todaysSalesTotal,
//             todaysTransactions: todaysTransactions,
//             lowStockCount: lowStockCount,
//             criticalStockCount: criticalStockCount
//         });
        
//     } catch (error) {
//         console.error("ERROR in /salesattendant:", error.message);
//         console.error(error.stack);
//         return res.render('sales_dashboard', { 
//             allSales: [], 
//             stockItems: [],
//             attendantName: 'Sales Attendant',
//             todaysSalesTotal: 0,
//             todaysTransactions: 0,
//             lowStockCount: 0,
//             criticalStockCount: 0
//         });
//     }
// });

// router.get('/logout', (req, res, next) => {
//     req.logout((err) => {
//         if (err) {
//             return next(err);
//         }
//         res.redirect('/');
//     });
// });


// module.exports = router;
const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales'); 
const Stock = require('../models/Stock'); 
const Registration = require('../models/Registration');
const SupplierCredit = require('../models/Supplier');
const Depositor = require('../models/Depositor'); 

// ========== AUTHENTICATION & AUTHORIZATION MIDDLEWARE ==========

// Check if user is authenticated
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// Role-based authorization middleware
function authorize(...allowedRoles) {
    return (req, res, next) => {
        if (!req.user) {
            return res.redirect('/');
        }
        
        const userRole = req.user.role;
        
        if (allowedRoles.includes(userRole)) {
            return next();
        }
        
        // User doesn't have permission - redirect based on their role
        if (userRole === 'admin') {
            return res.redirect('/admin');
        } else if (userRole === 'manager') {
            return res.redirect('/manager');
        } else if (userRole === 'salesattendant') {
            return res.redirect('/salesattendant');
        } else {
            return res.redirect('/');
        }
    };
}

// ========== ADMIN DASHBOARD ==========
// Only admin can access
router.get("/admin", isAuthenticated, authorize('admin'), async (req, res) => {
    try {
        // Get all sales using the NEW schema structure (same as manager)
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        const stockItems = await Stock.find();
        const depositors = await Depositor.find();
        
        // Use sales directly since each sale already contains all items (same as manager)
        const allSales = sales.map(sale => ({
            _id: sale._id,
            Date: sale.Date,
            customername: sale.customername,
            phonenumber: sale.phonenumber,
            items: sale.items || [],  // Array of products in this sale
            grandTotal: sale.grandTotal || 0,
            paymentmethod: sale.paymentmethod,
            transportFee: sale.transportFee || 0,
            attendantName: sale.attendantName || (sale.attendant ? sale.attendant.fullname : 'Unknown')
        }));
        
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
        
        // Calculate Today's Sales using grandTotal (same as manager)
        const today = new Date().toDateString();
        let todaysSalesTotal = 0;
        for (let i = 0; i < allSales.length; i++) {
            if (allSales[i].Date && new Date(allSales[i].Date).toDateString() === today) {
                todaysSalesTotal += allSales[i].grandTotal || 0;
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

// ========== MANAGER DASHBOARD ==========
// Admin and Manager can access
router.get("/manager", isAuthenticated, authorize('admin', 'store_manager'), async (req, res) => {
    try {
        // Get current user from session
        const currentUser = req.user;
        
        // Get all stock items
        const stockItems = await Stock.find().sort({ Date: -1 });
        
        // Get all sales using the NEW schema structure
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        // Use sales directly since each sale already contains all items
        const allSales = sales.map(sale => ({
            _id: sale._id,
            Date: sale.Date,
            customername: sale.customername,
            phonenumber: sale.phonenumber,
            items: sale.items,  // Array of products in this sale
            grandTotal: sale.grandTotal,
            paymentmethod: sale.paymentmethod,
            attendantName: sale.attendantName || (sale.attendant ? sale.attendant.fullname : 'Unknown')
        }));
        
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
        
        // Calculate Today's Sales using grandTotal
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
        
        // Get unique credit suppliers count
        const creditSuppliersCount = uniqueSuppliers.size;
        
        // Get top selling products from the items array
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
            currentUser: currentUser,
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
        console.error(error.stack);
        
        res.render('manager_dashboard', {
            currentUser: req.user || { fullname: 'Store Manager', role: 'manager' },
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

// ========== SALES ATTENDANT DASHBOARD ==========
// Admin, Manager, and Sales Attendant can access
router.get("/salesattendant", isAuthenticated, authorize('admin', 'store_manager', 'sales_attendant'), async (req, res) => {
    try {
        console.log("=== /salesattendant route hit ===");
        
        // Get all sales using the NEW schema structure (same as manager)
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        const stockItems = await Stock.find();
        
        // Use sales directly since each sale already contains all items (same as manager)
        const allSales = sales.map(sale => ({
            _id: sale._id,
            Date: sale.Date,
            customername: sale.customername,
            phonenumber: sale.phonenumber,
            items: sale.items || [],  // Array of products in this sale
            grandTotal: sale.grandTotal || 0,
            paymentmethod: sale.paymentmethod,
             attendantName: sale.attendantName || (sale.attendant ? sale.attendant.fullname : 'Unknown')
        }));
        
        // Calculate today's sales total
        const today = new Date().toDateString();
        let todaysSalesTotal = 0;
        let todaysTransactions = 0;
        
        for (let i = 0; i < allSales.length; i++) {
            if (allSales[i].Date && new Date(allSales[i].Date).toDateString() === today) {
                todaysSalesTotal += allSales[i].grandTotal || 0;
                todaysTransactions++;
            }
        }
        
        // Count low stock items
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
        
        // Get current attendant name from session
        const attendantName = req.user ? req.user.fullname : 'Sales Attendant';
        
        // Render template with sales data
        return res.render('sales_dashboard', { 
            currentUser: req.user,
            allSales: allSales,
            stockItems: stockItems,
            attendantName: attendantName,
            todaysSalesTotal: todaysSalesTotal,
            todaysTransactions: todaysTransactions,
            lowStockCount: lowStockCount,
            criticalStockCount: criticalStockCount
        });
        
    } catch (error) {
        console.error("ERROR in /salesattendant:", error.message);
        console.error(error.stack);
        return res.render('sales_dashboard', { 
            currentUser: req.user || { fullname: 'Sales Attendant', role: 'salesattendant' },
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

// ========== LOGOUT ==========
router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

module.exports = router;