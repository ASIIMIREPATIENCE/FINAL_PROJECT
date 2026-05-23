const express = require('express');
const router = express.Router();
const Depositor = require('../models/Depositor');
const Stock = require('../models/Stock');
const Registration = require('../models/Registration');
const Sale = require('../models/Sales');

// ============================================================
// AUTHENTICATION MIDDLEWARE
// ============================================================
function isAuthenticated(req, res, next) {
    if (req.isAuthenticated()) {
        return next();
    }
    res.redirect('/');
}

// ============================================================
// GET /scheme - DISPLAY DEPOSIT SCHEME PAGE
// ============================================================
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
        
        // Pickup statistics
        const readyForPickup = await Depositor.countDocuments({
            remainingBalance: 0,
            pickupStatus: 'ready'
        });
        
        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const tomorrow = new Date(today);
        tomorrow.setDate(tomorrow.getDate() + 1);
        
        const pickedUpToday = await Depositor.countDocuments({
            pickupStatus: 'picked_up',
            pickupDate: { $gte: today, $lt: tomorrow }
        });
        
        const pendingPickups = await Depositor.countDocuments({
            remainingBalance: 0,
            pickupStatus: 'pending'
        });
        
        const recentPickups = await Depositor.find({
            pickupStatus: 'picked_up'
        })
        .sort({ pickupDate: -1 })
        .limit(5)
        .select('fullName pickupDate pickedUpBy items');
        
        res.render('scheme', {
            depositors: depositors,
            stockItems: stockItems,
            recentTransactions: recentTransactions,
            totalSavingsTarget: totalSavingsTarget,
            totalAmountPaid: totalAmountPaid,
            totalRemaining: totalSavingsTarget - totalAmountPaid,
            depositorsCount: depositors.length,
            currentUser: user,
            readyForPickup: readyForPickup,
            pickedUpToday: pickedUpToday,
            pendingPickups: pendingPickups,
            recentPickups: recentPickups,
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

// ============================================================
// POST /registerDepositor - REGISTER NEW DEPOSITOR
// ============================================================
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
            depositHistory: [],
            pickupStatus: 'pending',
            pickupHistory: []
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

// ============================================================
// POST /recordDeposit - RECORD DEPOSIT PAYMENT
// ============================================================
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

// ============================================================
// POST /mark-ready/:id - MARK GOODS READY FOR PICKUP
// ============================================================
router.post('/mark-ready/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const user = req.user;
        const attendantName = user ? user.fullname : 'Admin';
        const attendantId = user ? user._id : null;
        
        const depositor = await Depositor.findById(id);
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
            return res.redirect('/scheme');
        }
        
        if (depositor.remainingBalance > 0) {
            if (req.flash) req.flash('error', `Cannot mark ready. Payment not complete. Remaining: UGX ${depositor.remainingBalance.toLocaleString()}`);
            return res.redirect('/scheme');
        }
        
        depositor.pickupStatus = 'ready';
        depositor.pickupNotes = notes || '';
        
        depositor.pickupHistory.push({
            action: 'marked_ready',
            date: new Date(),
            attendant: attendantId,
            attendantName: attendantName,
            notes: notes || 'Goods marked ready for pickup'
        });
        
        depositor.status = 'completed';
        
        await depositor.save();
        
        console.log(`[${new Date().toLocaleString()}] Goods marked ready for ${depositor.fullName} by ${attendantName}`);
        
        if (req.flash) req.flash('success', `Goods for ${depositor.fullName} marked READY for pickup.`);
        res.redirect('/scheme');
        
    } catch (error) {
        console.error('Error marking ready:', error);
        if (req.flash) req.flash('error', 'Error marking goods ready');
        res.redirect('/scheme');
    }
});

// ============================================================
// POST /record-pickup/:id - RECORD PICKUP AND CREATE SALE
// ============================================================
router.post('/record-pickup/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { pickedUpBy, notes } = req.body;
        const user = req.user;
        const attendantName = user ? user.fullname : 'Admin';
        const attendantId = user ? user._id : null;
        
        const depositor = await Depositor.findById(id);
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
            return res.redirect('/scheme');
        }
        
        if (depositor.pickupStatus !== 'ready') {
            if (req.flash) req.flash('error', 'Goods are not marked ready for pickup.');
            return res.redirect('/scheme');
        }
        
        // ========== DEDUCT ITEMS FROM STOCK ==========
        const stockUpdates = [];
        let stockErrors = [];
        
        for (const item of depositor.items) {
            const stockItem = await Stock.findOne({ 
                productname: item.productname,
                sellingprice: item.unitprice
            });
            
            if (!stockItem) {
                stockErrors.push(`Product "${item.productname}" not found`);
                continue;
            }
            
            if (stockItem.quantity < item.quantity) {
                stockErrors.push(`Insufficient stock for "${item.productname}". Available: ${stockItem.quantity}, Need: ${item.quantity}`);
                continue;
            }
            
            const oldQuantity = stockItem.quantity;
            stockItem.quantity -= item.quantity;
            await stockItem.save();
            
            stockUpdates.push({
                productname: item.productname,
                oldQuantity: oldQuantity,
                deducted: item.quantity,
                newQuantity: stockItem.quantity
            });
        }
        
        if (stockErrors.length > 0) {
            if (req.flash) req.flash('error', 'Stock errors: ' + stockErrors.join(', '));
            return res.redirect('/scheme');
        }
        
        // ========== CREATE SALE RECORD ==========
        const saleItems = depositor.items.map(item => ({
            productname: item.productname,
            quantity: item.quantity,
            unitprice: item.unitprice,
            subtotal: item.subtotal
        }));
        
        const saleData = {
            customername: depositor.fullName,
            phonenumber: depositor.phoneNumber,
            nin: depositor.nin || 'N/A',
            paymentmethod: 'Deposit Scheme',
            items: saleItems,
            cartSubtotal: depositor.itemsSubtotal,
            distance: depositor.distance || 0,
            transportFee: depositor.transportFee || 0,
            grandTotal: depositor.totalAmountOwed,
            freeTransportApplied: depositor.transportFee === 0 && depositor.needTransport,
            needTransport: depositor.needTransport || false,
            attendantName: attendantName,
            attendant: attendantId,
            Date: new Date(),
            depositSchemeId: depositor._id,
            pickupRecordedBy: pickedUpBy || depositor.fullName,
            pickupNotes: notes || ''
        };
        
        const newSale = new Sale(saleData);
        await newSale.save();
        
        // ========== UPDATE PICKUP STATUS ==========
        depositor.pickupStatus = 'picked_up';
        depositor.pickupDate = new Date();
        depositor.pickedUpBy = pickedUpBy || depositor.fullName;
        depositor.pickupNotes = notes || '';
        depositor.saleRecordId = newSale._id;
        
        depositor.pickupHistory.push({
            action: 'picked_up',
            date: new Date(),
            attendant: attendantId,
            attendantName: attendantName,
            notes: notes || `Goods picked up by ${pickedUpBy || depositor.fullName}. Sale: #SALE-${newSale._id.toString().slice(-8)}`
        });
        
        depositor.status = 'picked_up';
        
        await depositor.save();
        
        console.log(`[${new Date().toLocaleString()}] Pickup recorded for ${depositor.fullName} by ${attendantName}`);
        console.log(`   Sale: #SALE-${newSale._id.toString().slice(-8)}`);
        console.log(`   Total: UGX ${depositor.totalAmountOwed.toLocaleString()}`);
        
        res.render('pickup_receipt', {
            depositor: depositor,
            sale: newSale,
            stockUpdates: stockUpdates,
            pickupDate: new Date(),
            pickedUpBy: pickedUpBy || depositor.fullName,
            attendantName: attendantName,
            currentUser: req.user,
            success: true
        });
        
    } catch (error) {
        console.error('Error recording pickup:', error);
        if (req.flash) req.flash('error', 'Error recording pickup: ' + error.message);
        res.redirect('/scheme');
    }
});

// ============================================================
// POST /cancel-pickup/:id - CANCEL READY STATUS
// ============================================================
router.post('/cancel-pickup/:id', isAuthenticated, async (req, res) => {
    try {
        const { id } = req.params;
        const { notes } = req.body;
        const user = req.user;
        const attendantName = user ? user.fullname : 'Admin';
        const attendantId = user ? user._id : null;
        
        const depositor = await Depositor.findById(id);
        if (!depositor) {
            if (req.flash) req.flash('error', 'Depositor not found');
            return res.redirect('/scheme');
        }
        
        depositor.pickupStatus = 'pending';
        
        depositor.pickupHistory.push({
            action: 'cancelled',
            date: new Date(),
            attendant: attendantId,
            attendantName: attendantName,
            notes: notes || 'Pickup ready status cancelled'
        });
        
        await depositor.save();
        
        console.log(`[${new Date().toLocaleString()}] Pickup status cancelled for ${depositor.fullName} by ${attendantName}`);
        
        if (req.flash) req.flash('success', `Pickup ready status cancelled for ${depositor.fullName}.`);
        res.redirect('/scheme');
        
    } catch (error) {
        console.error('Error cancelling pickup:', error);
        if (req.flash) req.flash('error', 'Error cancelling pickup status');
        res.redirect('/scheme');
    }
});

module.exports = router;