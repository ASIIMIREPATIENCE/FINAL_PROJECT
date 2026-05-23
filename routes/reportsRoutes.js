const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales');
const Stock = require('../models/Stock');
const Depositor = require('../models/Depositor');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
// This function checks if the user is logged in
// If not logged in, they are redirected to the home page
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// ============================================================
// MAIN REPORTS ROUTE
// URL: /reports
// ============================================================
// This route generates different reports based on user selection
// It can show: Sales, Stock, Deposit Scheme, Supplier Credit, or Financial reports
router.get('/reports', isAuthenticated, async (req, res) => {
    try {
        // Get the report type and date range from the URL query parameters
        // Example: /reports?reportType=sales&startDate=2024-01-01&endDate=2024-01-31
        const { reportType, startDate, endDate } = req.query;
        
        // Initialize empty arrays to store data for different reports
        let salesData = [];           // Will hold sales transaction data
        let stockData = [];           // Will hold stock inventory data
        let schemeData = [];          // Will hold deposit scheme data
        let supplierCreditData = [];   // Will hold supplier credit data
        let summary = {};              // Will hold summary statistics (totals, averages, etc.)
        
        // Default to 'sales' report if no report type is selected
        let selectedReport = reportType || 'sales';
        
        // ============================================================
        // DATE RANGE SETUP
        // ============================================================
        // Get today's date
        const today = new Date();
        
        // Set default start date to 30 days ago
        const defaultStart = new Date();
        defaultStart.setDate(today.getDate() - 30);
        
        // Use the provided dates or fall back to defaults
        const start = startDate ? new Date(startDate) : defaultStart;
        const end = endDate ? new Date(endDate) : today;
        
        // Set the end date to the very end of the day (11:59:59 PM)
        // This ensures we include all transactions on the end date
        end.setHours(23, 59, 59, 999);
        
        // ============================================================
        // GET ALL STOCK ITEMS (used by multiple reports)
        // ============================================================
        // Fetch all stock items from database, sorted by date (newest first)
        const allStock = await Stock.find().sort({ Date: -1 });
        
        // Calculate total value of all stock (quantity × selling price)
        const totalStockValue = allStock.reduce((sum, item) => sum + ((item.quantity || 0) * (item.sellingprice || 0)), 0);
        
        // Find items that are low on stock (quantity <= reorder level)
        const lowStockItems = allStock.filter(item => item.quantity <= (item.reorderlevel || 0));
        
        // Count total number of products
        const totalProducts = allStock.length;
        
        // ============================================================
        // SALES REPORT
        // ============================================================
        // Shows: Total sales, number of transactions, average sale value,
        //        payment methods breakdown, top selling products, and individual transactions
        if (selectedReport === 'sales') {
            // Fetch all sales within the selected date range
            const sales = await Sale.find({
                Date: { $gte: start, $lte: end }
            }).populate('attendant', 'fullname').sort({ Date: -1 });
            
            // Transform the sales data into a format suitable for the template
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
            
            // Calculate total sales amount (sum of all grandTotals)
            const totalSales = salesData.reduce((sum, sale) => sum + sale.grandTotal, 0);
            
            // Count how many transactions occurred
            const totalTransactions = salesData.length;
            
            // Calculate average value per transaction
            const avgTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
            
            // Break down sales by payment method
            let cashSales = 0;      // Total from cash payments
            let mobileSales = 0;    // Total from mobile money payments
            let bankSales = 0;   // Total from bank transfer payments
            let depositSchemeSales = 0;   // Total from deposit scheme payments
            
            for (const sale of sales) {
                if (sale.paymentmethod === 'Cash') {
                    cashSales += sale.grandTotal || 0;
                } else if (sale.paymentmethod === 'Mobile Money') {
                    mobileSales += sale.grandTotal || 0;
                } else if (sale.paymentmethod === 'Bank Transfer') {
                    bankSales += sale.grandTotal || 0;
                } else if (sale.paymentmethod === 'Deposit Scheme') {  
        depositSchemeSales += sale.grandTotal || 0;
    }
            }
            
            // Calculate top selling products (by quantity sold, not revenue)
            const productSales = {};
            for (const sale of sales) {
                if (sale.items && sale.items.length) {
                    for (const item of sale.items) {
                        if (!productSales[item.productname]) {
                            productSales[item.productname] = { quantity: 0, revenue: 0 };
                        }
                        productSales[item.productname].quantity += item.quantity || 0;
                        productSales[item.productname].revenue += item.subtotal || 0;
                    }
                }
            }
            
            // Sort products by quantity sold and take the top 5
            const topProducts = Object.entries(productSales)
                .map(([name, data]) => ({ name, quantity: data.quantity, revenue: data.revenue }))
                .sort((a, b) => b.quantity - a.quantity)
                .slice(0, 5);
            
            // Store all sales summary data
            summary = {
                totalSales,
                totalTransactions,
                avgTransactionValue,
                cashSales,
                mobileSales,
                bankSales,
                depositSchemeSales,  
                topProducts
            };
        }
        
        // ============================================================
        // STOCK REPORT
        // ============================================================
        // Shows: Total products, total stock value, low stock items,
        //        and a complete list of all stock items
        if (selectedReport === 'stock') {
            // If date range is provided, filter stock by date
            let filteredStock = allStock;
            if (startDate && endDate) {
                filteredStock = allStock.filter(item => {
                    const itemDate = new Date(item.Date);
                    return itemDate >= start && itemDate <= end;
                });
            }
            
            stockData = filteredStock;
            
            // Calculate total cost value (quantity × cost price)
            const totalCostValue = filteredStock.reduce((sum, item) => sum + ((item.quantity || 0) * (item.costprice || 0)), 0);
            
            // Calculate total selling value (quantity × selling price)
            const totalStockValueFiltered = filteredStock.reduce((sum, item) => sum + ((item.quantity || 0) * (item.sellingprice || 0)), 0);
            
            // Store stock summary data
            summary = {
                totalProducts: filteredStock.length,                           // Number of products
                totalStockValue: totalStockValueFiltered,                      // Total value at selling price
                totalCostValue: totalCostValue,                                // Total cost at purchase price
                potentialProfit: totalStockValueFiltered - totalCostValue,     // Potential profit if all sold
                lowStockCount: filteredStock.filter(item => item.quantity <= (item.reorderlevel || 0)).length,  // Count of low stock items
                outOfStockCount: filteredStock.filter(item => item.quantity === 0).length  // Count of out of stock items
            };
        }
        
        // ============================================================
        // DEPOSIT SCHEME REPORT
        // ============================================================
        // Shows: Depositor information, total deposits, remaining balances,
        //        top depositors, recent deposits, and complete depositor list
        if (selectedReport === 'scheme') {
            // Fetch all depositors from database, newest first
            const depositors = await Depositor.find().sort({ joinDate: -1 });
            
            // Process each depositor's data
            schemeData = depositors.map(depositor => {
                // Get deposit history, filtered by date range if provided
                let filteredDeposits = depositor.depositHistory || [];
                if (startDate && endDate) {
                    filteredDeposits = (depositor.depositHistory || []).filter(deposit => 
                        deposit.date >= start && deposit.date <= end
                    );
                }
                
                // Calculate total deposits within the date range (using amountPaid field)
                const depositsWithinRange = filteredDeposits.reduce((sum, d) => sum + (d.amountPaid || 0), 0);
                
                // Calculate total deposits of all time
                const totalDepositsAll = (depositor.depositHistory || []).reduce((sum, d) => sum + (d.amountPaid || 0), 0);
                
                // Calculate total amount owed (items subtotal + transport fee)
                const totalOwed = (depositor.itemsSubtotal || 0) + (depositor.transportFee || 0);
                
                // Calculate remaining balance (what they still need to pay)
                const remainingBalance = totalOwed - (depositor.totalPaid || 0);
                
                // Return formatted depositor data
                return {
                    fullName: depositor.fullName,
                    phoneNumber: depositor.phoneNumber,
                    nin: depositor.nin,
                    employer: depositor.employer,
                    joinDate: depositor.joinDate,
                    totalOwed: totalOwed,                                    // Items + transport
                    totalDeposits: totalDepositsAll,                          // Total amount paid
                    totalPaid: depositor.totalPaid || 0,
                    remainingBalance: remainingBalance,                       // What's still owed
                    currentBalance: depositor.currentBalance || 0,            // Savings balance
                    depositCount: filteredDeposits.length,                    // Number of deposits made
                    lastDepositDate: filteredDeposits.length > 0 ? 
                        filteredDeposits[filteredDeposits.length - 1].date : null
                };
            });
            
            // Calculate overall summary statistics
            const totalDepositors = depositors.length;                                                      // Total number of depositors
            const totalDepositAmount = schemeData.reduce((sum, d) => sum + d.totalDeposits, 0);             // Sum of all deposits
            const totalCurrentBalance = schemeData.reduce((sum, d) => sum + d.currentBalance, 0);           // Sum of savings balances
            const totalRemainingOwed = schemeData.reduce((sum, d) => sum + (d.remainingBalance > 0 ? d.remainingBalance : 0), 0); // Sum of amounts still owed
            
            // Count total number of deposit transactions
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
            
            // Get top 5 depositors by total amount paid
            const topDepositors = [...schemeData]
                .sort((a, b) => b.totalDeposits - a.totalDeposits)
                .slice(0, 5);
            
            // Collect all individual deposit transactions for the recent deposits list
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
                        amount: deposit.amountPaid || 0,
                        balanceAfter: deposit.balanceAfter,
                        paymentMethod: deposit.paymentMethod,
                        attendantName: deposit.attendantName
                    }));
                    allDeposits.push(...depositsWithInfo);
                }
            });
            
            // Sort deposits by date (newest first)
            allDeposits.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            // Store scheme summary data
            summary = {
                totalDepositors: totalDepositors,
                totalDepositAmount: totalDepositAmount,
                totalCurrentBalance: totalCurrentBalance,
                totalRemainingOwed: totalRemainingOwed,
                totalDepositsCount: totalDepositsCount,
                topDepositors: topDepositors,
                recentDeposits: allDeposits.slice(0, 20)      // Show only the 20 most recent deposits
            };
        }
        
        // ============================================================
        // SUPPLIER CREDIT REPORT
        // ============================================================
        // Shows: Total outstanding credit, suppliers with credit,
        //        payments due within 7 days, overdue payments,
        //        and detailed credit purchase information
        if (selectedReport === 'supplier-credit') {
            // Get all stock items purchased on credit
            let creditItems = await Stock.find({ 
                paymentMethod: 'Credit'
            });
            
            // Apply date filter if provided
            if (startDate && endDate) {
                creditItems = creditItems.filter(item => {
                    const itemDate = new Date(item.Date);
                    return itemDate >= start && itemDate <= end;
                });
            }
            
            // Set up date calculations
            const todayDate = new Date();
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(todayDate.getDate() + 7);
            
            // Initialize counters
            let totalOutstanding = 0;          // Total money owed
            let dueWithin7Days = 0;             // Amount due in next 7 days
            let dueWithin7DaysCount = 0;        // Number of items due in 7 days
            let overdueTotal = 0;               // Total overdue amount
            let overdueCount = 0;               // Number of overdue items
            
            // Process each credit item
            supplierCreditData = creditItems.map(item => {
                // Calculate total owed and balance
                const totalOwed = (item.costprice || 0) * (item.quantity || 0);
                const paid = item.amountPaid || 0;
                const balance = totalOwed - paid;
                
                if (balance > 0) totalOutstanding += balance;
                
                // Calculate due date (30 days from purchase date)
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
                
                // Return formatted credit item
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
            
            // Get unique list of suppliers
            const uniqueSuppliers = [...new Set(creditItems.map(item => item.supplier).filter(s => s))];
            
            // Group credit items by supplier for summary
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
            
            // Store supplier credit summary
            summary = {
                totalOutstanding: totalOutstanding,           // Total money owed to all suppliers
                uniqueSuppliersCount: uniqueSuppliers.length, // Number of suppliers with credit
                dueWithin7Days: dueWithin7Days,               // Amount due in next 7 days
                dueWithin7DaysCount: dueWithin7DaysCount,     // Number of items due in 7 days
                overdueTotal: overdueTotal,                   // Total overdue amount
                overdueCount: overdueCount,                   // Number of overdue items
                supplierSummary: Object.values(suppliersGroup), // Summary grouped by supplier
                suppliers: uniqueSuppliers                    // List of all suppliers
            };
        }
        
        // ============================================================
        // FINANCIAL REPORT
        // ============================================================
        // Shows: Total revenue, total cost, profit, profit margin,
        //        outstanding credit, and total deposits
        if (selectedReport === 'financial') {
            // Get all sales within date range
            const sales = await Sale.find({
                Date: { $gte: start, $lte: end }
            });
            
            // Calculate total revenue from sales
            const totalRevenue = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
            
            // ============================================================
            // CALCULATE TOTAL COST OF GOODS SOLD
            // ============================================================
            // First, collect all unique product names from the sales
            let totalCost = 0;
            const productNames = new Set();
            for (const sale of sales) {
                if (sale.items && sale.items.length) {
                    for (const item of sale.items) {
                        productNames.add(item.productname);
                    }
                }
            }
            
            // Then, fetch all those products in ONE database query (efficient)
            const products = await Stock.find({ productname: { $in: Array.from(productNames) } });
            
            // Create a map for quick lookups (productname → costprice)
            const productCostMap = {};
            products.forEach(p => { productCostMap[p.productname] = p.costprice; });
            
            // Calculate total cost by multiplying quantity × cost price
            for (const sale of sales) {
                if (sale.items && sale.items.length) {
                    for (const item of sale.items) {
                        const cost = productCostMap[item.productname] || 0;
                        totalCost += cost * (item.quantity || 0);
                    }
                }
            }
            
            // Calculate outstanding credit from supplier credit purchases
            let creditItems = await Stock.find({ paymentMethod: 'Credit' });
            const outstandingCredit = creditItems.reduce((sum, item) => {
                const totalOwed = (item.costprice || 0) * (item.quantity || 0);
                const paid = item.amountPaid || 0;
                return sum + (totalOwed - paid);
            }, 0);
            
            // Calculate total deposits within the date range
            const depositors = await Depositor.find();
            let totalDepositsInRange = 0;
            for (const depositor of depositors) {
                if (depositor.depositHistory && depositor.depositHistory.length) {
                    let depositsToSum = depositor.depositHistory;
                    if (startDate && endDate) {
                        depositsToSum = depositor.depositHistory.filter(deposit => 
                            deposit.date >= start && deposit.date <= end
                        );
                    }
                    totalDepositsInRange += depositsToSum.reduce((sum, d) => sum + (d.amountPaid || 0), 0);
                }
            }
            
            // Calculate profit and profit margin
            const profit = totalRevenue - totalCost;
            const profitMargin = totalRevenue > 0 ? (profit / totalRevenue * 100).toFixed(2) : 0;
            
            // Store financial summary
            summary = {
                totalRevenue: totalRevenue,
                totalCost: totalCost,
                profit: profit,
                profitMargin: profitMargin,
                outstandingCredit: outstandingCredit,
                totalDeposits: totalDepositsInRange
            };
        }
        
        // ============================================================
        // RENDER THE REPORTS PAGE
        // ============================================================
        // Pass all the collected data to the Pug template for display
        res.render('reports', {
            currentUser: req.user,                    // Current logged-in user
            selectedReport,                           // Which report is being shown
            startDate: start.toISOString().split('T')[0],  // Start date for display
            endDate: end.toISOString().split('T')[0],      // End date for display
            salesData,                                // Sales transactions data
            stockData,                                // Stock inventory data
            schemeData,                               // Deposit scheme data
            supplierCreditData,                       // Supplier credit data
            summary,                                  // All summary statistics
            totalStockValue,                          // Total value of all stock
            lowStockCount: lowStockItems.length,      // Number of low stock items
            totalProducts                             // Total number of products
        });
        
    } catch (error) {
        // If anything goes wrong, log the error and render the page with empty data
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
            error: error.message  // Show the error message on the page
        });
    }
});

module.exports = router;