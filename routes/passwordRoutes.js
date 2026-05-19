const express = require('express');
const router = express.Router();
const Registration = require('../models/Registration');
const crypto = require('crypto');

// GET - Forgot password form
router.get('/forgot-password', (req, res) => {
    res.render('forgot_password', { message: null, error: null });
});

// POST - Send reset email (simple version - just shows token on screen)
router.post('/forgot-password', async (req, res) => {
    try {
        const { email } = req.body;
        const user = await Registration.findOne({ email: email.toLowerCase() });
        
        if (!user) {
            return res.render('forgot_password', { error: 'Email not found', message: null });
        }
        
        // Generate token
        const token = crypto.randomBytes(20).toString('hex');
        user.resetPasswordToken = token;
        user.resetPasswordExpires = Date.now() + 3600000; // 1 hour
        await user.save();
        
        // Show token on screen (no email setup needed)
        res.render('forgot_password', { 
            message: `Reset link: http://localhost:3000/reset-password/${token}`,
            error: null 
        });
        
    } catch (error) {
        res.render('forgot_password', { error: 'Something went wrong', message: null });
    }
});

// GET - Reset password form
router.get('/reset-password/:token', async (req, res) => {
    const user = await Registration.findOne({
        resetPasswordToken: req.params.token,
        resetPasswordExpires: { $gt: Date.now() }
    });
    
    if (!user) {
        return res.render('reset_password', { error: 'Link invalid or expired', token: null });
    }
    
    res.render('reset_password', { token: req.params.token, error: null });
});

// POST - Reset password
router.post('/reset-password/:token', async (req, res) => {
    try {
        const { password, confirmPassword } = req.body;
        
        if (password !== confirmPassword) {
            return res.render('reset_password', { error: 'Passwords do not match', token: req.params.token });
        }
        
        const user = await Registration.findOne({
            resetPasswordToken: req.params.token,
            resetPasswordExpires: { $gt: Date.now() }
        });
        
        if (!user) {
            return res.render('reset_password', { error: 'Link invalid or expired', token: null });
        }
        
        await user.setPassword(password);
        user.resetPasswordToken = null;
        user.resetPasswordExpires = null;
        await user.save();
        
        res.render('reset_password', { message: 'Password reset successful!', error: null, token: null });
        
    } catch (error) {
        res.render('reset_password', { error: 'Error resetting password', token: req.params.token });
    }
});

module.exports = router;