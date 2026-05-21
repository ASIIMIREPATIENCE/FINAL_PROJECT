const express = require('express');
const router = express.Router();
const Depositor = require('../models/Depositor');
const Registration = require('../models/Registration');
const Stock = require('../models/Stock');

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
        
        let totalDeposits = 0;
        let currentBalance = 0;
        
        depositors.forEach(depositor => {
            totalDeposits += depositor.totalDeposits || 0;
            currentBalance += depositor.currentBalance || 0;
        });
        
        let topBalanceDepositor = null;
        let highestBalance = 0;
        
        depositors.forEach(depositor => {
            if (depositor.currentBalance > highestBalance) {
                highestBalance = depositor.currentBalance;
                topBalanceDepositor = depositor;
            }
        });
        
        res.render('scheme', {
            depositors: depositors,
            stockItems: stockItems,
            totalDeposits: totalDeposits,
            currentBalance: currentBalance,
            depositorsCount: depositors.length,
            currentUser: user,
            topBalanceDepositor: topBalanceDepositor,
            messages: { success: null, error: null }
        });
        
    } catch (error) {
        console.error('Error loading scheme page:', error);
        res.status(500).send('Server error');
    }
});

// POST route - Register new depositor
router.post('/registerDepositor', isAuthenticated, async (req, res) => {
    try {
        const { fullName, phoneNumber, nin, employer } = req.body;
        const user = req.user;
        const attendantName = user ? user.fullname : 'System Admin';
        
        const existingDepositor = await Depositor.findOne({ nin: nin });
        if (existingDepositor) {
            if (req.flash) req.flash('error', 'Depositor with this NIN already exists');
            return res.redirect('/scheme');
        }
        
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

// POST route - Record deposit with items
router.post('/recordDepositWithItems', isAuthenticated, async (req, res) => {
    try {
        const { depositorId, amount, paymentMethod, cartItems, distance, needTransport } = req.body;
        const user = req.user;
        const attendantName = user ? user.fullname : 'Admin';
        const attendantId = user ? user._id : null;
        
        const depositor = await Depositor.findById(depositorId);
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
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
        
        const distanceKm = parseInt(distance) || 0;
        const needTrans = needTransport === 'true';
        
        let transportFee = 0;
        if (needTrans && distanceKm > 0) {
            const isFree = (itemsSubtotal >= 500000 && distanceKm <= 10);
            if (!isFree) transportFee = 30000;
        }
        
        const grandTotal = itemsSubtotal + transportFee;
        const amountPaid = Number(amount);
        
        let paymentStatus = 'pending';
        let remainingBalance = grandTotal - amountPaid;
        
        if (remainingBalance <= 0) {
            paymentStatus = 'completed';
            remainingBalance = 0;
        } else if (amountPaid > 0 && amountPaid < grandTotal) {
            paymentStatus = 'partial';
        }
        
        const depositRecord = {
            amount: amountPaid,
            date: new Date(),
            attendant: attendantId,
            attendantName: attendantName,
            paymentMethod: paymentMethod || 'Cash',
            balanceAfter: depositor.currentBalance,
            items: items,
            cartSubtotal: itemsSubtotal,
            distance: distanceKm,
            transportFee: transportFee,
            grandTotal: grandTotal,
            needTransport: needTrans,
            paymentStatus: paymentStatus,
            amountPaid: amountPaid,
            remainingBalance: remainingBalance
        };
        
        depositor.depositHistory.push(depositRecord);
        
        // Update depositor balance
        if (paymentStatus === 'completed') {
            depositor.currentBalance += grandTotal;
            depositor.totalDeposits += grandTotal;
        } else {
            depositor.currentBalance += amountPaid;
            depositor.totalDeposits += amountPaid;
        }
        
        await depositor.save();
        
        console.log(`[${new Date().toLocaleString()}] Deposit recorded for ${depositor.fullName}`);
        console.log(`   Amount: UGX ${amountPaid.toLocaleString()}, Grand Total: UGX ${grandTotal.toLocaleString()}, Status: ${paymentStatus}`);
        
        res.render('deposit_receipt', { 
            deposit: depositRecord,
            depositor: depositor,
            currentUser: user,
            success: true 
        });
        
    } catch (error) {
        console.error('Error recording deposit:', error);
        if (req.flash) req.flash('error', 'Error recording deposit');
        res.redirect('/scheme');
    }
});

module.exports = router;