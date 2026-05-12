const express = require("express");
const router = express.Router();
const Registration = require('../models/Registration');
const passport = require('passport');
const Sale = require('../models/Sales'); 

router.get("/", (req, res) => {
    res.render('index')
})

// user registration
router.get("/register", (req, res) => {
    res.render('registration')
})

router.post('/postreg', async (req, res) => {
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
            password, 
            confirmpassword, 
            role 
        } = req.body;
        
        // Check if passwords match
        if (password !== confirmpassword) {
            return res.render('registration', { message: "Passwords do not match" });
        }
        
        // Check if email already exists
        let existingemail = await Registration.findOne({ email: email.toLowerCase() });
        if (existingemail) {
            return res.render('registration', { message: "Email already exists" });
        }
        
        // Check if NIN already exists
        let existingNIN = await Registration.findOne({ nin: nin });
        if (existingNIN) {
            return res.render('registration', { message: "NIN already exists" });
        }
        
        // Create new user with all fields
        const newUser = new Registration({
            fullname: fullname,
            email: email.toLowerCase(),
            phonenumber: phonenumber,
            address: address,
            nin: nin,
            nextOfKinName: nextOfKinName,
            nextOfKinPhone: nextOfKinPhone,
            nextOfKinRelationship: nextOfKinRelationship,
            role: role
        });
        
        await Registration.register(newUser, password);
        res.redirect('/userlogin');
        
    } catch (error) {
        console.log(error);
        res.render('registration', { error: error.message });
    }
})

// user login
router.get("/userlogin", (req, res) => {
    res.render('login')
})

router.post('/postlogin', passport.authenticate('local', { 
    failureRedirect: '/userlogin'  // Fixed: changed 'failure' to 'failureRedirect'
}), (req, res) => {
    if (req.user.role === 'admin') {
        res.redirect('/admin')
    } else if (req.user.role === 'store_manager') {
        res.redirect('/manager')
    } else if (req.user.role === 'sales_attendant') {
        res.redirect('/salesattendant')
    } else {
        res.redirect('/')
    }
})

router.get("/admin", (req, res) => {
    res.render('admin_dashboard')
})

router.get("/manager", (req, res) => {
    res.render('manager_dashboard')
})

// Fixed: Removed duplicate route
router.get("/salesattendant", async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 })
        
        res.render('sales_dashboard', { sales })
    } catch (error) {
        console.log(error.message)
        res.status(500).send('Cannot collect data from the database')
    }
})

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err)
        }
        res.redirect('/')
    })
})

router.get('/users', async (req, res) => {
    try {
        const users = await Registration.find();
        res.render('user_mgt', { users: users });
    } catch (error) {
        console.log(error);
        res.render('user_mgt', { users: [] });
    }
})

module.exports = router;