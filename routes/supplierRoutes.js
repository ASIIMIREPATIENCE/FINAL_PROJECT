const express = require('express');
const router = express.Router();
const Stock = require('../models/Stock');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
// This function checks if the user is logged in before allowing access
// If not logged in, they are redirected to the home page
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// ============================================================
// DISPLAY SUPPLIER CREDIT PAGE
// URL: /supplier-credit
// ============================================================
// This route shows all credit purchases from suppliers
// It displays:
// - Summary statistics (total outstanding, due in 7 days, overdue)
// - List of all credit items with their status
// - Suppliers grouped with their outstanding balances
router.get('/supplier-credit', isAuthenticated, async (req, res) => {
    try {
        // Get all stock items purchased on credit from the database
        // Populate the attendant field to get the person who made the purchase
        let creditStockItems = await Stock.find({ paymentMethod: 'Credit' })
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        
        // Initialize counters for summary statistics
        let totalOutstanding = 0;           // Total money owed to all suppliers
        const today = new Date();            // Current date
        const sevenDaysFromNow = new Date(); // Date 7 days from now
        sevenDaysFromNow.setDate(today.getDate() + 7);
        
        let dueWithin7Days = 0;              // Amount due within the next 7 days
        let dueWithin7DaysCount = 0;         // Number of items due within 7 days
        let overdueTotal = 0;                // Total overdue amount
        let overdueCount = 0;                // Number of overdue items
        
        // ============================================================
        // PROCESS EACH CREDIT STOCK ITEM
        // ============================================================
        creditStockItems = creditStockItems.map(item => {
            // Calculate financial figures
            const totalOwed = item.costprice * item.quantity;     // Total cost of the purchase
            const paid = item.amountPaid || 0;                    // Amount already paid
            const balance = totalOwed - paid;                     // Remaining balance
            
            // Add to total outstanding if balance is positive
            if (balance > 0) {
                totalOutstanding += balance;
            }
            
            // Calculate due date and determine payment status
            let dueDate = null;
            let status = 'Pending';           // Default status
            
            if (item.Date) {
                // Due date is 30 days from the purchase date
                dueDate = new Date(item.Date);
                dueDate.setDate(dueDate.getDate() + 30);
                
                // Determine the payment status
                if (balance <= 0) {
                    status = 'Paid';                                 // Fully paid
                } else if (dueDate < today) {
                    status = 'Overdue';                              // Past due date
                    overdueTotal += balance;
                    overdueCount++;
                } else if (dueDate <= sevenDaysFromNow) {
                    dueWithin7Days += balance;                       // Due within 7 days
                    dueWithin7DaysCount++;
                }
            }
            
            // Return the processed item with all calculated fields
            return {
                ...item.toObject(),
                totalOwed: totalOwed,                                    // Total amount owed
                paidAmount: paid,                                        // Amount already paid
                balance: balance,                                        // Remaining balance
                dueDate: dueDate,                                        // Due date for payment
                status: status,                                          // Payment status
                attendantName: item.attendantName || (item.attendant ? item.attendant.fullname : 'Unknown')
            };
        });
        
        // Get unique list of suppliers (remove duplicates using Set)
        const uniqueSuppliers = [...new Set(creditStockItems.map(item => item.supplier))];
        
        // Render the supplier credit page with all data
        res.render('supplier_credit', {
            currentUser: req.user,                   // Current logged-in user
            creditStockItems: creditStockItems,      // List of all credit items
            totalOutstanding: totalOutstanding,      // Total money owed
            uniqueSuppliers: uniqueSuppliers.length, // Number of suppliers with credit
            dueWithin7Days: dueWithin7Days,          // Amount due in 7 days
            dueWithin7DaysCount: dueWithin7DaysCount, // Number of items due in 7 days
            overdueTotal: overdueTotal,              // Total overdue amount
            overdueCount: overdueCount,              // Number of overdue items
            suppliersWithCredit: uniqueSuppliers     // List of all suppliers
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// ============================================================
// SHOW PAYMENT FORM
// URL: /payment/:id
// ============================================================
// This route displays the payment form for a specific credit item
// The user can enter the amount they want to pay
router.get('/payment/:id', isAuthenticated, async (req, res) => {
    try {
        // Find the credit stock item by its ID
        const stockItem = await Stock.findById(req.params.id).populate('attendant', 'fullname');
        
        // If item doesn't exist, redirect back to supplier credit page
        if (!stockItem) return res.redirect('/supplier-credit');
        
        // Calculate financial figures for the payment form
        const totalOwed = stockItem.costprice * stockItem.quantity;  // Total amount owed
        const paid = stockItem.amountPaid || 0;                      // Amount already paid
        const balance = totalOwed - paid;                            // Remaining balance
        
        // Calculate due date (30 days from purchase date)
        const dueDate = new Date(stockItem.Date);
        dueDate.setDate(dueDate.getDate() + 30);
        
        // Render the payment form with the item details
        res.render('payment_form', {
            currentUser: req.user,           // Current logged-in user
            stockItem: stockItem,            // The credit item
            totalOwed: totalOwed,            // Total amount owed
            balance: balance,                // Remaining balance
            dueDate: dueDate                 // Due date for payment
        });
        
    } catch (error) {
        console.error(error);
        res.redirect('/supplier-credit');
    }
});

// ============================================================
// RECORD SUPPLIER PAYMENT
// URL: /recordSupplierPayment
// ============================================================
// This route processes the payment form submission
// It updates the amount paid for the credit item
router.post('/recordSupplierPayment', isAuthenticated, async (req, res) => {
    try {
        // Get the stock ID and payment amount from the form
        const { stockId, amountPaid } = req.body;
        
        // Find the stock item in the database
        const stockItem = await Stock.findById(stockId);
        if (!stockItem) {
            return res.redirect('/supplier-credit');
        }
        
        // Calculate new payment totals
        const currentPaid = stockItem.amountPaid || 0;           // Current total paid
        const newPaid = currentPaid + Number(amountPaid);        // New total after payment
        const totalOwed = stockItem.costprice * stockItem.quantity; // Total amount owed
        
        // Get attendant information for logging
        const attendantName = req.user ? req.user.fullname : 'Unknown';
        
        // Update the amount paid in the database
        await Stock.findByIdAndUpdate(stockId, {
            amountPaid: newPaid
        });
        
        // Log the payment for audit purposes
        console.log(`[${new Date().toLocaleString()}] Payment recorded by ${attendantName}: UGX ${amountPaid} for ${stockItem.productname}`);
        console.log(`   Total paid now: UGX ${newPaid} | Balance: UGX ${totalOwed - newPaid}`);
        
        // Redirect back to the supplier credit page
        res.redirect('/supplier-credit');
        
    } catch (error) {
        console.error(error);
        res.redirect('/supplier-credit');
    }
});

module.exports = router;