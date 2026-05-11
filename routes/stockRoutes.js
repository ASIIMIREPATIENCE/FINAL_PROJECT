// 
const express = require("express");
const router = express.Router();
const Stock = require('../models/Stock');
// const passport = require('passport');

// GET route - Display stock page with all stock items
router.get('/addStock', async (req, res) => {
    try {
        const stockItems = await Stock.find(); // Fetch all stock items
        res.render('stock', { stockItems: stockItems }); // Pass stockItems to the template
    } catch (error) {
        console.error(error);
        res.render('stock', { stockItems: [] }); // Pass empty array if error
    }
});

// GET route - Show edit form
router.get('/editStock/:id', async (req, res) => {
    try {
        const item = await Stock.findById(req.params.id);
        res.render('stock_edit', { item: item });
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

// POST route - Add new stock item
router.post('/postStock', async (req, res) => {
    try {
        const { productname, category, quantity, costprice, sellingprice, supplier, reorderlevel } = req.body;
        
        const newStock = new Stock({
            productname,
            category,
            quantity: Number(quantity),
            costprice: Number(costprice),
            sellingprice: Number(sellingprice),
            supplier,
            reorderlevel: Number(reorderlevel),
            Date: new Date() // Add current date
        });
        
        await newStock.save();
        console.log("Stock saved:", req.body);
        res.redirect('/addStock');
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

// DELETE route - Delete stock item
router.post('/deleteStock/:id', async (req, res) => {
    try {
        await Stock.findByIdAndDelete(req.params.id);
        console.log("Stock deleted with ID:", req.params.id);
        res.redirect('/addStock');
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

// EDIT route - Update stock item
router.post('/editStock/:id', async (req, res) => {
    try {
        const { quantity, costprice, sellingprice, supplier, reorderlevel } = req.body;
        
        await Stock.findByIdAndUpdate(req.params.id, {
            quantity: Number(quantity),
            costprice: Number(costprice),
            sellingprice: Number(sellingprice),
            supplier,
            reorderlevel: Number(reorderlevel)
        });
        
        console.log("Stock updated with ID:", req.params.id);
        res.redirect('/addStock');
    } catch (error) {
        console.error(error);
        res.redirect('/addStock');
    }
});

module.exports = router;