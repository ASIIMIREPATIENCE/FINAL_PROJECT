const express = require("express");
const router = express.Router();
const Registration = require('../models/Registration');
const passport = require('passport');


// index
router.get("/", (req, res) => {
    res.render('index');
});


// registration
router.get("/register", (req, res) => {
    res.render('registration', { error: null, message: null });
});

router.post('/postreg', async (req, res) => {
    try {
        const { fullname, email, phonenumber, address, nin, nextOfKinName, nextOfKinPhone, nextOfKinRelationship, password, confirmpassword, role } = req.body;

        if (password !== confirmpassword) {
            return res.render('registration', { error: 'Passwords do not match', message: null });
        }

        const existingUser = await Registration.findOne({ email: email.toLowerCase() });
        if (existingUser) {
            return res.render('registration', { error: 'Email already exists', message: null });
        }

        const newUser = new Registration({
            fullname,
            email: email.toLowerCase(),
            phonenumber,
            address,
            nin: nin || 'N/A',
            nextOfKinName,
            nextOfKinPhone,
            nextOfKinRelationship,
            role: role || 'sales_attendant'
        });

        await Registration.register(newUser, password);
        res.redirect('/userlogin');

    } catch (error) {
        console.error(error);
        res.render('registration', { error: error.message, message: null });
    }
});


// login
router.get("/userlogin", (req, res) => {
    res.render('login', { error: null });
});

router.post('/postlogin', passport.authenticate('local', {
    successRedirect: '/dashboard-redirect',
    failureRedirect: '/',
    failureFlash: false
}));

router.get('/dashboard-redirect', (req, res) => {
    if (req.user.role === 'admin') {
        res.redirect('/admin');
    } else if (req.user.role === 'store_manager') {
        res.redirect('/manager');
    } else {
        res.redirect('/salesattendant');
    }
});


// logout
router.get('/logout', (req, res) => {
    req.logout((err) => {
        if (err) console.error(err);
        res.redirect('/userlogin');
    });
});

// View all users
router.get('/users', async (req, res) => {
    try {
        const users = await Registration.find({}).sort({ Date: -1 });
        
        
        let adminCount = 0;
        let managerCount = 0;
        let attendantCount = 0;
        
        users.forEach(user => {
            if (user.role === 'admin') adminCount++;
            else if (user.role === 'store_manager') managerCount++;
            else if (user.role === 'sales_attendant') attendantCount++;
        });
        
        res.render('user_mgt', { 
            users: users,
            totalUsers: users.length,
            adminCount: adminCount,
            managerCount: managerCount,
            attendantCount: attendantCount
        });
    } catch (error) {
        console.error(error);
        res.render('user_mgt', { 
            users: [],
            totalUsers: 0,
            adminCount: 0,
            managerCount: 0,
            attendantCount: 0
        });
    }
});

// Edit user 
router.get('/edit-user/:id', async (req, res) => {
    try {
        const user = await Registration.findById(req.params.id);
        if (!user) {
            return res.redirect('/users');
        }
        res.render('edit_user', { user: user });
    } catch (error) {
        console.error(error);
        res.redirect('/users');
    }
});


router.post('/edit-user/:id', async (req, res) => {
    try {
        const { 
            fullname, 
            email, 
            phonenumber, 
            address,
            nin,
            nextOfKinName,
            nextOfKinPhone,
            nextOfKinRelationship,
            role 
        } = req.body;
        
        await Registration.findByIdAndUpdate(req.params.id, {
            fullname: fullname,
            email: email.toLowerCase(),
            phonenumber: phonenumber,
            address: address,
            nin: nin || 'N/A',
            nextOfKinName: nextOfKinName,
            nextOfKinPhone: nextOfKinPhone,
            nextOfKinRelationship: nextOfKinRelationship,
            role: role
        });
        
        console.log(`[${new Date().toLocaleString()}] User updated: ${fullname}`);
        res.redirect('/users');
        
    } catch (error) {
        console.error('Error updating user:', error);
        res.redirect('/users');
    }
});

//Delete user
router.post('/delete-user/:id', async (req, res) => {
    try {
        const user = await Registration.findById(req.params.id);
        if (!user) {
            return res.redirect('/users');
        }
        
        // Prevent deleting your own account
        if (req.user && req.user._id.toString() === req.params.id) {
            return res.redirect('/users');
        }
        
        await Registration.findByIdAndDelete(req.params.id);
        
        console.log(`[${new Date().toLocaleString()}] User deleted: ${user.fullname} (${user.role})`);
        res.redirect('/users');
        
    } catch (error) {
        console.error('Error deleting user:', error);
        res.redirect('/users');
    }
});

module.exports = router;