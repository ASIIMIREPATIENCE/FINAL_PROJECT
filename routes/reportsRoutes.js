const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales');
const Stock = require('../models/Stock');
const Depositor = require('../models/Depositor');

// ========== AUTHENTICATION MIDDLEWARE ==========
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// GET route - Main reports page
router.get('/reports', isAuthenticated, async (req, res) => {
    try {
        const { reportType, startDate, endDate } = req.query;
        
        let salesData = [];
        let stockData = [];
        let schemeData = [];
        let supplierCreditData = [];
        let summary = {};
        let selectedReport = reportType || 'sales';
        
        // Set default date range (last 30 days)
        const today = new Date();
        const defaultStart = new Date();
        defaultStart.setDate(today.getDate() - 30);
        
        const start = startDate ? new Date(startDate) : defaultStart;
        const end = endDate ? new Date(endDate) : today;
        end.setHours(23, 59, 59, 999);
        
        // Get all stock items (no date filter needed for stock - it's current inventory)
        const allStock = await Stock.find().sort({ Date: -1 });
        
        // Calculate stock summary
        const totalStockValue = allStock.reduce((sum, item) => sum + ((item.quantity || 0) * (item.sellingprice || 0)), 0);
        const lowStockItems = allStock.filter(item => item.quantity <= (item.reorderlevel || 0));
        const totalProducts = allStock.length;
        
        // ========== SALES REPORT (FIXED FOR NEW SCHEMA) ==========
        if (selectedReport === 'sales') {
            // Get all sales within date range - using the NEW schema structure
            const sales = await Sale.find({
                Date: { $gte: start, $lte: end }
            }).populate('attendant', 'fullname').sort({ Date: -1 });
            
            // Transform sales data for the report
            salesData = sales.map(sale => ({
                _id: sale._id,
                Date: sale.Date,
                customername: sale.customername,
                phonenumber: sale.phonenumber,
                products: sale.items ? sale.items.map(item => item.productname) : [],
                grandTotal: sale.grandTotal || 0,
                paymentmethod: sale.paymentmethod,
                attendantName: sale.attendantName || (sale.attendant ? sale.attendant.fullname : 'Unknown')
            }));
            
            // Calculate summary statistics
            const totalSales = salesData.reduce((sum, sale) => sum + sale.grandTotal, 0);
            const totalTransactions = salesData.length;
            const avgTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
            
            // Calculate payment method breakdown from sales data
            let cashSales = 0;
            let mobileSales = 0;
            let bankSales = 0;
            
            for (const sale of sales) {
                if (sale.paymentmethod === 'Cash') {
                    cashSales += sale.grandTotal || 0;
                } else if (sale.paymentmethod === 'Mobile Money') {
                    mobileSales += sale.grandTotal || 0;
                } else if (sale.paymentmethod === 'Bank Transfer') {
                    bankSales += sale.grandTotal || 0;
                }
            }
            
            // Get top selling products from the items array
            const productSales = {};
            for (const sale of sales) {
                if (sale.items && sale.items.length) {
                    for (const item of sale.items) {
                        if (!productSales[item.productname]) {
                            productSales[item.productname] = { quantity: 0, revenue: 0 };
                        }
                        productSales[item.productname].quantity += item.quantity || 0;
                        productSales[item.productname].revenue += item.subtotal || (item.quantity * item.unitprice) || 0;
                    }
                }
            }
            
            const topProducts = Object.entries(productSales)
                .map(([name, data]) => ({ name, ...data }))
                .sort((a, b) => b.revenue - a.revenue)
                .slice(0, 5);
            
            summary = {
                totalSales: totalSales,
                totalTransactions: totalTransactions,
                avgTransactionValue: avgTransactionValue,
                cashSales: cashSales,
                mobileSales: mobileSales,
                bankSales: bankSales,
                topProducts: topProducts
            };
        }
        
        // ========== STOCK REPORT ==========
        if (selectedReport === 'stock') {
            // Filter stock by date if date range is provided
            let filteredStock = allStock;
            if (startDate && endDate) {
                filteredStock = allStock.filter(item => {
                    const itemDate = new Date(item.Date);
                    return itemDate >= start && itemDate <= end;
                });
            }
            
            stockData = filteredStock;
            
            const totalCostValue = filteredStock.reduce((sum, item) => sum + ((item.quantity || 0) * (item.costprice || 0)), 0);
            const totalStockValueFiltered = filteredStock.reduce((sum, item) => sum + ((item.quantity || 0) * (item.sellingprice || 0)), 0);
            const potentialProfit = totalStockValueFiltered - totalCostValue;
            
            summary = {
                totalProducts: filteredStock.length,
                totalStockValue: totalStockValueFiltered,
                totalCostValue: totalCostValue,
                potentialProfit: potentialProfit,
                lowStockCount: filteredStock.filter(item => item.quantity <= (item.reorderlevel || 0)).length,
                outOfStockCount: filteredStock.filter(item => item.quantity === 0).length
            };
        }
        
        // ========== SCHEME REPORT (Deposits) ==========
        if (selectedReport === 'scheme') {
            const depositors = await Depositor.find().sort({ joinDate: -1 });
            
            // Process each depositor's data
            schemeData = depositors.map(depositor => {
                // Get deposit history within date range
                let filteredDeposits = depositor.depositHistory || [];
                if (startDate && endDate) {
                    filteredDeposits = (depositor.depositHistory || []).filter(deposit => 
                        deposit.date >= start && deposit.date <= end
                    );
                }
                
                const depositsWithinRange = filteredDeposits.reduce((sum, d) => sum + d.amount, 0);
                const totalDepositsAll = (depositor.depositHistory || []).reduce((sum, d) => sum + d.amount, 0);
                
                return {
                    fullName: depositor.fullName,
                    phoneNumber: depositor.phoneNumber,
                    nin: depositor.nin,
                    employer: depositor.employer,
                    joinDate: depositor.joinDate,
                    totalDeposits: totalDepositsAll,
                    depositsWithinRange: depositsWithinRange,
                    currentBalance: depositor.currentBalance,
                    depositCount: filteredDeposits.length,
                    lastDepositDate: filteredDeposits.length > 0 ? 
                        filteredDeposits[filteredDeposits.length - 1].date : null
                };
            });
            
            // Calculate summary statistics
            const totalDepositors = depositors.length;
            const totalDepositAmount = schemeData.reduce((sum, d) => sum + d.totalDeposits, 0);
            const totalCurrentBalance = schemeData.reduce((sum, d) => sum + d.currentBalance, 0);
            
            // Calculate TOTAL NUMBER OF DEPOSITS in the period (count, not amount)
            let totalDepositsCount = 0;
            for (const depositor of depositors) {
                if (depositor.depositHistory && depositor.depositHistory.length) {
                    let depositsToCount = depositor.depositHistory;
                    if (startDate && endDate) {
                        depositsToCount = depositor.depositHistory.filter(deposit => 
                            deposit.date >= start && deposit.date <= end
                        );
                    }
                    totalDepositsCount += depositsToCount.length;
                }
            }
            
            // Get top depositors by balance
            const topDepositors = [...schemeData]
                .sort((a, b) => b.currentBalance - a.currentBalance)
                .slice(0, 5);
            
            // Get recent deposits across all depositors (filtered by date range)
            let allDeposits = [];
            depositors.forEach(depositor => {
                if (depositor.depositHistory && depositor.depositHistory.length) {
                    let depositsToShow = depositor.depositHistory;
                    if (startDate && endDate) {
                        depositsToShow = depositor.depositHistory.filter(deposit => 
                            deposit.date >= start && deposit.date <= end
                        );
                    }
                    const depositsWithInfo = depositsToShow.map(deposit => ({
                        date: deposit.date,
                        depositorName: depositor.fullName,
                        amount: deposit.amount,
                        balanceAfter: deposit.balanceAfter,
                        paymentMethod: deposit.paymentMethod,
                        attendantName: deposit.attendantName
                    }));
                    allDeposits.push(...depositsWithInfo);
                }
            });
            allDeposits.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            summary = {
                totalDepositors: totalDepositors,
                totalDepositAmount: totalDepositAmount,
                totalCurrentBalance: totalCurrentBalance,
                totalDepositsCount: totalDepositsCount,  // Changed from totalDepositsInRange to count
                topDepositors: topDepositors,
                recentDeposits: allDeposits.slice(0, 20)
            };
        }
        
        // ========== SUPPLIER CREDIT REPORT ==========
        if (selectedReport === 'supplier-credit') {
            // Get all credit stock items with date filtering
            let creditItems = [];
            if (startDate && endDate) {
                creditItems = await Stock.find({ 
                    paymentMethod: 'Credit',
                    Date: { $gte: start, $lte: end }
                });
            } else {
                creditItems = await Stock.find({ paymentMethod: 'Credit' });
            }
            
            const todayDate = new Date();
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(todayDate.getDate() + 7);
            
            let totalOutstanding = 0;
            let dueWithin7Days = 0;
            let dueWithin7DaysCount = 0;
            let overdueTotal = 0;
            let overdueCount = 0;
            
            // Process each credit item
            supplierCreditData = creditItems.map(item => {
                const totalOwed = (item.costprice || 0) * (item.quantity || 0);
                const paid = item.amountPaid || 0;
                const balance = totalOwed - paid;
                
                if (balance > 0) totalOutstanding += balance;
                
                let dueDate = null;
                let status = 'Pending';
                
                if (item.Date) {
                    dueDate = new Date(item.Date);
                    dueDate.setDate(dueDate.getDate() + 30);
                    
                    if (balance <= 0) {
                        status = 'Paid';
                    } else if (dueDate < todayDate) {
                        status = 'Overdue';
                        overdueTotal += balance;
                        overdueCount++;
                    } else if (dueDate <= sevenDaysFromNow) {
                        dueWithin7Days += balance;
                        dueWithin7DaysCount++;
                    }
                }
                
                return {
                    productname: item.productname,
                    supplier: item.supplier,
                    quantity: item.quantity,
                    costprice: item.costprice,
                    totalOwed: totalOwed,
                    paidAmount: paid,
                    balance: balance,
                    purchaseDate: item.Date,
                    dueDate: dueDate,
                    status: status
                };
            });
            
            // Get unique suppliers with credit
            const uniqueSuppliers = [...new Set(creditItems.map(item => item.supplier).filter(s => s))];
            
            // Group by supplier
            const suppliersGroup = {};
            supplierCreditData.forEach(item => {
                if (!suppliersGroup[item.supplier]) {
                    suppliersGroup[item.supplier] = {
                        supplier: item.supplier,
                        totalBalance: 0,
                        items: []
                    };
                }
                suppliersGroup[item.supplier].totalBalance += item.balance;
                suppliersGroup[item.supplier].items.push(item);
            });
            
            const supplierSummary = Object.values(suppliersGroup);
            
            summary = {
                totalOutstanding: totalOutstanding,
                uniqueSuppliersCount: uniqueSuppliers.length,
                dueWithin7Days: dueWithin7Days,
                dueWithin7DaysCount: dueWithin7DaysCount,
                overdueTotal: overdueTotal,
                overdueCount: overdueCount,
                supplierSummary: supplierSummary,
                suppliers: uniqueSuppliers
            };
        }
        
        // ========== FINANCIAL REPORT ==========
        if (selectedReport === 'financial') {
            // Get sales within date range using NEW schema
            const sales = await Sale.find({
                Date: { $gte: start, $lte: end }
            });
            
            // Calculate TOTAL REVENUE from grandTotal
            const totalRevenue = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
            
            // Calculate TOTAL COST OF GOODS SOLD (from items in each sale)
            let totalCost = 0;
            for (const sale of sales) {
                if (sale.items && sale.items.length) {
                    for (const item of sale.items) {
                        const product = await Stock.findOne({ productname: item.productname });
                        if (product && product.costprice) {
                            totalCost += product.costprice * (item.quantity || 0);
                        }
                    }
                }
            }
            
            // Get outstanding credit from supplier credit (filtered by date)
            let creditItems = [];
            if (startDate && endDate) {
                creditItems = await Stock.find({ 
                    paymentMethod: 'Credit',
                    Date: { $gte: start, $lte: end }
                });
            } else {
                creditItems = await Stock.find({ paymentMethod: 'Credit' });
            }
            
            const outstandingCredit = creditItems.reduce((sum, item) => {
                const totalOwed = (item.costprice || 0) * (item.quantity || 0);
                const paid = item.amountPaid || 0;
                return sum + (totalOwed - paid);
            }, 0);
            
            // Get total deposits from deposit scheme (filtered by date range for deposits)
            const depositors = await Depositor.find();
            let totalDepositsInRange = 0;
            depositors.forEach(depositor => {
                if (depositor.depositHistory && depositor.depositHistory.length) {
                    let depositsToSum = depositor.depositHistory;
                    if (startDate && endDate) {
                        depositsToSum = depositor.depositHistory.filter(deposit => 
                            deposit.date >= start && deposit.date <= end
                        );
                    }
                    totalDepositsInRange += depositsToSum.reduce((sum, d) => sum + d.amount, 0);
                }
            });
            
            // Calculate PROFIT
            const profit = totalRevenue - totalCost;
            
            // Calculate PROFIT MARGIN (%)
            const profitMargin = totalRevenue > 0 ? (profit / totalRevenue * 100).toFixed(2) : 0;
            
            summary = {
                totalRevenue: totalRevenue,
                totalCost: totalCost,
                profit: profit,
                profitMargin: profitMargin,
                outstandingCredit: outstandingCredit,
                totalDeposits: totalDepositsInRange
            };
        }
        
        res.render('reports', {
            currentUser: req.user,
            selectedReport: selectedReport,
            startDate: start.toISOString().split('T')[0],
            endDate: end.toISOString().split('T')[0],
            salesData: salesData,
            stockData: stockData,
            schemeData: schemeData,
            supplierCreditData: supplierCreditData,
            summary: summary,
            totalStockValue: totalStockValue,
            lowStockCount: lowStockItems.length,
            totalProducts: totalProducts
        });
        
    } catch (error) {
        console.error(error);
        res.render('reports', {
            currentUser: req.user,
            selectedReport: 'sales',
            startDate: '',
            endDate: '',
            salesData: [],
            stockData: [],
            schemeData: [],
            supplierCreditData: [],
            summary: {},
            totalStockValue: 0,
            lowStockCount: 0,
            totalProducts: 0,
            error: error.message
        });
    }
});

module.exports = router;