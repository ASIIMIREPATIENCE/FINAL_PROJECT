const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales');
const Stock = require('../models/Stock');
const Depositor = require('../models/Depositor');


function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

//Reports
router.get('/reports', isAuthenticated, async (req, res) => {
    try {
        
        const { reportType, startDate, endDate } = req.query;
        
        let salesData = [];           
        let stockData = [];           
        let schemeData = [];          
        let supplierCreditData = [];   
        let summary = {};              
        
    
        let selectedReport = reportType || 'sales';
        
// Get today's date
        const today = new Date();
        
        
        const defaultStart = new Date();
        defaultStart.setDate(today.getDate() - 30);
        
// Use the provided dates or fall back to defaults
        const start = startDate ? new Date(startDate) : defaultStart;
        const end = endDate ? new Date(endDate) : today;
        end.setHours(23, 59, 59, 999);
        
    
        const allStock = await Stock.find().sort({ Date: -1 });
        const totalStockValue = allStock.reduce((sum, item) => sum + ((item.quantity || 0) * (item.sellingprice || 0)), 0);
        const lowStockItems = allStock.filter(item => item.quantity <= (item.reorderlevel || 0));
        const totalProducts = allStock.length;
        
        
        if (selectedReport === 'sales') {
           
            const sales = await Sale.find({
                Date: { $gte: start, $lte: end }
            }).populate('attendant', 'fullname').sort({ Date: -1 });
            
            
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
            
    
            const totalSales = salesData.reduce((sum, sale) => sum + sale.grandTotal, 0);
            const totalTransactions = salesData.length;
            const avgTransactionValue = totalTransactions > 0 ? totalSales / totalTransactions : 0;
            
// Break down sales by payment method
            let cashSales = 0;      
            let mobileSales = 0;    
            let bankSales = 0;   
            let depositSchemeSales = 0;  
            
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
            
// Calculate top selling products by quantity
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
        
    
// STOCK REPORT
        
        if (selectedReport === 'stock') {
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
            
            
            summary = {
                totalProducts: filteredStock.length,                           
                totalStockValue: totalStockValueFiltered,                      
                totalCostValue: totalCostValue,                               
                potentialProfit: totalStockValueFiltered - totalCostValue,     
                lowStockCount: filteredStock.filter(item => item.quantity <= (item.reorderlevel || 0)).length, 
                outOfStockCount: filteredStock.filter(item => item.quantity === 0).length  
            };
        }
        
    
// DEPOSIT SCHEME REPORT
       
        if (selectedReport === 'scheme') {
            
            const depositors = await Depositor.find().sort({ joinDate: -1 });
            
          
            schemeData = depositors.map(depositor => {
                
                let filteredDeposits = depositor.depositHistory || [];
                if (startDate && endDate) {
                    filteredDeposits = (depositor.depositHistory || []).filter(deposit => 
                        deposit.date >= start && deposit.date <= end
                    );
                }
                
               
                const depositsWithinRange = filteredDeposits.reduce((sum, d) => sum + (d.amountPaid || 0), 0);
                const totalDepositsAll = (depositor.depositHistory || []).reduce((sum, d) => sum + (d.amountPaid || 0), 0);
                const totalOwed = (depositor.itemsSubtotal || 0) + (depositor.transportFee || 0);
                const remainingBalance = totalOwed - (depositor.totalPaid || 0);
                
                
                return {
                    fullName: depositor.fullName,
                    phoneNumber: depositor.phoneNumber,
                    nin: depositor.nin,
                    employer: depositor.employer,
                    joinDate: depositor.joinDate,
                    totalOwed: totalOwed,                                    
                    totalDeposits: totalDepositsAll,                         
                    totalPaid: depositor.totalPaid || 0,
                    remainingBalance: remainingBalance,                       
                    currentBalance: depositor.currentBalance || 0,            
                    depositCount: filteredDeposits.length,                    
                    lastDepositDate: filteredDeposits.length > 0 ? 
                        filteredDeposits[filteredDeposits.length - 1].date : null
                };
            });
            
// Calculate  summary statistics
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
            
        
            allDeposits.sort((a, b) => new Date(b.date) - new Date(a.date));
            
            
            summary = {
                totalDepositors: totalDepositors,
                totalDepositAmount: totalDepositAmount,
                totalCurrentBalance: totalCurrentBalance,
                totalRemainingOwed: totalRemainingOwed,
                totalDepositsCount: totalDepositsCount,
                topDepositors: topDepositors,
                recentDeposits: allDeposits.slice(0, 30)      
            };
        }
    
// SUPPLIER CREDIT REPORT

        if (selectedReport === 'supplier-credit') {
            let creditItems = await Stock.find({ 
                paymentMethod: 'Credit'
            });
            

            if (startDate && endDate) {
                creditItems = creditItems.filter(item => {
                    const itemDate = new Date(item.Date);
                    return itemDate >= start && itemDate <= end;
                });
            }
            
            
            const todayDate = new Date();
            const sevenDaysFromNow = new Date();
            sevenDaysFromNow.setDate(todayDate.getDate() + 7);
            
    
            let totalOutstanding = 0;         
            let dueWithin7Days = 0;             
            let dueWithin7DaysCount = 0;        
            let overdueTotal = 0;               
            let overdueCount = 0;               
            
            
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
            
        
            const uniqueSuppliers = [...new Set(creditItems.map(item => item.supplier).filter(s => s))];
            
        
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
            

            summary = {
                totalOutstanding: totalOutstanding,          
                uniqueSuppliersCount: uniqueSuppliers.length, 
                dueWithin7Days: dueWithin7Days,               
                dueWithin7DaysCount: dueWithin7DaysCount,     
                overdueTotal: overdueTotal,                   
                overdueCount: overdueCount,                   
                supplierSummary: Object.values(suppliersGroup), 
                suppliers: uniqueSuppliers                   
            };
        }
        
    
        // FINANCIAL REPORT

        if (selectedReport === 'financial') {
            
            const sales = await Sale.find({
                Date: { $gte: start, $lte: end }
            });
            
    
            const totalRevenue = sales.reduce((sum, sale) => sum + (sale.grandTotal || 0), 0);
            
            
//Calculate tottal of goods sold
  
            let totalCost = 0;
            const productNames = new Set();
            for (const sale of sales) {
                if (sale.items && sale.items.length) {
                    for (const item of sale.items) {
                        productNames.add(item.productname);
                    }
                }
            }
            
            
            const products = await Stock.find({ productname: { $in: Array.from(productNames) } });
            
            
            const productCostMap = {};
            products.forEach(p => { productCostMap[p.productname] = p.costprice; });
            
    
            for (const sale of sales) {
                if (sale.items && sale.items.length) {
                    for (const item of sale.items) {
                        const cost = productCostMap[item.productname] || 0;
                        totalCost += cost * (item.quantity || 0);
                    }
                }
            }
            
// Calculate outstanding credit from supplier credit purchasess
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
            selectedReport,                           
            startDate: start.toISOString().split('T')[0],  
            endDate: end.toISOString().split('T')[0],     
            salesData,                                
            stockData,                                
            schemeData,                               
            supplierCreditData,                       
            summary,                                  
            totalStockValue,                          
            lowStockCount: lowStockItems.length,      
            totalProducts                            
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