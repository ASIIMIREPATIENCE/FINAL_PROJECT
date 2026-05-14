const express = require('express');
const router = express.Router();
const Depositor = require('../models/Depositor');
const Registration = require('../models/Registration');

// GET route - Display deposit scheme page (Auth removed for now)
router.get('/scheme', async (req, res) => {
    try {
        // Get current logged-in user from Registration model (will work without auth)
        const userId = req.user?._id || req.session?.userId;
        let user = null;
        
        if (userId) {
            user = await Registration.findById(userId).select('fullname email role');
        }
        
        // Get all depositors
        const depositors = await Depositor.find().sort({ joinDate: -1 });
        
        // Calculate summary totals
        let totalDeposits = 0;
        let currentBalance = 0;
        
        depositors.forEach(depositor => {
            totalDeposits += depositor.totalDeposits || 0;
            currentBalance += depositor.currentBalance || 0;
        });
        
        // Find depositor with highest current balance (Top Depositor)
        let topBalanceDepositor = null;
        let highestBalance = 0;
        
        depositors.forEach(depositor => {
            if (depositor.currentBalance > highestBalance) {
                highestBalance = depositor.currentBalance;
                topBalanceDepositor = depositor;
            }
        });
        
        // Collect all deposit history from all depositors for the transaction history table
        let allDeposits = [];
        depositors.forEach(depositor => {
            if (depositor.depositHistory && depositor.depositHistory.length) {
                const depositsWithInfo = depositor.depositHistory.map(deposit => ({
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
        
        // Sort by date, most recent first
        allDeposits.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentDeposits = allDeposits.slice(0, 50);
        
        // Set flash messages if they exist
        const success_msg = req.flash ? req.flash('success')[0] : null;
        const error_msg = req.flash ? req.flash('error')[0] : null;
        
        res.render('scheme', {
            depositors: depositors,
            transactions: recentDeposits, // For the deposit history table
            totalDeposits: totalDeposits,
            currentBalance: currentBalance,
            depositorsCount: depositors.length,
            user: user || { fullname: 'Guest User', role: 'Guest' },
            topBalanceDepositor: topBalanceDepositor, // ADD THIS LINE
            messages: {
                success: success_msg,
                error: error_msg
            }
        });
        
    } catch (error) {
        console.error('Error loading scheme page:', error);
        res.status(500).send('Server error');
    }
});

// POST route - Register new depositor (Auth removed for now)
router.post('/registerDepositor', async (req, res) => {
    try {
        const { fullName, phoneNumber, nin, employer } = req.body;
        
        // Get current logged-in user (if any)
        const userId = req.user?._id || req.session?.userId;
        let user = null;
        
        if (userId) {
            user = await Registration.findById(userId).select('fullname');
        }
        
        // If no user found, use a default attendant
        const attendantName = user ? user.fullname : 'System Admin';
        
        // Check if NIN already exists
        const existingDepositor = await Depositor.findOne({ nin: nin });
        if (existingDepositor) {
            if (req.flash) req.flash('error', 'Depositor with this NIN already exists');
            return res.redirect('/scheme');
        }
        
        // Create new depositor
        const newDepositor = new Depositor({
            fullName: fullName,
            phoneNumber: phoneNumber,
            nin: nin,
            employer: employer || '',
            joinDate: new Date(),
            currentBalance: 0,
            totalDeposits: 0,
            depositHistory: []
        });
        
        await newDepositor.save();
        console.log(`[${new Date().toLocaleString()}] New depositor registered: ${fullName} by ${attendantName}`);
        if (req.flash) req.flash('success', `Depositor ${fullName} registered successfully`);
        res.redirect('/scheme');
        
    } catch (error) {
        console.error('Error registering depositor:', error);
        if (req.flash) req.flash('error', 'Error registering depositor');
        res.redirect('/scheme');
    }
});

// POST route - Record deposit (Auth removed for now)
router.post('/recordDeposit', async (req, res) => {
    try {
        const { depositorId, amount, paymentMethod } = req.body;
        
        // Get current logged-in user (if any)
        const userId = req.user?._id || req.session?.userId;
        let attendant = null;
        
        if (userId) {
            attendant = await Registration.findById(userId).select('fullname');
        }
        
        // If no user found, use a default attendant
        const attendantName = attendant ? attendant.fullname : 'System Admin';
        const attendantId = attendant ? attendant._id : null;
        
        // Find the depositor
        const depositor = await Depositor.findById(depositorId);
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
            return res.redirect('/scheme');
        }
        
        const depositAmount = Number(amount);
        
        if (depositAmount <= 0) {
            if (req.flash) req.flash('error', 'Deposit amount must be greater than 0');
            return res.redirect('/scheme');
        }
        
        // Calculate new balance
        const oldBalance = depositor.currentBalance;
        const newBalance = oldBalance + depositAmount;
        
        // Update depositor
        depositor.currentBalance = newBalance;
        depositor.totalDeposits += depositAmount;
        
        // Add to deposit history
        depositor.depositHistory.push({
            amount: depositAmount,
            date: new Date(), // Auto-captures current date and time
            attendant: attendantId,
            attendantName: attendantName,
            paymentMethod: paymentMethod || 'Cash',
            balanceAfter: newBalance
        });
        
        await depositor.save();
        
        console.log(`[${new Date().toLocaleString()}] Deposit of UGX ${depositAmount.toLocaleString()} recorded for ${depositor.fullName}`);
        console.log(`   Attendant: ${attendantName}`);
        console.log(`   Balance changed: UGX ${oldBalance.toLocaleString()} → UGX ${newBalance.toLocaleString()}`);
        
        if (req.flash) req.flash('success', `Deposit of UGX ${depositAmount.toLocaleString()} recorded for ${depositor.fullName}`);
        res.redirect('/scheme');
        
    } catch (error) {
        console.error('Error recording deposit:', error);
        if (req.flash) req.flash('error', 'Error recording deposit');
        res.redirect('/scheme');
    }
});

module.exports = router;