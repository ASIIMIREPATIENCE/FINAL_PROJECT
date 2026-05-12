const express = require('express');
const router = express.Router();
const Depositor = require('../models/Depositor');
const Transaction = require('../models/Transaction');

// GET route - Display deposit scheme page
router.get('/scheme', async (req, res) => {
    try {
        // Get all depositors
        const depositors = await Depositor.find().sort({ joinDate: -1 });
        
        // Get all transactions
        const transactions = await Transaction.find().sort({ date: -1 }).limit(10);
        
        // Calculate summary totals
        let totalDeposits = 0;
        let totalWithdrawals = 0;
        let currentBalance = 0;
        
        depositors.forEach(depositor => {
            totalDeposits += depositor.totalDeposits || 0;
            totalWithdrawals += depositor.totalWithdrawals || 0;
            currentBalance += depositor.currentBalance || 0;
        });
        
        res.render('scheme', {
            depositors: depositors,
            transactions: transactions,
            totalDeposits: totalDeposits,
            totalWithdrawals: totalWithdrawals,
            currentBalance: currentBalance,
            depositorsCount: depositors.length
        });
        
    } catch (error) {
        console.error(error);
        res.status(500).send('Server error');
    }
});

// POST route - Register new depositor
router.post('/registerDepositor', async (req, res) => {
    try {
        const { fullName, phoneNumber, nin, employer } = req.body;
        
        // Check if NIN already exists
        const existingDepositor = await Depositor.findOne({ nin: nin });
        if (existingDepositor) {
            console.log(`Depositor with NIN ${nin} already exists`);
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
            totalWithdrawals: 0
        });
        
        await newDepositor.save();
        console.log(`New depositor registered: ${fullName}`);
        res.redirect('/scheme');
        
    } catch (error) {
        console.error(error);
        res.redirect('/scheme');
    }
});

// POST route - Record transaction (handles both deposit and withdrawal)
router.post('/recordTransaction', async (req, res) => {
    try {
        const { depositorId, transactionType, amount, date } = req.body;
        
        const depositor = await Depositor.findById(depositorId);
        if (!depositor) {
            console.log('Depositor not found');
            return res.redirect('/scheme');
        }
        
        const transactionAmount = Number(amount);
        
        if (transactionType === 'Deposit') {
            // Update depositor balance for deposit
            depositor.currentBalance += transactionAmount;
            depositor.totalDeposits += transactionAmount;
            await depositor.save();
            
            // Create transaction record
            const transaction = new Transaction({
                depositorId: depositor._id,
                depositorName: depositor.fullName,
                type: 'Deposit',
                amount: transactionAmount,
                balanceAfter: depositor.currentBalance,
                date: date,
                processedBy: 'Admin'
            });
            
            await transaction.save();
            console.log(`Deposit of UGX ${transactionAmount} recorded for ${depositor.fullName}`);
            
        } else if (transactionType === 'Withdrawal') {
            // Check if sufficient balance
            if (depositor.currentBalance < transactionAmount) {
                console.log(`Insufficient balance for ${depositor.fullName}. Balance: UGX ${depositor.currentBalance}`);
                return res.redirect('/scheme');
            }
            
            // Update depositor balance for withdrawal
            depositor.currentBalance -= transactionAmount;
            depositor.totalWithdrawals += transactionAmount;
            await depositor.save();
            
            // Create transaction record
            const transaction = new Transaction({
                depositorId: depositor._id,
                depositorName: depositor.fullName,
                type: 'Withdrawal',
                amount: transactionAmount,
                balanceAfter: depositor.currentBalance,
                date: date,
                processedBy: 'Admin'
            });
            
            await transaction.save();
            console.log(`Withdrawal of UGX ${transactionAmount} recorded for ${depositor.fullName}`);
        }
        
        res.redirect('/scheme');
        
    } catch (error) {
        console.error(error);
        res.redirect('/scheme');
    }
});

module.exports = router;