const express = require('express');
const router = express.Router();
const Depositor = require('../models/Depositor');
const Stock = require('../models/Stock');
const Registration = require('../models/Registration');

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
// DISPLAY DEPOSIT SCHEME PAGE
// URL: /scheme
// ============================================================
// This route shows the deposit scheme management page where users can:
// - Register new depositors
// - Record deposit payments
// - View all depositors and their transaction history
router.get('/scheme', isAuthenticated, async (req, res) => {
    try {
        // Get the currently logged-in user
        const user = req.user;
        
        // Fetch all depositors from database, sorted by join date (newest first)
        const depositors = await Depositor.find().sort({ joinDate: -1 });
        
        // Fetch all stock items that have quantity > 0 (for item selection)
        const stockItems = await Stock.find({ quantity: { $gt: 0 } });
        
        // Calculate summary statistics
        let totalSavingsTarget = 0;  // Sum of all amounts owed (items + transport)
        let totalAmountPaid = 0;      // Sum of all payments made
        
        depositors.forEach(depositor => {
            totalSavingsTarget += depositor.totalAmountOwed || 0;
            totalAmountPaid += depositor.totalPaid || 0;
        });
        
        // Collect all deposit transactions for the recent transactions table
        let allTransactions = [];
        depositors.forEach(depositor => {
            if (depositor.depositHistory && depositor.depositHistory.length) {
                const transactionsWithInfo = depositor.depositHistory.map(transaction => ({
                    date: transaction.date,
                    depositorName: depositor.fullName,
                    totalOwed: transaction.totalOwedAtTime,
                    amountPaid: transaction.amountPaid,
                    balanceAfter: transaction.balanceAfter,
                    paymentMethod: transaction.paymentMethod,
                    attendantName: transaction.attendantName
                }));
                allTransactions.push(...transactionsWithInfo);
            }
        });
        
        // Sort transactions by date (newest first) and keep only the 50 most recent
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentTransactions = allTransactions.slice(0, 50);
        
        // Render the deposit scheme page with all the data
        res.render('scheme', {
            depositors: depositors,                    // List of all depositors
            stockItems: stockItems,                    // Available stock items for selection
            recentTransactions: recentTransactions,    // Recent deposit transactions
            totalSavingsTarget: totalSavingsTarget,    // Total amount owed by all depositors
            totalAmountPaid: totalAmountPaid,          // Total amount paid by all depositors
            totalRemaining: totalSavingsTarget - totalAmountPaid,  // Total remaining balance
            depositorsCount: depositors.length,        // Number of depositors
            currentUser: user,                         // Current logged-in user
            messages: { 
                success: req.flash ? req.flash('success')[0] : null,  // Success flash message
                error: req.flash ? req.flash('error')[0] : null       // Error flash message
            }
        });
        
    } catch (error) {
        console.error('Error loading scheme page:', error);
        res.status(500).send('Server error');
    }
});

// ============================================================
// REGISTER NEW DEPOSITOR
// URL: /registerDepositor
// ============================================================
// This route creates a new depositor with their selected items,
// calculates transport fee, and saves the total amount owed
router.post('/registerDepositor', isAuthenticated, async (req, res) => {
    try {
        // Extract data from the form submission
        const { fullName, phoneNumber, nin, employer, cartItems, needTransport, distance } = req.body;
        
        // Get current user info
        const user = req.user;
        const attendantName = user ? user.fullname : 'System Admin';
        
        // Check if a depositor with this NIN already exists
        const existingDepositor = await Depositor.findOne({ nin: nin });
        if (existingDepositor) {
            if (req.flash) req.flash('error', 'Depositor with this NIN already exists');
            return res.redirect('/scheme');
        }
        
        // ============================================================
        // PARSE CART ITEMS AND CALCULATE SUBTOTAL
        // ============================================================
        let items = [];
        let itemsSubtotal = 0;
        
        if (cartItems && cartItems !== '[]') {
            // Convert JSON string to array
            items = JSON.parse(cartItems);
            
            // Format each item for database storage
            items = items.map(item => ({
                productname: item.productName,
                quantity: item.quantity,
                unitprice: item.unitPrice,
                subtotal: item.quantity * item.unitPrice
            }));
            
            // Calculate the total subtotal of all items
            itemsSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        }
        
        // ============================================================
        // CALCULATE TRANSPORT FEE
        // ============================================================
        // Transport is free if:
        //   1. Transport is needed (needTransport = true)
        //   2. Distance > 0 km
        //   3. Items subtotal is ≥ 500,000 UGX
        //   4. Distance is ≤ 10 km
        // Otherwise, transport fee is 30,000 UGX
        const needTrans = needTransport === 'true';
        const distanceKm = parseInt(distance) || 0;
        let transportFee = 0;
        
        if (needTrans && distanceKm > 0) {
            const isFree = (itemsSubtotal >= 500000 && distanceKm <= 10);
            if (!isFree) {
                transportFee = 30000;
            }
        }
        
        // Calculate the total amount owed (items + transport)
        const totalAmountOwed = itemsSubtotal + transportFee;
        
        // ============================================================
        // CREATE AND SAVE THE NEW DEPOSITOR
        // ============================================================
        const newDepositor = new Depositor({
            fullName: fullName,
            phoneNumber: phoneNumber,
            nin: nin,
            employer: employer || '',
            joinDate: new Date(),
            items: items,                       // Items they want to purchase
            itemsSubtotal: itemsSubtotal,       // Subtotal of items only
            needTransport: needTrans,           // Whether transport is needed
            distance: distanceKm,               // Distance in km
            transportFee: transportFee,         // Transport fee charged
            totalAmountOwed: totalAmountOwed,   // Total owed (items + transport)
            totalPaid: 0,                       // No payments yet
            remainingBalance: totalAmountOwed,  // Full amount is remaining
            depositHistory: []                  // No deposit history yet
        });
        
        await newDepositor.save();
        
        // Log the registration details
        console.log(`[${new Date().toLocaleString()}] New depositor registered: ${fullName}`);
        console.log(`   Items Subtotal: UGX ${itemsSubtotal.toLocaleString()}`);
        console.log(`   Transport Fee: UGX ${transportFee.toLocaleString()}`);
        console.log(`   TOTAL OWED: UGX ${totalAmountOwed.toLocaleString()}`);
        
        // Show success message and redirect back to scheme page
        if (req.flash) req.flash('success', `Depositor ${fullName} registered successfully. Total: UGX ${totalAmountOwed.toLocaleString()}`);
        res.redirect('/scheme');
        
    } catch (error) {
        console.error('Error registering depositor:', error);
        if (req.flash) req.flash('error', 'Error registering depositor: ' + error.message);
        res.redirect('/scheme');
    }
});

// ============================================================
// RECORD DEPOSIT PAYMENT
// URL: /recordDeposit
// ============================================================
// This route records a payment made by a depositor towards their savings goal
// It updates the depositor's balance and creates a transaction record
router.post('/recordDeposit', isAuthenticated, async (req, res) => {
    try {
        // Extract payment information from the form
        const { depositorId, amountPaid, paymentMethod, notes } = req.body;
        
        // Get current user (attendant) information
        const user = req.user;
        const attendantName = user ? user.fullname : 'Admin';
        const attendantId = user ? user._id : null;
        
        // Find the depositor in the database
        const depositor = await Depositor.findById(depositorId);
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
            return res.redirect('/scheme');
        }
        
        // Validate the payment amount
        const amount = Number(amountPaid);
        
        if (amount <= 0) {
            if (req.flash) req.flash('error', 'Amount must be greater than 0');
            return res.redirect('/scheme');
        }
        
        // Check if the payment amount exceeds the remaining balance
        if (amount > depositor.remainingBalance) {
            if (req.flash) req.flash('error', `Amount cannot exceed remaining balance of UGX ${depositor.remainingBalance.toLocaleString()}`);
            return res.redirect('/scheme');
        }
        
        // ============================================================
        // CALCULATE NEW BALANCES
        // ============================================================
        const newRemaining = depositor.remainingBalance - amount;  // What's left to pay
        const newTotalPaid = depositor.totalPaid + amount;         // Total paid so far
        
        // ============================================================
        // CREATE DEPOSIT RECORD
        // ============================================================
        const depositRecord = {
            date: new Date(),                               // Current date and time
            amountPaid: amount,                             // Amount paid this time
            totalOwedAtTime: depositor.totalAmountOwed,     // Total owed at the time of payment
            balanceAfter: newRemaining,                     // Balance after this payment
            paymentMethod: paymentMethod || 'Cash',         // How they paid
            attendant: attendantId,                         // Who recorded the payment
            attendantName: attendantName,                   // Attendant's name
            notes: notes || '',                             // Any additional notes
            transportFee: depositor.transportFee            // Store transport fee for receipt
        };
        
        // Add the deposit record to the depositor's history
        depositor.depositHistory.push(depositRecord);
        
        // Update the depositor's totals
        depositor.totalPaid = newTotalPaid;
        depositor.remainingBalance = newRemaining;
        
        // If fully paid, mark as completed
        if (newRemaining <= 0) {
            depositor.status = 'completed';
        }
        
        // Save the updated depositor to the database
        await depositor.save();
        
        // Get the newly created deposit record for the receipt
        const savedDeposit = depositor.depositHistory[depositor.depositHistory.length - 1];
        
        // Log the deposit
        console.log(`[${new Date().toLocaleString()}] Deposit recorded for ${depositor.fullName}`);
        console.log(`   Amount: UGX ${amount.toLocaleString()}`);
        console.log(`   Remaining: UGX ${newRemaining.toLocaleString()}`);
        
        // ============================================================
        // SHOW THE RECEIPT PAGE
        // ============================================================
        // Render the deposit receipt page with the transaction details
        res.render('deposit_receipt', {
            deposit: savedDeposit,      // The deposit record
            depositor: depositor,       // The depositor information
            currentUser: req.user,      // Current logged-in user
            success: true               // Success flag
        });
        
    } catch (error) {
        console.error('Error recording deposit:', error);
        if (req.flash) req.flash('error', 'Error recording deposit: ' + error.message);
        res.redirect('/scheme');
    }
});

module.exports = router;
