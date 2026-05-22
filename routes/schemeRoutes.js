const express = require('express');
const router = express.Router();
const Depositor = require('../models/Depositor');
const Stock = require('../models/Stock');
const Registration = require('../models/Registration');

function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// GET route - Display deposit scheme page
router.get('/scheme', isAuthenticated, async (req, res) => {
    try {
        const user = req.user;
        const depositors = await Depositor.find().sort({ joinDate: -1 });
        const stockItems = await Stock.find({ quantity: { $gt: 0 } });
        
        let totalSavingsTarget = 0;
        let totalAmountPaid = 0;
        
        depositors.forEach(depositor => {
            totalSavingsTarget += depositor.totalAmountOwed || 0;
            totalAmountPaid += depositor.totalPaid || 0;
        });
        
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
        
        allTransactions.sort((a, b) => new Date(b.date) - new Date(a.date));
        const recentTransactions = allTransactions.slice(0, 50);
        
        res.render('scheme', {
            depositors: depositors,
            stockItems: stockItems,
            recentTransactions: recentTransactions,
            totalSavingsTarget: totalSavingsTarget,
            totalAmountPaid: totalAmountPaid,
            totalRemaining: totalSavingsTarget - totalAmountPaid,
            depositorsCount: depositors.length,
            currentUser: user,
            messages: { 
                success: req.flash ? req.flash('success')[0] : null, 
                error: req.flash ? req.flash('error')[0] : null 
            }
        });
        
    } catch (error) {
        console.error('Error loading scheme page:', error);
        res.status(500).send('Server error');
    }
});

// POST route - Register new depositor
router.post('/registerDepositor', isAuthenticated, async (req, res) => {
    try {
        const { fullName, phoneNumber, nin, employer, cartItems, needTransport, distance } = req.body;
        const user = req.user;
        const attendantName = user ? user.fullname : 'System Admin';
        
        const existingDepositor = await Depositor.findOne({ nin: nin });
        if (existingDepositor) {
            if (req.flash) req.flash('error', 'Depositor with this NIN already exists');
            return res.redirect('/scheme');
        }
        
        // Parse cart items
        let items = [];
        let itemsSubtotal = 0;
        
        if (cartItems && cartItems !== '[]') {
            items = JSON.parse(cartItems);
            items = items.map(item => ({
                productname: item.productName,
                quantity: item.quantity,
                unitprice: item.unitPrice,
                subtotal: item.quantity * item.unitPrice
            }));
            itemsSubtotal = items.reduce((sum, item) => sum + item.subtotal, 0);
        }
        
        // Calculate transport fee
        const needTrans = needTransport === 'true';
        const distanceKm = parseInt(distance) || 0;
        let transportFee = 0;
        
        if (needTrans && distanceKm > 0) {
            const isFree = (itemsSubtotal >= 500000 && distanceKm <= 10);
            if (!isFree) {
                transportFee = 30000;
            }
        }
        
        const totalAmountOwed = itemsSubtotal + transportFee;
        
        const newDepositor = new Depositor({
            fullName: fullName,
            phoneNumber: phoneNumber,
            nin: nin,
            employer: employer || '',
            joinDate: new Date(),
            items: items,
            itemsSubtotal: itemsSubtotal,
            needTransport: needTrans,
            distance: distanceKm,
            transportFee: transportFee,
            totalAmountOwed: totalAmountOwed,
            totalPaid: 0,
            remainingBalance: totalAmountOwed,
            depositHistory: []
        });
        
        await newDepositor.save();
        
        console.log(`[${new Date().toLocaleString()}] New depositor registered: ${fullName}`);
        console.log(`   Items Subtotal: UGX ${itemsSubtotal.toLocaleString()}`);
        console.log(`   Transport Fee: UGX ${transportFee.toLocaleString()}`);
        console.log(`   TOTAL OWED: UGX ${totalAmountOwed.toLocaleString()}`);
        
        if (req.flash) req.flash('success', `Depositor ${fullName} registered successfully. Total: UGX ${totalAmountOwed.toLocaleString()}`);
        res.redirect('/scheme');
        
    } catch (error) {
        console.error('Error registering depositor:', error);
        if (req.flash) req.flash('error', 'Error registering depositor: ' + error.message);
        res.redirect('/scheme');
    }
});

// POST route - Record deposit payment
router.post('/recordDeposit', isAuthenticated, async (req, res) => {
    try {
        const { depositorId, amountPaid, paymentMethod, notes } = req.body;
        const user = req.user;
        const attendantName = user ? user.fullname : 'Admin';
        const attendantId = user ? user._id : null;
        
        const depositor = await Depositor.findById(depositorId);
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
            return res.redirect('/scheme');
        }
        
        const amount = Number(amountPaid);
        
        if (amount <= 0) {
            if (req.flash) req.flash('error', 'Amount must be greater than 0');
            return res.redirect('/scheme');
        }
        
        if (amount > depositor.remainingBalance) {
            if (req.flash) req.flash('error', `Amount cannot exceed remaining balance of UGX ${depositor.remainingBalance.toLocaleString()}`);
            return res.redirect('/scheme');
        }
        
        const newRemaining = depositor.remainingBalance - amount;
        const newTotalPaid = depositor.totalPaid + amount;
        
        const depositRecord = {
            date: new Date(),
            amountPaid: amount,
            totalOwedAtTime: depositor.totalAmountOwed,
            balanceAfter: newRemaining,
            paymentMethod: paymentMethod || 'Cash',
            attendant: attendantId,
            attendantName: attendantName,
            notes: notes || '',
            transportFee: depositor.transportFee
        };
        
        depositor.depositHistory.push(depositRecord);
        depositor.totalPaid = newTotalPaid;
        depositor.remainingBalance = newRemaining;
        
        if (newRemaining <= 0) {
            depositor.status = 'completed';
        }
        
        await depositor.save();
        
        const savedDeposit = depositor.depositHistory[depositor.depositHistory.length - 1];
        
        console.log(`[${new Date().toLocaleString()}] Deposit recorded for ${depositor.fullName}`);
        console.log(`   Amount: UGX ${amount.toLocaleString()}`);
        console.log(`   Remaining: UGX ${newRemaining.toLocaleString()}`);
        
        res.render('deposit_receipt', {
            deposit: savedDeposit,
            depositor: depositor,
            currentUser: req.user,
            success: true
        });
        
    } catch (error) {
        console.error('Error recording deposit:', error);
        if (req.flash) req.flash('error', 'Error recording deposit: ' + error.message);
        res.redirect('/scheme');
    }
});

module.exports = router;