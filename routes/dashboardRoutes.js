const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales'); 
const Stock = require('../models/Stock'); 
const Registration = require('../models/Registration');

router.get("/admin", async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
        const stockItems = await Stock.find();
        
        res.render('admin_dashboard', { sales, stockItems });
    } catch (error) {
        console.log(error.message);
        res.render('admin_dashboard', { sales: [], stockItems: [] });
    }
});

router.get("/manager", (req, res) => {
    res.render('manager_dashboard');
});

router.get("/salesattendant", async (req, res) => {
    try {
        console.log("=== /salesattendant route hit ===");
        
        // Fetch data
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            .sort({ Date: -1 });
            
        const stockItems = await Stock.find();
        
        console.log("Sales count:", sales.length);
        console.log("Stock items count:", stockItems.length);
        
        // Render template with data
        return res.render('sales_dashboard', { 
            sales: sales, 
            stockItems: stockItems 
        });
        
    } catch (error) {
        console.error("ERROR in /salesattendant:", error.message);
        console.error(error.stack);
        return res.render('sales_dashboard', { 
            sales: [], 
            stockItems: [] 
        });
    }
});

router.get('/logout', (req, res, next) => {
    req.logout((err) => {
        if (err) {
            return next(err);
        }
        res.redirect('/');
    });
});

router.get('/users', async (req, res) => {
    try {
        const users = await Registration.find();
        res.render('user_mgt', { users: users });
    } catch (error) {
        console.log(error);
        res.render('user_mgt', { users: [] });
    }
});

module.exports = router;