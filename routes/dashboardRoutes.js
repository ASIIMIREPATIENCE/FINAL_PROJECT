const express = require("express");
const router = express.Router();
const Sale = require('../models/Sales'); 
const Stock = require('../models/Stock'); 



router.get("/admin", async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('attendant', 'fullname')  // Only populate attendant (it's an ObjectId)
            .sort({ Date: -1 })  // Note: 'Date' not 'date' (check your schema)
         const stockItems = await Stock.find();
        res.render('admin_dashboard', { sales })
    } catch (error) {
        console.log(error.message)
        res.status(500).send('Cannot collect data from the database')
    }
})
router.get("/manager", (req, res) => {
    res.render('manager_dashboard')
})

// router.get("/salesattendant", async (req, res) => {
//     try {
//         const sales = await Sale.find()
//             .populate('attendant', 'fullname')  // Only populate attendant (it's an ObjectId)
//             .sort({ Date: -1 })  // Note: 'Date' not 'date' (check your schema)
        
//         res.render('sales_dashboard', { sales })
//     } catch (error) {
//         console.log(error.message)
//         res.status(500).send('Cannot collect data from the database')
//     }
// })





router.get("/salesattendant", async (req, res) => {
    try {
        const sales = await Sale.find()
            .populate('attendant', 'fullname')
            // .populate('productId') // If you have productId reference
            .sort({ Date: -1 });
        
        const stockItems = await Stock.find();
        
        res.render('sales_dashboard', { 
            sales, 
            stockItems 
        });
    } catch (error) {
        console.log(error.message);
        res.status(500).send('Cannot collect data from the database');
    }
});
// router.get("/salesattendant", async (req, res) => {
//     try {
//         const sales= await Sale.find()
//         .populate('productname')
//         .populate('attendant', 'fullname')
//         .sort({date:-1})
//          res.render('sales_dashboard', {sales})
//     } catch (error) {
//       console.log(error.message)
//       res.status(500).send('cannot collect data from the database')  
//     }
   
   
// })

router.get('/logout', (req, res, next) => {
    req.logout((err)=>{
        if(err){
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
});












module.exports = router;