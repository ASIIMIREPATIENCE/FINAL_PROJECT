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

// GET route - Edit user form
router.get('/edit-user/:id', async (req, res) => {
    try {
        const user = await Registration.findById(req.params.id);
        if (!user) {
            return res.redirect('/users');
        }
        res.render('edit_user', { user: user });
    } catch (error) {
        console.log(error);
        res.redirect('/users');
    }
});

// POST route - Update user
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
            email: email,
            phonenumber: phonenumber,
            address: address,
            nin: nin,
            nextOfKinName: nextOfKinName,
            nextOfKinPhone: nextOfKinPhone,
            nextOfKinRelationship: nextOfKinRelationship,
            role: role
        });
        
        console.log(`[${new Date().toLocaleString()}] User updated: ${fullname}`);
        res.redirect('/users');
        
    } catch (error) {
        console.log('Error updating user:', error);
        res.redirect('/users');
    }
});

// POST route - Delete user
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
        console.log('Error deleting user:', error);
        res.redirect('/users');
    }
});

// Update your existing /users route to include statistics
router.get('/users', async (req, res) => {
    try {
        const users = await Registration.find().sort({ Date: -1 });
        
        // Calculate user statistics
        let totalUsers = users.length;
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
            totalUsers: totalUsers,
            adminCount: adminCount,
            managerCount: managerCount,
            attendantCount: attendantCount
        });
    } catch (error) {
        console.log(error);
        res.render('user_mgt', { 
            users: [],
            totalUsers: 0,
            adminCount: 0,
            managerCount: 0,
            attendantCount: 0
        });
    }
});

module.exports = router;